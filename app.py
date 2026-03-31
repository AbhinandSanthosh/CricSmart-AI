import streamlit as st
import urllib.request
from pathlib import Path
import cv2
import mediapipe as mp
import numpy as np
import time
import requests
from PIL import Image
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
import pandas as pd
from streamlit_cropper import st_cropper
from analysis_engine import analyze_ball_tracking, calculate_speed
# Core modules
from core.auth import authenticate_user, create_user, get_user_by_id, get_all_users
from core.db import init_db, get_conn

def get_team_flag(team):
    flags = {
        "India": "🇮🇳",
        "Australia": "🇦🇺",
        "England": "🇬🇧",
        "Pakistan": "🇵🇰",
        "Sri Lanka": "🇱🇰",
        "New Zealand": "🇳🇿",
        "South Africa": "🇿🇦"
    }

    for key in flags:
        if key in team:
            return flags[key]

    return "🏏"
# ── CONFIG ──────────────────────────────────────────────────────────────────
st.set_page_config(page_title="CricSmart AI", page_icon="🏏", layout="wide")

# ── POSE CONNECTIONS ─────────────────────────────────────────────────────────
POSE_CONNECTIONS = [
    (11, 12), (11, 13), (13, 15), (12, 14), (14, 16),
    (11, 23), (12, 24), (23, 24),
    (23, 25), (24, 26), (25, 27), (26, 28)
]

