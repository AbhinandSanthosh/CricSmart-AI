"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/store/auth";

const ROLES = ["Batter", "Bowler", "All-Rounder", "Wicketkeeper"];
const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced"];
const BOWLING_STYLES = ["Fast", "Medium", "Off-Spin", "Leg-Spin"];

export default function SignupPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
    role: "Batter",
    skillLevel: "Beginner",
    bowlingStyle: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(data.user);
      router.push("/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--cs-border-strong)',
    borderRadius: 12, padding: '12px 16px', color: 'var(--text-main)', fontFamily: 'var(--font-ui)',
    fontSize: 13, transition: 'all 0.3s',
  };

  const selectBtnBase: React.CSSProperties = {
    padding: '10px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: '1px solid var(--cs-border-strong)', background: 'transparent', color: 'var(--text-muted)',
    transition: 'all 0.2s', fontFamily: 'var(--font-ui)',
  };

  const selectBtnActive: React.CSSProperties = {
    ...selectBtnBase,
    background: 'rgba(0,212,255,0.1)', color: 'var(--cs-accent)', borderColor: 'rgba(0,212,255,0.3)',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: '50%', background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #4ade80 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
            🏏
          </div>
          <h1 style={{ fontSize: 36, background: 'linear-gradient(180deg, #ffffff 0%, #909ab0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.03em', fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic' }}>
            JOIN CRIC<span style={{ color: 'var(--cs-accent)', WebkitTextFillColor: 'var(--cs-accent)' }}>EYE</span>
          </h1>
          <div className="label-bracket" style={{ marginTop: 8 }}>create_account</div>
        </div>

        {/* Card */}
        <div className="panel" style={{ padding: 32 }}>
          <div className="panel-header">
            <span className="label-bracket">registration</span>
            <h2 className="panel-title">SIGN UP</h2>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div style={{ fontSize: 13, color: 'var(--cs-danger)', background: 'rgba(255,42,75,0.08)', padding: 12, borderRadius: 12 }}>
                {error}
              </div>
            )}
            <div>
              <div className="label-bracket" style={{ marginBottom: 6 }}>full_name</div>
              <input
                value={form.username}
                onChange={(e) => update("username", e.target.value)}
                placeholder="Your full name"
                required
                style={inputStyle}
              />
            </div>
            <div>
              <div className="label-bracket" style={{ marginBottom: 6 }}>email</div>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="your@email.com"
                required
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div className="label-bracket" style={{ marginBottom: 6 }}>password</div>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="Password"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <div className="label-bracket" style={{ marginBottom: 6 }}>confirm</div>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => update("confirm", e.target.value)}
                  placeholder="Confirm"
                  required
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <div className="label-bracket" style={{ marginBottom: 6 }}>primary_role</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => update("role", r)}
                    style={form.role === r ? selectBtnActive : selectBtnBase}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {form.role === "Bowler" && (
              <div>
                <div className="label-bracket" style={{ marginBottom: 6 }}>bowling_style</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {BOWLING_STYLES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => update("bowlingStyle", s)}
                      style={form.bowlingStyle === s ? selectBtnActive : selectBtnBase}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="label-bracket" style={{ marginBottom: 6 }}>skill_level</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {SKILL_LEVELS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => update("skillLevel", s)}
                    style={form.skillLevel === s ? selectBtnActive : selectBtnBase}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '8px 8px 8px 24px', fontSize: 14, width: '100%', opacity: loading ? 0.5 : 1 }}
            >
              {loading ? "Creating account..." : "Create Account"}
              <div className="btn-icon-circle" style={{ width: 28, height: 28 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </div>
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: 'var(--cs-accent)', textDecoration: 'none' }}>
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
