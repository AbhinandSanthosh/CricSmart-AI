import requests
import feedparser
from datetime import datetime


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


def get_live_and_upcoming():
    matches = {"live": [], "upcoming": [], "completed": []}

    try:
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
                            date_time = raw_time[:10] if raw_time else "Date TBC"

                score = "Match not started"
                if match.get("score"):
                    try:
                        score = " | ".join([
                            f"{i.get('r',0)}/{i.get('w',0)} ({i.get('o',0)})"
                            for i in match["score"]
                        ])
                    except:
                        score = "Live"

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

    except Exception as e:
        print("Error:", e)

    # Fallback if empty
    if not matches["live"] and not matches["upcoming"] and not matches["completed"]:
        matches["live"] = [{"title": "India vs England", "score": "245/6 (45) | 210/8 (50)", "status": "LIVE 🔴", "league": "ICC ODI Series", "date": "Today, 2:30 PM", "summary": "India is chasing 250."}]
        matches["completed"] = [{"title": "Australia vs Pakistan", "score": "300/7 | 280/10", "status": "COMPLETED ✅", "league": "ICC World Cup", "date": "Yesterday", "summary": "Australia won by 20 runs."}]
        matches["upcoming"] = [{"title": "India vs Australia", "score": "Match yet to start", "status": "UPCOMING ⏳", "league": "Border-Gavaskar Trophy", "date": "Tomorrow, 9:30 AM", "summary": "Highly anticipated test match."}]

    return matches


def get_cricket_news():
    try:
        feed = feedparser.parse("https://www.espncricinfo.com/rss/content/story/feeds/0.xml")
        return [{"title": e.title, "link": e.link, "date": e.published[:16]} for e in feed.entries[:6]]
    except:
        return []