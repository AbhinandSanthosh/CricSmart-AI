import streamlit as st
import pandas as pd
from core.auth import get_all_users


def admin_page():
    st.markdown("<h1>👑 Admin Dashboard</h1>", unsafe_allow_html=True)
    st.markdown("View all registered users.")

    users = get_all_users()
    if users:
        df = pd.DataFrame(users)
        if 'password' in df.columns:
            df = df.drop('password', axis=1)
        st.dataframe(df, use_container_width=True)
        st.caption(f"Total users: {len(users)}")
    else:
        st.info("No users found.")