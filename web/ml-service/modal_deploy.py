"""
CricSmart AI - Ball Tracking ML Service (Modal Deployment)

Deploy to Modal (free GPU, serverless):
    1. pip install modal
    2. modal setup        (one-time auth)
    3. modal deploy modal_deploy.py

Your endpoint will be: https://YOUR_USERNAME--cricsmart-ml-service.modal.run

Set this as NEXT_PUBLIC_ML_SERVICE_URL on Vercel.
"""

import modal

# --- Modal App & Image ---
app = modal.App("cricsmart-ml-service")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "libgl1", "libglib2.0-0")
    .pip_install(
        "fastapi>=0.100.0",
        "uvicorn>=0.23.0",
        "python-multipart>=0.0.6",
        "opencv-python-headless>=4.9.0",
        "numpy>=1.24.0",
        "ultralytics>=8.0.0",
        "gdown>=4.7.0",
        "imageio-ffmpeg>=0.4.9",
    )
)

# --- Volume for model weights (persists across cold starts) ---
model_volume = modal.Volume.from_name("cricsmart-models", create_if_missing=True)

# --- The web endpoint ---
@app.function(
    image=image,
    gpu="T4",                   # Free-tier GPU — great for YOLO inference
    timeout=300,                # 5 min max per request
    volumes={"/models": model_volume},
)
@modal.concurrent(max_inputs=5)
@modal.asgi_app()
def serve():
    """Serve the FastAPI ball tracking API on Modal."""
    import os
    import sys
    import shutil
    import subprocess
    import tempfile
    import uuid
    from pathlib import Path

    from fastapi import FastAPI, UploadFile, File, Form
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import FileResponse

    # --- Setup ---
    OUTPUT_DIR = Path(tempfile.gettempdir()) / "cricsmart_outputs"
    OUTPUT_DIR.mkdir(exist_ok=True)

    api = FastAPI(title="CricSmart Ball Tracking (Modal)")

    api.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Model loading ---
    MODEL_PATH = Path("/models/best.pt")

    def ensure_model():
        """Download the YOLO model if not cached in the volume."""
        if MODEL_PATH.exists():
            return
        print("Downloading YOLO model...")
        import gdown
        gdown.download(
            "https://drive.google.com/uc?id=11odraYb85iaNCbnfiBkRVL8OoH4T4FRW",
            str(MODEL_PATH), quiet=False,
        )
        model_volume.commit()
        print("Model downloaded and cached.")

    ensure_model()

    from ultralytics import YOLO
    import cv2
    import numpy as np

    yolo_model = YOLO(str(MODEL_PATH))
    print(f"YOLO model loaded. Classes: {yolo_model.names}")

    STUMP_HEIGHT_METERS = 0.711

    # --- Helper: BallTracker (Kalman filter) ---
    class BallTracker:
        def __init__(self):
            self.kalman = cv2.KalmanFilter(4, 2)
            self.kalman.measurementMatrix = np.array([[1,0,0,0],[0,1,0,0]], np.float32)
            self.kalman.transitionMatrix = np.array([[1,0,1,0],[0,1,0,1],[0,0,1,0],[0,0,0,1]], np.float32)
            self.kalman.processNoiseCov = np.eye(4, dtype=np.float32) * 0.03
            self.kalman.measurementNoiseCov = np.eye(2, dtype=np.float32) * 0.5
            self.initialized = False
            self.last_pos = None

        def update(self, pos):
            if pos is None:
                if self.initialized:
                    pred = self.kalman.predict()
                    return (int(pred[0]), int(pred[1]))
                return None
            measurement = np.array([[np.float32(pos[0])], [np.float32(pos[1])]])
            if not self.initialized:
                self.kalman.statePre = np.array([[pos[0]], [pos[1]], [0], [0]], np.float32)
                self.initialized = True
            self.kalman.correct(measurement)
            pred = self.kalman.predict()
            self.last_pos = (int(pred.flat[0]), int(pred.flat[1]))
            return self.last_pos

    def calculate_speed(ball_trail, px_to_meter, fps=30):
        if len(ball_trail) < 5:
            return 0.0
        speeds = []
        for i in range(1, len(ball_trail)):
            dx = ball_trail[i][0] - ball_trail[i-1][0]
            dy = ball_trail[i][1] - ball_trail[i-1][1]
            dist_px = np.sqrt(dx**2 + dy**2)
            dist_m = dist_px * px_to_meter
            speed_ms = dist_m * fps
            speeds.append(speed_ms * 3.6)
        speeds.sort()
        trim = max(1, len(speeds)//5)
        return np.mean(speeds[trim:-trim]) if len(speeds) > 2*trim else np.mean(speeds)

    def classify_shot(bounce_point, ground_y):
        if not bounce_point:
            return "Unknown"
        dist = ground_y - bounce_point[1]
        if dist < 40: return "Yorker"
        elif dist < 120: return "Full Length"
        elif dist < 250: return "Good Length"
        else: return "Short Ball"

    # --- Routes ---
    @api.get("/health")
    async def health():
        return {"status": "ok", "gpu": True, "model": str(MODEL_PATH)}

    @api.get("/outputs/{filename}")
    async def get_output(filename: str):
        path = OUTPUT_DIR / filename
        if path.exists():
            return FileResponse(str(path), media_type="video/mp4")
        return {"error": "not found"}

    @api.post("/analyze")
    async def analyze_video(
        video: UploadFile = File(...),
        trim_start: float = Form(0.0),
        trim_end: float = Form(0.0),
    ):
        suffix = Path(video.filename or "video.mp4").suffix
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            content = await video.read()
            tmp.write(content)
            tmp_path = tmp.name

        try:
            analysis_path = tmp_path

            # Trim if requested
            if trim_end > trim_start > 0:
                trimmed = tmp_path + "_trimmed.mp4"
                try:
                    subprocess.run(
                        ["ffmpeg", "-y", "-i", tmp_path, "-ss", str(trim_start),
                         "-to", str(trim_end), "-c:v", "libx264", "-preset", "ultrafast",
                         "-an", trimmed],
                        capture_output=True, timeout=30,
                    )
                    if os.path.exists(trimmed) and os.path.getsize(trimmed) > 0:
                        analysis_path = trimmed
                except Exception:
                    pass

            cap = cv2.VideoCapture(analysis_path)
            if not cap.isOpened():
                return {"error": "Could not open video"}

            fps = cap.get(cv2.CAP_PROP_FPS) or 30
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            # Detect balls and stumps
            max_frames = min(frame_count, 300)
            raw_detections = []
            stump_detections = []
            ball_cls = 0
            stump_cls = None

            for cid, name in yolo_model.names.items():
                if name.lower() == "ball": ball_cls = cid
                elif name.lower() == "stump": stump_cls = cid

            for i in range(max_frames):
                ret, frame = cap.read()
                if not ret: break
                results = yolo_model.predict(frame, conf=0.15, iou=0.3, verbose=False)[0]
                if results.boxes:
                    for box in results.boxes:
                        cls_id = int(box.cls[0])
                        b = box.xyxy[0].cpu().numpy()
                        conf = float(box.conf[0])
                        if cls_id == ball_cls:
                            cx, cy = int((b[0]+b[2])/2), int((b[1]+b[3])/2)
                            raw_detections.append((i, cx, cy, conf))
                        elif cls_id == stump_cls:
                            stump_detections.append((i, int(b[0]), int(b[1]), int(b[2]), int(b[3]), conf))
            cap.release()

            # Stump calibration
            stump_center_x = frame_w // 2
            stump_detected = False
            ground_y = frame_h - 50
            pixels_per_meter = 3.0 / frame_h

            if stump_detections:
                stump_detections.sort(key=lambda s: s[5], reverse=True)
                top_n = stump_detections[:min(10, len(stump_detections))]
                stump_center_x = int(sum((s[1]+s[3])/2 for s in top_n) / len(top_n))
                stump_top = int(sum(s[2] for s in top_n) / len(top_n))
                stump_bottom = int(sum(s[4] for s in top_n) / len(top_n))
                ground_y = stump_bottom
                px_h = stump_bottom - stump_top
                if px_h > 10:
                    pixels_per_meter = 0.711 / px_h
                stump_detected = True

            if len(raw_detections) < 3:
                return {
                    "speed_kmh": 0, "shot_type": "Unknown",
                    "bounce_point": "No ball detected — try a clearer video",
                    "hit_stumps": False, "confidence": 0,
                    "stumps_detected": stump_detected,
                }

            # Find delivery sequence
            chains = []
            current = [raw_detections[0]]
            for det in raw_detections[1:]:
                prev = current[-1]
                gap = det[0] - prev[0]
                dist = np.sqrt((det[1]-prev[1])**2 + (det[2]-prev[2])**2)
                if gap <= 5 and dist < 80 * max(gap, 1):
                    current.append(det)
                else:
                    if len(current) >= 3: chains.append(current)
                    current = [det]
            if len(current) >= 3: chains.append(current)

            delivery = max(chains, key=len) if chains else raw_detections

            # Kalman smooth
            tracker = BallTracker()
            ball_trail = []
            for d in delivery:
                t = tracker.update((float(d.flat[1]), float(d.flat[2])))
                if t: ball_trail.append(t)
            if len(ball_trail) < 3:
                ball_trail = [(d[1], d[2]) for d in delivery]

            # Bounce detection
            bounce_idx = len(ball_trail) // 2
            if len(ball_trail) >= 5:
                dy = [ball_trail[i][1] - ball_trail[i-1][1] for i in range(1, len(ball_trail))]
                for i in range(1, len(dy)):
                    if dy[i-1] > 0 and dy[i] <= 0:
                        bounce_idx = i
                        break

            speed = calculate_speed(ball_trail, pixels_per_meter, fps)
            shot_type = classify_shot(ball_trail[bounce_idx], ground_y)

            stump_margin = int(frame_w * 0.06)
            last_x = ball_trail[-1][0]
            hit_stumps = abs(last_x - stump_center_x) < stump_margin

            confidence = min(95, len(ball_trail) * 3 + 20)
            if stump_detected: confidence = min(98, confidence + 10)

            return {
                "speed_kmh": round(speed, 1),
                "shot_type": shot_type,
                "bounce_point": f"~{abs(ground_y - ball_trail[bounce_idx][1]) * pixels_per_meter:.1f}m from stumps",
                "hit_stumps": hit_stumps,
                "confidence": confidence,
                "stumps_detected": stump_detected,
                "ball_detections": len(raw_detections),
                "stump_detections": len(stump_detections),
                "delivery_points": len(ball_trail),
                "release_point": list(ball_trail[0]),
                "pitch_point": list(ball_trail[bounce_idx]),
                "impact_point": list(ball_trail[-1]),
            }
        finally:
            os.unlink(tmp_path)

    return api
