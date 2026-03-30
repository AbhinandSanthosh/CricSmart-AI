import cv2
import numpy as np
from ultralytics import YOLO
from collections import deque

# Load the YOLOv8 model (Nano is fastest for live apps)
model = YOLO('yolov8n.pt') 

# Calibration: adjust this based on your camera setup
PIXELS_PER_METER = 100  # example: 100 pixels = 1 meter

def process_cricket_frame(frame, roi_box, landmarker):
    left, top, w, h = roi_box
    roi = frame[top:top+h, left:left+w]

    roi = cv2.resize(roi, (640, 640))
    roi = cv2.GaussianBlur(roi, (5,5), 0)
    roi = cv2.convertScaleAbs(roi, alpha=1.2, beta=20)
    
    # --- 1. YOLO DETECTION (Ball & Bat) ---
    # COCO Classes: 32 is 'sports ball', 34 is 'baseball bat' (good proxy for cricket bat)
    results = model.predict(roi, conf=0.1, verbose=False)[0]
    
    ball_pos = None
    bat_pos = None
    ball_depth_z = 0

    for box in results.boxes:
        cls = int(box.cls[0])
        b = box.xyxy[0].cpu().numpy()
        
        # Ball Detection & 3D Depth Logic
        if cls == 32: 
            cx = int((b[0] + b[2]) / 2) + left
            cy = int((b[1] + b[3]) / 2) + top
            ball_pos = (cx, cy)
            
            # 3D Depth Logic: Larger pixel width = closer to camera
            pixel_width = b[2] - b[0]
            ball_depth_z = round(1000 / (pixel_width + 1), 2) # Inverse relationship

        # Bat Detection
        if cls in [34]: 
            bx = int((b[0] + b[2]) / 2) + left
            by = int((b[1] + b[3]) / 2) + top
            bat_pos = (bx, by)

    return ball_pos, bat_pos, ball_depth_z

def classify_shot(hand_trail, ball_trail):
    """
    Analyzes the paths to decide the shot type.
    """
    if len(hand_trail) < 5 or len(ball_trail) < 5:
        return "Waiting for Impact...", "N/A"

    # Get the movement vectors
    start_hand = hand_trail[0]
    end_hand = hand_trail[-1]
    
    # Calculate vertical vs horizontal movement
    hand_move_y = end_hand[1] - start_hand[1]
    hand_move_x = end_hand[0] - start_hand[0]

    # --- SHOT CLASSIFICATION RULES ---
    if abs(hand_move_y) > abs(hand_move_x):
        return "Vertical Bat: Drive / Defense", "Focus on high elbow and straight follow-through."
    elif hand_move_x > 50:
        return "Horizontal Bat: Pull / Sweep", "Keep weight on the back foot and roll the wrists."
    else:
        return "Unclassified Action", "Try to make a clearer swing for the AI."

def calculate_speed(prev_pos, curr_pos, time_seconds):
    """Return speed in km/h given two pixel positions and time delta."""
    distance_pixels = np.linalg.norm(np.array(curr_pos) - np.array(prev_pos))
    distance_meters = distance_pixels / PIXELS_PER_METER
    speed_mps = distance_meters / time_seconds
    return speed_mps * 3.6  # km/h

def predict_trajectory(ball_trail, num_frames=3):
    """Predict next point using linear regression on last 'num_frames' points."""
    if len(ball_trail) < 2:
        return None
    points = np.array(ball_trail[-num_frames:])
    # Linear regression
    x = points[:, 0]
    y = points[:, 1]
    t = np.arange(len(x))
    coeff_x = np.polyfit(t, x, 1)
    coeff_y = np.polyfit(t, y, 1)
    next_t = len(x)
    pred_x = coeff_x[0] * next_t + coeff_x[1]
    pred_y = coeff_y[0] * next_t + coeff_y[1]
    return (int(pred_x), int(pred_y))

