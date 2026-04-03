import streamlit as st
import cv2
import numpy as np
import mediapipe as mp
from PIL import Image
from pathlib import Path
from streamlit_cropper import st_cropper
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision


@st.cache_resource
def get_pose_landmarker():
    model_url = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
    model_path = Path("data/pose_landmarker.task")
    model_path.parent.mkdir(exist_ok=True)
    if not model_path.exists():
        import urllib.request
        with st.spinner("Downloading pose model (one-time setup)..."):
            urllib.request.urlretrieve(model_url, str(model_path))
    options = vision.PoseLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(model_path)),
        running_mode=vision.RunningMode.IMAGE
    )
    return vision.PoseLandmarker.create_from_options(options)


def draw_dotted_skeleton(img, p1, p2, color):
    dist = np.linalg.norm(p1 - p2)
    segments = max(1, int(dist / 10))
    for i in range(segments):
        s = p1 + (p2 - p1) * (i / segments)
        e = p1 + (p2 - p1) * ((i + 0.5) / segments)
        cv2.line(img, tuple(s.astype(int)), tuple(e.astype(int)), color, 2)


def stance_analysis_page():
    st.markdown("<h1>🔬 Biometric Lab</h1>", unsafe_allow_html=True)
    st.markdown("### 🖼️ Stance Check (Photo)")

    photo_mode = st.radio("Photo Source", ["Upload Image", "Take Live Photo"], horizontal=True)

    if photo_mode == "Take Live Photo":
        uploaded = st.camera_input("Capture your stance")
    else:
        uploaded = st.file_uploader("Upload Batter Photo", type=["jpg", "png"], key="photo_v3")

    if uploaded:
        img = Image.open(uploaded).convert("RGB")
        st.markdown("### ✂️ Step 1: Isolate the Batter")
        cropped_img = st_cropper(img, realtime_update=True, box_color='#FF0000', aspect_ratio=None)

        col_pre1, col_pre2 = st.columns(2)
        with col_pre1:
            st.image(img, caption="Original", use_container_width=True)
        with col_pre2:
            st.image(cropped_img, caption="Cropped", use_container_width=True)

        if st.button("🚀 Analyze Batter Stance", use_container_width=True):
            img_np = np.array(cropped_img)
            h, w = img_np.shape[:2]

            with st.spinner("Processing..."):
                landmarker = get_pose_landmarker()
                res = landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=img_np))

            if res.pose_landmarks:
                lm = res.pose_landmarks[0]

                def get_pt(i):
                    return np.array([lm[i].x * w, lm[i].y * h])

                def angle_between_points(a, b, c):
                    ba = a - b
                    bc = c - b
                    cos_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
                    return np.degrees(np.arccos(np.clip(cos_angle, -1.0, 1.0)))

                def angle_between_vectors(v1, v2):
                    cos_theta = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
                    return np.degrees(np.arccos(np.clip(cos_theta, -1.0, 1.0)))

                ann = img_np.copy()
                score = 100
                findings, wrongs = [], []

                torso_h = np.linalg.norm(get_pt(11) - get_pt(23))

                # 1. BACK LEG KNEE BEND
                k_angle = angle_between_points(get_pt(24), get_pt(26), get_pt(28))
                k_color = (0, 255, 0)
                if k_angle > 170:
                    wrongs.append("❌ **Stiff back leg** – bend it slightly for balance and power.")
                    score -= 25
                    k_color = (0, 0, 255)
                elif k_angle > 150:
                    findings.append("✅ **Good knee bend** – athletic stance.")
                else:
                    findings.append("✅ **Deep knee bend** – stable base.")
                cv2.line(ann, tuple(get_pt(24).astype(int)), tuple(get_pt(26).astype(int)), k_color, 3)
                cv2.line(ann, tuple(get_pt(26).astype(int)), tuple(get_pt(28).astype(int)), k_color, 3)

                # 2. LEAD ELBOW
                e_angle = angle_between_points(get_pt(11), get_pt(13), get_pt(15))
                e_color = (0, 255, 255)
                if e_angle < 75:
                    wrongs.append("❌ **Low lead elbow** – raise it to create a high bat lift.")
                    score -= 20
                    e_color = (0, 0, 255)
                elif e_angle > 90:
                    findings.append("✅ **High lead elbow** – excellent bat lift position.")
                else:
                    findings.append("✅ **Good elbow height** – ready to play.")
                cv2.line(ann, tuple(get_pt(11).astype(int)), tuple(get_pt(13).astype(int)), e_color, 3)
                cv2.line(ann, tuple(get_pt(13).astype(int)), tuple(get_pt(15).astype(int)), e_color, 3)

                # 3. EYE ALIGNMENT & BALANCE
                left_eye, right_eye = get_pt(2), get_pt(5)
                mid_eye_x = (left_eye[0] + right_eye[0]) / 2
                eye_horiz_dist = abs(right_eye[0] - left_eye[0])
                eye_vert_diff = abs(right_eye[1] - left_eye[1])
                if eye_horiz_dist > 0 and (eye_vert_diff / eye_horiz_dist) > 0.15:
                    wrongs.append("❌ **Head tilt** – keep head straight to track the ball better.")
                    score -= 20
                    eye_color = (0, 0, 255)
                else:
                    findings.append("✅ **Eyes level** – clear vision.")
                    eye_color = (0, 255, 0)
                mid_feet_x = (get_pt(31)[0] + get_pt(32)[0]) / 2
                if abs(mid_eye_x - mid_feet_x) > (w * 0.1):
                    wrongs.append("❌ **Off-balance** – head is not centered over your base.")
                    score -= 15
                cv2.circle(ann, tuple(left_eye.astype(int)), 8, eye_color, -1)
                cv2.circle(ann, tuple(right_eye.astype(int)), 8, eye_color, -1)
                cv2.line(ann, tuple(left_eye.astype(int)), tuple(right_eye.astype(int)), eye_color, 2)

                # 4. SHOULDER TILT
                l_sh, r_sh = get_pt(11), get_pt(12)
                shoulder_diff_y = r_sh[1] - l_sh[1]
                shoulder_color = (0, 255, 0)
                if abs(shoulder_diff_y) / h > 0.03:
                    wrongs.append("❌ **Improper shoulder tilt** – align shoulders to load power correctly.")
                    score -= 15
                    shoulder_color = (0, 0, 255)
                else:
                    findings.append("✅ **Good shoulder alignment.**")
                cv2.line(ann, tuple(l_sh.astype(int)), tuple(r_sh.astype(int)), shoulder_color, 3)

                # 5. FOOT ALIGNMENT
                r_ank, l_ank = get_pt(31), get_pt(32)
                foot_angle = angle_between_vectors(l_sh - r_sh, l_ank - r_ank)
                foot_color = (0, 255, 0)
                if foot_angle > 25:
                    wrongs.append("❌ **Feet misaligned** – keep feet in line with shoulders.")
                    score -= 15
                    foot_color = (0, 0, 255)
                else:
                    findings.append("✅ **Good foot alignment.**")
                cv2.line(ann, tuple(r_ank.astype(int)), tuple(l_ank.astype(int)), foot_color, 3)

                # 6. STANCE WIDTH
                actual_stance_w = abs(get_pt(27)[0] - get_pt(28)[0])
                if actual_stance_w < (torso_h * 0.8):
                    wrongs.append("❌ **Stance too narrow** – widen your feet for better stability.")
                    score -= 15
                elif actual_stance_w > (torso_h * 1.5):
                    wrongs.append("❌ **Stance too wide** – might restrict quick footwork.")
                    score -= 10
                else:
                    findings.append("✅ **Perfect stance width.**")

                # FINAL OUTPUT
                final_score = max(score, 0)
                st.divider()
                st.subheader(f"Technical Score: {final_score}%")
                st.image(ann, caption="CricSmart AI Biometric Analysis", use_container_width=True)

                c1, c2 = st.columns(2)
                with c1:
                    st.success("### Correct Mechanics")
                    for f in findings:
                        st.write(f)
                with c2:
                    st.error("### Critical Errors")
                    for w_msg in wrongs:
                        st.write(w_msg)

                if final_score >= 90:
                    st.balloons()
                    st.success("🌟 **Perfect Stance!**")
                elif final_score >= 75:
                    st.info("👍 Good stance! Minor adjustments needed.")
                else:
                    st.warning("📘 Review the corrections and try again.")
            else:
                st.error("No player detected. Try cropping tighter.")