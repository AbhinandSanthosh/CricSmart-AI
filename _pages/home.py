import streamlit as st
from services.live_data import get_live_and_upcoming, get_cricket_news, get_team_flag
from core.auth import get_user_by_id


def current_user():
    uid = st.session_state.get("user_id")
    return get_user_by_id(int(uid)) if uid else None


def home_page():
    user = current_user()

    from streamlit_autorefresh import st_autorefresh
    st_autorefresh(interval=30000, key="refresh")

    if not user:
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            st.markdown("<h1 style='text-align: center; color: #22C55E;'>🏏 CricSmart AI</h1>", unsafe_allow_html=True)
            st.write("---")

            login_tab, signup_tab = st.tabs(["🔐 Login", "📝 Join Team"])

            with login_tab:
                with st.form("login_form"):
                    from core.auth import authenticate_user
                    u = st.text_input("Username")
                    p = st.text_input("Password", type="password")
                    if st.form_submit_button("Access Stadium", use_container_width=True):
                        res = authenticate_user(u, p)
                        if res:
                            st.session_state.user_id = res["id"]
                            st.session_state.username = res["username"]
                            st.rerun()
                        else:
                            st.error("Invalid credentials")

            with signup_tab:
                with st.form("signup_form"):
                    from core.auth import create_user
                    nu = st.text_input("Choose Username")
                    np_ = st.text_input("Secret Password", type="password")
                    role = st.selectbox("Your Role", ["Batter", "Bowler", "All-rounder", "Wicketkeeper"])
                    lvl = st.selectbox("Skill Level", ["Beginner", "Intermediate", "Advanced"])
                    if st.form_submit_button("Create Profile", use_container_width=True):
                        success = create_user(username=nu, password=np_, primary_role=role, skill_level=lvl)
                        if success:
                            st.success("✅ Profile created! Please login.")
                        else:
                            st.error("❌ Username already exists.")
        return

    if st.sidebar.button("🚪 Logout"):
        st.session_state.user_id = None
        st.session_state.username = None
        st.rerun()

    st.markdown(f"## 🏏 Stadium Dashboard: Welcome, {user['username']}!")
    st.markdown("### 🔴 Live Matches")

    match_data = get_live_and_upcoming()

    if match_data["live"]:
        live_matches = match_data["live"][:3]
        cols = st.columns(len(live_matches))
        for i, match in enumerate(live_matches):
            with cols[i]:
                team1, team2 = match['title'].split(" vs ")
                flag1 = get_team_flag(team1)
                flag2 = get_team_flag(team2)
                with st.container(border=True):
                    st.markdown(f"### {flag1} {team1} vs {flag2} {team2}")
                    st.markdown(f"## {match['score']}")
                    st.caption(f"🏆 {match['league']}")
                    st.caption(f"📅 {match['date']}")
                    if "LIVE" in match["status"]:
                        st.markdown("""
                        <span style="color:red; font-weight:bold;">🔴 LIVE</span>
                        """, unsafe_allow_html=True)
                    elif "COMPLETED" in match["status"]:
                        st.success("Completed")
                    else:
                        st.warning("Upcoming")
                    with st.expander("📖 Match Summary"):
                        st.write(match.get("summary", "No summary available"))
    else:
        st.info("No matches currently live.")

    if match_data["completed"]:
        st.markdown("### ✅ Recent Results")
        for m in match_data["completed"][:3]:
            with st.container(border=True):
                st.markdown(f"🏏 {m['title']}")
                st.write(f"**Score:** {m['score']}")
                st.caption(f"🏆 {m['league']}")
                st.caption(f"📅 {m['date']}")
                st.success(m["status"])

    st.divider()

    left_col, right_col = st.columns([1.5, 1])

    with left_col:
        st.markdown("### 📅 Upcoming Matches")
        if match_data["upcoming"]:
            for m in match_data["upcoming"]:
                with st.container(border=True):
                    st.markdown(f"### 🏏 {m['title']}")
                    st.write(m["score"])
                    st.caption(f"🏆 {m['league']}")
                    st.caption(f"📅 {m['date']}")
                    st.warning(m["status"])
                    with st.expander("📖 View Details"):
                        st.write(m.get("summary", "No details available"))
        else:
            st.info("No upcoming matches.")

    with right_col:
        st.markdown("### 📰 Latest Cricket News")
        news = get_cricket_news()
        if news:
            for item in news:
                st.markdown(f"**[{item['title']}]({item['link']})**")
                st.caption(f"📅 {item['date']}")
        else:
            st.warning("Unable to load news.")

    st.divider()
    st.markdown("##### 🕒 Your Last Session")
    st.info("Complete a Biometric Lab session to see your stats here.")