# ── UI THEME ─────────────────────────────────────────────────────────────────
def inject_cricket_theme():
    st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&family=Inter:wght@400;500;600&display=swap');
    .stApp { background-color: #0F172A; color: #E5E7EB; font-family: 'Inter', sans-serif; }
    h1, h2, h3 { font-family: 'Montserrat', sans-serif !important; color: #22C55E !important; text-transform: uppercase; }
    .stButton > button { background-color: #22C55E !important; color: white !important; font-weight: 600 !important; }
    </style>
    """, unsafe_allow_html=True)

# ── AUTH HELPERS ─────────────────────────────────────────────────────────────
def is_logged_in():
    return bool(st.session_state.get("user_id"))

def current_user():
    uid = st.session_state.get("user_id")
    return get_user_by_id(int(uid)) if uid else None

# ── POSE ENGINE ──────────────────────────────────────────────────────────────
@st.cache_resource
def get_pose_landmarker():
    model_url = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
    model_path = Path("data/pose_landmarker.task")
    model_path.parent.mkdir(exist_ok=True)
    if not model_path.exists():
        with st.spinner("Downloading pose model (one-time setup)..."):
            urllib.request.urlretrieve(model_url, str(model_path))
    options = vision.PoseLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(model_path)),
        running_mode=vision.RunningMode.IMAGE
    )
    return vision.PoseLandmarker.create_from_options(options)

# ── HELPERS ───────────────────────────────────────────────────────────────────
def draw_dotted_skeleton(img, p1, p2, color):
    dist = np.linalg.norm(p1 - p2)
    segments = max(1, int(dist / 10))
    for i in range(segments):
        s = p1 + (p2 - p1) * (i / segments)
        e = p1 + (p2 - p1) * ((i + 0.5) / segments)
        cv2.line(img, tuple(s.astype(int)), tuple(e.astype(int)), color, 2)

def render_performance_chart(chart_data):
    st.line_chart(chart_data.set_index("Date")["Score"])

# ── LIVE SCORES & NEWS ────────────────────────────────────────────────────────
def get_live_and_upcoming():
    matches = {"live": [], "upcoming": [], "completed": []}

    try:
        import requests
        from datetime import datetime

        url = "https://api.cricapi.com/v1/currentMatches?apikey=1010c16b-a144-4550-96fd-7c8a353108ab&offset=0"
        response = requests.get(url)
        data = response.json()

        if data.get("status") == "success":

            for match in data.get("data", []):

                teams = match.get("teams", [])
                if len(teams) < 2:
                    continue

                title = f"{teams[0]} vs {teams[1]}"
                league = match.get("series", "International Match")

                # ⏰ FORMAT TIME
                raw_time = match.get("dateTimeGMT")
                date_time = "Time not available"

                if raw_time:
                    try:
                        dt = datetime.strptime(raw_time, "%Y-%m-%dT%H:%M:%S.%fZ")
                        date_time = dt.strftime("%d %b %Y, %I:%M %p")
                    except:
                        try:
                            dt = datetime.strptime(raw_time, "%Y-%m-%dT%H:%M:%SZ")
                            date_time = dt.strftime("%d %b %Y, %I:%M %p")
                        except:
                            date_time = raw_time

                # 🏏 SCORE
                score = "Match not started"
                if match.get("score"):
                    try:
                        score = " | ".join([
                            f"{i.get('r',0)}/{i.get('w',0)} ({i.get('o',0)})"
                            for i in match["score"]
                        ])
                    except:
                        score = "Live"

                # 📊 STATUS
                if match.get("matchEnded"):
                    category = "completed"
                    status = "COMPLETED ✅"

                elif match.get("matchStarted"):
                    category = "live"
                    status = "LIVE 🔴"

                else:
                    category = "upcoming"
                    status = "UPCOMING ⏳"

                matches[category].append({
                    "title": title,
                    "score": score,
                    "status": status,
                    "league": league,
                    "date": date_time,
                    "summary": match.get("status", "No details available")
                })


                if not matches["live"] and not matches["upcoming"] and not matches["completed"]:
                    matches["live"] = [
                        {
                            "title": "India vs England",
                            "score": "245/6 (45) | 210/8 (50)",
                            "status": "LIVE 🔴",
                            "league": "ICC ODI Series",
                            "date": "Today, 2:30 PM",
                            "summary": "India is chasing 250. Strong middle-order performance."
                            }
                            ]

                    matches["completed"] = [
                        {
                            "title": "Australia vs Pakistan",
                            "score": "300/7 | 280/10",
                            "status": "COMPLETED ✅",
                            "league": "ICC World Cup",
                            "date": "Yesterday",
                            "summary": "Australia won by 20 runs."
                            }
                            ]
                    
                    matches["upcoming"] = [
                        {
                            "title": "India vs Australia",
                            "score": "Match yet to start",
                            "status": "UPCOMING ⏳",
                            "league": "Border-Gavaskar Trophy",
                            "date": "Tomorrow, 9:30 AM",
                            "summary": "Highly anticipated test match."
                            }]

    except Exception as e:
        print("Error:", e)

    return matches

def get_cricket_news():
    try:
        import feedparser
        feed = feedparser.parse("https://www.espncricinfo.com/rss/content/story/feeds/0.xml")
        return [{"title": e.title, "link": e.link, "date": e.published[:16]} for e in feed.entries[:6]]
    except:
        return []

# ── PAGES ─────────────────────────────────────────────────────────────────────

def home_page():
    user = current_user()

    from streamlit_autorefresh import st_autorefresh
    st_autorefresh(interval=30000, key="refresh")

    # 🔐 LOGIN PAGE
    if not user:
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            st.markdown("<h1 style='text-align: center; color: #22C55E;'>🏏 CricSmart AI</h1>", unsafe_allow_html=True)
            st.write("---")

            login_tab, signup_tab = st.tabs(["🔐 Login", "📝 Join Team"])

            with login_tab:
                with st.form("login_form"):
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

    # 🏠 DASHBOARD
    if st.sidebar.button("🚪 Logout"):
        st.session_state.user_id = None
        st.session_state.username = None
        st.rerun()

    st.markdown(f"## 🏏 Stadium Dashboard: Welcome, {user['username']}!")
    st.markdown("### 🔴 Live Matches")

    match_data = get_live_and_upcoming()

    # 🔴 LIVE MATCHES
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

                    # 🔴 blinking LIVE
                    if "LIVE" in match["status"]:
                        st.markdown("""
                        <span style="color:red; font-weight:bold; animation: blinker 1s linear infinite;">
                        🔴 LIVE
                        </span>

                        <style>
                        @keyframes blinker {
                          50% { opacity: 0; }
                        }
                        </style>
                        """, unsafe_allow_html=True)

                    elif "COMPLETED" in match["status"]:
                        st.success("Completed")

                    else:
                        st.warning("Upcoming")

                    with st.expander("📖 Match Summary"):
                        st.write(match.get("summary", "No summary available"))

    else:
        st.info("No matches currently live.")

    # ✅ COMPLETED MATCHES
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

    # 🟡 UPCOMING + NEWS
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

    # 📰 NEWS
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
# ------------------------------------------------------------------------------
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

# ------------------------------------------------------------------------------
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
                def get_pt(i): return np.array([lm[i].x * w, lm[i].y * h])

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

                # ---- 1. BACK LEG KNEE BEND (right leg) ----
                k_angle = angle_between_points(get_pt(24), get_pt(26), get_pt(28))
                k_color = (0, 255, 0)
                if k_angle > 170:
                    wrongs.append("❌ **Stiff back leg** – knee almost straight. Bend it slightly for balance and power.")
                    score -= 25
                    k_color = (0, 0, 255)
                elif k_angle > 150:
                    findings.append("✅ **Good knee bend** – athletic stance.")
                else:
                    findings.append("✅ **Deep knee bend** – stable base.")
                cv2.line(ann, tuple(get_pt(24).astype(int)), tuple(get_pt(26).astype(int)), k_color, 3)
                cv2.line(ann, tuple(get_pt(26).astype(int)), tuple(get_pt(28).astype(int)), k_color, 3)

                # ---- 2. LEAD ELBOW (left arm for right‑handed batter) ----
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

                # ---- 3. EYE ALIGNMENT (using vertical‑to‑horizontal ratio) ----
                left_eye = get_pt(2)
                right_eye = get_pt(5)
                eye_horiz_dist = abs(right_eye[0] - left_eye[0])
                eye_vert_diff = abs(right_eye[1] - left_eye[1])
                tilt_threshold = 0.15  # 15% of eye width
                if eye_horiz_dist > 0 and (eye_vert_diff / eye_horiz_dist) > tilt_threshold:
                    wrongs.append("❌ **Head tilt** – eyes not level. Keep your head straight to avoid double vision.")
                    score -= 20
                    eye_color = (0, 0, 255)
                else:
                    findings.append("✅ **Eyes level** – clear vision, ready to track the ball.")
                    eye_color = (0, 255, 0)
                cv2.circle(ann, tuple(left_eye.astype(int)), 8, eye_color, -1)
                cv2.circle(ann, tuple(right_eye.astype(int)), 8, eye_color, -1)
                cv2.line(ann, tuple(left_eye.astype(int)), tuple(right_eye.astype(int)), eye_color, 2)
                mid_eye_x = int((left_eye[0] + right_eye[0]) / 2)
                mid_eye_y = int(min(left_eye[1], right_eye[1]) - 10)
                cv2.putText(ann, "Eyes", (mid_eye_x, mid_eye_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, eye_color, 1)

                # ---- 4. SHOULDER TILT (using normalized height ratio) ----
                left_shoulder = get_pt(11)
                right_shoulder = get_pt(12)
                shoulder_diff_y = right_shoulder[1] - left_shoulder[1]
                shoulder_diff_ratio = abs(shoulder_diff_y) / h
                shoulder_color = (0, 255, 0)
                if shoulder_diff_ratio > 0.03:
                    if shoulder_diff_y < 0:
                        wrongs.append("❌ **Right shoulder too high** – drop it slightly to load power.")
                    else:
                        wrongs.append("❌ **Right shoulder too low** – excessive tilt can cause imbalance.")
                    score -= 15
                    shoulder_color = (0, 0, 255)
                elif shoulder_diff_y > 0:
                    findings.append("✅ **Good shoulder tilt** – right shoulder slightly lower, ready to coil.")
                else:
                    wrongs.append("⚠️ **Level shoulders** – try dropping right shoulder a bit for better loading.")
                cv2.circle(ann, tuple(left_shoulder.astype(int)), 8, shoulder_color, -1)
                cv2.circle(ann, tuple(right_shoulder.astype(int)), 8, shoulder_color, -1)
                mid_shoulder_x = int((left_shoulder[0] + right_shoulder[0]) / 2)
                mid_shoulder_y = int(min(left_shoulder[1], right_shoulder[1]) - 10)
                cv2.putText(ann, "Shoulders", (mid_shoulder_x, mid_shoulder_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, shoulder_color, 1)

                # ---- 5. FOOT ALIGNMENT (angle between shoulders and feet) ----
                right_ankle = get_pt(31)
                left_ankle = get_pt(32)
                shoulder_vec = left_shoulder - right_shoulder
                ankle_vec = left_ankle - right_ankle
                foot_angle = angle_between_vectors(shoulder_vec, ankle_vec)

                foot_color = (0, 255, 0)
                if foot_angle > 25:
                    wrongs.append("❌ **Feet too open/closed** – feet pointing away from shoulders. Align them for a stable base.")
                    score -= 15
                    foot_color = (0, 0, 255)
                elif foot_angle > 15:
                    findings.append("✅ **Front foot slightly open** – acceptable for a balanced stance.")
                else:
                    findings.append("✅ **Good foot alignment** – feet in line with shoulders.")

                cv2.circle(ann, tuple(right_ankle.astype(int)), 8, foot_color, -1)
                cv2.circle(ann, tuple(left_ankle.astype(int)), 8, foot_color, -1)
                cv2.line(ann, tuple(right_ankle.astype(int)), tuple(left_ankle.astype(int)), foot_color, 2)
                mid_ankle_x = int((right_ankle[0] + left_ankle[0]) / 2)
                mid_ankle_y = int(min(right_ankle[1], left_ankle[1]) - 10)
                cv2.putText(ann, "Feet", (mid_ankle_x, mid_ankle_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, foot_color, 1)

                # ---- 6. LEG FOUNDATION (side‑on vs open stance) ----
                front_ankle = get_pt(27)   # right ankle
                back_ankle = get_pt(28)    # left ankle
                leg_dist = abs(front_ankle[0] - back_ankle[0]) / w
                leg_color = (0, 255, 0)
                if leg_dist < 0.06:
                    findings.append("✅ **Solid Base:** Side-on stance, perfect for straight drives.")
                elif leg_dist <= 0.12:
                    findings.append("✅ **Slightly Open:** Front foot slightly open – good for playing across the line.")
                    leg_color = (0, 255, 255)  # yellow
                else:
                    wrongs.append("❌ **Stance too open:** Your base is too wide or too across. Align your feet with the crease.")
                    score -= 15
                    leg_color = (0, 0, 255)
                cv2.line(ann, tuple(front_ankle.astype(int)), tuple(back_ankle.astype(int)), leg_color, 2)
                mid_base_x = int((front_ankle[0] + back_ankle[0]) / 2)
                mid_base_y = int(min(front_ankle[1], back_ankle[1]) - 10)
                cv2.putText(ann, "Stance Base", (mid_base_x, mid_base_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, leg_color, 1)

                # ---- DRAW FULL DOTTED SKELETON ----
                for a, b in POSE_CONNECTIONS:
                    try:
                        draw_dotted_skeleton(ann, get_pt(a), get_pt(b), (200, 200, 200))
                    except:
                        continue

                # ---- FINAL OUTPUT ----
                final_score = max(score, 0)
                st.divider()
                st.subheader(f"Technical Score: {final_score}%")
                st.image(ann, caption="CricSmart AI Biometric Analysis", use_container_width=True)

                # ---- TWO COLUMNS FOR FEEDBACK ----
                c1, c2 = st.columns(2)
                with c1:
                    st.success("### Correct Mechanics")
                    if findings:
                        for f in findings:
                            st.write(f)
                    else:
                        st.write("_None_")
                with c2:
                    st.error("### Critical Errors")
                    if wrongs:
                        for w in wrongs:
                            st.write(w)
                    else:
                        st.write("_None_")

                # ---- FINAL MESSAGE ----
                if final_score >= 90 and len(wrongs) == 0:
                    st.balloons()
                    st.success("🌟 **Perfect Stance!** 🌟\n\nYour setup is textbook. You're ready to face any bowler!")
                elif final_score >= 75:
                    st.info("👍 Good stance! Work on the points above to fine-tune your technique.")
                else:
                    st.warning("📘 Review the corrections above and try again. Small adjustments make a big difference!")

            else:
                st.error("No player detected. Try cropping tighter around the batter.")

def drills_page():
    st.markdown("<h1>🏏 Pro Training Academy</h1>", unsafe_allow_html=True)
    st.markdown("<p style='color: #888;'>Select your role to unlock specialized AI-driven coaching modules.</p>", unsafe_allow_html=True)

    role = st.selectbox("Select Specialization", ["Batter", "Bowler", "All-rounder", "Wicketkeeper"])
    st.divider()

    if role == "Batter":
        tab1, tab2 = st.tabs(["📚 Batting Library", "📅 AI Weekly Planner"])
        with tab1:
            with st.expander("🏏 1. Basic Technique"):
                st.markdown("### **a) Shadow Batting**\n- 50–100 reps daily in a mirror. Focus on stance, grip, follow-through.")
                st.markdown("### **b) Front Foot Defense**\n- Partner throws; step forward straight.")
                st.markdown("### **c) Back Foot Practice**\n- Move back and across for cuts and punches.")
                if st.button("🎥 Watch Tutorial", key="bat_f"):
                    st.video("https://www.youtube.com/watch?v=M-WfX7-q4pU")
            with st.expander("🎯 2. Hand-Eye Coordination"):
                st.markdown("### **a) Wall Rebound**\n- Tennis ball rebound; improves timing.")
                st.markdown("### **b) One-Hand Batting**\n- Top hand only for control.")
                st.markdown("### **c) Colored Ball Drill**\n- Call ball color before hitting.")
            with st.expander("⚡ 3. Footwork & Movement"):
                st.markdown("### **a) Ladder Drill** — Quick feet with agility ladder.")
                st.markdown("### **b) Cone Movement** — React to coach's call.")
                st.markdown("### **c) Advance & Retreat** — Practice coming down for spin.")
            with st.expander("💥 4. Power & Shot-Making"):
                st.markdown("### **a) Range Hitting** — Clear specific zones powerfully.")
                st.markdown("### **b) Target Practice** — Score by hitting targets.")
                st.markdown("### **c) Lofted Shot Drill** — Controlled aerial technique.")
            with st.expander("🧠 5. Game Simulation"):
                st.markdown("### **a) Scenario** — 30 needed in 3 overs.")
                st.markdown("### **b) Strike Rotation** — Soft hands for singles.")
                st.markdown("### **c) Death Overs** — Hitting yorkers and slower balls.")
        with tab2:
            st.markdown("### **Personalized Growth Plan**")
            if st.button("📅 Generate My Batting Plan", use_container_width=True):
                with st.status("Analyzing your history...", expanded=True):
                    time.sleep(1)
                    days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
                    plan = ["Net Session","Shadow Batting","Range Hitting","Rest","Game Simulation","Footwork Drills","Active Recovery"]
                    for day, drill in zip(days, plan):
                        st.write(f"**{day}:** {drill}")

    elif role == "Bowler":
        style = st.radio("Bowling Style", ["Fast", "Medium", "Off-Spin", "Leg-Spin"], horizontal=True)
        tab1, tab2 = st.tabs(["🎯 Bowling Library", "📅 Bowling Plan"])
        with tab1:
            with st.expander("🎯 1. Accuracy & Line-Length"):
                st.write("**a) Cone Target:** Hit a good length 6/6.")
                st.write("**b) Yorker Practice:** Target the base of stumps.")
                st.write("**c) Corridor Bowling:** Stay in the corridor of uncertainty.")
                if st.button("🎥 Watch Tutorial", key="bowl_a"):
                    st.video("https://www.youtube.com/watch?v=8mG_J8N_2vY")
            with st.expander("⚡ 2. Run-Up & Rhythm"):
                st.write("**a) Marker Run-Up:** Repeat start-to-crease 10 times.")
                st.write("**b) Jump & Gather:** Smooth delivery transition.")
                st.write("**c) Shadow Run-Up:** Build muscle memory.")
            with st.expander("💪 3. Style Specific Drills"):
                if "Spin" in style:
                    st.write("**a) Spot Bowling** — Same revolution point.")
                    st.write("**b) Flight & Loop** — Create dip in the air.")
                    st.write("**c) Spin Release** — Finger/wrist rip.")
                else:
                    st.write("**a) Medicine Ball Throws** — Explosive power.")
                    st.write("**b) Sprint Intervals** — Speed and stamina.")
                    st.write("**c) Resistance Bands** — Strengthen bowling muscles.")
            with st.expander("🧠 4. Variations & Match Strategy"):
                st.write("**a) Variation Mix:** 1 bouncer, 2 slower balls, 3 stock.")
                st.write("**b) Death Over Drill:** Defend 10 runs in 6 balls.")
        with tab2:
            if st.button("📅 Generate Bowling Plan", use_container_width=True):
                days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
                focus = "Pace & Sprints" if "Fast" in style else "Flight & Control"
                plan = ["Accuracy (Cone Drills)", f"Style: {focus}", "Run-up & Rhythm", "Strength Training", "Variations", "Match Simulation", "REST"]
                st.success(f"7-Day {style} Program Generated!")
                for day, drill in zip(days, plan): st.write(f"**{day}:** {drill}")

    elif role == "All-rounder":
        tab1, tab2 = st.tabs(["🔄 Hybrid Library", "📅 All-Rounder Plan"])
        with tab1:
            with st.expander("🔄 1. Bat + Ball Combination"):
                st.markdown("### **a) Bowl–Bat Cycle**\n- Bowl 6 → Pad up → Face 6. Repeat 4 sets.")
                st.markdown("### **b) Pressure Switch**\n- Defend 10 runs then chase 10 runs.")
        with tab2:
            if st.button("📅 Generate All-Rounder Plan", use_container_width=True):
                days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
                plan = ["Batting + Light Bowling","Bowling + Fitness","Combination Drills","REST","Match Simulation","Strength + Fielding","Light Practice"]
                st.success("7-Day All-Rounder Hybrid Plan Generated!")
                for day, drill in zip(days, plan): st.write(f"**{day}:** {drill}")

    elif role == "Wicketkeeper":
        tab1, tab2 = st.tabs(["🧤 Keeper Library", "📅 Keeper Plan"])
        with tab1:
            with st.expander("⚡ 1. Reflex & Reaction"):
                st.markdown("### **a) Tennis Ball Rapid Fire**\n- Stand 5m away; fast-paced catches.")
                if st.button("🎥 Watch Tutorial", key="keep_r"):
                    st.video("https://www.youtube.com/watch?v=ZfXjI_WwN-w")
        with tab2:
            if st.button("📅 Generate Keeper Plan", use_container_width=True):
                days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
                plan = ["Reflex + Catching","Footwork + Fitness","Stumping + Run-outs","REST","Match Simulation","Mixed Drills","Light Recovery"]
                st.success("7-Day Wicketkeeper Plan Generated!")
                for day, drill in zip(days, plan): st.write(f"**{day}:** {drill}")

def chat_page():
    st.title("💬 AI Cricket Mentor")
    st.markdown("---")

    if "messages" not in st.session_state:
        st.session_state.messages = [
            {"role": "assistant", "content": "Hello! I'm your CricSmart AI Coach powered by Claude. Ask me anything about your batting, bowling, technique, or training!"}
        ]

    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    if prompt := st.chat_input("Ask about your stance, drills, or technique..."):
        with st.chat_message("user"):
            st.markdown(prompt)
        st.session_state.messages.append({"role": "user", "content": prompt})

        with st.chat_message("assistant"):
            message_placeholder = st.empty()
            message_placeholder.markdown("🤔 Thinking...")

            try:
                api_messages = [
                    {"role": m["role"], "content": m["content"]}
                    for m in st.session_state.messages
                    if m["role"] in ("user", "assistant")
                ]

                resp = requests.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": st.secrets.get("ANTHROPIC_API_KEY", ""),
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-haiku-4-5-20251001",
                        "max_tokens": 512,
                        "system": (
                            "You are CricSmart AI Coach, an expert cricket coach and analyst. "
                            "You give concise, actionable advice on batting technique, bowling, footwork, "
                            "fitness, and match strategy. Keep answers focused and practical. "
                            "Use cricket terminology naturally. Be encouraging but honest."
                        ),
                        "messages": api_messages,
                    },
                    timeout=30,
                )

                if resp.status_code == 200:
                    assistant_response = resp.json()["content"][0]["text"]
                else:
                    assistant_response = _fallback_mentor(prompt)

            except Exception:
                assistant_response = _fallback_mentor(prompt)

            full_response = ""
            for chunk in assistant_response.split():
                full_response += chunk + " "
                time.sleep(0.03)
                message_placeholder.markdown(full_response + "▌")
            message_placeholder.markdown(full_response)

        st.session_state.messages.append({"role": "assistant", "content": full_response})

def _fallback_mentor(prompt: str) -> str:
    p = prompt.lower()
    if any(w in p for w in ["head", "eyes", "balance"]):
        return "Keep your head still and eyes level throughout the shot. Try the 'Shadow Batting' drill — watch yourself in a mirror and focus on keeping your head from moving."
    elif any(w in p for w in ["fast", "pace", "bowling", "speed"]):
        return "For pace bowling, focus on your jump-and-gather at the crease. Medicine Ball throws build explosive power. Check the Bowling drills section."
    elif any(w in p for w in ["footwork", "feet", "movement"]):
        return "Good footwork starts with a balanced stance. Use the agility ladder drill daily — 10 minutes before any batting session makes a big difference."
    elif any(w in p for w in ["grip", "bat", "hold"]):
        return "Hold the bat with a 'V' formed by thumb and forefinger pointing down the splice. Don't squeeze too tight — a relaxed grip gives better timing."
    else:
        return f"Great question! For '{prompt}', focus on fundamentals first. Check your stance, grip and follow-through. Add it to your next training session and track progress in your Biometric Lab."

def profile_page():
    st.markdown(f"<h1>Welcome, Captain {st.session_state.get('username', 'Player')}! 👋</h1>", unsafe_allow_html=True)

    col1, col2, col3 = st.columns(3)
    with col1: st.metric(label="Primary Role", value="Batter")
    with col2: st.metric(label="Experience", value="Beginner")
    with col3: st.metric(label="Total Sessions", value="12")

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
        from core.db import DB_PATH
        st.code(f"DB path: {DB_PATH}\nDB exists: {DB_PATH.exists()}", language="text")
        if DB_PATH.exists():
            with get_conn() as conn:
                users = conn.execute("SELECT id, username, primary_role FROM users").fetchall()
            if users:
                st.dataframe(pd.DataFrame([dict(u) for u in users]))
            else:
                st.warning("No users in DB yet — sign up first.")

def ball_tracking_page():
    st.markdown("<h1>🎯 Ball Tracking Lab</h1>", unsafe_allow_html=True)
    st.write("Upload a cricket video to analyze ball trajectory, bounce, and shot recommendation.")

    uploaded_video = st.file_uploader("Upload Cricket Video", type=["mp4", "mov", "avi"])

    if uploaded_video:
        video_path = "temp_video.mp4"
        with open(video_path, "wb") as f:
            f.write(uploaded_video.read())

        st.video(video_path)

        if st.button("🚀 Analyze Ball Tracking", use_container_width=True):

            with st.spinner("Analyzing ball trajectory..."):

                roi_box = (200, 150, 800, 400)

                # ✅ UPDATED (includes shot)
                result = analyze_ball_tracking(
                    video_path,
                    roi_box=roi_box,
                    track_ball=True,
                    advanced=True,
                    fps=30
                )

                # ✅ SAFE UNPACKING
                if len(result) == 6:
                    ball_trail, bounce_point, bat_impact, predicted_path, stats, shot = result
                else:
                    ball_trail, bounce_point, bat_impact, predicted_path, stats = result
                    shot = "Unknown"

                # ---------------- BASIC INFO ----------------
                st.subheader("📊 Detection Summary")

                if ball_trail:
                    st.success(f"Ball detected in {len(ball_trail)} frames")
                    st.write("Sample:", ball_trail[:5])
                else:
                    st.error("❌ No ball detected — try a clearer video")
                    return

                # ---------------- RESULTS ----------------
                st.subheader("📊 Analysis Results")

                if bounce_point:
                    st.info(f"📍 Bounce Point: {bounce_point}")

                # 🧠 Decision Logic
                if bat_impact:
                    st.success("🏏 Ball Hit the Bat")

                elif predicted_path:
                    st.error("🟥 Ball would hit the stumps")

                else:
                    st.warning("❌ Ball missed everything")

                # ⚡ Speed Calculation (SAFE)
                if ball_trail and len(ball_trail) > 5:
                    try:
                        speed = calculate_speed(ball_trail[-5], ball_trail[-1], 5/30)
                        st.metric("⚡ Ball Speed", f"{speed:.2f} km/h")
                    except:
                        st.warning("Speed calculation failed")

                # 🎯 SHOT RECOMMENDATION (NEW FEATURE)
                st.subheader("🏏 Shot Recommendation")

                if shot:
                    st.success(shot)
                else:
                    st.warning("Shot could not be determined")

                # ---------------- VISUALIZATION ----------------
                st.subheader("🎥 Visual Output")

                cap = cv2.VideoCapture(video_path)
                output_frames = []
                i = 0

                while cap.isOpened():
                    ret, frame = cap.read()
                    if not ret:
                        break

                    # 🟢 Draw trajectory
                    for j in range(1, min(len(ball_trail), i)):
                        cv2.line(frame, ball_trail[j-1], ball_trail[j], (0, 255, 0), 2)

                    # 🔵 Bounce point
                    if bounce_point:
                        cv2.circle(frame, bounce_point, 8, (255, 0, 0), -1)

                    # 🔴 Predicted path
                    if predicted_path:
                        for p in predicted_path:
                            cv2.circle(frame, p, 3, (0, 0, 255), -1)

                    output_frames.append(frame)
                    i += 1

                cap.release()

                # 🎬 Save processed video
                if output_frames:
                    output_path = "output.mp4"
                    h, w, _ = output_frames[0].shape

                    out = cv2.VideoWriter(
                        output_path,
                        cv2.VideoWriter_fourcc(*'mp4v'),
                        30,
                        (w, h)
                    )

                    for frame in output_frames:
                        out.write(frame)

                    out.release()

                    st.video(output_path)

                # 📦 Raw stats
                if stats:
                    st.subheader("📦 Debug Stats")
                    st.json(stats)
# ── MAIN ROUTER ───────────────────────────────────────────────────────────────
def main():
    if 'current_page' not in st.session_state:
        st.session_state.current_page = "Home"

    inject_cricket_theme()
    init_db()

    with st.sidebar:
        st.markdown("<h2 style='color: #22C55E; text-align: center;'>🏏 CricSmart AI</h2>", unsafe_allow_html=True)
        st.divider()

        if st.button(" Home", use_container_width=True):
            st.session_state.current_page = "Home"
            st.rerun()

        if st.button(" Biometric Lab", use_container_width=True):
            st.session_state.current_page = "Analysis"
            st.rerun()

        if st.button(" Training Drills", use_container_width=True):
            st.session_state.current_page = "Drills"
            st.rerun()

        if st.button(" AI Mentor", use_container_width=True):
            st.session_state.current_page = "Chat"
            st.rerun()

        if st.button(" My Profile", use_container_width=True):
            st.session_state.current_page = "Profile"
            st.rerun()

        if st.button(" Settings", use_container_width=True):
            st.session_state.current_page = "Settings"
            st.rerun()

        # ✅ FIX: Ball Tracking for ALL users
        if st.button(" Ball Tracking", use_container_width=True):
            st.session_state.current_page = "BallTracking"
            st.rerun()

        # 👑 Admin Panel ONLY for admin
        user = current_user()
        if user and user.get('is_admin', 0) == 1:
            if st.button(" Admin Panel", use_container_width=True):
                st.session_state.current_page = "Admin"
                st.rerun()

    # ---------------- PAGE ROUTING ----------------
    page = st.session_state.current_page

    if page == "Home":
        home_page()

    elif page == "Analysis":
        if is_logged_in():
            stance_analysis_page()
        else:
            st.warning("🔒 Please login to access the Biometric Lab.")
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
            st.warning("🔒 Admin access only.")
            st.session_state.current_page = "Home"
            st.rerun()


if __name__ == "__main__":
    main()