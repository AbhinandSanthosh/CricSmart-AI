"""
CricSmart AI - Ball Tracking ML Service
FastAPI server that wraps the YOLO-based ball tracking pipeline.

Usage:
    pip install fastapi uvicorn python-multipart opencv-python-headless ultralytics
    python server.py
"""

import os
import sys
import tempfile
from pathlib import Path

try:
    from fastapi import FastAPI, UploadFile, File
    from fastapi.middleware.cors import CORSMiddleware
    import uvicorn
except ImportError:
    print("Install dependencies: pip install fastapi uvicorn python-multipart")
    sys.exit(1)

app = FastAPI(title="CricSmart Ball Tracking")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Try to import the existing analysis engine
ANALYSIS_AVAILABLE = False
try:
    # Add parent directory to path for existing code
    parent_dir = str(Path(__file__).resolve().parent.parent)
    sys.path.insert(0, parent_dir)
    from analysis_engine import load_model, get_calibration_scale, process_cricket_frame, BallTracker, calculate_speed, classify_shot_relative
    ANALYSIS_AVAILABLE = True
    print("Analysis engine loaded successfully")
except ImportError as e:
    print(f"Analysis engine not available: {e}")
    print("Ball tracking will use demo results")


@app.get("/health")
async def health():
    return {"status": "ok", "analysis_available": ANALYSIS_AVAILABLE}


@app.post("/analyze")
async def analyze_video(video: UploadFile = File(...)):
    """Analyze a cricket video for ball tracking."""

    if not ANALYSIS_AVAILABLE:
        # Return demo results
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

        model = load_model()
        cap = cv2.VideoCapture(tmp_path)

        if not cap.isOpened():
            return {"error": "Could not open video file"}

        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        # Get calibration from first frame
        ret, first_frame = cap.read()
        if not ret:
            return {"error": "Could not read video frames"}

        scale, ground_y = get_calibration_scale(model, first_frame)
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

        tracker = BallTracker()
        ball_trail = []
        prev_cx, prev_cy = None, None

        for i in range(min(frame_count, 300)):  # Max 300 frames
            ret, frame = cap.read()
            if not ret:
                break

            detections = process_cricket_frame(model, frame)

            for det in detections:
                if det["class"] == 0:  # Ball
                    cx = int((det["bbox"][0] + det["bbox"][2]) / 2)
                    cy = int((det["bbox"][1] + det["bbox"][3]) / 2)

                    if prev_cx is not None:
                        dist = np.sqrt((cx - prev_cx) ** 2 + (cy - prev_cy) ** 2)
                        if dist > 150:
                            continue

                    tracker.update(cx, cy)
                    ball_trail.append((cx, cy, i))
                    prev_cx, prev_cy = cx, cy

        cap.release()

        if len(ball_trail) < 2:
            return {
                "speed_kmh": 0,
                "shot_type": "Unknown",
                "bounce_point": "Not enough data",
                "hit_stumps": False,
                "confidence": 0,
            }

        speed = calculate_speed(ball_trail, scale, fps)
        shot_type = classify_shot_relative(ball_trail, ground_y)

        # Check if ball would hit stumps (x-range 450-550)
        last_x = ball_trail[-1][0]
        hit_stumps = 450 <= last_x <= 550

        return {
            "speed_kmh": round(speed, 1),
            "shot_type": shot_type,
            "bounce_point": f"Frame {ball_trail[len(ball_trail)//2][2]}",
            "hit_stumps": hit_stumps,
            "confidence": min(95, len(ball_trail) * 5),
        }

    finally:
        os.unlink(tmp_path)


if __name__ == "__main__":
    print("Starting CricSmart Ball Tracking Service on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
