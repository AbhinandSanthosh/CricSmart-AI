from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

# BlazePose 33 landmark indices (same as used by MediaPipe Pose/Tasks)
NOSE = 0
LEFT_SHOULDER = 11
RIGHT_SHOULDER = 12
LEFT_FOOT = 31
RIGHT_FOOT = 32
LEFT_HIP = 23
RIGHT_HIP = 24
LEFT_KNEE = 25
RIGHT_KNEE = 26
LEFT_ANKLE = 27
RIGHT_ANKLE = 28


# Pre-defined "Perfect Technical Stance" template.
#
# NOTE:
# - Coordinates are normalized in an arbitrary side-view reference frame.
# - We later normalize/translate/scale both template + user landmarks before computing similarity/ratios.
# - Template indices must match BlazePose 33:
#   - shoulders: 11 (L_SHOULDER), 12 (R_SHOULDER)
#   - elbows: 13/14, wrists: 15/16
#   - hips: 23/24, knees: 25/26, ankles: 27/28
#   - feet: 31 (L_FOOT), 32 (R_FOOT)
PRO_TEMPLATE_LANDMARKS = np.full((33, 2), np.nan, dtype=np.float32)

# Core references (front foot is the RIGHT foot in this template).
PRO_TEMPLATE_LANDMARKS[NOSE] = [0.52, 0.18]
PRO_TEMPLATE_LANDMARKS[2] = [0.48, 0.16]  # LEFT_EYE
PRO_TEMPLATE_LANDMARKS[5] = [0.56, 0.16]  # RIGHT_EYE

PRO_TEMPLATE_LANDMARKS[LEFT_SHOULDER] = [0.44, 0.48]
PRO_TEMPLATE_LANDMARKS[RIGHT_SHOULDER] = [0.60, 0.48]

PRO_TEMPLATE_LANDMARKS[13] = [0.36, 0.53]  # LEFT_ELBOW
PRO_TEMPLATE_LANDMARKS[14] = [0.66, 0.53]  # RIGHT_ELBOW

PRO_TEMPLATE_LANDMARKS[15] = [0.35, 0.62]  # LEFT_WRIST
PRO_TEMPLATE_LANDMARKS[16] = [0.67, 0.62]  # RIGHT_WRIST

PRO_TEMPLATE_LANDMARKS[LEFT_HIP] = [0.41, 0.69]
PRO_TEMPLATE_LANDMARKS[RIGHT_HIP] = [0.63, 0.69]

PRO_TEMPLATE_LANDMARKS[LEFT_KNEE] = [0.38, 0.77]
PRO_TEMPLATE_LANDMARKS[RIGHT_KNEE] = [0.66, 0.77]

PRO_TEMPLATE_LANDMARKS[LEFT_ANKLE] = [0.36, 0.88]
PRO_TEMPLATE_LANDMARKS[RIGHT_ANKLE] = [0.68, 0.88]

PRO_TEMPLATE_LANDMARKS[LEFT_FOOT] = [0.30, 0.94]  # back foot
PRO_TEMPLATE_LANDMARKS[RIGHT_FOOT] = [0.61, 0.94]  # front foot

# Fill remaining landmarks with a simple torso interpolation so cosine similarity
# has a stable, non-empty vector.
x_mid = float((PRO_TEMPLATE_LANDMARKS[LEFT_SHOULDER][0] + PRO_TEMPLATE_LANDMARKS[RIGHT_SHOULDER][0]) / 2.0)
y_top = float(PRO_TEMPLATE_LANDMARKS[NOSE][1])
y_bottom = float(PRO_TEMPLATE_LANDMARKS[RIGHT_FOOT][1])

for i in range(33):
    if np.isnan(PRO_TEMPLATE_LANDMARKS[i, 0]):
        t = i / 32.0
        PRO_TEMPLATE_LANDMARKS[i, 0] = x_mid
        PRO_TEMPLATE_LANDMARKS[i, 1] = y_top + t * (y_bottom - y_top)


# The template above is an approximate normalized skeleton.
# For similarity + ratio logic we normalize using:
# - translation: move front foot (more forward in +x) to origin
# - scale: divide by shoulder width


def _euclidean(a: np.ndarray, b: np.ndarray) -> float:
    d = float(np.linalg.norm(a - b))
    return d


def _angle_degrees(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    ba = a - b
    bc = c - b
    denom = float(np.linalg.norm(ba) * np.linalg.norm(bc))
    if denom == 0.0:
        return float("nan")
    cosang = float(np.dot(ba, bc) / denom)
    cosang = max(-1.0, min(1.0, cosang))
    return float(math.degrees(math.acos(cosang)))


@dataclass(frozen=True)
class ProTemplateFeatures:
    head_over_toes_ratio: float
    shoulder_width_ratio: float
    knee_angle_template: float
    front_foot_idx: int


def _template_front_foot_idx(templ_xy: np.ndarray) -> int:
    lf_x = float(templ_xy[LEFT_FOOT][0])
    rf_x = float(templ_xy[RIGHT_FOOT][0])
    return RIGHT_FOOT if rf_x >= lf_x else LEFT_FOOT


def compute_template_features(templ_xy: np.ndarray | None = None) -> ProTemplateFeatures:
    templ_xy = templ_xy if templ_xy is not None else PRO_TEMPLATE_LANDMARKS
    front_foot_idx = _template_front_foot_idx(templ_xy)

    shoulder_width = _euclidean(templ_xy[LEFT_SHOULDER], templ_xy[RIGHT_SHOULDER])
    feet_width = _euclidean(templ_xy[LEFT_FOOT], templ_xy[RIGHT_FOOT])

    nose_xy = templ_xy[NOSE]
    front_foot_xy = templ_xy[front_foot_idx]

    head_over_toes_ratio = abs(float(nose_xy[0] - front_foot_xy[0])) / shoulder_width if shoulder_width > 1e-6 else float("nan")
    shoulder_width_ratio = shoulder_width / feet_width if feet_width > 1e-6 else float("nan")

    # Front leg knee-angle template (assume the front leg corresponds to side of front foot)
    if front_foot_idx == RIGHT_FOOT:
        knee_angle = _angle_degrees(templ_xy[RIGHT_HIP], templ_xy[RIGHT_KNEE], templ_xy[RIGHT_ANKLE])
    else:
        knee_angle = _angle_degrees(templ_xy[LEFT_HIP], templ_xy[LEFT_KNEE], templ_xy[LEFT_ANKLE])

    return ProTemplateFeatures(
        head_over_toes_ratio=head_over_toes_ratio,
        shoulder_width_ratio=shoulder_width_ratio,
        knee_angle_template=knee_angle,
        front_foot_idx=front_foot_idx,
    )


def normalize_for_similarity(lm_xy: np.ndarray, *, front_foot_idx: int) -> np.ndarray:
    """
    Normalize landmark coordinates for template comparison:
    - translate so front foot is at origin
    - scale by shoulder width
    - flatten to a fixed vector shape (33,2)
    """
    lm_xy = np.asarray(lm_xy, dtype=np.float32)
    shoulder_width = _euclidean(lm_xy[LEFT_SHOULDER], lm_xy[RIGHT_SHOULDER])
    scale = shoulder_width if shoulder_width > 1e-6 else 1.0

    origin = lm_xy[front_foot_idx]
    return (lm_xy - origin) / scale


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    a = a.reshape(-1).astype(np.float32)
    b = b.reshape(-1).astype(np.float32)
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0.0:
        return 0.0
    return float(np.dot(a, b) / denom)


def euclidean_distance(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.linalg.norm(a.reshape(-1) - b.reshape(-1)))

