"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/store/auth";
import Link from "next/link";
import { Activity, Dumbbell, MessageCircle, Calendar, Camera, Trophy, Flame, Lock, Star, Eye, Scale, TrendingUp, Award, Crown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const BADGES = [
  { key: "first_analysis", name: "First Analysis", description: "Complete your first stance analysis", Icon: Trophy },
  { key: "perfect_eyes", name: "Perfect Eyes", description: "Get 'good' on Head & Eyes", Icon: Eye },
  { key: "balanced_batsman", name: "Balanced Batsman", description: "Get 'good' on Balance", Icon: Scale },
  { key: "century_club", name: "Century Club", description: "Score 85+", Icon: Star },
  { key: "consistent_player", name: "Consistent Player", description: "7-day streak", Icon: Flame },
  { key: "dedicated_cricketer", name: "Dedicated Cricketer", description: "30-day streak", Icon: Award },
  { key: "improving_player", name: "Improving Player", description: "Improve by 10+ points", Icon: TrendingUp },
  { key: "all_rounder_stance", name: "All-Rounder", description: "All metrics 'good'", Icon: Crown },
];

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<{
    totalSessions: number; avgScore: number; improvementPct: number; highestScore: number;
    currentStreak: number; bestStreak: number;
    badges: { key: string; earnedAt: string }[];
    recentAnalyses: { id: number; score: number; createdAt: string }[];
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { auth } = await import("@/lib/firebase");
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          const res = await fetch("/api/analyses/stats", { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const data = await res.json();
            setStats(data.stats);
          }
        }
      } catch {}
    })();
  }, []);

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
          <div className="stat-val">{stats?.totalSessions ?? "--"}</div>
        </div>
        <div className="stat-box">
          <div className="label-bracket">avg_stance_score</div>
          <div className="stat-val">{stats?.avgScore ? `${stats.avgScore}` : "--"}<span className="text-lg text-[var(--text-muted)]"> %</span></div>
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
        {stats && stats.recentAnalyses.length > 0 ? (
          <div className="flex flex-col gap-2">
            {stats.recentAnalyses.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--cs-border)]">
                <div>
                  <span className="text-sm font-semibold text-[var(--text-main)]">Stance Analysis</span>
                  <span className="text-xs text-[var(--text-muted)] ml-2">{new Date(a.createdAt).toLocaleDateString()}</span>
                </div>
                <span className="stat-val text-lg" style={{ color: a.score >= 70 ? '#22c55e' : a.score >= 50 ? '#f59e0b' : 'var(--cs-danger)' }}>
                  {a.score}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-sm text-[var(--text-muted)]">
            No activity yet. Start a session to see your progress here!
          </div>
        )}
      </div>

      {/* Streak */}
      {stats && stats.currentStreak > 0 && (
        <div className="panel col-span-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--cs-accent-light)] flex items-center justify-center text-2xl">
              <span role="img" aria-label="fire">&#x1F525;</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--cs-accent)]">{stats.currentStreak} Day Streak</div>
              <div className="text-sm text-[var(--text-muted)]">Best: {stats.bestStreak} days</div>
            </div>
          </div>
        </div>
      )}

      {/* Score Trend Chart */}
      {stats && stats.recentAnalyses && stats.recentAnalyses.length >= 2 && (
        <div className="panel col-span-12">
          <div className="panel-header">
            <span className="label-bracket flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" /> Performance Trend
            </span>
            <h2 className="panel-title">Score Progress</h2>
          </div>
          <div className="flex gap-6 mb-4 flex-wrap">
            <div>
              <div className="text-xs text-[var(--text-muted)] mb-1">Improvement</div>
              <div className="text-lg font-bold" style={{ color: stats.improvementPct >= 0 ? '#22c55e' : 'var(--cs-danger)' }}>
                {stats.improvementPct >= 0 ? '+' : ''}{stats.improvementPct}%
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)] mb-1">Highest Score</div>
              <div className="text-lg font-bold text-[var(--cs-accent)]">{stats.highestScore}%</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)] mb-1">Avg Score</div>
              <div className="text-lg font-bold text-[var(--text-main)]">{stats.avgScore}%</div>
            </div>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...stats.recentAnalyses].reverse().map((a) => ({
                date: new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                score: a.score,
              }))}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--cs-border)', borderRadius: 8, fontSize: 13 }}
                  labelStyle={{ color: 'var(--text-muted)' }}
                />
                <Line type="monotone" dataKey="score" stroke="var(--cs-accent)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--cs-accent)' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Badges / Achievements */}
      <div className="panel col-span-12">
        <div className="panel-header">
          <span className="label-bracket">Achievements</span>
          <h2 className="panel-title">Badges</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {BADGES.map((badge) => {
            const earned = stats?.badges.some(b => b.key === badge.key);
            return (
              <div key={badge.key} className={`p-4 rounded-xl border text-center transition-all ${earned ? 'bg-[var(--cs-accent-light)] border-[var(--cs-accent)]' : 'bg-[var(--bg-surface)] border-[var(--cs-border)] opacity-50'}`}>
                <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: earned ? 'var(--cs-accent-light)' : 'var(--bg-surface)' }}>
                  {earned ? <badge.Icon className="w-5 h-5 text-[var(--cs-accent)]" /> : <Lock className="w-4 h-4 text-[var(--text-muted)]" />}
                </div>
                <h4 className="text-sm font-semibold text-[var(--text-main)]">{badge.name}</h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">{badge.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
