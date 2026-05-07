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
    """Calculates pixels-to-meters from detected stump height. Fallback only -
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
    NOT on (X, Z) - at the stump plane, Z is fixed at 20.12.
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


def classify_length(bounce_Z_m):
    """Returns one of: 'Yorker', 'Full Length', 'Good Length', 'Short Ball'.
    Based on distance from the batter-end stump line (Z = 20.12 m)."""
    distance_to_stumps = PITCH_LENGTH_M - bounce_Z_m
    if distance_to_stumps < 2.0:
        return "Yorker"
    if distance_to_stumps < 4.0:
        return "Full Length"
    if distance_to_stumps < 7.0:
        return "Good Length"
    return "Short Ball"


# Terse one-or-two-word advice for each delivery length.
SHOT_ADVICE = {
    "Yorker": "Block or flick",
    "Full Length": "Drive",
    "Good Length": "Defend or leave",
    "Short Ball": "Pull or duck",
}

# Short subtitle describing where the ball pitched (renders under the Length card).
LENGTH_DESC = {
    "Yorker": "At the crease",
    "Full Length": "2-4m from stumps",
    "Good Length": "4-7m from stumps",
    "Short Ball": "7m+ from stumps",
}

# Short subtitle describing how to play the suggested shot.
SHOT_DESC = {
    "Yorker": "Jam down quickly, soft hands",
    "Full Length": "Front foot, swing through line",
    "Good Length": "Soft hands, straight bat",
    "Short Ball": "Watch ball, decide early",
}


def shot_advice_for(length_label):
    return SHOT_ADVICE.get(length_label, "")


def length_desc_for(length_label):
    return LENGTH_DESC.get(length_label, "")


def shot_desc_for(length_label):
    return SHOT_DESC.get(length_label, "")


def describe_bounce(bounce_X_m, bounce_Z_m):
    """Plain-English bounce description. No emojis, no numbers."""
    length = classify_length(bounce_Z_m).lower()
    # match prior pattern wording
    if length == "yorker":
        length = "yorker length"
    elif length == "short ball":
        length = "short of a length"
    elif length == "full length":
        length = "full length"
    elif length == "good length":
        length = "good length"

    if abs(bounce_X_m) <= STUMP_HALF_W_M:
        line = "in line with the stumps"
    elif bounce_X_m < -STUMP_HALF_W_M:
        line = "outside off stump"
    else:
        line = "outside leg stump"

    return f"Pitched on a {length}, {line}."


def auto_detect_pitch_corners(stump_detections, frame_w, frame_h):
    """Heuristic pitch-corner derivation from YOLO stump detections.

    Returns [BL, BR, TR, TL] pixel coords, ordered:
      bowler-end-leg, bowler-end-off, batter-end-off, batter-end-leg.
    Returns None if no stump detections (caller should fall back to
    pixel-space heuristics).

    Geometry assumptions:
      - Camera positioned roughly behind the bowler (most common amateur view)
        with the batter's stumps visible in the lower portion of the frame.
      - Pitch surface tapers toward the bowler end due to perspective.
      - Pitch is 3.05 m wide; each stump set spans 0.22 m, so half the pitch
        width is ~6.93 stump-widths.
      - Bowler-end appearance is ~32% as wide as batter-end on a typical
        amateur side-on / behind-bowler shot (perspective compression).

    stump_detections: list of (frame_idx, x1, y1, x2, y2, conf) tuples.
    """
    if not stump_detections:
        return None

    sorted_dets = sorted(stump_detections, key=lambda s: s[5], reverse=True)
    top = sorted_dets[: min(8, len(sorted_dets))]
    avg_x1 = sum(s[1] for s in top) / len(top)
    avg_x2 = sum(s[3] for s in top) / len(top)
    avg_y2 = sum(s[4] for s in top) / len(top)

    stump_center_x = (avg_x1 + avg_x2) / 2
    stump_pixel_width = max(avg_x2 - avg_x1, 8.0)
    stump_bottom_y = avg_y2

    half_pitch_at_batter_px = 6.93 * stump_pixel_width
    perspective_factor = 0.32
    half_pitch_at_bowler_px = half_pitch_at_batter_px * perspective_factor

    bowler_end_y = max(int(frame_h * 0.05),
                       int(stump_bottom_y - frame_h * 0.65))

    BL = [stump_center_x - half_pitch_at_bowler_px, float(bowler_end_y)]
    BR = [stump_center_x + half_pitch_at_bowler_px, float(bowler_end_y)]
    TR = [stump_center_x + half_pitch_at_batter_px, float(stump_bottom_y)]
    TL = [stump_center_x - half_pitch_at_batter_px, float(stump_bottom_y)]
    return [BL, BR, TR, TL]


def fallback_hit_stumps(last_x_px, last_y_px, stump_center_x,
                        stump_top_y, ground_y_px, meters_per_pixel):
    """Pixel-space LBW check when no homography is available.

    Uses the detected stump bbox + meters_per_pixel scale to decide whether
    the last detected ball position falls within the stump area in real
    meters (0.22 m wide × 0.711 m tall). Better than a hardcoded pixel range
    because it scales with detected stump size.
    """
    lateral_offset_m = abs(last_x_px - stump_center_x) * meters_per_pixel
    in_lateral = lateral_offset_m <= STUMP_HALF_W_M
    if stump_top_y is not None and ground_y_px is not None:
        in_height = stump_top_y - 5 <= last_y_px <= ground_y_px + 5
    else:
        in_height = True
    return bool(in_lateral and in_height)


def fallback_bounce_text(bounce_x_px, bounce_y_px, stump_center_x,
                         ground_y_px, meters_per_pixel):
    """Pixel-space bounce description when homography isn't available.
    Reuses describe_bounce with pixel→meter conversions.
    """
    distance_from_stumps_m = max(0.0, (ground_y_px - bounce_y_px) * meters_per_pixel)
    bounce_Z_m = PITCH_LENGTH_M - distance_from_stumps_m
    bounce_X_m = (bounce_x_px - stump_center_x) * meters_per_pixel
    return describe_bounce(bounce_X_m, bounce_Z_m)
