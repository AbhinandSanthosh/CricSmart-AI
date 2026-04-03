import streamlit as st
import pandas as pd
from core.db import DB_PATH, get_conn


def settings_page():
    st.markdown("<h1>⚙️ App Settings</h1>", unsafe_allow_html=True)

    with st.expander("👤 Edit Profile Information", expanded=True):
        new_name = st.text_input("Full Name", placeholder="Enter new name")
        new_email = st.text_input("Email Address", placeholder="new@example.com")
        new_phone = st.text_input("Phone Number", placeholder="+91 XXXXX XXXXX")
        if st.button("Update Profile", use_container_width=True):
            st.success("Profile updated successfully!")

    with st.expander("🎨 Theme & Appearance"):
        st.write("Personalize your Cricket Lab experience")

    with st.expander("🔒 Security & Password"):
        new_pw = st.text_input("New Password", type="password")
        confirm_pw = st.text_input("Confirm New Password", type="password")
        if st.button("Change Password", use_container_width=True):
            if new_pw == confirm_pw and new_pw != "":
                st.success("Password updated!")
            else:
                st.error("Passwords do not match.")

    with st.expander("🔑 API Configuration"):
        st.info("To enable the real AI Mentor, add your Anthropic API key to `.streamlit/secrets.toml`:")
        st.code('ANTHROPIC_API_KEY = "sk-ant-..."', language="toml")

    with st.expander("🛠️ Debug Info"):
        st.code(f"DB path: {DB_PATH}\nDB exists: {DB_PATH.exists()}", language="text")
        if DB_PATH.exists():
            with get_conn() as conn:
                users = conn.execute("SELECT id, username, primary_role FROM users").fetchall()
            if users:
                st.dataframe(pd.DataFrame([dict(u) for u in users]))
            else:
                st.warning("No users in DB yet — sign up first.")