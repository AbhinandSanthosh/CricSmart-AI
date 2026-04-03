# CricEye AI

AI-powered cricket training platform built with Next.js. Analyze your batting stance, track ball deliveries, get AI coaching, and follow live matches — all in one place.

## Features

- **Stance Lab** — Upload a photo or use your camera. MediaPipe pose detection analyzes your batting stance and scores alignment, knee bend, elbow height, and more.
- **Ball Tracking** — Upload cricket video, trim the clip, and analyze ball trajectory, speed, bounce point, and whether it hits the stumps (powered by a Python YOLO ML service).
- **AI Coach** — Chat with an AI cricket mentor for advice on batting, bowling, fielding, fitness, and the mental game. Powered by OpenRouter (free LLM models).
- **Training Academy** — Structured drills for shadow batting, front foot defense, wall rebounds, and more. Track your progress.
- **Live Matches** — Real-time cricket scores via CricAPI with team flags, overs, and match status.
- **Cricket News** — Latest headlines from ESPN Cricinfo RSS feed.
- **Profile & Settings** — Player profile with role, skill level, and account management.
- **Admin Panel** — Hidden admin page (`/admin`) with password gate to manage users.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React, TypeScript |
| Styling | Custom CSS (glassmorphism, 12-col grid), Montserrat + Inter fonts |
| Database | Turso (libSQL) — SQLite-compatible, works on Vercel |
| Auth | Cookie-based sessions with bcryptjs |
| Pose Detection | MediaPipe Tasks Vision (runs in browser) |
| AI Coach | OpenRouter API (free models) with rule-based fallback |
| Ball Tracking | Python FastAPI + YOLO (optional, local service) |
| Live Data | CricAPI (free tier) + ESPN RSS |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Local Development

```bash
cd web
npm install
cp .env.example .env.local  # add your API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Default admin login: `admin` / `admin123`.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TURSO_DATABASE_URL` | For production | Turso database URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | For production | Turso auth token |
| `CRICAPI_KEY` | Optional | CricAPI key for live match scores |
| `OPENROUTER_API_KEY` | Optional | OpenRouter key for AI coach |
| `OPENROUTER_MODEL` | Optional | Model ID (default: `liquid/lfm-2.5-1.2b-instruct:free`) |

Without env vars, the app uses local SQLite, demo match data, and rule-based coaching fallback.

### Optional: Ball Tracking ML Service

```bash
cd ml-service
pip install -r requirements.txt
python server.py
```

Runs on `http://localhost:8000`. The web app detects it automatically.

## Deploy to Vercel

1. Push code to GitHub
2. Create a free Turso database: `turso db create criceye`
3. Import repo on [vercel.com/new](https://vercel.com/new) — set root directory to `web`
4. Add environment variables (Turso URL/token, CricAPI key, OpenRouter key)
5. Deploy

## License

MIT
