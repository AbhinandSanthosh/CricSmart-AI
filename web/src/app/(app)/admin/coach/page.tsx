"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { auth } from "@/lib/firebase";

interface PromptMeta {
  prompt: string;
  updated_at: string | null;
  is_default: boolean;
  default_prompt: string;
}

export default function AdminCoachPage() {
  const [meta, setMeta] = useState<PromptMeta | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch("/api/admin/coach-prompt", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMeta(data);
      setDraft(data.prompt);
    } catch {
      setError("Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(value: string) {
    setSaving(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/admin/coach-prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: value }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSavedAt(new Date().toLocaleTimeString());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  function restoreDefault() {
    if (!window.confirm("Restore the default coach prompt? Your custom prompt will be deleted.")) return;
    void save("");
  }

  if (!meta) return <div className="text-sm text-[var(--text-muted)]">Loading...</div>;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">AI Coach Prompt</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {meta.is_default ? "Currently using the default prompt." : `Custom prompt — last updated ${meta.updated_at || "—"}`}
        </p>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="label-bracket">system_prompt</span>
          <div className="flex gap-2">
            <button onClick={restoreDefault} disabled={saving} className="btn btn-secondary text-sm disabled:opacity-50">
              <RotateCcw className="w-4 h-4" />
              Restore default
            </button>
            <button onClick={() => save(draft)} disabled={saving} className="btn btn-primary text-sm disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={28}
          className="w-full bg-[var(--bg-surface)] border border-[var(--cs-border)] rounded-lg p-4 font-mono text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--cs-accent)]"
        />
        {savedAt && <div className="text-xs text-emerald-400 mt-3">Saved at {savedAt}. Change takes effect within ~15s.</div>}
        {error && <div className="text-xs text-red-400 mt-3">{error}</div>}
      </div>
    </div>
  );
}
