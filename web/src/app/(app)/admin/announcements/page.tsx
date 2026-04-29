"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { auth } from "@/lib/firebase";

interface Announcement {
  id: number;
  message: string;
  variant: string;
  is_active: number;
  expires_at: string | null;
  updated_at: string;
}

export default function AdminAnnouncementsPage() {
  const [current, setCurrent] = useState<Announcement | null>(null);
  const [message, setMessage] = useState("");
  const [variant, setVariant] = useState("info");
  const [isActive, setIsActive] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch("/api/admin/announcements", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const a: Announcement | null = data.announcement || null;
      setCurrent(a);
      if (a) {
        setMessage(a.message);
        setVariant(a.variant);
        setIsActive(a.is_active === 1);
        setExpiresAt(a.expires_at ? a.expires_at.replace(" ", "T").slice(0, 16) : "");
      }
    } catch {
      setError("Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/admin/announcements", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message,
          variant,
          is_active: isActive,
          expires_at: expiresAt || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSavedAt(new Date().toLocaleTimeString());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">Announcement Banner</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Shown at the top of the app to all logged-in users when active.
        </p>
      </div>

      <div className="panel p-6 max-w-2xl">
        <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Maintenance tonight 10pm IST. Some features may be unavailable."
          className="w-full bg-[var(--bg-surface)] border border-[var(--cs-border)] rounded-lg p-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--cs-accent)]"
        />

        <div className="grid grid-cols-2 gap-4 mt-4">
          <label className="block text-xs font-bold text-[var(--text-muted)]">
            Variant
            <select
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              className="mt-1 block w-full bg-[var(--bg-surface)] border border-[var(--cs-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--cs-accent)]"
            >
              <option value="info">Info (blue)</option>
              <option value="warning">Warning (amber)</option>
              <option value="success">Success (green)</option>
            </select>
          </label>
          <label className="block text-xs font-bold text-[var(--text-muted)]">
            Expires at (optional)
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1 block w-full bg-[var(--bg-surface)] border border-[var(--cs-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--cs-accent)]"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 mt-5 text-sm text-[var(--text-main)] cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <span className="font-semibold">Active — show banner platform-wide</span>
        </label>

        <div className="flex justify-end mt-6">
          <button onClick={save} disabled={saving} className="btn btn-primary text-sm disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save banner
          </button>
        </div>

        {savedAt && <div className="text-xs text-emerald-400 mt-3">Saved at {savedAt}</div>}
        {error && <div className="text-xs text-red-400 mt-3">{error}</div>}

        {current && (
          <div className="mt-6 pt-4 border-t border-[var(--cs-border)] text-xs text-[var(--text-muted)]">
            Current row id #{current.id} · last updated {current.updated_at}
          </div>
        )}
      </div>
    </div>
  );
}
