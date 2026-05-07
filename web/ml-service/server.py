"""
CricSmart AI - Ball Tracking ML Service
FastAPI server that wraps the YOLO-based ball tracking pipeline.

Returns plain-language results with a homography-calibrated 3D pitch model.
Response is intentionally minimal — speed, terse hit/miss verdict, length
label (Yorker / Full Length / Good Length / Short Ball), and a one-or-two-word
shot suggestion.

Usage:
    pip install fastapi uvicorn python-multipart opencv-python-headless ultralytics
    python server.py
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def _find_ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        pass
    return shutil.which("ffmpeg")


FFMPEG_BIN = _find_ffmpeg()
print(f"ffmpeg binary: {FFMPEG_BIN or 'NOT FOUND'}")

try:
    from fastapi import FastAPI, UploadFile, File, Form, Request
    from fastapi.middleware.cors import CORSMiddleware
    import uvicorn
except ImportError:
    print("Install dependencies: pip install fastapi uvicorn python-multipart")
    sys.exit(1)

app = FastAPI(title="CricSmart Ball Tracking")

ALLOWED_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

ANALYSIS_AVAILABLE = False
try:
    parent_dir = str(Path(__file__).resolve().parent.parent.parent)
    sys.path.insert(0, parent_dir)
    from analysis_engine import (
        load_model,
        get_calibration_scale,
        process_cricket_frame,
        BallTracker,
    )
    from utils.physics_utils import (
        compute_pitch_homography,
        pixel_to_pitch_coords,
        predict_stump_impact,
        classify_length,
        shot_advice_for,
        length_desc_for,
        shot_desc_for,
        auto_detect_pitch_corners,
        fallback_hit_stumps,
        calculate_speed,
        PITCH_LENGTH_M,
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


def load_best_model():
    """Load the best available YOLO model — prefer custom-trained v2."""
    from ultralytics import YOLO

    model_dir = Path(__file__).resolve().parent
    v2_path = model_dir / "cricket_ball_v2_best.pt"
    v1_path = model_dir / "best.pt"

    project_root = model_dir.parent.parent
    training_best = project_root / "cricsmart_training" / "cricket_ball_v2" / "weights" / "best.pt"
    runs_best = project_root / "runs" / "detect" / "cricsmart_training" / "cricket_ball_v2" / "weights" / "best.pt"

    for path in [v2_path, training_best, runs_best]:
        if path.exists():
            print(f"  Loading custom model: {path}")
            m = YOLO(str(path))
            return m, m.names

    if v1_path.exists():
        print(f"  Loading v1 model: {v1_path}")
        m = YOLO(str(v1_path))
        return m, m.names

    m = load_model()
    return m, getattr(m, "names", {0: "ball"})


def find_delivery_sequence(detections, fps):
    """Find the sequence of detections that represents the actual delivery."""
    import numpy as np
    if not detections:
        return []

    chains = []
    current = [detections[0]]
    for det in detections[1:]:
        prev = current[-1]
        frame_gap = det[0] - prev[0]
        dist = np.sqrt((det[1] - prev[1]) ** 2 + (det[2] - prev[2]) ** 2)
        if frame_gap <= 5 and dist < 80 * max(frame_gap, 1):
            current.append(det)
        else:
            if len(current) >= 3:
                chains.append(current)
            current = [det]
    if len(current) >= 3:
        chains.append(current)

    if not chains:
        return detections

    best_chain = None
    best_score = -1
    for chain in chains:
        pts = [(d[1], d[2]) for d in chain]
        total_disp = np.sqrt(
            (pts[-1][0] - pts[0][0]) ** 2 + (pts[-1][1] - pts[0][1]) ** 2
        )
        n_frames = chain[-1][0] - chain[0][0] + 1
        motion_per_frame = total_disp / max(n_frames, 1)
        duration = n_frames / fps
        if motion_per_frame < 2:
            continue
        score = (
            motion_per_frame * 10
            + len(chain) * 2
            + total_disp * 0.5
            + (1 if 0.2 < duration < 3.0 else 0) * 50
        )
        if score > best_score:
            best_score = score
            best_chain = chain

    return best_chain if best_chain else max(chains, key=len)


@app.post("/analyze")
async def analyze_video(
    request: Request,
    video: UploadFile = File(...),
    trim_start: float = Form(0.0),
    trim_end: float = Form(0.0),
    pitch_corners: str = Form(""),
):
    """Analyze a cricket video. Returns a small plain-language result.

    pitch_corners: optional JSON string of 4 [x, y] pixel pairs in order
        [BL, BR, TR, TL] = bowler-end-leg, bowler-end-off,
                           batter-end-off, batter-end-leg.
        If omitted (the default), the server auto-detects pitch corners
        from YOLO stump detections.
    """
    if not ANALYSIS_AVAILABLE:
        return {
            "speed_kmh": 132,
            "hit_stumps": False,
            "verdict": "Demo",
            "length_label": "Good Length",
            "length_desc": "4-7m from stumps",
            "shot_advice": "Defend or leave",
            "shot_desc": "Soft hands, straight bat",
        }

    parsed_corners = None
    if pitch_corners:
        try:
            parsed = json.loads(pitch_corners)
            if isinstance(parsed, list) and len(parsed) == 4:
                parsed_corners = [[float(p[0]), float(p[1])] for p in parsed]
        except Exception:
            parsed_corners = None

    suffix = Path(video.filename or "video.mp4").suffix
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await video.read()
        tmp.write(content)
        tmp_path = tmp.name

    trimmed_path = None
    try:
        import cv2
        import numpy as np

        analysis_path = tmp_path
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
                pass

        yolo_model, class_names = load_best_model()

        ball_class_id = None
        stump_class_id = None
        for cid, cname in class_names.items():
            if cname.lower() == "ball":
                ball_class_id = cid
            elif cname.lower() == "stump":
                stump_class_id = cid
        if ball_class_id is None:
            ball_class_id = 0

        cap = cv2.VideoCapture(analysis_path)
        if not cap.isOpened():
            return {
                "speed_kmh": 0,
                "hit_stumps": False,
                "verdict": "Wicket missing",
                "length_label": None,
                "length_desc": None,
                "shot_advice": None,
                "shot_desc": None,
                "error": "Couldn't read the video.",
            }

        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        max_frames = min(frame_count, 600)
        raw_detections = []
        stump_detections = []
        for i in range(max_frames):
            ret, frame = cap.read()
            if not ret:
                break
            results = yolo_model.predict(frame, conf=0.10, iou=0.3, verbose=False)[0]
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
                        stump_detections.append((i, int(b[0]), int(b[1]),
                                                 int(b[2]), int(b[3]), conf))
        cap.release()

        # Stump position (used as height-scale anchor + auto-corner anchor)
        stump_top_y = None
        stump_bottom_y = None
        stump_center_x = frame_w // 2
        if stump_detections:
            sorted_dets = sorted(stump_detections, key=lambda s: s[5], reverse=True)
            top_n = sorted_dets[:min(10, len(sorted_dets))]
            avg_x1 = sum(s[1] for s in top_n) / len(top_n)
            avg_x2 = sum(s[3] for s in top_n) / len(top_n)
            avg_y1 = sum(s[2] for s in top_n) / len(top_n)
            avg_y2 = sum(s[4] for s in top_n) / len(top_n)
            stump_top_y = int(avg_y1)
            stump_bottom_y = int(avg_y2)
            stump_center_x = int((avg_x1 + avg_x2) / 2)

        if len(raw_detections) < 3:
            return {
                "speed_kmh": 0,
                "hit_stumps": False,
                "verdict": "Wicket missing",
                "length_label": None,
                "length_desc": None,
                "shot_advice": None,
                "shot_desc": None,
                "error": "Couldn't see the ball. Try a brighter, side-on clip.",
            }

        delivery = find_delivery_sequence(raw_detections, fps)
        if len(delivery) < 3:
            return {
                "speed_kmh": 0,
                "hit_stumps": False,
                "verdict": "Wicket missing",
                "length_label": None,
                "length_desc": None,
                "shot_advice": None,
                "shot_desc": None,
                "error": "Couldn't isolate one delivery. Record one ball at a time.",
            }

        tracker = BallTracker()
        ball_trail = []
        ball_trail_frames = []
        for det in delivery:
            f_idx, cx, cy, _ = det
            tracked = tracker.update((cx, cy))
            if tracked:
                ball_trail.append(tracked)
                ball_trail_frames.append(f_idx)
        if len(ball_trail) < 3:
            ball_trail = [(d[1], d[2]) for d in delivery]
            ball_trail_frames = [d[0] for d in delivery]

        # Vertical scale + ground line for height (Y) estimation
        if stump_bottom_y and stump_top_y:
            ground_y_px = stump_bottom_y
            stump_pixel_height = stump_bottom_y - stump_top_y
            pixels_per_meter = (
                STUMP_HEIGHT_METERS / stump_pixel_height
                if stump_pixel_height > 10 else 3.0 / frame_h
            )
        else:
            ground_y_px = max(d[2] for d in delivery) + 20
            pixels_per_meter = 3.0 / frame_h

        speed_kmh = calculate_speed(ball_trail, pixels_per_meter, fps)

        # Pick corner source: explicit > auto-detected > none
        corners = parsed_corners
        if corners is None:
            corners = auto_detect_pitch_corners(stump_detections, frame_w, frame_h)

        bounce_idx = 0
        if len(ball_trail) >= 3:
            bounce_idx = min(range(len(ball_trail)),
                             key=lambda i: ball_trail[i][1])

        # Compute bounce_Z_m (along-pitch distance) once, via homography if we have
        # stumps, otherwise via pixel-space scale. Same conversion either way feeds
        # classify_length so the user always sees a label.
        bounce_Z_m = None
        bounce_X_m = None

        if corners is not None:
            H = compute_pitch_homography(corners)
            pitch_trail = []
            for (u, v) in ball_trail:
                X_m, Z_m = pixel_to_pitch_coords((u, v), H)
                Y_m = max(0.0, (ground_y_px - v) * pixels_per_meter)
                pitch_trail.append((X_m, Y_m, Z_m))

            impact = predict_stump_impact(pitch_trail)
            hit_stumps = bool(impact.get("hit_stumps", False))
            if "bounce_X_m" in impact:
                bounce_X_m = impact["bounce_X_m"]
                bounce_Z_m = impact["bounce_Z_m"]
            else:
                bx, by = ball_trail[bounce_idx]
                bounce_X_m = (bx - stump_center_x) * pixels_per_meter
                bounce_Z_m = PITCH_LENGTH_M - max(0.0, (ground_y_px - by) * pixels_per_meter)
        else:
            last_x, last_y = ball_trail[-1]
            hit_stumps = fallback_hit_stumps(
                last_x, last_y, stump_center_x,
                stump_top_y, ground_y_px, pixels_per_meter
            )
            bx, by = ball_trail[bounce_idx]
            bounce_X_m = (bx - stump_center_x) * pixels_per_meter
            bounce_Z_m = PITCH_LENGTH_M - max(0.0, (ground_y_px - by) * pixels_per_meter)

        length_label = classify_length(bounce_Z_m) if bounce_Z_m is not None else None
        shot_advice = shot_advice_for(length_label) if length_label else None
        length_desc = length_desc_for(length_label) if length_label else None
        shot_desc = shot_desc_for(length_label) if length_label else None
        verdict = "Wicket hitting" if hit_stumps else "Wicket missing"

        return {
            "speed_kmh": round(speed_kmh, 1),
            "hit_stumps": hit_stumps,
            "verdict": verdict,
            "length_label": length_label,
            "length_desc": length_desc,
            "shot_advice": shot_advice,
            "shot_desc": shot_desc,
        }

    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
        if trimmed_path and os.path.exists(trimmed_path):
            try:
                os.unlink(trimmed_path)
            except Exception:
                pass


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting CricSmart Ball Tracking Service on http://0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
