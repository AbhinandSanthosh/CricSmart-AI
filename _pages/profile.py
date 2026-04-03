import streamlit as st
import pandas as pd


def render_performance_chart(chart_data):
    st.line_chart(chart_data.set_index("Date")["Score"])


def profile_page():
    st.markdown(f"<h1>Welcome, Captain {st.session_state.get('username', 'Player')}! 👋</h1>", unsafe_allow_html=True)

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric(label="Primary Role", value="Batter")
    with col2:
        st.metric(label="Experience", value="Beginner")
    with col3:
        st.metric(label="Total Sessions", value="12")

    st.divider()
    c1, c2 = st.columns([2, 1])

    with c1:
        st.markdown("### 📈 Your Progress")
        chart_data = pd.DataFrame({
            "Date": ["Mar 18","Mar 19","Mar 20","Mar 21","Mar 22","Mar 23","Mar 24"],
            "Score": [45, 52, 48, 65, 60, 72, 78]
        })
        render_performance_chart(chart_data)

    with c2:
        st.markdown("### 🎯 Quick Tasks")
        st.success("✅ Stance Checkup (Daily)")
        st.warning("⚠️ Practice Footwork (Weekly)")
        st.info("💬 Chat with AI Mentor")
        st.divider()
        if st.button("🚪 Logout from Session", use_container_width=True, type="secondary"):
            st.session_state.clear()
            st.session_state.current_page = "Home"
            st.rerun()

    st.markdown("### 🕒 Recent Activity")
    activity_df = pd.DataFrame({
        "Date": ["2026-03-24", "2026-03-22", "2026-03-20"],
        "Activity": ["Stance Analysis", "Drill: Shadow Batting", "Stance Analysis"],
        "Result": ["78%", "Completed", "72%"]
    })
    st.table(activity_df)