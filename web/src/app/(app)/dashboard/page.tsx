"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { Activity, Video, Brain, Dumbbell, ChevronRight, Trophy, Zap } from "lucide-react";

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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>

      {/* ── Hero Section ── */}
      <div style={{ gridColumn: 'span 12', padding: '40px 0 24px' }}>
        <div className="label-bracket" style={{ marginBottom: 20, display: 'inline-block' }}>
          welcome back, {user?.username}
        </div>
        <h1 className="hero-title">
          YOUR CRICKET<br />TRAINING HUB
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.6, maxWidth: 540, marginBottom: 32 }}>
          {user?.primary_role} &middot; {user?.skill_level} level. Track your biometrics, follow drills, and get AI coaching — all in one place.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/drills" className="btn btn-primary" style={{ padding: '8px 8px 8px 28px', fontSize: 18, textDecoration: 'none' }}>
            Start Drill
            <div className="btn-icon-circle" style={{ width: 40, height: 40 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </div>
          </Link>
          <Link href="/mentor" className="btn btn-secondary" style={{ padding: '8px 28px', fontSize: 18, textDecoration: 'none' }}>
            Ask Coach
          </Link>
        </div>
      </div>

      {/* ── Quick Access Cards ── */}
      <div style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { href: "/biometric", icon: Activity, label: "Stance Lab", desc: "Analyze your batting stance", color: '#00d4ff' },
          { href: "/ball-tracking", icon: Video, label: "Ball Tracking", desc: "Track ball speed & trajectory", color: '#ff2a4b' },
          { href: "/drills", icon: Dumbbell, label: "Training Drills", desc: "Role-specific practice routines", color: '#22c55e' },
          { href: "/mentor", icon: Brain, label: "AI Coach", desc: "Get personalized coaching", color: '#8b5cf6' },
        ].map((card) => (
          <Link key={card.href} href={card.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="feature-card" style={{
              padding: 24, borderRadius: 16,
              background: 'linear-gradient(145deg, rgba(20, 22, 26, 0.7) 0%, rgba(10, 11, 14, 0.8) 100%)',
              border: '1px solid var(--cs-border)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <card.icon style={{ width: 22, height: 22, color: card.color }} />
              </div>
              <h3 style={{ fontSize: 16, marginBottom: 4, letterSpacing: '0.02em' }}>{card.label.toUpperCase()}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{card.desc}</p>
              <ChevronRight style={{ position: 'absolute', top: 24, right: 20, width: 16, height: 16, color: 'var(--text-muted)', opacity: 0.5 }} />
            </div>
          </Link>
        ))}
      </div>

      {/* ── Stats Strip ── */}
      <div className="stats-strip" style={{ gridColumn: 'span 12' }}>
        <div className="stat-box">
          <div className="label-bracket">total_sessions</div>
          <div className="stat-val">--</div>
        </div>
        <div className="stat-box">
          <div className="label-bracket">avg_stance_score</div>
          <div className="stat-val">--<span style={{ fontSize: 18, color: 'var(--text-muted)' }}> %</span></div>
        </div>
        <div className="stat-box">
          <div className="label-bracket">drills_completed</div>
          <div className="stat-val">--</div>
        </div>
      </div>

      {/* ── Live Match + Stance Lab (side by side on desktop) ── */}
      <div className="panel" style={{ gridColumn: 'span 6' }}>
        <div className="panel-header">
          <span className="label-bracket">cricapi_feed</span>
          <h2 className="panel-title">LIVE MATCH</h2>
        </div>
        {topMatch ? (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {(() => {
                const parts = topMatch.teams.split(' vs ');
                const scores = topMatch.score ? topMatch.score.split(' | ') : [];
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div>
                        <div className="team-name">{parts[0]?.replace(/[^\w\s]/g, '').trim().substring(0, 3).toUpperCase() || 'TM1'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{topMatch.status}</div>
                      </div>
                      <div className="runs">{scores[0] || '--'}</div>
                    </div>
                    <div style={{ height: 1, background: 'var(--cs-border)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div>
                        <div className="team-name" style={{ color: 'var(--text-muted)' }}>{parts[1]?.replace(/[^\w\s]/g, '').trim().substring(0, 3).toUpperCase() || 'TM2'}</div>
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
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--cs-border)' }}>
                {completedMatches.slice(0, 2).map((m) => (
                  <div key={m.id} style={{ marginBottom: 12, fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{m.teams}</div>
                    <div style={{ color: 'var(--cs-accent)', fontSize: 11, marginTop: 2 }}>{m.status}</div>
                  </div>
                ))}
                {upcomingMatches.slice(0, 2).map((m) => (
                  <div key={m.id} style={{ marginBottom: 12, fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{m.teams}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{m.status}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
            No live matches right now
          </div>
        )}
      </div>

      {/* ── Stance Lab Widget ── */}
      <div className="panel" style={{ gridColumn: 'span 6', minHeight: 300 }}>
        <div className="panel-header">
          <span className="label-bracket">pose_detection</span>
          <h2 className="panel-title">STANCE LAB</h2>
        </div>
        <Link href="/biometric" style={{ textDecoration: 'none', flex: 1, display: 'flex' }}>
          <div className="video-container" style={{ minHeight: 200, flex: 1 }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.1em', opacity: 0.3 }}>
              CAMERA FEED
            </span>
            <div className="analysis-overlay">
              <div className="metric-val">--<span style={{ fontSize: 16 }}>%</span></div>
              <div className="metric-label">STANCE SCORE</div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />
              <div className="metric-val" style={{ color: 'var(--cs-accent)' }}>0<span style={{ fontSize: 16 }}>&deg;</span></div>
              <div className="metric-label">HEAD ALIGNMENT</div>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Today's Drills ── */}
      <div className="panel" style={{ gridColumn: 'span 7' }}>
        <div className="panel-header">
          <span className="label-bracket">recommended_drills</span>
          <h2 className="panel-title">TODAY&apos;S TRAINING</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { name: "SHADOW BATTING", desc: "Practice shots to build muscle memory", icon: Zap },
            { name: "FRONT FOOT DEFENSE", desc: "Get your defense solid against full-length", icon: Activity },
            { name: "WALL REBOUND DRILL", desc: "Hand-eye coordination against rebounds", icon: Trophy },
          ].map((drill) => (
            <Link key={drill.name} href="/drills" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="drill-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,212,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <drill.icon style={{ width: 18, height: 18, color: 'var(--cs-accent)' }} />
                  </div>
                  <div className="drill-info">
                    <h4>{drill.name}</h4>
                    <p>{drill.desc}</p>
                  </div>
                </div>
                <div className="drill-status">PENDING</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Coach Chat Widget ── */}
      <div className="panel" style={{ gridColumn: 'span 5' }}>
        <div className="panel-header">
          <span className="label-bracket">ai_mentor</span>
          <h2 className="panel-title">COACH CHAT</h2>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
          <div className="msg msg-ai">
            Hey {user?.username}! I&apos;m your CricEye AI Coach. Ask me anything about batting, bowling, fielding, or the mental game.
          </div>
        </div>
        <Link href="/mentor" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              placeholder="Ask coach..."
              className="chat-input-field"
              readOnly
              style={{ cursor: 'pointer' }}
            />
            <button className="btn-send" type="button">SEND</button>
          </div>
        </Link>
      </div>

      {/* ── News Section ── */}
      {news.length > 0 && (
        <div className="panel" style={{ gridColumn: 'span 12' }}>
          <div className="panel-header">
            <span className="label-bracket">cricket_news</span>
            <h2 className="panel-title">LATEST NEWS</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 24 }}>
            {news.slice(0, 6).map((n, i) => (
              <div key={i}>
                <a
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--text-main)', textDecoration: 'none', fontSize: 14, fontWeight: 600, lineHeight: 1.4, transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cs-accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
                >
                  {n.title}
                </a>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{n.published}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
