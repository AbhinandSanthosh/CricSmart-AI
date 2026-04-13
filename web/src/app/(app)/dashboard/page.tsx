"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { Activity, Video, Brain, Dumbbell, ChevronRight, Trophy, Zap, ArrowRight } from "lucide-react";

interface Match {
  id: string;
  teams: string;
  score: string;
  status: string;
  league: string;
  state: "live" | "completed" | "upcoming";
}

interface NewsItem {
  title: string;
  link: string;
  published: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    fetch("/api/live")
      .then((r) => r.json())
      .then((data) => {
        setMatches(data.matches || []);
        setNews(data.news || []);
      })
      .catch(() => {});
  }, []);

  const liveMatches = matches.filter((m) => m.state === "live");
  const completedMatches = matches.filter((m) => m.state === "completed");
  const upcomingMatches = matches.filter((m) => m.state === "upcoming");
  const topMatch = liveMatches[0] || completedMatches[0];

  return (
    <div className="grid grid-cols-12 gap-6">

      {/* Hero Section */}
      <div className="col-span-12 py-6">
        <p className="label-bracket mb-4">Welcome back, {user?.username}</p>
        <h1 className="hero-title">
          Your Cricket<br />
          <span className="text-[var(--cs-accent)]">Training Hub</span>
        </h1>
        <p className="text-[var(--text-muted)] text-base leading-relaxed max-w-[540px] mb-6">
          {user?.primary_role} &middot; {user?.skill_level} level. Track your biometrics, follow drills, and get AI coaching — all in one place.
        </p>
        <div className="flex gap-3 flex-wrap">
          <Link href="/drills" className="btn btn-primary text-base no-underline">
            Start Drill
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/mentor" className="btn btn-secondary text-base no-underline">
            Ask Coach
          </Link>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="col-span-12 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {[
          { href: "/biometric", icon: Activity, label: "Stance Lab", desc: "Analyze your batting stance", color: '#65b741' },
          { href: "/ball-tracking", icon: Video, label: "Ball Tracking", desc: "Track ball speed & trajectory", color: '#ef4444' },
          { href: "/drills", icon: Dumbbell, label: "Training Drills", desc: "Role-specific practice routines", color: '#3b82f6' },
          { href: "/mentor", icon: Brain, label: "AI Coach", desc: "Get personalized coaching", color: '#8b5cf6' },
        ].map((card) => (
          <Link key={card.href} href={card.href} className="no-underline text-inherit">
            <div className="feature-card">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${card.color}15` }}
              >
                <card.icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
              <h3 className="text-base font-semibold mb-1 text-[var(--text-main)]">{card.label}</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">{card.desc}</p>
              <ChevronRight className="absolute top-6 right-5 w-4 h-4 text-[var(--text-muted)] opacity-40" />
            </div>
          </Link>
        ))}
      </div>

      {/* Stats Strip */}
      <div className="stats-strip col-span-12">
        <div className="stat-box">
          <div className="label-bracket">Total Sessions</div>
          <div className="stat-val">--</div>
        </div>
        <div className="stat-box">
          <div className="label-bracket">Avg Stance Score</div>
          <div className="stat-val">--<span className="text-lg text-[var(--text-muted)]"> %</span></div>
        </div>
        <div className="stat-box">
          <div className="label-bracket">Drills Completed</div>
          <div className="stat-val">--</div>
        </div>
      </div>

      {/* Live Match */}
      <div className="panel col-span-12 md:col-span-6">
        <div className="panel-header">
          <span className="label-bracket">Live Feed</span>
          <h2 className="panel-title">Live Match</h2>
        </div>
        {topMatch ? (
          <div>
            <div className="flex flex-col gap-5">
              {(() => {
                const parts = topMatch.teams.split(' vs ');
                const scores = topMatch.score ? topMatch.score.split(' | ') : [];
                return (
                  <>
                    <div className="flex justify-between items-baseline">
                      <div>
                        <div className="team-name">{parts[0]?.replace(/[^\w\s]/g, '').trim().substring(0, 3).toUpperCase() || 'TM1'}</div>
                        <div className="text-xs text-[var(--text-muted)] font-medium mt-1">{topMatch.status}</div>
                      </div>
                      <div className="runs">{scores[0] || '--'}</div>
                    </div>
                    <div className="h-px bg-[var(--cs-border)]" />
                    <div className="flex justify-between items-baseline">
                      <div className="team-name text-[var(--text-muted)]">
                        {parts[1]?.replace(/[^\w\s]/g, '').trim().substring(0, 3).toUpperCase() || 'TM2'}
                      </div>
                      <div className="runs" style={{ color: scores[1] ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {scores[1] || '0/0'}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="match-status">
              {topMatch.state === 'live' && <div className="live-dot" />}
              {topMatch.status}
            </div>
            {(completedMatches.length > 0 || upcomingMatches.length > 0) && (
              <div className="mt-5 pt-4 border-t border-[var(--cs-border)]">
                {completedMatches.slice(0, 2).map((m) => (
                  <div key={m.id} className="mb-3 text-xs">
                    <div className="font-semibold text-[var(--text-main)]">{m.teams}</div>
                    <div className="text-[var(--cs-accent)] text-[11px] mt-0.5">{m.status}</div>
                  </div>
                ))}
                {upcomingMatches.slice(0, 2).map((m) => (
                  <div key={m.id} className="mb-3 text-xs">
                    <div className="font-semibold text-[var(--text-muted)]">{m.teams}</div>
                    <div className="text-[var(--text-muted)] text-[11px] mt-0.5">{m.status}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-[var(--text-muted)] text-sm text-center py-10">
            No live matches right now
          </div>
        )}
      </div>

      {/* Stance Lab Widget */}
      <div className="panel col-span-12 md:col-span-6 min-h-[300px]">
        <div className="panel-header">
          <span className="label-bracket">Pose Detection</span>
          <h2 className="panel-title">Stance Lab</h2>
        </div>
        <Link href="/biometric" className="no-underline flex-1 flex">
          <div className="video-container flex-1 min-h-[200px]">
            <span className="text-[var(--text-muted)] font-semibold tracking-wider opacity-30 text-sm">
              CAMERA FEED
            </span>
            <div className="analysis-overlay">
              <div className="metric-val">--<span className="text-base">%</span></div>
              <div className="metric-label">STANCE SCORE</div>
              <div className="h-px bg-white/10 my-3" />
              <div className="metric-val text-[var(--cs-accent)]">0<span className="text-base">&deg;</span></div>
              <div className="metric-label">HEAD ALIGNMENT</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Today's Drills */}
      <div className="panel col-span-12 md:col-span-7">
        <div className="panel-header">
          <span className="label-bracket">Recommended</span>
          <h2 className="panel-title">Today&apos;s Training</h2>
        </div>
        <div className="flex flex-col gap-2.5">
          {[
            { name: "Shadow Batting", desc: "Practice shots to build muscle memory", icon: Zap },
            { name: "Front Foot Defense", desc: "Get your defense solid against full-length", icon: Activity },
            { name: "Wall Rebound Drill", desc: "Hand-eye coordination against rebounds", icon: Trophy },
          ].map((drill) => (
            <Link key={drill.name} href="/drills" className="no-underline text-inherit">
              <div className="drill-item">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-[var(--cs-accent-light)] flex items-center justify-center shrink-0">
                    <drill.icon className="w-[18px] h-[18px] text-[var(--cs-accent)]" />
                  </div>
                  <div className="drill-info">
                    <h4>{drill.name}</h4>
                    <p>{drill.desc}</p>
                  </div>
                </div>
                <div className="drill-status">Pending</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Coach Chat Widget */}
      <div className="panel col-span-12 md:col-span-5">
        <div className="panel-header">
          <span className="label-bracket">AI Mentor</span>
          <h2 className="panel-title">Coach Chat</h2>
        </div>
        <div className="flex-1 flex flex-col gap-4 mb-4">
          <div className="msg msg-ai">
            Hey {user?.username}! I&apos;m your CricEye AI Coach. Ask me anything about batting, bowling, fielding, or the mental game.
          </div>
        </div>
        <Link href="/mentor" className="no-underline">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Ask coach..."
              className="chat-input-field"
              readOnly
              style={{ cursor: 'pointer' }}
            />
            <button className="btn-send" type="button">Send</button>
          </div>
        </Link>
      </div>

      {/* News Section */}
      {news.length > 0 && (
        <div className="panel col-span-12">
          <div className="panel-header">
            <span className="label-bracket">Cricket News</span>
            <h2 className="panel-title">Latest News</h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-6">
            {news.slice(0, 6).map((n, i) => (
              <div key={i}>
                <a
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold leading-snug text-[var(--text-main)] no-underline hover:text-[var(--cs-accent)] transition-colors"
                >
                  {n.title}
                </a>
                <div className="text-[11px] text-[var(--text-muted)] mt-1.5">{n.published}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
