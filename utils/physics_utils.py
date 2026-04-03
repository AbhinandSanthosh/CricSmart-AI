# physics_utils.py
import numpy as np

# Global Constants for the Project
STUMP_HEIGHT_METERS = 0.711 
DEFAULT_FPS = 30

def get_calibration_scale(stump_box, roi_top):
    """Calculates pixels-to-meters based on detected stump height."""
    if stump_box is None:
        return 0.01, (roi_top + 500) # Fallback
    
    x1, y1, x2, y2 = stump_box
    pixel_height = y2 - y1
    scale = STUMP_HEIGHT_METERS / pixel_height
    ground_y = y2 + roi_top 
    return scale, ground_y

def calculate_speed(ball_trail, px_to_meter, fps=DEFAULT_FPS):
    """Returns speed in km/h using the dynamic scale."""
    if len(ball_trail) < 10:
        return 0.0
    
    p1, p2 = ball_trail[0], ball_trail[-1]
    dist_px = np.linalg.norm(np.array(p1) - np.array(p2))
    dist_m = dist_px * px_to_meter
    time_s = len(ball_trail) / float(fps)
    
    speed_mps = dist_m / time_s
    return speed_mps * 3.6

def classify_shot_relative(bounce_point, ground_y):
    """Classifies length based on distance from the ground anchor."""
    if not bounce_point:
        return "Unknown"

    bx, by = bounce_point
    dist_from_ground = ground_y - by # Relative distance
    
    if dist_from_ground < 40:
        return "🛡️ Yorker → Play Defensive Shot"
    elif 40 <= dist_from_ground < 120:
        return "🏏 Full Length → Play Drive"
    elif 120 <= dist_from_ground < 250:
        return "⚖️ Good Length → Defensive / Straight Bat"
    else:
        return "🔥 Short Ball → Play Pull / Hook"