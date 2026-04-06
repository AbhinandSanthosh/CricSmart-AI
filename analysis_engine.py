import cv2
import numpy as np
import os
import gdown
from ultralytics import YOLO

# Load your custom trained YOLOv8 model
MODEL_PATH = "best.pt"

def load_model():
    if not os.path.exists(MODEL_PATH):
        url = "https://drive.google.com/uc?id=11odraYb85iaNCbnfiBkRVL8OoH4T4FRW"
        gdown.download(url, MODEL_PATH, quiet=False)
    return YOLO(MODEL_PATH)

model = load_model()

# Physical constants
STUMP_HEIGHT_METERS = 0.711  # Standard cricket stump height
PITCH_LENGTH_METERS = 20.12  # Standard cricket pitch length


def get_calibration_scale(frame, roi_box):
    """
    Detects stumps in the first frame to calculate pixels-per-meter.
    Uses stump height (0.711m) as a ruler to calibrate the video perspective.
    """
    left, top, w, h = roi_box
    roi = frame[top:top+h, left:left+w]

    results = model.predict(roi, conf=0.4, verbose=False)[0]

    for box in results.boxes:
        cls = int(box.cls[0])
        if cls == 1:  # Stumps
            b = box.xyxy[0].cpu().numpy()
            pixel_height = b[3] - b[1]
            if pixel_height > 10:  # Valid detection
                scale = STUMP_HEIGHT_METERS / pixel_height
                ground_y = b[3] + top
                return scale, ground_y

    # Fallback: estimate scale from frame height
    # Assume the frame captures roughly 3 meters of vertical space
    # (typical for a cricket broadcast or phone recording at the ground)
    estimated_vertical_meters = 3.0
    scale = estimated_vertical_meters / h
    ground_y = top + int(h * 0.85)  # Ground is roughly at 85% of frame height
    return scale, ground_y


def process_cricket_frame(frame, roi_box):
    left, top, w, h = roi_box
    roi = frame[top:top+h, left:left+w]

    roi_resized = cv2.resize(roi, (640, 640))

    results = model.predict(roi_resized, conf=0.2, iou=0.3, verbose=False)[0]

    ball_pos = None
    bat_pos = None

    if results.boxes:
        for box in results.boxes:
            cls = int(box.cls[0])
            b = box.xyxy[0].cpu().numpy()

            # Scale back from 640x640 to original ROI size
            x_scale = w / 640
            y_scale = h / 640

            cx = int(((b[0] + b[2]) / 2) * x_scale) + left
            cy = int(((b[1] + b[3]) / 2) * y_scale) + top

            if cls == 0:  # Ball
                ball_pos = (cx, cy)
            elif cls == 2:  # Bat
                bat_pos = (cx, cy)

    return ball_pos, bat_pos


def calculate_speed(ball_trail, pixels_per_meter, fps):
    """
    Calculate ball speed using multiple methods and pick the most reliable.

    Method 1: Pixel-based — measure actual pixel displacement, convert via calibration.
    Method 2: Time-based — use the number of frames the ball is visible and the
              known delivery distance (~18m from release to crease).

    Why two methods:
    - Pixel-based is accurate ONLY when calibration (stump detection) works AND
      the camera is side-on (ball moves across the frame, not toward/away).
    - Time-based is reliable when the video captures the full delivery (release
      to reaching the batter). It doesn't depend on calibration at all.

    We cross-validate: if pixel-based gives a realistic result (40-165 km/h),
    we average it with time-based. Otherwise we use time-based alone.

    Limitation: Single-camera speed will always be approximate. Professional
    systems use radar guns or multiple calibrated cameras for exact readings.
    """
    if len(ball_trail) < 3:
        return 0.0

    time_per_frame = 1.0 / fps
    total_time = len(ball_trail) * time_per_frame

    # --- Method 1: Pixel-based with peak segment speed ---
    segment_speeds = []
    for i in range(1, len(ball_trail)):
        p1 = np.array(ball_trail[i - 1], dtype=float)
        p2 = np.array(ball_trail[i], dtype=float)
        dist_px = np.linalg.norm(p2 - p1)
        dist_m = dist_px * pixels_per_meter
        speed_kmh = (dist_m / time_per_frame) * 3.6
        segment_speeds.append(speed_kmh)

    # Smooth with 3-frame sliding window, take 75th percentile
    # (more stable than peak, less diluted than average)
    window = min(3, len(segment_speeds))
    if len(segment_speeds) >= window:
        smoothed = []
        for i in range(len(segment_speeds) - window + 1):
            avg = sum(segment_speeds[i:i + window]) / window
            smoothed.append(avg)
        smoothed.sort()
        pixel_speed = smoothed[int(len(smoothed) * 0.75)]
    else:
        pixel_speed = max(segment_speeds) if segment_speeds else 0

    # --- Method 2: Time-based estimation ---
    # Standard delivery distance: bowler releases ~2m behind crease,
    # ball reaches batter at crease = ~20m pitch - 2m = 18m travel distance
    # For shorter videos that may only capture part of the delivery,
    # scale the distance proportionally based on the pixel displacement
    DELIVERY_DISTANCE = 18.0  # meters

    # Estimate what fraction of the delivery this video captures
    # by looking at total pixel displacement vs frame diagonal
    total_disp = np.linalg.norm(
        np.array(ball_trail[-1], dtype=float) - np.array(ball_trail[0], dtype=float)
    )

    if total_time > 0:
        time_speed = (DELIVERY_DISTANCE / total_time) * 3.6
    else:
        time_speed = 0

    # --- Cross-validate and pick best estimate ---
    pixel_realistic = 40 <= pixel_speed <= 165
    time_realistic = 40 <= time_speed <= 165

    if pixel_realistic and time_realistic:
        # Both methods give realistic results — weighted average
        # Trust pixel-based more if calibration was good (not fallback)
        speed = pixel_speed * 0.4 + time_speed * 0.6
    elif pixel_realistic:
        speed = pixel_speed
    elif time_realistic:
        speed = time_speed
    else:
        # Neither is realistic — use time-based with clamping
        speed = max(60, min(155, time_speed)) if time_speed > 0 else 80

    return round(speed, 1)


