import streamlit as st
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

                st.subheader("Result")

                if not ball_trail:
                    st.error("Couldn't see the ball clearly. Try a brighter side-on video.")
                    return

                speed = stats.get('speed_kmh', 0)
                col1, col2 = st.columns(2)
                with col1:
                    st.metric("Speed", f"{speed:.0f} km/h")
                with col2:
                    if stats.get('hit_stumps'):
                        st.error(stats.get('verdict', 'Wicket hitting'))
                    else:
                        st.success(stats.get('verdict', 'Wicket missing'))

                length_label = stats.get('length_label')
                length_desc = stats.get('length_desc')
                shot_advice = stats.get('shot_advice')
                shot_desc = stats.get('shot_desc')
                col3, col4 = st.columns(2)
                with col3:
                    st.metric("Length", length_label or "-")
                    if length_desc:
                        st.caption(length_desc)
                with col4:
                    st.metric("Shot", shot_advice or "-")
                    if shot_desc:
                        st.caption(shot_desc)

                if stats.get('error'):
                    st.warning(stats['error'])