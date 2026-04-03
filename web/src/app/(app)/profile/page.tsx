"use client";

import { useAuth } from "@/store/auth";
import Link from "next/link";
import { Activity, Dumbbell, MessageCircle, Calendar } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
      <div style={{ gridColumn: 'span 12', padding: '20px 0' }}>
        <div className="label-bracket" style={{ marginBottom: 12 }}>player_profile</div>
        <h1 style={{ fontSize: 48, background: 'linear-gradient(180deg, #ffffff 0%, #909ab0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.03em' }}>
          PROFILE
        </h1>
      </div>

      {/* User Card */}
      <div className="panel" style={{ gridColumn: 'span 12' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div className="avatar" style={{ width: 64, height: 64, fontSize: 24 }}>
            {user.username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: 28, marginBottom: 4 }}>{user.username?.toUpperCase()}</h2>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="label-bracket">{user.primary_role}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.skill_level}</span>
            </div>
            {user.created_at && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                <Calendar style={{ width: 12, height: 12 }} />
                Joined {new Date(user.created_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
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
          <div className="label-bracket">drills_done</div>
          <div className="stat-val">--</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="panel" style={{ gridColumn: 'span 6' }}>
        <div className="panel-header">
          <span className="label-bracket">actions</span>
          <h2 className="panel-title">QUICK START</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { href: "/biometric", icon: Activity, label: "STANCE CHECKUP", desc: "Analyze your batting stance" },
            { href: "/drills", icon: Dumbbell, label: "FOOTWORK PRACTICE", desc: "Start a training drill" },
            { href: "/mentor", icon: MessageCircle, label: "CHAT WITH COACH", desc: "Get coaching advice" },
          ].map((action) => (
            <Link key={action.href} href={action.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="drill-item">
                <div className="drill-info">
                  <h4>{action.label}</h4>
                  <p>{action.desc}</p>
                </div>
                <action.icon style={{ width: 20, height: 20, color: 'var(--cs-accent)' }} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="panel" style={{ gridColumn: 'span 6' }}>
        <div className="panel-header">
          <span className="label-bracket">activity_log</span>
          <h2 className="panel-title">RECENT</h2>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          No activity yet. Start a session to see your progress here!
        </div>
      </div>
    </div>
  );
}
