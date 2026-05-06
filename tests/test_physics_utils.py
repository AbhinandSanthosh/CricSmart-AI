"""Unit tests for the homography + parabolic impact predictor."""
import os
import sys
import numpy as np

# Ensure we can import the project package
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)

from utils.physics_utils import (
    compute_pitch_homography,
    pixel_to_pitch_coords,
    predict_stump_impact,
    describe_bounce,
    auto_detect_pitch_corners,
    fallback_hit_stumps,
    fallback_bounce_text,
    PITCH_LENGTH_M,
    PITCH_HALF_W_M,
    STUMP_HALF_W_M,
    STUMP_HEIGHT_M,
)


def test_homography_round_trip():
    """Each input corner must map back to its known pitch-frame target within 1 cm."""
    corners_px = [
        [480, 720],   # BL bowler-leg
        [1440, 720],  # BR bowler-off
        [1100, 360],  # TR batter-off
        [820, 360],   # TL batter-leg
    ]
    expected = [
        (-PITCH_HALF_W_M, 0.0),
        ( PITCH_HALF_W_M, 0.0),
        ( PITCH_HALF_W_M, PITCH_LENGTH_M),
        (-PITCH_HALF_W_M, PITCH_LENGTH_M),
    ]
    H = compute_pitch_homography(corners_px)
    for px, (X_exp, Z_exp) in zip(corners_px, expected):
        X, Z = pixel_to_pitch_coords(px, H)
        assert abs(X - X_exp) < 0.01, f"X off: got {X}, want {X_exp}"
        assert abs(Z - Z_exp) < 0.01, f"Z off: got {Z}, want {Z_exp}"
    print("homography round-trip: OK")


def _trail_hitting_stumps():
    """Synthetic post-bounce parabola peaking at Y=0.3 m, straight down the middle."""
    Z_b = 17.0
    pre = [(0.0, 2.0 - 0.1 * z, z) for z in np.linspace(0.0, Z_b, 8)]
    post_Z = np.linspace(Z_b, 20.5, 6)
    post = []
    for z in post_Z:
        dz = z - Z_b
        # Y rises then falls; arrange so Y at Z=20.12 is in (0, 0.711).
        Y = max(0.0, 0.3 - 1.5 * (dz - 1.5) ** 2 / (1.5 ** 2 + 1e-9) + 0.3)
        post.append((0.0, Y, z))
    return pre + post


def test_impact_hit():
    """Straight ball, post-bounce parabola peaking at low height -> hits."""
    # A clean parabola: post-bounce Y(z) = -a*(z - 17.5)^2 + 0.3
    # so Y(20.12) = -a*(2.62)^2 + 0.3. Pick a small enough that Y(20.12) is in [0, 0.71].
    pre = [(0.0, max(0.0, 1.5 - 0.1 * z), z) for z in np.linspace(0.0, 16.5, 8)]
    bounce = (0.0, 0.0, 17.0)
    post_Z = np.linspace(17.5, 20.5, 6)
    a = 0.025
    post = [(0.0, max(0.0, -a * (z - 17.5) ** 2 + 0.4), z) for z in post_Z]
    trail = pre + [bounce] + post
    out = predict_stump_impact(trail)
    assert out["hit_stumps"] is True, f"Expected HIT, got {out}"
    assert abs(out["X_stump_m"]) <= STUMP_HALF_W_M
    assert 0.0 <= out["Y_stump_m"] <= STUMP_HEIGHT_M
    print(f"impact hit case: OK (X={out['X_stump_m']:.3f}, Y={out['Y_stump_m']:.3f})")


def test_impact_lateral_miss():
    """Ball drifts wide of the stumps."""
    pre = [(0.0 + 0.05 * z, max(0.0, 1.5 - 0.1 * z), z) for z in np.linspace(0.0, 16.5, 8)]
    bounce = (0.5 * 16.5 / 16.5, 0.0, 17.0)  # at X = 0.55
    post_Z = np.linspace(17.5, 20.5, 6)
    # X drifts further outside off stump
    a = 0.025
    post = [(0.6 + 0.1 * (z - 17.5), max(0.0, -a * (z - 17.5) ** 2 + 0.4), z) for z in post_Z]
    trail = pre + [bounce] + post
    out = predict_stump_impact(trail)
    assert out["hit_stumps"] is False, f"Expected MISS (lateral), got {out}"
    assert abs(out["X_stump_m"]) > STUMP_HALF_W_M
    print(f"impact lateral-miss: OK (X={out['X_stump_m']:.3f})")


