"""
CricSmart AI - Ball Tracking ML Service
FastAPI server that wraps the YOLO-based ball tracking pipeline.

Usage:
    pip install fastapi uvicorn python-multipart opencv-python-headless ultralytics
    python server.py
"""

import os
import sys
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path

# Find ffmpeg binary — prefer imageio_ffmpeg bundled version, then system
def _find_ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        pass
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        return ffmpeg
    return None

FFMPEG_BIN = _find_ffmpeg()
print(f"ffmpeg binary: {FFMPEG_BIN or 'NOT FOUND'}")

try:
    from fastapi import FastAPI, UploadFile, File, Form
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.staticfiles import StaticFiles
    import uvicorn
except ImportError:
    print("Install dependencies: pip install fastapi uvicorn python-multipart")
    sys.exit(1)

# Directory for serving output videos
OUTPUT_DIR = Path(tempfile.gettempdir()) / "cricsmart_outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

app = FastAPI(title="CricSmart Ball Tracking")

ALLOWED_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve output videos as static files
app.mount("/outputs", StaticFiles(directory=str(OUTPUT_DIR)), name="outputs")

# Try to import the existing analysis engine
ANALYSIS_AVAILABLE = False
try:
    # ml-service -> web -> CricSmart-AI (where analysis_engine.py lives)
    parent_dir = str(Path(__file__).resolve().parent.parent.parent)
    sys.path.insert(0, parent_dir)
    from analysis_engine import (
        load_model,
        get_calibration_scale,
        process_cricket_frame,
        BallTracker,
        calculate_speed,
        classify_shot_relative,
        STUMP_HEIGHT_METERS,
    )
    ANALYSIS_AVAILABLE = True
    print("Analysis engine loaded successfully")
except ImportError as e:
    print(f"Analysis engine not available: {e}")
    print("Ball tracking will use demo results")


@app.get("/health")
async def health():
    return {"status": "ok", "analysis_available": ANALYSIS_AVAILABLE}


def smooth_trajectory(points, num_output=200):
    """Fit a smooth curve through the ball trail points (like DRS trajectory)."""
    import numpy as np
    if len(points) < 4:
        return points

    pts = np.array(points, dtype=float)
    # Parameterize by cumulative arc length
    diffs = np.diff(pts, axis=0)
    seg_lengths = np.sqrt((diffs ** 2).sum(axis=1))
    cum_length = np.concatenate([[0], np.cumsum(seg_lengths)])

    if cum_length[-1] == 0:
        return points

    t = cum_length / cum_length[-1]  # normalize to [0, 1]
    t_new = np.linspace(0, 1, num_output)

    # Interpolate x and y separately
    x_smooth = np.interp(t_new, t, pts[:, 0])
    y_smooth = np.interp(t_new, t, pts[:, 1])

    return [(int(x), int(y)) for x, y in zip(x_smooth, y_smooth)]


def predict_trajectory(ball_trail, num_predict=40):
    """Extend the trajectory beyond the last detected point using velocity."""
    import numpy as np
    if len(ball_trail) < 3:
        return []

    # Use the last few points to estimate velocity
    recent = ball_trail[-min(8, len(ball_trail)):]
    pts = np.array(recent, dtype=float)

    # Average velocity from recent segment
    vx = (pts[-1][0] - pts[0][0]) / len(pts)
    vy = (pts[-1][1] - pts[0][1]) / len(pts)

    predicted = []
    last = pts[-1].copy()
    for i in range(1, num_predict + 1):
        nx = int(last[0] + vx * i)
        ny = int(last[1] + vy * i)
        predicted.append((nx, ny))

    return predicted


