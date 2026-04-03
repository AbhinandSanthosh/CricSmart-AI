"use client";

import { useState } from "react";
import { useAuth } from "@/store/auth";

export default function SettingsPage() {
  const { user } = useAuth();
  const [profileForm, setProfileForm] = useState({ email: user?.email || "", phone: user?.phone || "" });
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [profileMsg, setProfileMsg] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/users/update", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profileForm) });
      setProfileMsg(res.ok ? "Profile updated!" : "Failed to update");
    } catch {
      setProfileMsg("Error saving profile");
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) { setPasswordMsg("Passwords don't match"); return; }
    try {
      const res = await fetch("/api/users/password", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.newPass }) });
      if (res.ok) { setPasswordMsg("Password changed!"); setPasswordForm({ current: "", newPass: "", confirm: "" }); }
      else { const data = await res.json(); setPasswordMsg(data.error || "Failed to change password"); }
    } catch {
      setPasswordMsg("Error changing password");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--cs-border-strong)',
    borderRadius: 12, padding: '12px 16px', color: 'var(--text-main)', fontFamily: 'var(--font-ui)',
    fontSize: 13, transition: 'all 0.3s',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24, maxWidth: 800 }}>
      <div style={{ gridColumn: 'span 12', padding: '20px 0' }}>
        <div className="label-bracket" style={{ marginBottom: 12 }}>account_settings</div>
        <h1 style={{ fontSize: 48, background: 'linear-gradient(180deg, #ffffff 0%, #909ab0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.03em' }}>
          SETTINGS
        </h1>
      </div>

      {/* Profile */}
      <div className="panel" style={{ gridColumn: 'span 12' }}>
        <div className="panel-header">
          <span className="label-bracket">profile</span>
          <h2 className="panel-title">INFORMATION</h2>
        </div>
        <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="label-bracket" style={{ marginBottom: 6 }}>username</div>
            <input value={user?.username || ""} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Username cannot be changed</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div className="label-bracket" style={{ marginBottom: 6 }}>email</div>
              <input type="email" value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} placeholder="your@email.com" style={inputStyle} />
            </div>
            <div>
              <div className="label-bracket" style={{ marginBottom: 6 }}>phone</div>
              <input value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 234 567 890" style={inputStyle} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '8px 8px 8px 24px', fontSize: 14, alignSelf: 'flex-start' }}>
            Save Changes
            <div className="btn-icon-circle" style={{ width: 28, height: 28 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
            </div>
          </button>
          {profileMsg && <p style={{ fontSize: 13, color: 'var(--cs-accent)' }}>{profileMsg}</p>}
        </form>
      </div>

      {/* Password */}
      <div className="panel" style={{ gridColumn: 'span 12' }}>
        <div className="panel-header">
          <span className="label-bracket">security</span>
          <h2 className="panel-title">PASSWORD</h2>
        </div>
        <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="label-bracket" style={{ marginBottom: 6 }}>current_password</div>
            <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))} required style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div className="label-bracket" style={{ marginBottom: 6 }}>new_password</div>
              <input type="password" value={passwordForm.newPass} onChange={(e) => setPasswordForm((p) => ({ ...p, newPass: e.target.value }))} required style={inputStyle} />
            </div>
            <div>
              <div className="label-bracket" style={{ marginBottom: 6 }}>confirm</div>
              <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))} required style={inputStyle} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '8px 8px 8px 24px', fontSize: 14, alignSelf: 'flex-start' }}>
            Change Password
            <div className="btn-icon-circle" style={{ width: 28, height: 28 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
            </div>
          </button>
          {passwordMsg && <p style={{ fontSize: 13, color: 'var(--cs-accent)' }}>{passwordMsg}</p>}
        </form>
      </div>

      {/* AI Services */}
      <div className="panel" style={{ gridColumn: 'span 12' }}>
        <div className="panel-header">
          <span className="label-bracket">integrations</span>
          <h2 className="panel-title">AI SERVICES</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--cs-border)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontStyle: 'italic', fontSize: 16 }}>OLLAMA (LOCAL AI)</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              For AI Mentor chat, install Ollama and run: <code style={{ color: 'var(--cs-accent)' }}>ollama run llama3.2</code>
            </p>
          </div>
          <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--cs-border)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontStyle: 'italic', fontSize: 16 }}>BALL TRACKING ML</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Start the Python service: <code style={{ color: 'var(--cs-accent)' }}>cd ml-service && python server.py</code>
            </p>
          </div>
          <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--cs-border)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontStyle: 'italic', fontSize: 16 }}>CRICAPI (LIVE SCORES)</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Set <code style={{ color: 'var(--cs-accent)' }}>CRICAPI_KEY</code> in <code>.env.local</code> for live match data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
