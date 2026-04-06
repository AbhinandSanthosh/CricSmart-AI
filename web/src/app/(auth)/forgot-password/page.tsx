"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<"email" | "reset">("email");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToken(data.token);
      setStep("reset");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send reset request");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("Passwords don't match");
      return;
    }
    if (newPassword.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("Password reset successfully! You can now sign in.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to reset password");
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
          <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: '50%', background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #4ade80 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
            🏏
          </div>
          <h1 style={{ fontSize: 36, background: 'linear-gradient(180deg, #ffffff 0%, #909ab0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.03em', fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic' }}>
            CRIC<span style={{ color: 'var(--cs-accent)', WebkitTextFillColor: 'var(--cs-accent)' }}>EYE</span>
          </h1>
          <div className="label-bracket" style={{ marginTop: 8 }}>password_recovery</div>
        </div>

        <div className="panel" style={{ padding: 32 }}>
          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="panel-title" style={{ marginBottom: 12 }}>PASSWORD RESET</h2>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>{success}</p>
              <Link href="/login" className="btn btn-primary" style={{ padding: '8px 8px 8px 24px', fontSize: 14, textDecoration: 'none', width: '100%', justifyContent: 'center' }}>
                Back to Sign In
                <div className="btn-icon-circle" style={{ width: 28, height: 28 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </div>
              </Link>
            </div>
          ) : step === "email" ? (
            <>
              <div className="panel-header">
                <span className="label-bracket">step_1</span>
                <h2 className="panel-title">FIND ACCOUNT</h2>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                Enter the email address associated with your account.
              </p>
              <form onSubmit={handleRequestReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {error && (
                  <div style={{ fontSize: 13, color: 'var(--cs-danger)', background: 'rgba(255,42,75,0.08)', padding: 12, borderRadius: 12 }}>
                    {error}
                  </div>
                )}
                <div>
                  <div className="label-bracket" style={{ marginBottom: 6 }}>email</div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
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
                  {loading ? "Verifying..." : "Continue"}
                  <div className="btn-icon-circle" style={{ width: 28, height: 28 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </div>
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="panel-header">
                <span className="label-bracket">step_2</span>
                <h2 className="panel-title">NEW PASSWORD</h2>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                Set a new password for <strong style={{ color: 'var(--cs-accent)' }}>{email}</strong>
              </p>
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {error && (
                  <div style={{ fontSize: 13, color: 'var(--cs-danger)', background: 'rgba(255,42,75,0.08)', padding: 12, borderRadius: 12 }}>
                    {error}
                  </div>
                )}
                <div>
                  <div className="label-bracket" style={{ marginBottom: 6 }}>new_password</div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <div className="label-bracket" style={{ marginBottom: 6 }}>confirm_password</div>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirm new password"
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
                  {loading ? "Resetting..." : "Reset Password"}
                  <div className="btn-icon-circle" style={{ width: 28, height: 28 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                  </div>
                </button>
              </form>
            </>
          )}
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 20 }}>
            <Link href="/login" style={{ color: 'var(--cs-accent)', textDecoration: 'none' }}>
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
