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
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 py-5">
        <p className="label-bracket mb-3">player_profile</p>
        <h1 className="text-4xl font-bold text-[var(--text-main)] tracking-tight">Profile</h1>
      </div>

      {/* User Card */}
      <div className="panel col-span-12">
        <div className="flex items-center gap-5">
          {/* Profile Photo */}
          <div className="relative shrink-0">
            <div
              onClick={() => fileRef.current?.click()}
              className="w-20 h-20 rounded-full cursor-pointer flex items-center justify-center border-[3px] border-[var(--cs-border-strong)] transition-all text-[28px] font-black text-black"
              style={{
                background: user.profile_photo ? `url(${user.profile_photo}) center/cover` : 'linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #4ade80 100%)',
              }}
            >
              {!user.profile_photo && user.username?.charAt(0).toUpperCase()}
              <div className="absolute bottom-0 right-0 w-7 h-7 bg-[var(--cs-accent)] rounded-full flex items-center justify-center border-2 border-[var(--bg-base)]">
                <Camera className="w-3.5 h-3.5 text-black" />
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-[10px] text-[var(--cs-accent)]">
                ...
              </div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-main)] mb-1">{user.username}</h2>
            <div className="text-xs text-[var(--text-muted)] mb-1">{user.email}</div>
            <div className="flex gap-3 items-center">
              <span className="label-bracket">{user.primary_role}</span>
              <span className="text-xs text-[var(--text-muted)]">{user.skill_level}</span>
            </div>
            {user.created_at && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-[var(--text-muted)]">
                <Calendar className="w-3 h-3" />
                Joined {new Date(user.created_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-strip col-span-12">
        <div className="stat-box">
          <div className="label-bracket">total_sessions</div>
          <div className="stat-val">--</div>
        </div>
        <div className="stat-box">
          <div className="label-bracket">avg_stance_score</div>
          <div className="stat-val">--<span className="text-lg text-[var(--text-muted)]"> %</span></div>
        </div>
        <div className="stat-box">
          <div className="label-bracket">drills_done</div>
          <div className="stat-val">--</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="panel col-span-12 md:col-span-6">
        <div className="panel-header">
          <span className="label-bracket">actions</span>
          <h2 className="panel-title">Quick Start</h2>
        </div>
        <div className="flex flex-col gap-2.5">
          {[
            { href: "/biometric", icon: Activity, label: "Stance Checkup", desc: "Analyze your batting stance" },
            { href: "/drills", icon: Dumbbell, label: "Footwork Practice", desc: "Start a training drill" },
            { href: "/mentor", icon: MessageCircle, label: "Chat with Coach", desc: "Get coaching advice" },
          ].map((action) => (
            <Link key={action.href} href={action.href} className="no-underline text-inherit">
              <div className="drill-item">
                <div className="drill-info">
                  <h4>{action.label}</h4>
                  <p>{action.desc}</p>
                </div>
                <action.icon className="w-5 h-5 text-[var(--cs-accent)]" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="panel col-span-12 md:col-span-6">
        <div className="panel-header">
          <span className="label-bracket">activity_log</span>
          <h2 className="panel-title">Recent</h2>
        </div>
        <div className="text-center py-10 text-[var(--text-muted)] text-[13px]">
          No activity yet. Start a session to see your progress here!
        </div>
      </div>
    </div>
  );
}
