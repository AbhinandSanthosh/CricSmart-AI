"use client";

import { useEffect, useState } from "react";
import { Shield, Users } from "lucide-react";

interface AdminUser {
  id: number;
  username: string;
  primary_role: string;
  skill_level: string;
  is_admin: number;
  created_at: string;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      if (data.user?.is_admin !== 1) { setError("Access denied. Admin privileges required."); return; }
      setAuthenticated(true);
    } catch {
      setError("Authentication failed");
    }
  }

  useEffect(() => {
    if (!authenticated) return;
    setLoading(true);
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authenticated]);

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--cs-border-strong)',
    borderRadius: 12, padding: '12px 16px', color: 'var(--text-main)', fontFamily: 'var(--font-ui)',
    fontSize: 13, transition: 'all 0.3s',
  };

  if (!authenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 200px)' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Shield style={{ width: 48, height: 48, color: 'var(--cs-accent)', margin: '0 auto 16px' }} />
            <h1 style={{ fontSize: 36, background: 'linear-gradient(180deg, #ffffff 0%, #909ab0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.03em', fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic' }}>
              ADMIN ACCESS
            </h1>
            <div className="label-bracket" style={{ marginTop: 8 }}>restricted_area</div>
          </div>
          <div className="panel" style={{ padding: 32 }}>
            <div className="panel-header">
              <span className="label-bracket">authentication</span>
              <h2 className="panel-title">VERIFY</h2>
            </div>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                  placeholder="Admin email"
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
                  placeholder="Admin password"
                  required
                  style={inputStyle}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 8px 8px 24px', fontSize: 14, width: '100%' }}>
                Authenticate
                <div className="btn-icon-circle" style={{ width: 28, height: 28 }}>
                  <Shield style={{ width: 12, height: 12 }} />
                </div>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
      <div style={{ gridColumn: 'span 12', padding: '20px 0' }}>
        <div className="label-bracket" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield style={{ width: 14, height: 14 }} /> admin_panel
        </div>
        <h1 style={{ fontSize: 48, background: 'linear-gradient(180deg, #ffffff 0%, #909ab0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.03em' }}>
          ADMIN PANEL
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 8 }}>Manage users and platform</p>
      </div>

      <div className="stats-strip" style={{ gridColumn: 'span 12' }}>
        <div className="stat-box">
          <div className="label-bracket"><Users style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />total_users</div>
          <div className="stat-val">{users.length}</div>
        </div>
        <div className="stat-box">
          <div className="label-bracket"><Shield style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />admin_count</div>
          <div className="stat-val">{users.filter((u) => u.is_admin === 1).length}</div>
        </div>
      </div>

      <div className="panel" style={{ gridColumn: 'span 12' }}>
        <div className="panel-header">
          <span className="label-bracket">user_database</span>
          <h2 className="panel-title">ALL USERS</h2>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-display)', fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.1em' }}>
            LOADING...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cs-border)' }}>
                  {['ID', 'USERNAME', 'ROLE', 'SKILL', 'JOINED', 'ADMIN'].map((h) => (
                    <th key={h} style={{ paddingBottom: 12, fontWeight: 700, fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-muted)', textAlign: 'left', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '12px 0', color: 'var(--text-muted)' }}>{u.id}</td>
                    <td style={{ padding: '12px 0', fontWeight: 600, color: 'var(--text-main)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{u.username.toUpperCase()}</td>
                    <td style={{ padding: '12px 0' }}>
                      <span className="label-bracket">{u.primary_role}</span>
                    </td>
                    <td style={{ padding: '12px 0', color: 'var(--text-muted)' }}>{u.skill_level}</td>
                    <td style={{ padding: '12px 0', color: 'var(--text-muted)' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "\u2014"}
                    </td>
                    <td style={{ padding: '12px 0' }}>
                      {u.is_admin === 1 ? (
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontStyle: 'italic', fontSize: 12, color: 'var(--cs-accent)' }}>ADMIN</span>
                      ) : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
