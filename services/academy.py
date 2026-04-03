import streamlit as st
import time


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
                for day, drill in zip(days, plan):
                    st.write(f"**{day}:** {drill}")

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
                for day, drill in zip(days, plan):
                    st.write(f"**{day}:** {drill}")

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
                for day, drill in zip(days, plan):
                    st.write(f"**{day}:** {drill}")