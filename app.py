import streamlit as st
from core.db import init_db
from core.auth import get_user_by_id
from core.theme import inject_cricket_theme

from _pages.home import home_page
from _pages.admin import admin_page
from _pages.profile import profile_page
from _pages.settings import settings_page
from services.biometric import stance_analysis_page
from services.tracking import ball_tracking_page
from services.academy import drills_page
from services.mentor import chat_page


def current_user():
    uid = st.session_state.get("user_id")
    return get_user_by_id(int(uid)) if uid else None


def is_logged_in():
    return bool(st.session_state.get("user_id"))


def main():
    if 'current_page' not in st.session_state:
        st.session_state.current_page = "Home"

    inject_cricket_theme()
    init_db()

    with st.sidebar:
        st.markdown("""
                    <div style='text-align:center;padding:8px 0 20px;border-bottom:1px solid #1C2333;margin-bottom:14px;'>
                    <div style='width:44px;height:44px;background:#F59E0B;border-radius:10px;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:22px;'>🏏</div>
                    <div style='font-family:Rajdhani,sans-serif;font-size:20px;font-weight:700;letter-spacing:3px;color:#F59E0B;'>CRICSMART</div>
                    <div style='font-size:10px;color:#3A4A60;letter-spacing:2px;margin-top:2px;'>AI PLATFORM</div>
                    </div>
                    """, unsafe_allow_html=True)

        st.divider()

        if st.button("Home", use_container_width=True):
            st.session_state.current_page = "Home"
            st.rerun()

        if st.button("Biometric Lab", use_container_width=True):
            st.session_state.current_page = "Analysis"
            st.rerun()

        if st.button("Training Drills", use_container_width=True):
            st.session_state.current_page = "Drills"
            st.rerun()

        if st.button("AI Mentor", use_container_width=True):
            st.session_state.current_page = "Chat"
            st.rerun()

        if st.button("My Profile", use_container_width=True):
            st.session_state.current_page = "Profile"
            st.rerun()

        if st.button("Settings", use_container_width=True):
            st.session_state.current_page = "Settings"
            st.rerun()

        if st.button("Ball Tracking", use_container_width=True):
            st.session_state.current_page = "BallTracking"
            st.rerun()

        user = current_user()
        if user and user.get('is_admin', 0) == 1:
            if st.button("👑 Admin Panel", use_container_width=True):
                st.session_state.current_page = "Admin"
                st.rerun()

    page = st.session_state.current_page

    if page == "Home":
        home_page()

    elif page == "Analysis":
        if is_logged_in():
            stance_analysis_page()
        else:
            st.warning("Please login to access the Biometric Lab.")
            st.session_state.current_page = "Home"
            st.rerun()

    elif page == "Drills":
        drills_page()

    elif page == "Chat":
        chat_page()

    elif page == "Profile":
        profile_page()

    elif page == "Settings":
        settings_page()

    elif page == "BallTracking":
        ball_tracking_page()

    elif page == "Admin":
        if current_user() and current_user().get('is_admin', 0) == 1:
            admin_page()
        else:
            st.warning("Admin access only.")
            st.session_state.current_page = "Home"
            st.rerun()


if __name__ == "__main__":
    main()