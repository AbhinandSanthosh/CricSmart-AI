# physics_utils.py
import numpy as np

# Physical constants
STUMP_HEIGHT_METERS = 0.711
STUMP_HEIGHT_M = 0.711
PITCH_LENGTH_M = 20.12
PITCH_HALF_W_M = 1.525
STUMP_HALF_W_M = 0.11
G = 9.81
DEFAULT_FPS = 30


def get_calibration_scale(stump_box, roi_top):
    """Calculates pixels-to-meters from detected stump height. Fallback only —
    prefer compute_pitch_homography when 4 pitch corners are known."""
    if stump_box is None:
        return 0.01, (roi_top + 500)

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


def compute_pitch_homography(corners_px):
    """corners_px = [BL, BR, TR, TL] in image pixels, ordered:
       bowler-end-leg, bowler-end-off, batter-end-off, batter-end-leg.
       Returns 3x3 H mapping image pixel -> ground (X_lateral_m, Z_along_pitch_m).

       Pitch frame:
         X = lateral, -1.525 .. +1.525 (m)
         Z = along pitch, 0 (bowler) .. 20.12 (batter stump line) (m)
    """
    import cv2
    src = np.float32(corners_px)
    dst = np.float32([[-PITCH_HALF_W_M, 0.0],
                      [ PITCH_HALF_W_M, 0.0],
                      [ PITCH_HALF_W_M, PITCH_LENGTH_M],
                      [-PITCH_HALF_W_M, PITCH_LENGTH_M]])
    return cv2.getPerspectiveTransform(src, dst)


def pixel_to_pitch_coords(uv, H):
    """Project a ball pixel (u, v) to ground-plane (X_m, Z_m) using homography H."""
    u, v = float(uv[0]), float(uv[1])
    p = np.array([u, v, 1.0])
    q = H @ p
    return (q[0] / q[2], q[1] / q[2])


def predict_stump_impact(pitch_trail):
    """pitch_trail: list of (X_m, Y_m, Z_m). Returns dict with hit_stumps and impact coords.

    Math:
      - Z grows monotonically with time (ball moves down the pitch).
      - Bounce frame = argmin(Y) in the trail.
      - Post-bounce: fit parabola Y(Z) = a*Z^2 + b*Z + c. Gravity is baked in
        because Z ~ vz*t for a roughly constant vz over the short post-bounce arc,
        so the time-domain parabola Y(t) = Y0 + vy*t - 0.5*g*t^2 maps to a
        parabola in Z.
      - Post-bounce: fit linear X(Z) = m*Z + k for lateral drift.
      - Evaluate at Z = 20.12 m. Hit iff |X_stump| <= 0.11 (half stump width)
        AND 0 <= Y_stump <= 0.711 (stump height).

    Coordinate-axis note: the stump-plane test runs on (X lateral, Y height),
    NOT on (X, Z) — at the stump plane, Z is fixed at 20.12.
    """
    pts = np.asarray(pitch_trail, dtype=float)
    if len(pts) < 4:
        return {"hit_stumps": False, "reason": "not_enough_points"}

    X, Y, Z = pts[:, 0], pts[:, 1], pts[:, 2]
    bounce_idx = int(np.argmin(Y))
    post_start = bounce_idx
    if (len(pts) - post_start) < 3:
        post_start = max(0, len(pts) - 5)
    post = slice(post_start, None)

    # Need at least 3 distinct Z values for a parabola
    Z_post = Z[post]
    if len(np.unique(Z_post)) < 3:
        return {"hit_stumps": False, "reason": "insufficient_post_bounce_data"}

    cy = np.polyfit(Z_post, Y[post], 2)
    cx = np.polyfit(Z_post, X[post], 1)

    Z_stump = PITCH_LENGTH_M
    X_stump = float(np.polyval(cx, Z_stump))
    Y_stump = float(np.polyval(cy, Z_stump))

    in_lateral = abs(X_stump) <= STUMP_HALF_W_M
    in_height = 0.0 <= Y_stump <= STUMP_HEIGHT_M
    return {
        "hit_stumps": bool(in_lateral and in_height),
        "X_stump_m": X_stump,
        "Y_stump_m": Y_stump,
        "bounce_X_m": float(X[bounce_idx]),
        "bounce_Z_m": float(Z[bounce_idx]),
    }


def describe_bounce(bounce_X_m, bounce_Z_m):
    """Plain-English bounce description. No emojis, no numbers."""
    distance_to_stumps = PITCH_LENGTH_M - bounce_Z_m

    if distance_to_stumps < 2.0:
        length = "yorker length"
    elif distance_to_stumps < 4.0:
        length = "full length"
    elif distance_to_stumps < 7.0:
        length = "good length"
    else:
        length = "short of a length"

    if abs(bounce_X_m) <= STUMP_HALF_W_M:
        line = "in line with the stumps"
    elif bounce_X_m < -STUMP_HALF_W_M:
        line = "outside off stump"
    else:
        line = "outside leg stump"

    return f"Pitched on a {length}, {line}."
