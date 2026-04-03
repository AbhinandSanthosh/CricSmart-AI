"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/store/auth";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(data.user);
      router.push("/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--cs-border-strong)',
    borderRadius: 12, padding: '12px 16px', color: 'var(--text-main)', fontFamily: 'var(--font-ui)',
    fontSize: 13, transition: 'all 0.3s',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="avatar" style={{ width: 56, height: 56, fontSize: 20, margin: '0 auto 16px' }}>
            CE
          </div>
          <h1 style={{ fontSize: 36, background: 'linear-gradient(180deg, #ffffff 0%, #909ab0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.03em', fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic' }}>
            CRIC<span style={{ color: 'var(--cs-accent)', WebkitTextFillColor: 'var(--cs-accent)' }}>EYE</span>
          </h1>
          <div className="label-bracket" style={{ marginTop: 8 }}>ai_platform</div>
        </div>

        {/* Card */}
        <div className="panel" style={{ padding: 32 }}>
          <div className="panel-header">
            <span className="label-bracket">authentication</span>
            <h2 className="panel-title">SIGN IN</h2>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div style={{ fontSize: 13, color: 'var(--cs-danger)', background: 'rgba(255,42,75,0.08)', padding: 12, borderRadius: 12 }}>
                {error}
              </div>
            )}
            <div>
              <div className="label-bracket" style={{ marginBottom: 6 }}>username</div>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                style={inputStyle}
              />
            </div>
            <div>
              <div className="label-bracket" style={{ marginBottom: 6 }}>password</div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '8px 8px 8px 24px', fontSize: 14, width: '100%', opacity: loading ? 0.5 : 1 }}
            >
              {loading ? "Signing in..." : "Sign In"}
              <div className="btn-icon-circle" style={{ width: 28, height: 28 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </div>
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              Don&apos;t have an account?{" "}
              <Link href="/signup" style={{ color: 'var(--cs-accent)', textDecoration: 'none' }}>
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