def test_impact_height_miss():
    """Ball is rising over the stumps."""
    pre = [(0.0, max(0.0, 1.5 - 0.1 * z), z) for z in np.linspace(0.0, 16.5, 8)]
    bounce = (0.0, 0.0, 17.0)
    post_Z = np.linspace(17.5, 20.5, 6)
    # post-bounce Y rises strongly: 0.6 + 0.3*(z-17.5)
    post = [(0.0, 0.6 + 0.3 * (z - 17.5), z) for z in post_Z]
    trail = pre + [bounce] + post
    out = predict_stump_impact(trail)
    assert out["hit_stumps"] is False, f"Expected MISS (over the top), got {out}"
    assert out["Y_stump_m"] > STUMP_HEIGHT_M
    print(f"impact height-miss: OK (Y={out['Y_stump_m']:.3f})")


def test_describe_bounce_strings():
    s_full_inline = describe_bounce(0.0, 17.5)  # 2.62 m from stumps -> full
    s_short_off = describe_bounce(-0.5, 12.0)   # 8.12 m from stumps -> short, off
    s_yorker_leg = describe_bounce(0.4, 19.0)   # 1.12 m -> yorker, leg
    assert "full length" in s_full_inline and "in line with the stumps" in s_full_inline
    assert "short of a length" in s_short_off and "outside off stump" in s_short_off
    assert "yorker length" in s_yorker_leg and "outside leg stump" in s_yorker_leg
    print(f"describe_bounce: OK")
    print(f"  -> {s_full_inline}")
    print(f"  -> {s_short_off}")
    print(f"  -> {s_yorker_leg}")


def test_auto_detect_pitch_corners():
    """With a single confident stump detection, auto-detect produces 4
    sensibly-ordered pixel corners that round-trip through the homography
    near the expected pitch-frame anchors."""
    # Synthetic stump bbox: 32 px wide, 90 px tall, centered at (960, 980)
    # in a 1920×1080 frame.
    stump_dets = [(0, 944, 890, 976, 980, 0.92)]
    corners = auto_detect_pitch_corners(stump_dets, 1920, 1080)
    assert corners is not None
    assert len(corners) == 4
    BL, BR, TR, TL = corners
    # Order sanity: bowler-end pair has smaller y; batter-end has larger y
    assert BL[1] < TL[1] and BR[1] < TR[1]
    # Bowler end is narrower (perspective compression)
    assert (BR[0] - BL[0]) < (TR[0] - TL[0])
    # Batter-end pair sits at stump-bottom y (= 980)
    assert abs(TL[1] - 980) < 1 and abs(TR[1] - 980) < 1

    # Round-trip the 4 detected corners through the homography
    H = compute_pitch_homography(corners)
    expected = [
        (-PITCH_HALF_W_M, 0.0),
        ( PITCH_HALF_W_M, 0.0),
        ( PITCH_HALF_W_M, PITCH_LENGTH_M),
        (-PITCH_HALF_W_M, PITCH_LENGTH_M),
    ]
    for px, (X_exp, Z_exp) in zip(corners, expected):
        X, Z = pixel_to_pitch_coords(px, H)
        assert abs(X - X_exp) < 0.01
        assert abs(Z - Z_exp) < 0.01
    print("auto_detect_pitch_corners: OK")


def test_auto_detect_returns_none_without_stumps():
    assert auto_detect_pitch_corners([], 1920, 1080) is None
    print("auto_detect_pitch_corners empty input: OK")


def test_fallback_hit_stumps():
    # stump_center_x = 960, stump bbox y1=890, y2=980, ~50 m/px would be silly,
    # use mpp = 0.711 / 90 = 0.0079 m/px.
    mpp = 0.711 / 90
    # Last ball position close to stumps and within stump height -> HIT
    assert fallback_hit_stumps(965, 950, 960, 890, 980, mpp) is True
    # Last ball position 0.5 m to the side -> MISS
    far_x = 960 + int(0.5 / mpp)
    assert fallback_hit_stumps(far_x, 950, 960, 890, 980, mpp) is False
    # Last ball above stumps -> MISS (height fail)
    assert fallback_hit_stumps(965, 700, 960, 890, 980, mpp) is False
    print("fallback_hit_stumps: OK")


def test_fallback_bounce_text():
    mpp = 0.711 / 90
    text = fallback_bounce_text(960, 700, 960, 980, mpp)  # ~2.21m from stumps, in line
    assert "in line with the stumps" in text
    print(f"fallback_bounce_text: OK -> {text}")


if __name__ == "__main__":
    test_homography_round_trip()
    test_impact_hit()
    test_impact_lateral_miss()
    test_impact_height_miss()
    test_describe_bounce_strings()
    test_auto_detect_pitch_corners()
    test_auto_detect_returns_none_without_stumps()
    test_fallback_hit_stumps()
    test_fallback_bounce_text()
    print("\nAll tests passed.")
