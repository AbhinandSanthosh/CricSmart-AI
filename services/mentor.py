import streamlit as st
import requests
import time


def fallback_mentor(prompt: str) -> str:
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


def chat_page():
    st.title("💬 AI Cricket Mentor")
    st.markdown("---")

    from prompt import SYSTEM_PROMPT

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
                        "system": SYSTEM_PROMPT,
                        "messages": api_messages,
                    },
                    timeout=30,
                )

                if resp.status_code == 200:
                    assistant_response = resp.json()["content"][0]["text"]
                else:
                    assistant_response = fallback_mentor(prompt)

            except Exception:
                assistant_response = fallback_mentor(prompt)

            full_response = ""
            for chunk in assistant_response.split():
                full_response += chunk + " "
                time.sleep(0.03)
                message_placeholder.markdown(full_response + "▌")
            message_placeholder.markdown(full_response)

        st.session_state.messages.append({"role": "assistant", "content": full_response})