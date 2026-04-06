"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/store/auth";
import Link from "next/link";
import { Activity, Dumbbell, MessageCircle, Calendar, Camera } from "lucide-react";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!user) return null;

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Image too large. Max 2MB.");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch("/api/users/photo", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photo: base64 }),
        });
        if (res.ok) {
          setUser({ ...user!, profile_photo: base64 });
        }
      } catch {
        // silently fail
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }

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
          {/* Profile Photo */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 80, height: 80, borderRadius: '50%', cursor: 'pointer',
                background: user.profile_photo ? `url(${user.profile_photo}) center/cover` : 'linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #4ade80 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '3px solid var(--cs-border-strong)', transition: 'all 0.3s',
                fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', color: '#000',
              }}
            >
              {!user.profile_photo && user.username?.charAt(0).toUpperCase()}
              <div style={{
                position: 'absolute', bottom: 0, right: 0, width: 28, height: 28,
                background: 'var(--cs-accent)', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--bg-base)',
              }}>
                <Camera style={{ width: 14, height: 14, color: '#000' }} />
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            {uploading && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--cs-accent)' }}>
                ...
              </div>
            )}
          </div>
          <div>
            <h2 style={{ fontSize: 28, marginBottom: 4 }}>{user.username?.toUpperCase()}</h2>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{user.email}</div>
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
