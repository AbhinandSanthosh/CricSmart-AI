# prompt.py – AI Cricket Mentor System Prompt & Fallback

SYSTEM_PROMPT = """You are CricSmart AI Coach, an expert cricket coach and analyst.
Your tone is encouraging, patient, and supportive. You understand that cricket is as much a mental game as a technical one.
You give concise, actionable advice on batting, bowling, fielding, fitness, and match strategy.
Use cricket terminology naturally. When a player struggles, acknowledge their effort and provide a clear path forward.
Always promote proper technique, safety, and a positive mindset.

Focus on these areas:
- Batting (stance, grip, footwork, shot selection, power hitting)
- Bowling (action, run-up, variations, accuracy)
- Fielding (catching, ground fielding, throwing, diving)
- Fitness and conditioning
- Mental aspects (focus, confidence, handling pressure, dealing with loss)
- Drills and practice routines"""

def fallback_mentor(prompt: str) -> str:
    """Polite, technically accurate, and mentally supportive fallback."""
    p = prompt.lower()

    # ---------- DEALING WITH LOSS ----------
    if any(w in p for w in ["lost", "loss", "defeat", "we lost", "match lost", "losing", "disappointed"]):
        return ("**Dealing with a tough loss:**\n\n"
                "First, give yourself and your team credit for the effort. Every match teaches something.\n\n"
                "1. **Reflect, don't dwell**: Think about one thing you did well and one thing you can improve.\n"
                "2. **Team talk**: Share what you learned with teammates. A loss can strengthen bonds.\n"
                "3. **Reset mentally**: Tomorrow is a new day. Leave the result on the field and focus on your next session.\n\n"
                "🏏 **Cricket wisdom**: Even the greatest players have lost matches. What matters is how you respond. Use this as fuel to train harder and smarter.\n\n"
                "You've got this. One practice at a time.")

    # ---------- BOWLING (explicit cues first) ----------
    # Check for clear bowling intent
    bowling_cues = ["how to bowl", "how to ball", "bowling tips", "bowl a", "bowl the", "how to deliver", "bowling action", "bowling variations"]
    is_bowling_query = any(cue in p for cue in bowling_cues) or (("bowl" in p or "bowling" in p) and "face" not in p and "play" not in p)

    if is_bowling_query:
        # --- Bowl inswing ---
        if "inswing" in p:
            return ("**How to bowl inswing:**\n\n"
                    "1. **Grip**: Hold the seam upright with the shiny side on the leg side (for a right‑hander to a right‑hander).\n"
                    "2. **Release**: At release, the wrist is slightly turned towards the slips. The seam should point towards the leg side.\n"
                    "3. **Action**: Keep your arm upright and follow through towards the batsman.\n\n"
                    "🎯 **Drill**: Practice with a semi‑new ball on a good length. Mark a target on the pitch and try to get the ball to move.")

        # --- Bowl outswing ---
        elif "outswing" in p:
            return ("**How to bowl outswing:**\n\n"
                    "1. **Grip**: Seam upright, shiny side on the off side.\n"
                    "2. **Release**: Wrist slightly rotated away from the batsman (towards the slips). The seam points towards first slip.\n"
                    "3. **Action**: Keep your arm high and follow through towards the slips.\n\n"
                    "🎯 **Drill**: Place a marker on a good length and aim to make the ball curve away. Use a slip cordon to judge movement.")

        # --- Bowl bouncer / short ball ---
        elif any(w in p for w in ["bouncer", "short ball"]):
            return ("**How to bowl a bouncer:**\n\n"
                    "1. **Grip**: Normal seam grip.\n"
                    "2. **Length**: Aim short, around halfway down the pitch.\n"
                    "3. **Action**: Bowl with a slightly quicker arm and more shoulder rotation. The ball should rise towards the batter's head.\n\n"
                    "⚠️ **Safety**: Use bouncers sparingly and only if you have control. Always inform the umpire and batter (in club cricket) to avoid dangerous bowling.")

        # --- Bowl yorker ---
        elif any(w in p for w in ["yorker", "full ball"]):
            return ("**How to bowl a yorker:**\n\n"
                    "1. **Grip**: Normal seam grip, but sometimes with a slightly lower wrist.\n"
                    "2. **Length**: Aim at the batsman's toes. The ball should land right at the crease line.\n"
                    "3. **Action**: Release the ball later in your delivery stride, keeping your wrist straight.\n\n"
                    "🎯 **Drill**: Place a shoe or a coin at the batsman's feet and practice hitting it repeatedly.")

        # --- Bowl slower ball ---
        elif any(w in p for w in ["slower ball", "slow ball", "change of pace", "slower delivery"]):
            return ("**How to bowl a slower ball:**\n\n"
                    "There are several types:\n"
                    "1. **Off‑cutter**: Grip like a seam‑up, but roll your fingers over the seam. It lands like a seam delivery but is slower.\n"
                    "2. **Leg‑cutter**: Use a wrist flick similar to a leg‑spin grip.\n"
                    "3. **Back‑of‑hand slower ball**: The ball is held like a bouncer but released with the back of the hand. It dips and lands shorter.\n"
                    "4. **Split‑finger slower ball**: Spread the index and middle fingers apart across the seam.\n\n"
                    "💡 **Tip**: Vary the pace without changing your action too much. Practice each variation separately before using them in matches.")

        # --- Bowl spin (leg‑spin, off‑spin, googly) ---
        elif any(w in p for w in ["spin", "leg-spin", "off-spin", "googly"]):
            if "leg-spin" in p or "googly" in p:
                return ("**How to bowl leg‑spin / googly:**\n\n"
                        "**Leg‑spin**:\n"
                        "1. **Grip**: The ball rests between the first two fingers and the thumb. The index finger and middle finger are split.\n"
                        "2. **Release**: Wrist turns sharply from right to left (for a right‑handed bowler). The ball spins from leg to off.\n"
                        "**Googly (wrong'un)**:\n"
                        "1. **Grip**: Same as leg‑spin, but the wrist turns the opposite way (from left to right).\n"
                        "2. **Release**: The back of the hand faces the batsman at delivery.\n\n"
                        "🎯 **Drill**: Bowl at a target on the pitch. Focus on consistency before adding drift and turn.")
            else:
                return ("**How to bowl off‑spin:**\n\n"
                        "1. **Grip**: The ball is held with the first two fingers spread across the seam, with the thumb on the seam underneath.\n"
                        "2. **Release**: As you deliver, roll your fingers over the ball. The index finger imparts spin.\n"
                        "3. **Action**: Keep your arm high and pivot on your front foot. Follow through with your hip rotation.\n\n"
                        "📚 **Drill**: Bowl at a spot on the pitch, trying to land on a consistent length. Add flight and dip later.")

        # --- General bowling fallback ---
        else:
            return ("To give you the best bowling advice, please specify what you'd like to learn:\n"
                    "- How to bowl inswing / outswing\n"
                    "- How to bowl a bouncer, yorker, or slower ball\n"
                    "- How to bowl spin (leg‑spin, off‑spin, googly)\n"
                    "- Or any other specific variation\n\n"
                    "I'll then give you step‑by‑step technique and drills.")

    # ---------- BATTING (explicit cues or remaining queries) ----------
    # Check for clear batting intent
    batting_cues = ["how to face", "facing", "play against", "bat against", "shot to play", "best shot"]
    is_batting_query = any(cue in p for cue in batting_cues) or (("bat" in p or "batting" in p) and "bowl" not in p)

    if is_batting_query:
        # --- Facing inswing ---
        if "inswing" in p:
            return ("**Facing inswing bowling:**\n\n"
                    "Inswing comes into the batsman. Key points:\n"
                    "1. **Watch the seam**: Identify the angle at release. If it's angled towards the slips, it's likely inswing.\n"
                    "2. **Footwork**: Get your front foot across towards the line of the ball to negate the swing.\n"
                    "3. **Bat angle**: Keep the bat straight and close to the pad to avoid lbw.\n"
                    "4. **Best shots**:\n"
                    "   - **Defensive block**: If unsure, defend with a straight bat.\n"
                    "   - **On‑drive / straight drive**: If it's full and swinging, drive along the ground.\n"
                    "   - **Clip off the pads**: If it's on the pads, work it to the leg side.\n\n"
                    "🧠 **Mindset**: Trust your judgment. Don't commit fully until you've picked the line early.")

        # --- Facing outswing ---
        elif "outswing" in p:
            return ("**Facing outswing bowling:**\n\n"
                    "Outswing moves away from the batsman. Key points:\n"
                    "1. **Watch the seam**: If the seam is angled towards the slips, it may outswing.\n"
                    "2. **Footwork**: Stay beside the line of the ball; don't chase the ball.\n"
                    "3. **Leave the ball**: If it's outside off and moving away, leave it if possible.\n"
                    "4. **Best shots**:\n"
                    "   - **Defensive block**: Defend with soft hands, letting the ball come to the bat.\n"
                    "   - **Cover drive**: If it's full and wide, a controlled cover drive can be effective.\n"
                    "   - **Late cut**: If it's short and wide, use the pace.\n\n"
                    "🎯 **Drill**: Practice with a bowling machine or partner who can swing the ball, focusing on leaving and playing late.")

        # --- Facing bouncer / short ball ---
        elif any(w in p for w in ["bouncer", "short ball", "short-pitched"]):
            return ("**Playing the bouncer / short ball:**\n\n"
                    "1. **Recognise early**: Look for the bowler's wrist position and a shorter length.\n"
                    "2. **Footwork**: Move back and across (or stand tall) depending on the line.\n"
                    "3. **Best shots**:\n"
                    "   - **Pull shot**: If it's chest‑high or lower, rock back and pull firmly.\n"
                    "   - **Hook**: If it's head‑high and on the line of the body, hook with control.\n"
                    "   - **Leave or duck**: If it's too high or wide, let it go.\n\n"
                    "💪 **Safety first**: Always wear a helmet against short‑pitched bowling. Practice with a partner using a tennis ball before facing hard balls.")

        # --- Facing yorker / full ball ---
        elif any(w in p for w in ["yorker", "full ball", "full toss"]):
            return ("**Playing the yorker / full ball:**\n\n"
                    "A yorker is a full delivery aimed at the base of the stumps.\n"
                    "1. **Watch early**: Pick the length as soon as possible.\n"
                    "2. **Footwork**: Get your front foot to the pitch of the ball.\n"
                    "3. **Best shots**:\n"
                    "   - **Defense**: If it's a good yorker, block with a straight bat, keeping the bat close to the pad.\n"
                    "   - **Drive**: If it's a full toss, a controlled drive along the ground is safe.\n"
                    "   - **Scoop / ramp**: For advanced players, a ramp shot can be used, but only with practice.\n\n"
                    "🔥 **Drill**: Practice with a partner who throws yorkers from a short distance. Learn to keep the bat down early.")

        # --- Facing slower ball / slow ball ---
        elif any(w in p for w in ["slower ball", "slow ball", "slow delivery", "change of pace"]):
            return ("**Facing slower deliveries:**\n\n"
                    "Slower balls are meant to deceive your timing.\n"
                    "1. **Detect early**: Watch the bowler's hand. A slower ball often comes from a different grip or a pause in the action.\n"
                    "2. **Wait**: Don't commit too early. Let the ball come to you.\n"
                    "3. **Best shots**:\n"
                    "   - **Defense**: If surprised, just block.\n"
                    "   - **Lofted drive**: If it's full and you pick it, you can hit over the infield.\n"
                    "   - **Cut / pull**: If it's short, you have time to play horizontal bat shots.\n\n"
                    "🧠 **Mental tip**: Slow balls are often used when the batter is expecting pace. Stay balanced and adjust your timing.")

        # --- Facing spin (googly, leg-spin, off-spin) ---
        elif any(w in p for w in ["spin", "googly", "leg-spin", "off-spin", "wrong'un"]):
            if "googly" in p:
                return ("**Facing a googly (leg‑spinner's wrong'un):**\n\n"
                        "A googly turns opposite to a normal leg‑spinner.\n"
                        "1. **Watch the hand**: The back of the hand faces the batsman at release.\n"
                        "2. **Play late**: Wait for the ball to pitch and turn.\n"
                        "3. **Best shots**:\n"
                        "   - **Forward defence** – if unsure, use a straight bat.\n"
                        "   - **Straight drive / on‑drive** – if you pick it early.\n"
                        "   - **Sweep** – only if you are confident; a controlled sweep can work.\n\n"
                        "📖 **Drill**: Practice against a spinner who bowls both leg‑spin and googly. Focus on watching the hand.")
            else:
                return ("**Playing spin bowling effectively:**\n\n"
                        "1. **Read the bowler**: Watch the wrist and fingers at release.\n"
                        "2. **Use your feet**: Get to the pitch of the ball by stepping out or staying back.\n"
                        "3. **Play with soft hands**: Avoid giving catching chances.\n"
                        "4. **Best shots**:\n"
                        "   - **Sweep / reverse sweep** – good against full balls.\n"
                        "   - **Drive** – if you reach the pitch.\n"
                        "   - **Defense** – your biggest weapon.\n\n"
                        "🧠 **Mindset**: Patience is key against spin. Wait for the loose ball.")

        # --- General batting fallback ---
        else:
            return (f"To help you face that delivery, I need a bit more detail. Could you tell me which delivery you're asking about? For example:\n"
                    "- Inswing / Outswing\n"
                    "- Bouncer / Short ball\n"
                    "- Yorker / Full ball\n"
                    "- Slower ball\n"
                    "- Spin (googly, leg‑spin, off‑spin)\n\n"
                    "Once I know, I can give you the best shot options and technique tips.")

    # ---------- OTHER TOPICS ----------
    elif any(w in p for w in ["fielding", "field", "catch", "throwing", "diving", "ground fielding"]):
        return ("**Fielding tips:**\n\n"
                "1. **Catching**: Keep your eyes on the ball until it settles in your hands. Use soft hands – let the ball come to you.\n"
                "2. **Ground fielding**: Get low, keep your back straight, and use the 'long barrier' to stop the ball.\n"
                "3. **Throwing**: Work on your release point and accuracy. Practice throwing at a single stump from different distances.\n"
                "4. **Diving**: Practice on soft ground first. Always land on your side, not on your knees or elbows.\n\n"
                "💡 **Mental tip**: Trust your preparation. Visualise taking the catch or stopping the ball before the ball is bowled.")

    elif any(w in p for w in ["focus", "concentrate", "watch the ball", "lose focus", "distracted", "seeing the ball"]):
        return ("**Improving focus at the crease:**\n\n"
                "1. **Head position**: Keep your head still and level. Any movement affects your vision.\n"
                "2. **Tracking the ball**: Pick up the ball as early as possible – from the bowler's hand. Use a 'trigger' like tapping the bat to stay alert.\n"
                "3. **Drills**: Practice with a partner who throws balls from close range, forcing you to react quickly.\n"
                "4. **Breathing**: Between deliveries, take deep breaths to reset. Never let one bad ball affect your concentration on the next.\n\n"
                "🧠 **Mental support**: Concentration is a skill you build. If you lose focus, tell yourself 'next ball only'.")

    elif any(w in p for w in ["confidence", "nervous", "scared", "pressure", "mentally"]):
        return ("**Building mental strength:**\n\n"
                "1. **Preparation**: Visualise success. Picture yourself playing each ball well.\n"
                "2. **Routine**: Have a pre‑delivery routine (tap the bat, take a breath) to focus.\n"
                "3. **Mistakes**: Everyone makes them. After a mistake, say 'next ball' and reset.\n"
                "4. **Support**: Talk to teammates, coaches, or a mentor. You're not alone.\n\n"
                "🌟 You have the skill – now trust it. One ball at a time.")

    # ---------- DEFAULT: ASK FOR CLARIFICATION ----------
    else:
        return (f"Thanks for asking about '{prompt}'. I'd love to help you improve.\n\n"
                "Could you tell me if this is about batting, bowling, or fielding?\n\n"
                "For batting, I can help with facing different deliveries (swing, bouncers, yorkers, slower balls, spin).\n"
                "For bowling, I can explain how to bowl inswing, outswing, bouncers, yorkers, slower balls, and spin variations.\n\n"
                "Just let me know, and we'll work on it together. 💪")