# ---------------------------
# New: Ball Tracker using Kalman Filter
# ---------------------------
class BallTracker:
    def __init__(self):
        self.kalman = cv2.KalmanFilter(4, 2)  # state: x, y, vx, vy; measurement: x, y
        self.kalman.measurementMatrix = np.array([[1,0,0,0],[0,1,0,0]], np.float32)
        self.kalman.transitionMatrix = np.array([[1,0,1,0],[0,1,0,1],[0,0,1,0],[0,0,0,1]], np.float32)
        self.kalman.processNoiseCov = np.eye(4, dtype=np.float32) * 0.1
        self.kalman.measurementNoiseCov = np.eye(2, dtype=np.float32) * 0.1
        self.initialized = False
        self.last_pos = None

    def update(self, measurement):
        if measurement is None:
            if self.initialized:
                pred = self.kalman.predict()
                return (int(pred[0]), int(pred[1]))
            else:
                return None
        if not self.initialized:
            self.kalman.statePre = np.array([measurement[0], measurement[1], 0, 0], dtype=np.float32)
            self.kalman.statePost = np.array([measurement[0], measurement[1], 0, 0], dtype=np.float32)
            self.initialized = True
            return measurement
        self.kalman.correct(np.array(measurement, dtype=np.float32))
        pred = self.kalman.predict()
        return (int(pred[0]), int(pred[1]))

# ---------------------------
# Polynomial fitting for trajectory
# ---------------------------
def fit_trajectory(points, degree=2):
    """Fit a polynomial to the ball positions (x as time, y as vertical)."""
    if len(points) < 3:
        return None
    xs = np.arange(len(points))
    ys = [p[1] for p in points]
    try:
        coeffs = np.polyfit(xs, ys, degree)
        return np.poly1d(coeffs)
    except:
        return None

def find_bounce_point(points):
    """Find the frame where the ball reaches its lowest vertical point."""
    if len(points) < 3:
        return None
    # Find local minimum in y
    min_index = np.argmin([p[1] for p in points])
    # Could refine by looking for change in direction
    return points[min_index], min_index

# ---------------------------
# Physics prediction after bounce
# ---------------------------
def predict_after_bounce(bounce_point, velocity, gravity=9.8, restitution=0.6, pixels_per_meter=PIXELS_PER_METER, fps=30):
    """Given bounce point and velocity (in pixels/frame), predict future positions."""
    # Convert velocity to m/s
    vx = velocity[0] / pixels_per_meter * fps
    vy = velocity[1] / pixels_per_meter * fps
    # After bounce, reverse vertical velocity with restitution
    vy = -vy * restitution
    # Time step (in seconds) per frame
    dt = 1.0 / fps
    # Simulate for N frames (say 2 seconds)
    points = []
    x, y = bounce_point[0], bounce_point[1]
    for t in range(int(2 / dt)):
        y = bounce_point[1] + vy * t*dt - 0.5*gravity * (t*dt)**2
        x = bounce_point[0] + vx * t*dt
        if y > bounce_point[1] + 100:  # stop after falling too far
            break
        points.append((int(x), int(y)))
    return points

# ---------------------------
# Main analysis function
# ---------------------------
def analyze_ball_tracking(video_path, roi_box, track_ball, advanced, fps, frame_skip=1):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None, None, None, None, None

    left, top, w, h = roi_box
    tracker = BallTracker()
    ball_trail = []
    bat_positions = []
    frame_count = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1
        if frame_count % frame_skip != 0:
            continue

        ball_pos, bat_pos, _ = process_cricket_frame(frame, (left, top, w, h), None)

        tracked_pos = tracker.update(ball_pos)
        if tracked_pos is not None:
            ball_trail.append(tracked_pos)

        if bat_pos:
            bat_positions.append(bat_pos)

    cap.release()

    if len(ball_trail) < 5:
        return ball_trail, None, None, None, None

    # Bounce detection
    bounce_point, bounce_idx = find_bounce_point(ball_trail)
    if bounce_idx is None or bounce_idx == 0 or bounce_idx == len(ball_trail)-1:
        bounce_point = None

    # Bat impact detection
    bat_impact = None
    if bat_positions and ball_trail:
        for ball in ball_trail:
            for bat in bat_positions:
                dist = np.linalg.norm(np.array(ball) - np.array(bat))
                if dist < 100:
                    bat_impact = bat
                    break
            if bat_impact:
                break

    # Prediction
    predicted_path = []
    if advanced and bounce_point is not None and bounce_idx < len(ball_trail)-1:
        if bounce_idx > 1:
            vx = ball_trail[bounce_idx][0] - ball_trail[bounce_idx-1][0]
            vy = ball_trail[bounce_idx][1] - ball_trail[bounce_idx-1][1]
            predicted_path = predict_after_bounce(bounce_point, (vx, vy), fps=fps)

    stats = {
        'bounce_index': int(bounce_idx) if bounce_idx is not None else None,
        'ball_trail_length': len(ball_trail),
        'bat_impacts': len(bat_positions)
    }

    return ball_trail, bounce_point, bat_impact, predicted_path, stats