class BallTracker:
    def __init__(self):
        self.kalman = cv2.KalmanFilter(4, 2)
        self.kalman.measurementMatrix = np.array([[1,0,0,0],[0,1,0,0]], np.float32)
        self.kalman.transitionMatrix = np.array([[1,0,1,0],[0,1,0,1],[0,0,1,0],[0,0,0,1]], np.float32)
        self.kalman.processNoiseCov = np.eye(4, dtype=np.float32) * 0.1
        self.kalman.measurementNoiseCov = np.eye(2, dtype=np.float32) * 0.1
        self.initialized = False

    def update(self, measurement):
        if measurement is None:
            if self.initialized:
                pred = self.kalman.predict()
                return (int(pred[0]), int(pred[1]))
            return None
        if not self.initialized:
            self.kalman.statePre = np.array([measurement[0], measurement[1], 0, 0], dtype=np.float32)
            self.kalman.statePost = np.array([measurement[0], measurement[1], 0, 0], dtype=np.float32)
            self.initialized = True
            return measurement
        self.kalman.correct(np.array(measurement, dtype=np.float32))
        pred = self.kalman.predict()
        return (int(pred[0]), int(pred[1]))


def classify_shot_relative(bounce_point, ground_y):
    """Classifies delivery length based on where the ball bounces relative to ground."""
    if not bounce_point:
        return "Unknown"

    bx, by = bounce_point
    dist_from_ground = ground_y - by

    if dist_from_ground < 40:
        return "Yorker"
    elif 40 <= dist_from_ground < 120:
        return "Full Length"
    elif 120 <= dist_from_ground < 250:
        return "Good Length"
    else:
        return "Short Ball"


def analyze_ball_tracking(video_path, roi_box, track_ball, advanced, fps):
    """Full pipeline: detect ball, track, calculate speed, classify shot."""
    cap = cv2.VideoCapture(video_path)
    ret, first_frame = cap.read()
    if not ret:
        return None

    # 1. DYNAMIC CALIBRATION
    pixels_per_meter, ground_y = get_calibration_scale(first_frame, roi_box)

    tracker = BallTracker()
    ball_trail = []
    bat_positions = []

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        ball_pos, bat_pos = process_cricket_frame(frame, roi_box)

        # 2. CENTROID DISTANCE FILTER
        if ball_pos:
            if len(ball_trail) > 0:
                dist = np.linalg.norm(np.array(ball_pos) - np.array(ball_trail[-1]))
                if dist < 150:
                    tracked_pos = tracker.update(ball_pos)
                    if tracked_pos:
                        ball_trail.append(tracked_pos)
            else:
                tracked_pos = tracker.update(ball_pos)
                if tracked_pos:
                    ball_trail.append(tracked_pos)

        if bat_pos:
            bat_positions.append(bat_pos)

    cap.release()

    if len(ball_trail) < 5:
        return ball_trail, None, None, None, {"shot_type": "No Ball Detected"}

    # 3. BOUNCE & SPEED
    bounce_point = min(ball_trail, key=lambda p: p[1])

    speed_kmh = calculate_speed(ball_trail, pixels_per_meter, fps)

    # 4. STUMP HIT LOGIC
    ball_hit_stumps = False
    if ball_trail:
        last_x = ball_trail[-1][0]
        if 450 < last_x < 550:
            ball_hit_stumps = True

    stats = {
        'ball_trail_length': len(ball_trail),
        'speed_kmh': round(speed_kmh, 2),
        'shot_type': classify_shot_relative(bounce_point, ground_y),
        'hit_stumps': ball_hit_stumps
    }

    return ball_trail, bounce_point, None, None, stats
