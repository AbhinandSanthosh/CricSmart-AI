"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/store/auth";

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
      <div style={{ gridColumn: 'span 12', padding: '60px 0 40px' }}>
        <div className="label-bracket" style={{ marginBottom: 20, display: 'inline-block' }}>
          welcome back, {user?.username}
        </div>
        <h1 className="hero-title">
          YOUR CRICKET<br />TRAINING HUB
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.6, maxWidth: 540, marginBottom: 40 }}>
          {user?.primary_role} &middot; {user?.skill_level} level. Track your biometrics, follow drills, and get AI coaching—all in one place.
        </p>
        <Link href="/drills" className="btn btn-primary" style={{ padding: '8px 8px 8px 28px', fontSize: 18, textDecoration: 'none' }}>
          Start Drill
          <div className="btn-icon-circle" style={{ width: 40, height: 40 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </div>
        </Link>
      </div>

      {/* ── Stance Lab Widget (8 col) ── */}
      <div className="panel" style={{ gridColumn: 'span 8', minHeight: 440, padding: 24 }}>
        <div className="panel-header">
          <span className="label-bracket">pose_detection_active</span>
          <h2 className="panel-title">STANCE LAB</h2>
        </div>
        <Link href="/biometric" style={{ textDecoration: 'none' }}>
          <div className="video-container" style={{ minHeight: 320 }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.1em', opacity: 0.3 }}>
              CAMERA FEED
            </span>
            {/* Decorative pose skeleton */}
            <div style={{ position: 'absolute', width: 200, height: 300 }}>
              {/* Bones */}
              <div style={{ position: 'absolute', background: 'rgba(255,255,255,0.9)', height: 3, borderRadius: 3, top: '30%', left: '30%', width: 80 }} />
              <div style={{ position: 'absolute', background: 'rgba(255,255,255,0.9)', height: 3, borderRadius: 3, top: '30%', left: '30%', width: 60, transform: 'rotate(110deg)', transformOrigin: 'left center' }} />
              <div style={{ position: 'absolute', background: 'rgba(255,255,255,0.9)', height: 3, borderRadius: 3, top: '50%', left: '20%', width: 50, transform: 'rotate(-45deg)', transformOrigin: 'left center' }} />
              <div style={{ position: 'absolute', background: 'rgba(255,255,255,0.9)', height: 3, borderRadius: 3, top: '30%', left: '50%', width: 90, transform: 'rotate(90deg)', transformOrigin: 'left center' }} />
              <div style={{ position: 'absolute', background: 'rgba(255,255,255,0.9)', height: 3, borderRadius: 3, top: '60%', left: '40%', width: 40 }} />
              <div style={{ position: 'absolute', background: 'rgba(255,255,255,0.9)', height: 3, borderRadius: 3, top: '60%', left: '40%', width: 65, transform: 'rotate(115deg)', transformOrigin: 'left center' }} />
              <div style={{ position: 'absolute', background: 'rgba(255,255,255,0.9)', height: 3, borderRadius: 3, top: '80%', left: '30%', width: 65, transform: 'rotate(100deg)', transformOrigin: 'left center' }} />
              {/* Joints */}
              {[
                { top: '10%', left: '50%', size: 12 },
                { top: '30%', left: '30%', size: 8 },
                { top: '30%', left: '70%', size: 8 },
                { top: '50%', left: '20%', size: 8 },
                { top: '40%', left: '40%', size: 8 },
                { top: '60%', left: '40%', size: 8 },
                { top: '60%', left: '60%', size: 8 },
                { top: '80%', left: '30%', size: 8 },
                { top: '100%', left: '25%', size: 8 },
              ].map((j, i) => (
                <div key={i} style={{ position: 'absolute', width: j.size, height: j.size, background: '#fff', borderRadius: '50%', top: j.top, left: j.left, transform: 'translate(-50%, -50%)', zIndex: 2 }} />
              ))}
            </div>
            {/* Analysis overlay */}
            <div className="analysis-overlay">
              <div className="metric-val">--<span style={{ fontSize: 16 }}>%</span></div>
              <div className="metric-label">STANCE SCORE</div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />
              <div className="metric-val" style={{ color: 'var(--cs-accent)' }}>0<span style={{ fontSize: 16 }}>°</span></div>
              <div className="metric-label">HEAD ALIGNMENT</div>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Live Match Widget (4 col) ── */}
      <div className="panel" style={{ gridColumn: 'span 4' }}>
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
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                          {scores[1] ? '' : 'Yet to bat'}
                        </div>
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
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
            No live matches right now
          </div>
        )}

        {/* Additional matches below */}
        {(completedMatches.length > 0 || upcomingMatches.length > 0) && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--cs-border)' }}>
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

      {/* ── Stats Strip (12 col) ── */}
      <div className="stats-strip" style={{ gridColumn: 'span 12' }}>
        <div className="stat-box">
          <div className="label-bracket">total_sessions</div>
          <div className="stat-val">--<span style={{ fontSize: 18, color: 'var(--text-muted)' }}> </span></div>
        </div>
        <div className="stat-box">
          <div className="label-bracket">avg_stance_score</div>
          <div className="stat-val">--<span style={{ fontSize: 18, color: 'var(--text-muted)' }}> %</span></div>
        </div>
        <div className="stat-box">
          <div className="label-bracket">drills_completed</div>
          <div className="stat-val">--<span style={{ fontSize: 18, color: 'var(--text-muted)' }}> </span></div>
        </div>
      </div>

      {/* ── Drills Widget (6 col) ── */}
      <div className="panel" style={{ gridColumn: 'span 6' }}>
        <div className="panel-header">
          <span className="label-bracket">weekly_plan</span>
          <h2 className="panel-title">ACADEMY DRILLS</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link href="/drills" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="drill-item">
              <div className="drill-info">
                <h4>SHADOW BATTING</h4>
                <p>Practice shots to build muscle memory</p>
              </div>
              <div className="drill-status">PENDING</div>
            </div>
          </Link>
          <Link href="/drills" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="drill-item">
              <div className="drill-info">
                <h4>FRONT FOOT DEFENSE</h4>
                <p>Get your defense solid against full-length</p>
              </div>
              <div className="drill-status">PENDING</div>
            </div>
          </Link>
          <Link href="/drills" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="drill-item">
              <div className="drill-info">
                <h4>WALL REBOUND DRILL</h4>
                <p>Hand-eye coordination against rebounds</p>
              </div>
              <div className="drill-status">PENDING</div>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Coach Chat Widget (6 col) ── */}
      <div className="panel" style={{ gridColumn: 'span 6', height: 340 }}>
        <div className="panel-header">
          <span className="label-bracket">ai_mentor_v2</span>
          <h2 className="panel-title">COACH CHAT</h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 12, marginBottom: 16 }}>
          <div className="msg msg-ai">
            Hey! I&apos;m your CricEye AI Coach. Ask me anything about batting, bowling, fielding, or the mental game.
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

      {/* ── News Section (12 col) ── */}
      {news.length > 0 && (
        <div className="panel" style={{ gridColumn: 'span 12' }}>
          <div className="panel-header">
            <span className="label-bracket">espn_rss_feed</span>
            <h2 className="panel-title">CRICKET NEWS</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
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