def draw_ball_overlay(video_path: str, ball_trail: list, bounce_idx: int,
                      hit_stumps: bool, speed_kmh: float, shot_type: str,
                      stump_center_x: int, ground_y: int) -> str | None:
    """
    Full Track AI-style ball tracking overlay.

    Three key points marked:
      - RELEASE (first detection, cyan circle)
      - PITCH (bounce inflection point, orange circle)
      - IMPACT (last detection / batsman end, red or green)

    Two trajectory segments:
      - Pre-bounce: release → pitch (yellow line)
      - Post-bounce: pitch → impact (red if hitting, green if missing)

    Predicted trajectory shown as dashed extension.
    HUD panel at bottom with speed, length, verdict.
    3-second freeze frame summary at end.
    """
    import cv2
    import numpy as np

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    output_name = f"{uuid.uuid4().hex}.mp4"
    output_path = str(OUTPUT_DIR / output_name)

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, fps, (w, h))

    release_point = ball_trail[0]
    bounce_point = ball_trail[bounce_idx] if 0 <= bounce_idx < len(ball_trail) else ball_trail[len(ball_trail) // 2]
    impact_point = ball_trail[-1]

    # Split trail into pre-bounce and post-bounce
    pre_bounce = ball_trail[:bounce_idx + 1]
    post_bounce = ball_trail[bounce_idx:]

    # Smooth each segment separately
    smooth_pre = smooth_trajectory(pre_bounce, num_output=max(len(pre_bounce) * 3, 50))
    smooth_post = smooth_trajectory(post_bounce, num_output=max(len(post_bounce) * 3, 50))
    predicted = predict_trajectory(ball_trail, num_predict=30)

    # Stump zone
    stump_half_w = max(int(w * 0.025), 12)
    stump_height = max(int(h * 0.08), 40)
    stump_top = ground_y - stump_height
    stump_left = stump_center_x - stump_half_w
    stump_right = stump_center_x + stump_half_w

    # Colors (BGR)
    COL_RELEASE = (255, 255, 0)    # Cyan
    COL_PRE = (0, 230, 255)        # Yellow / gold (pre-bounce trajectory)
    COL_POST_HIT = (0, 0, 255)     # Red (hitting stumps)
    COL_POST_MISS = (0, 255, 100)  # Green (missing stumps)
    COL_PITCH = (0, 165, 255)      # Orange (pitch/bounce point)
    COL_IMPACT = (0, 0, 255) if hit_stumps else (0, 255, 100)
    COL_PREDICTED = (180, 180, 180)  # Grey dashed
    COL_STUMP = (200, 200, 200)
    COL_HUD_BG = (40, 30, 20)
    COL_HUD_BORDER = (255, 180, 0)  # Blue-ish
    COL_WHITE = (255, 255, 255)

    post_color = COL_POST_HIT if hit_stumps else COL_POST_MISS

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_idx = 0

    def draw_labeled_point(frame, pt, label, color, radius=10, filled=True):
        """Draw a labeled key point with glow ring."""
        cv2.circle(frame, pt, radius + 4, color, 2)  # outer glow
        if filled:
            cv2.circle(frame, pt, radius, color, -1)
        else:
            cv2.circle(frame, pt, radius, color, 2)
        # Label with background
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        lx, ly = pt[0] + radius + 6, pt[1] - 4
        # Keep label in frame
        if lx + tw > w - 10:
            lx = pt[0] - radius - tw - 6
        if ly - th < 10:
            ly = pt[1] + radius + th + 4
        cv2.rectangle(frame, (lx - 2, ly - th - 2), (lx + tw + 2, ly + 4), (0, 0, 0), -1)
        cv2.putText(frame, label, (lx, ly), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)

    def draw_glowing_line(frame, pts, color, thickness=2):
        """Draw a line with outer glow."""
        glow = tuple(max(0, int(c * 0.3)) for c in color)
        for j in range(1, len(pts)):
            cv2.line(frame, pts[j - 1], pts[j], glow, thickness + 4)
        for j in range(1, len(pts)):
            cv2.line(frame, pts[j - 1], pts[j], color, thickness)

    def draw_dashed_line(frame, pts, color, thickness=2, dash_len=8, gap_len=6):
        """Draw a dashed line."""
        for j in range(1, len(pts)):
            if j % (dash_len + gap_len) < dash_len:
                cv2.line(frame, pts[j - 1], pts[j], color, thickness)

    def draw_stumps(frame, alpha=0.15):
        """Draw semi-transparent stump zone."""
        ov = frame.copy()
        cv2.rectangle(ov, (stump_left, stump_top), (stump_right, ground_y), COL_STUMP, -1)
        cv2.addWeighted(ov, alpha, frame, 1 - alpha, 0, frame)
        cv2.rectangle(frame, (stump_left, stump_top), (stump_right, ground_y), COL_STUMP, 1)
        for i in range(3):
            sx = stump_left + int((stump_right - stump_left) * (i + 0.5) / 3)
            cv2.line(frame, (sx, stump_top), (sx, ground_y), COL_STUMP, 1)

    def draw_hud(frame):
        """Draw bottom HUD panel."""
        hud_h = 60
        hud_y = h - hud_h - 8
        ov = frame.copy()
        cv2.rectangle(ov, (8, hud_y), (w - 8, hud_y + hud_h), COL_HUD_BG, -1)
        cv2.addWeighted(ov, 0.75, frame, 0.25, 0, frame)
        cv2.rectangle(frame, (8, hud_y), (w - 8, hud_y + hud_h), COL_HUD_BORDER, 1)

        # Speed
        cv2.putText(frame, f"{speed_kmh:.1f}", (20, hud_y + 26),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, COL_WHITE, 2)
        cv2.putText(frame, "KM/H", (20, hud_y + 46),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.35, (150, 150, 150), 1)

        # Length
        len_x = w // 3
        cv2.putText(frame, shot_type.upper(), (len_x, hud_y + 26),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, COL_PRE, 1)
        cv2.putText(frame, "LENGTH", (len_x, hud_y + 46),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.35, (150, 150, 150), 1)

        # Verdict
        verdict = "HITTING" if hit_stumps else "MISSING"
        verdict_col = COL_POST_HIT if hit_stumps else COL_POST_MISS
        vx = w * 2 // 3
        cv2.putText(frame, verdict, (vx, hud_y + 26),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, verdict_col, 2)
        cv2.putText(frame, "STUMPS", (vx, hud_y + 46),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.35, (150, 150, 150), 1)

    # --- Main video frames ---
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        draw_stumps(frame)

        # Progress through the trail based on frame position
        progress = min(1.0, (frame_idx + 1) / max(total_frames * 0.75, 1))

        # Pre-bounce trajectory (yellow/gold)
        pre_end = max(1, int(len(smooth_pre) * min(1.0, progress / max(bounce_idx / len(ball_trail), 0.01))))
        if pre_end > 1:
            draw_glowing_line(frame, smooth_pre[:pre_end], COL_PRE, 2)

        # Post-bounce trajectory (red or green)
        if progress > bounce_idx / max(len(ball_trail), 1):
            post_progress = (progress - bounce_idx / len(ball_trail)) / max(1 - bounce_idx / len(ball_trail), 0.01)
            post_end = max(1, int(len(smooth_post) * min(1.0, post_progress)))
            if post_end > 1:
                draw_glowing_line(frame, smooth_post[:post_end], post_color, 2)

        # Ball detection dots
        dots_end = int(len(ball_trail) * progress) + 1
        for j in range(min(dots_end, len(ball_trail))):
            color = COL_PRE if j <= bounce_idx else post_color
            cv2.circle(frame, ball_trail[j], 4, color, -1)

        # Current ball position
        curr_idx = min(int(len(ball_trail) * progress), len(ball_trail) - 1)
        cv2.circle(frame, ball_trail[curr_idx], 10, COL_WHITE, -1)
        cv2.circle(frame, ball_trail[curr_idx], 12, COL_PRE if curr_idx <= bounce_idx else post_color, 2)

        # Release point label (always visible)
        if progress > 0.05:
            draw_labeled_point(frame, release_point, "RELEASE", COL_RELEASE, 8, False)

        # Pitch point label (after bounce)
        if progress > bounce_idx / max(len(ball_trail), 1):
            draw_labeled_point(frame, bounce_point, "PITCH", COL_PITCH, 9)

        # Impact point label (near end)
        if progress > 0.85:
            draw_labeled_point(frame, impact_point, "IMPACT", COL_IMPACT, 9)

        # Predicted trajectory (dashed, shown late)
        if progress > 0.7 and predicted:
            draw_dashed_line(frame, [ball_trail[-1]] + predicted, COL_PREDICTED, 2)

        draw_hud(frame)

        out.write(frame)
        frame_idx += 1

    # --- SUMMARY FREEZE (3 seconds on last frame) ---
    cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, total_frames - 1))
    ret, last_frame = cap.read()
    if not ret:
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        ret, last_frame = cap.read()

    if ret:
        for _ in range(int(fps * 3)):
            frame = last_frame.copy()

            # Darken background
            cv2.addWeighted(frame, 0.35, np.zeros_like(frame), 0.65, 0, frame)

            draw_stumps(frame, alpha=0.25)

            # Full pre-bounce trajectory
            draw_glowing_line(frame, smooth_pre, COL_PRE, 3)
            # Full post-bounce trajectory
            draw_glowing_line(frame, smooth_post, post_color, 3)
            # Predicted
            if predicted:
                draw_dashed_line(frame, [ball_trail[-1]] + predicted, COL_PREDICTED, 2)

            # All dots
            for j, pt in enumerate(ball_trail):
                color = COL_PRE if j <= bounce_idx else post_color
                cv2.circle(frame, pt, 4, color, -1)

            # Key points
            draw_labeled_point(frame, release_point, "RELEASE", COL_RELEASE, 10, False)
            draw_labeled_point(frame, bounce_point, "PITCH", COL_PITCH, 11)
            draw_labeled_point(frame, impact_point, "IMPACT", COL_IMPACT, 11)

            # Top verdict banner
            verdict = "HITTING STUMPS" if hit_stumps else "MISSING STUMPS"
            verdict_col = COL_POST_HIT if hit_stumps else COL_POST_MISS
            (tw, th), _ = cv2.getTextSize(verdict, cv2.FONT_HERSHEY_SIMPLEX, 1.0, 2)
            vx = (w - tw) // 2
            cv2.rectangle(frame, (vx - 16, 20), (vx + tw + 16, 65), (0, 0, 0), -1)
            cv2.rectangle(frame, (vx - 16, 20), (vx + tw + 16, 65), verdict_col, 2)
            cv2.putText(frame, verdict, (vx, 55), cv2.FONT_HERSHEY_SIMPLEX, 1.0, verdict_col, 2)

            # Bottom stats
            draw_hud(frame)

            # CricEye branding (small, top-right)
            cv2.putText(frame, "CRICEYE", (w - 110, 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, COL_HUD_BORDER, 1)

            out.write(frame)

    cap.release()
    out.release()

    # Re-encode to H.264 for browser playback
    if not FFMPEG_BIN:
        print("  WARNING: ffmpeg not found, output video may not play in browser")
        return output_name

    h264_name = f"{uuid.uuid4().hex}.mp4"
    h264_path = str(OUTPUT_DIR / h264_name)
    try:
        result = subprocess.run(
            [FFMPEG_BIN, "-y", "-i", output_path, "-c:v", "libx264",
             "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p",
             "-movflags", "+faststart", h264_path],
            capture_output=True, timeout=120,
        )
        if result.returncode == 0 and os.path.exists(h264_path) and os.path.getsize(h264_path) > 0:
            os.unlink(output_path)
            print(f"  Re-encoded to H.264: {h264_name}")
            return h264_name
        else:
            print(f"  ffmpeg failed: {result.stderr[:200] if result.stderr else 'unknown error'}")
            return output_name
    except Exception as e:
        print(f"  ffmpeg error: {e}")
        return output_name


def load_best_model():
    """Load the best available YOLO model — prefer new v2 trained model."""
    from ultralytics import YOLO

    # Check for our custom-trained model with ball+stump classes first
    model_dir = Path(__file__).resolve().parent
    v2_path = model_dir / "cricket_ball_v2_best.pt"
    v1_path = model_dir / "best.pt"

    # Also check the training output directory
    project_root = model_dir.parent.parent
    training_best = project_root / "cricsmart_training" / "cricket_ball_v2" / "weights" / "best.pt"
    # Check runs/ directory too (ultralytics sometimes puts results there)
    runs_best = project_root / "runs" / "detect" / "cricsmart_training" / "cricket_ball_v2" / "weights" / "best.pt"

    for path in [v2_path, training_best, runs_best]:
        if path.exists():
            print(f"  Loading custom model: {path}")
            m = YOLO(str(path))
            print(f"  Classes: {m.names}")
            return m, m.names

    if v1_path.exists():
        print(f"  Loading v1 model: {v1_path}")
        m = YOLO(str(v1_path))
        return m, m.names

    # Fallback to analysis_engine's load_model
    m = load_model()
    return m, getattr(m, 'names', {0: 'ball'})


@app.post("/analyze")
async def analyze_video(
    video: UploadFile = File(...),
    trim_start: float = Form(0.0),
    trim_end: float = Form(0.0),
):
    """Analyze a cricket video for ball tracking and return results + overlay video."""

    if not ANALYSIS_AVAILABLE:
        return {
            "speed_kmh": 132.4,
            "shot_type": "Good Length",
            "bounce_point": "5th stump line, 5.5m from stumps",
            "hit_stumps": False,
            "confidence": 78,
            "demo": True,
            "message": "YOLO model not available. Install ultralytics and ensure best.pt exists.",
        }

    # Save uploaded video to temp file
    suffix = Path(video.filename or "video.mp4").suffix
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await video.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        import cv2
        import numpy as np

        # If trimming requested, use ffmpeg to extract only the trimmed portion
        analysis_path = tmp_path
        trimmed_path = None
        if trim_end > trim_start > 0 and FFMPEG_BIN:
            trimmed_path = tmp_path + "_trimmed.mp4"
            try:
                subprocess.run(
                    [FFMPEG_BIN, "-y", "-i", tmp_path,
                     "-ss", str(trim_start), "-to", str(trim_end),
                     "-c:v", "libx264", "-preset", "ultrafast",
                     "-an", trimmed_path],
                    capture_output=True, timeout=30,
                )
                if os.path.exists(trimmed_path) and os.path.getsize(trimmed_path) > 0:
                    analysis_path = trimmed_path
            except Exception:
                pass  # Fall back to full video

        yolo_model, class_names = load_best_model()
        print(f"  Model classes: {class_names}")

        # Determine class indices
        ball_class_id = None
        stump_class_id = None
        for cid, cname in class_names.items():
            if cname.lower() == 'ball':
                ball_class_id = cid
            elif cname.lower() == 'stump':
                stump_class_id = cid
        if ball_class_id is None:
            ball_class_id = 0  # fallback

        cap = cv2.VideoCapture(analysis_path)

        if not cap.isOpened():
            return {"error": "Could not open video file"}

        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # --- Step 1: Collect ALL raw YOLO detections ---
        max_frames = min(frame_count, 300)
        raw_detections = []  # list of (frame_idx, cx, cy, confidence)
        stump_detections = []  # list of (frame_idx, x1, y1, x2, y2, conf)

        for i in range(max_frames):
            ret, frame = cap.read()
            if not ret:
                break

            results = yolo_model.predict(frame, conf=0.15, iou=0.3, verbose=False)[0]
            if results.boxes:
                for box in results.boxes:
                    cls_id = int(box.cls[0])
                    b = box.xyxy[0].cpu().numpy()
                    conf = float(box.conf[0])

                    if cls_id == ball_class_id:
                        cx = int((b[0] + b[2]) / 2)
                        cy = int((b[1] + b[3]) / 2)
                        raw_detections.append((i, cx, cy, conf))
                    elif cls_id == stump_class_id:
                        stump_detections.append((i, int(b[0]), int(b[1]), int(b[2]), int(b[3]), conf))

        cap.release()

        # --- Derive stump position from detections ---
        stump_center_x = frame_w // 2
        stump_top_y = None
        stump_bottom_y = None
        stump_detected = False

        if stump_detections:
            # Use the most confident stump detection to set position
            # Average the top-N confident stump bboxes
            stump_detections.sort(key=lambda s: s[5], reverse=True)
            top_n = stump_detections[:min(10, len(stump_detections))]
            avg_x1 = sum(s[1] for s in top_n) / len(top_n)
            avg_y1 = sum(s[2] for s in top_n) / len(top_n)
            avg_x2 = sum(s[3] for s in top_n) / len(top_n)
            avg_y2 = sum(s[4] for s in top_n) / len(top_n)
            stump_center_x = int((avg_x1 + avg_x2) / 2)
            stump_top_y = int(avg_y1)
            stump_bottom_y = int(avg_y2)
            stump_detected = True
            print(f"  Stumps detected: center_x={stump_center_x}, top={stump_top_y}, bottom={stump_bottom_y}")
        else:
            print("  No stump detections — using estimated position")

        if len(raw_detections) < 3:
            return {
                "speed_kmh": 0,
                "shot_type": "Unknown",
                "bounce_point": "No ball detected — try a clearer video",
                "hit_stumps": False,
                "confidence": 0,
                "stumps_detected": stump_detected,
            }

        # --- Step 2: Find the actual delivery sequence ---
        def find_delivery_sequence(detections, fps):
            """Find the sequence that represents the actual delivery."""
            if not detections:
                return []

            chains = []
            current_chain = [detections[0]]

            for det in detections[1:]:
                prev = current_chain[-1]
                frame_gap = det[0] - prev[0]
                dist = np.sqrt((det[1] - prev[1])**2 + (det[2] - prev[2])**2)

                if frame_gap <= 5 and dist < 80 * max(frame_gap, 1):
                    current_chain.append(det)
                else:
                    if len(current_chain) >= 3:
                        chains.append(current_chain)
                    current_chain = [det]

            if len(current_chain) >= 3:
                chains.append(current_chain)

            if not chains:
                return detections

            best_chain = None
            best_score = -1

            for chain in chains:
                pts = [(d[1], d[2]) for d in chain]
                total_disp = np.sqrt(
                    (pts[-1][0] - pts[0][0])**2 +
                    (pts[-1][1] - pts[0][1])**2
                )
                n_frames = chain[-1][0] - chain[0][0] + 1
                motion_per_frame = total_disp / max(n_frames, 1)
                duration = n_frames / fps

                if motion_per_frame < 2:
                    continue

                score = (
                    motion_per_frame * 10 +
                    len(chain) * 2 +
                    total_disp * 0.5 +
                    (1 if 0.2 < duration < 3.0 else 0) * 50
                )

                if score > best_score:
                    best_score = score
                    best_chain = chain

            return best_chain if best_chain else max(chains, key=len)

        delivery = find_delivery_sequence(raw_detections, fps)

        if len(delivery) < 3:
            return {
                "speed_kmh": 0,
                "shot_type": "Unknown",
                "bounce_point": "Could not isolate the delivery — try recording a single ball from side-on",
                "hit_stumps": False,
                "confidence": 0,
                "stumps_detected": stump_detected,
            }

        # --- Step 3: Smooth the delivery with Kalman filter ---
        tracker = BallTracker()
        ball_trail = []

        for det in delivery:
            _, cx, cy, _ = det
            tracked = tracker.update((cx, cy))
            if tracked:
                ball_trail.append(tracked)

        if len(ball_trail) < 3:
            ball_trail = [(d[1], d[2]) for d in delivery]

        # --- Ground and calibration ---
        if stump_detected and stump_bottom_y:
            ground_y = stump_bottom_y
            stump_pixel_height = stump_bottom_y - stump_top_y if stump_top_y else int(frame_h * 0.08)
            # Real stump height = 0.71m (28 inches)
            pixels_per_meter = stump_pixel_height / 0.71 if stump_pixel_height > 10 else 3.0 / frame_h
        else:
            ground_y = max(d[2] for d in delivery) + 20
            pixels_per_meter = 3.0 / frame_h

        # --- Detect key points ---
        release_idx = 0

        # Find bounce: vertical velocity inflection (dy: positive→negative)
        bounce_idx = None
        if len(ball_trail) >= 5:
            dy_values = []
            for i in range(1, len(ball_trail)):
                dy = ball_trail[i][1] - ball_trail[i - 1][1]
                dy_values.append(dy)

            smoothed_dy = []
            for i in range(len(dy_values)):
                start = max(0, i - 1)
                end = min(len(dy_values), i + 2)
                smoothed_dy.append(sum(dy_values[start:end]) / (end - start))

            for i in range(1, len(smoothed_dy)):
                if smoothed_dy[i - 1] > 0 and smoothed_dy[i] <= 0:
                    bounce_idx = i
                    break

            if bounce_idx is None:
                mid_start = len(ball_trail) // 5
                mid_end = len(ball_trail) * 4 // 5
                if mid_end > mid_start:
                    bounce_idx = mid_start + max(
                        range(mid_end - mid_start),
                        key=lambda i: ball_trail[mid_start + i][1]
                    )
                else:
                    bounce_idx = len(ball_trail) // 2

        if bounce_idx is None:
            bounce_idx = len(ball_trail) // 2

        bounce_point = ball_trail[bounce_idx]
        impact_idx = len(ball_trail) - 1

        # Speed
        speed_kmh = calculate_speed(ball_trail, pixels_per_meter, fps)

        # Shot classification
        shot_type_clean = classify_shot_relative(bounce_point, ground_y)

        # Stump margin for hit detection
        stump_margin = int(frame_w * 0.06)
        if stump_detected:
            stump_half_w = int((stump_detections[0][3] - stump_detections[0][1]) / 2) if stump_detections else stump_margin
            stump_margin = max(stump_half_w + 5, int(frame_w * 0.03))

        # Hit stumps check — using actual stump position if detected
        last_x = ball_trail[-1][0]
        last_y = ball_trail[-1][1]
        hit_stumps_x = abs(last_x - stump_center_x) < stump_margin
        # Also check if ball's Y is within stump height at impact
        if stump_detected and stump_top_y and stump_bottom_y:
            hit_stumps_y = stump_top_y <= last_y <= stump_bottom_y + 10
            hit_stumps = hit_stumps_x and hit_stumps_y
        else:
            hit_stumps = hit_stumps_x

        confidence = min(95, len(ball_trail) * 3 + 20)
        if stump_detected:
            confidence = min(98, confidence + 10)

        # --- Generate DRS-style overlay video ---
        overlay_ground_y = stump_bottom_y if stump_detected and stump_bottom_y else ground_y
        output_name = draw_ball_overlay(
            analysis_path, ball_trail, bounce_idx, hit_stumps,
            speed_kmh, shot_type_clean, stump_center_x, overlay_ground_y,
        )

        # Describe bounce location
        bounce_x_offset = bounce_point[0] - stump_center_x
        if abs(bounce_x_offset) < stump_margin:
            bounce_line = "on the stumps"
        elif bounce_x_offset < 0:
            bounce_line = "outside off stump"
        else:
            bounce_line = "outside leg stump"

        bounce_distance_m = abs(ground_y - bounce_point[1]) * pixels_per_meter
        bounce_desc = f"{bounce_line}, ~{bounce_distance_m:.1f}m from stumps"

        result = {
            "speed_kmh": round(speed_kmh, 1),
            "shot_type": shot_type_clean,
            "bounce_point": bounce_desc,
            "hit_stumps": hit_stumps,
            "confidence": confidence,
            "stumps_detected": stump_detected,
            "ball_detections": len(raw_detections),
            "stump_detections": len(stump_detections),
            "delivery_points": len(ball_trail),
            "release_point": list(ball_trail[0]) if ball_trail else None,
            "pitch_point": list(bounce_point),
            "impact_point": list(ball_trail[-1]) if ball_trail else None,
        }

        if output_name:
            base_url = os.environ.get("ML_SERVICE_BASE_URL", "http://localhost:8000")
            result["output_video_url"] = f"{base_url}/outputs/{output_name}"

        return result

    finally:
        os.unlink(tmp_path)
        if trimmed_path and os.path.exists(trimmed_path):
            os.unlink(trimmed_path)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting CricSmart Ball Tracking Service on http://0.0.0.0:{port}")
    print(f"Output videos saved to: {OUTPUT_DIR}")
    uvicorn.run(app, host="0.0.0.0", port=port)
