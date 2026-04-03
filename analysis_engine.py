import cv2
import numpy as np
from ultralytics import YOLO

# Load your custom trained YOLOv8 model
model = YOLO('data/best.pt') 

# Physical constant for MCA project calibration
STUMP_HEIGHT_METERS = 0.711 

def get_calibration_scale(frame, roi_box):
    """
    Detects stumps in the first frame to calculate Pixels Per Meter.
    Uses the stump height as a 'ruler' to calibrate the specific video perspective.
    """
    left, top, w, h = roi_box
    roi = frame[top:top+h, left:left+w]
    
    # Detect stumps (Assuming class 1 is stumps, change if your model differs)
    results = model.predict(roi, conf=0.4, verbose=False)[0]
    
    for box in results.boxes:
        cls = int(box.cls[0])
        if cls == 1: # Adjust index based on your data.yaml
            b = box.xyxy[0].cpu().numpy()
            pixel_height = b[3] - b[1]
            scale = STUMP_HEIGHT_METERS / pixel_height
            ground_y = b[3] + top # Bottom of the stump is our 'Ground Zero'
            return scale, ground_y
            
    # Fallback if stumps aren't detected
    return 0.01, (top + h)

def process_cricket_frame(frame, roi_box):
    left, top, w, h = roi_box
    roi = frame[top:top+h, left:left+w]

    # Pre-processing
    roi = cv2.resize(roi, (640, 640))
    
    # YOLO DETECTION
    results = model.predict(roi, conf=0.2, iou=0.3, verbose=False)[0]
    
    ball_pos = None
    bat_pos = None

    if results.boxes:
        for box in results.boxes:
            cls = int(box.cls[0])
            b = box.xyxy[0].cpu().numpy()
            
            # COORDINATE MAPPING: Scale ROI back to original frame size
            # 640 is the internal resize width used above
            x_scale = w / 640
            y_scale = h / 640
            
            cx = int(((b[0] + b[2]) / 2) * x_scale) + left
            cy = int(((b[1] + b[3]) / 2) * y_scale) + top
            
            if cls == 0: # Ball
                ball_pos = (cx, cy)
            elif cls == 2: # Bat (Adjust index if needed)
                bat_pos = (cx, cy)

    return ball_pos, bat_pos

def calculate_speed(prev_pos, curr_pos, time_seconds, pixels_per_meter):
    """Return speed in km/h using the dynamic calibration scale."""
    distance_pixels = np.linalg.norm(np.array(curr_pos) - np.array(prev_pos))
    distance_meters = distance_pixels * pixels_per_meter
    speed_mps = distance_meters / time_seconds
    return speed_mps * 3.6 

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
    """Classifies shot based on distance from the detected Ground Y (Stump Base)."""
    if not bounce_point:
        return "Unknown"

    bx, by = bounce_point
    # Relative distance from the ground anchor
    dist_from_ground = ground_y - by
    
    if dist_from_ground < 40:
        return "🛡️ Yorker → Play Defensive Shot"
    elif 40 <= dist_from_ground < 120:
        return "🏏 Full Length → Play Drive"
    elif 120 <= dist_from_ground < 250:
        return "⚖️ Good Length → Defensive / Straight Bat"
    else:
        return "🔥 Short Ball → Play Pull / Hook"

def analyze_ball_tracking(video_path, roi_box, track_ball, advanced, fps):
    cap = cv2.VideoCapture(video_path)
    ret, first_frame = cap.read()
    if not ret: return None
    
    # 1. DYNAMIC CALIBRATION
    pixels_per_meter, ground_y = get_calibration_scale(first_frame, roi_box)
    
    tracker = BallTracker()
    ball_trail = []
    bat_positions = []
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break

        ball_pos, bat_pos = process_cricket_frame(frame, roi_box)

        # 2. CENTROID DISTANCE FILTER: Stop the 'Spider-Web' trajectory
        if ball_pos:
            if len(ball_trail) > 0:
                dist = np.linalg.norm(np.array(ball_pos) - np.array(ball_trail[-1]))
                if dist < 150: # Ignore jumps larger than 150px (False Positives)
                    tracked_pos = tracker.update(ball_pos)
                    ball_trail.append(tracked_pos)
            else:
                ball_trail.append(ball_pos)

        if bat_pos:
            bat_positions.append(bat_pos)

    cap.release()

    if len(ball_trail) < 5:
        return ball_trail, None, None, None, {"shot_type": "No Ball Detected"}

    # 3. BOUNCE & SPEED MATH
    bounce_point = min(ball_trail, key=lambda p: p[1]) # Highest Y in CV2 is lowest point
    
    speed_kmh = calculate_speed(ball_trail[0], ball_trail[-1], len(ball_trail)/fps, pixels_per_meter)

    # 4. STUMP HIT LOGIC (Simple X-axis check)
    ball_hit_stumps = False
    if ball_trail:
        last_x = ball_trail[-1][0]
        # Adjust these X values based on where stumps are in your ROI
        if 450 < last_x < 550: 
            ball_hit_stumps = True

    stats = {
        'ball_trail_length': len(ball_trail),
        'speed_kmh': round(speed_kmh, 2),
        'shot_type': classify_shot_relative(bounce_point, ground_y),
        'hit_stumps': ball_hit_stumps
    }

    return ball_trail, bounce_point, None, None, stats
