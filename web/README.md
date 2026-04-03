# CricSmart AI (Next.js)

Modern, AI-powered cricket training platform built with Next.js 15, Tailwind CSS, and shadcn/ui.

## Features

- **Biometric Stance Analysis** — MediaPipe pose detection runs in-browser. Upload a photo or use your camera for instant 6-metric batting stance analysis with skeleton overlay.
- **Ball Tracking Lab** — Upload cricket video for ball speed (km/h), trajectory, bounce point, and shot type classification. Powered by YOLO v8 via a Python microservice.
- **AI Mentor Chat** — Cricket coaching chatbot. Uses Ollama (free, local) when available, with a comprehensive rule-based fallback covering batting, bowling, fielding, and mental game.
- **Training Drills Academy** — Role-specific drill libraries (Batter, Bowler, All-Rounder, Wicketkeeper) with step-by-step instructions, YouTube links, and AI-generated 7-day plans.
- **Live Match Data** — Live scores, recent results, upcoming matches, and cricket news via CricAPI + ESPN RSS.
- **Auth & Profiles** — SQLite-backed user system with roles, skill levels, and admin panel.

## Quick Start

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Default admin:** username `admin`, password `admin123`

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 (App Router), Tailwind CSS, shadcn/ui |
| State | Zustand |
| Database | SQLite (better-sqlite3) |
| Auth | Cookie-based sessions (bcryptjs) |
| Pose Analysis | MediaPipe Tasks Vision (browser-side) |
| AI Chat | Ollama (local LLM) + rule-based fallback |
| Ball Tracking | Python FastAPI + YOLO v8 |
| Live Data | CricAPI + ESPN RSS |

## Optional Services

Everything works out of the box with fallbacks. For enhanced features:

### Ollama (AI Mentor)
```bash
# Install: https://ollama.com
ollama run llama3.2
```

### Ball Tracking ML Service
```bash
cd ml-service
pip install -r requirements.txt
python server.py
```

### CricAPI (Live Scores)
Get a free key at [cricapi.com](https://cricapi.com), then add to `.env.local`:
```
CRICAPI_KEY=your_key_here
```

## Project Structure

```
web/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login, Signup
│   │   ├── (app)/           # Dashboard, Biometric, Drills, Mentor, etc.
│   │   └── api/             # Auth, Mentor, Live data, Users
│   ├── components/ui/       # shadcn/ui components
│   ├── lib/                 # DB, Auth, Pose analysis, Mentor fallback
│   └── store/               # Zustand auth store
├── ml-service/              # Python FastAPI ball tracking service
└── package.json
```
