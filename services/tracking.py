import streamlit as st
import cv2
import tempfile


def ball_tracking_page():
    st.markdown("<h1>🎯 Ball Tracking Lab</h1>", unsafe_allow_html=True)
    st.write("Upload a cricket video to analyze ball trajectory, bounce, and shot recommendation.")

    uploaded_video = st.file_uploader("Upload Cricket Video", type=["mp4", "mov", "avi"])

    if uploaded_video:
        # ✅ temp file (safe for cloud)
        tfile = tempfile.NamedTemporaryFile(delete=False)
        tfile.write(uploaded_video.read())
        video_path = tfile.name

        # ✅ Lazy import (IMPORTANT FIX)
        try:
            from moviepy.editor import VideoFileClip  
        except Exception as e:
            st.error(f"MoviePy import failed: {e}")
            return

        # 🎬 VIDEO TRIMMER
        try:
            clip = VideoFileClip(video_path)
            duration = clip.duration
            st.sidebar.header("✂️ Video Trimmer")

            start_time, end_time = st.sidebar.slider(
                "Select Shot Range",
                0.0,
                float(duration),
                (0.0, min(5.0, float(duration))),
                step=0.1
            )

            if st.sidebar.button("Apply Trim", use_container_width=True):
                with st.spinner("Isolating shot..."):
                    trimmed_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
                    trimmed_path = trimmed_file.name

                    new_clip = clip.subclip(start_time, end_time)
                    new_clip.write_videofile(
                        trimmed_path,
                        codec="libx264",
                        audio=False,
                        logger=None
                    )

                    st.session_state['active_video'] = trimmed_path
                    st.sidebar.success("✅ Shot Isolated!")
                    st.rerun()

            clip.close()

        except Exception as e:
            st.sidebar.error(f"Trimmer Error: {e}")

        final_video_path = st.session_state.get('active_video', video_path)
        st.video(final_video_path)

        # 🚀 ANALYSIS BUTTON
        if st.button("🚀 Analyze Ball Tracking", use_container_width=True):
            with st.spinner("Calibrating Perspective & Tracking Ball..."):

                try:
                    # ✅ Lazy import HERE (CRITICAL FIX)
                    from analysis_engine import analyze_ball_tracking

                    roi_box = (100, 50, 1100, 800)

                    ball_trail, bounce_point, _, _, stats = analyze_ball_tracking(
                        final_video_path,
                        roi_box=roi_box,
                        track_ball=True,
                        advanced=True,
                        fps=30
                    )

                except Exception as e:
                    st.error(f"Analysis failed: {e}")
                    return

                st.subheader("📊 Analysis Results")

                if not ball_trail:
                    st.error("❌ No ball detected. Try clearer video.")
                    return

                col1, col2 = st.columns(2)

                with col1:
                    speed = stats.get('speed_kmh', 0)
                    st.metric("⚡ Ball Speed", f"{speed:.2f} km/h")

                    if stats.get('hit_stumps'):
                        st.error("🟥 Ball would hit the stumps")
                    else:
                        st.success("🏏 Ball is missing the stumps")

                with col2:
                    shot = stats.get('shot_type', "Unknown")
                    st.success(f"AI Recommendation: {shot}")

                # 🎥 VISUAL OUTPUT
                st.subheader("🎥 Visual Output")

                cap = cv2.VideoCapture(final_video_path)

                output_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
                output_path = output_file.name

                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                out = None
                frame_idx = 0

                while cap.isOpened():
                    ret, frame = cap.read()
                    if not ret:
                        break

                    if out is None:
                        h, w, _ = frame.shape
                        out = cv2.VideoWriter(output_path, fourcc, 30, (w, h))

                    for j in range(1, min(len(ball_trail), frame_idx)):
                        cv2.line(frame, ball_trail[j-1], ball_trail[j], (0, 255, 0), 3)

                    if bounce_point and frame_idx >= stats.get('bounce_index', 0):
                        cv2.circle(frame, bounce_point, 10, (255, 0, 0), -1)

                    out.write(frame)
                    frame_idx += 1

                cap.release()
                if out:
                    out.release()

                st.video(output_path)

                with st.expander("📦 View Debug Stats"):
                    st.json(stats)