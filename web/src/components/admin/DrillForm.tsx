"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { Loader2, X } from "lucide-react";

export interface AdminDrill {
  id: number;
  role: string;
  category: string;
  category_icon: string;
  name: string;
  duration: string;
  description: string;
  steps: string[] | string;
  video_url: string;
  sort_order: number;
  is_active: number;
}

const ROLES = ["Batter", "Bowler", "Wicketkeeper", "Fielding", "All-Rounder"];
const ICONS = ["Target", "Zap", "Footprints", "Gamepad2", "Shield", "Eye", "Dumbbell"];

interface Props {
  initial?: AdminDrill | null;
  onClose: () => void;
  onSaved: () => void;
}

export function DrillForm({ initial, onClose, onSaved }: Props) {
  const [role, setRole] = useState(initial?.role || "Batter");
  const [category, setCategory] = useState(initial?.category || "");
  const [categoryIcon, setCategoryIcon] = useState(initial?.category_icon || "Target");
  const [name, setName] = useState(initial?.name || "");
  const [duration, setDuration] = useState(initial?.duration || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [steps, setSteps] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState(initial?.video_url || "");
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(initial?.is_active !== 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      const arr = Array.isArray(initial.steps)
        ? initial.steps
        : typeof initial.steps === "string"
        ? (() => {
            try {
              return JSON.parse(initial.steps as string);
            } catch {
              return [];
            }
          })()
        : [];
      setSteps((arr as string[]).join("\n"));
    }
  }, [initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not signed in");
      const payload = {
        role,
        category,
        category_icon: categoryIcon,
        name,
        duration,
        description,
        steps: steps.split("\n").map((s) => s.trim()).filter(Boolean),
        video_url: videoUrl,
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
      };
      const url = initial ? `/api/admin/drills/${initial.id}` : "/api/admin/drills";
      const method = initial ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-panel)] border border-[var(--cs-border)] rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--text-main)]">{initial ? "Edit drill" : "New drill"}</h2>
          <button type="button" onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="text-xs font-bold text-[var(--text-muted)]">
            Role
            <select className="mt-1 block w-full bg-[var(--bg-surface)] border border-[var(--cs-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--cs-accent)]" value={role} onChange={(e) => setRole(e.target.value)} required>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-[var(--text-muted)]">
            Category
            <input className="mt-1 block w-full bg-[var(--bg-surface)] border border-[var(--cs-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--cs-accent)]" value={category} onChange={(e) => setCategory(e.target.value)} required />
          </label>
          <label className="text-xs font-bold text-[var(--text-muted)]">
            Category icon
            <select className="mt-1 block w-full bg-[var(--bg-surface)] border border-[var(--cs-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--cs-accent)]" value={categoryIcon} onChange={(e) => setCategoryIcon(e.target.value)}>
              {ICONS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-[var(--text-muted)]">
            Sort order
            <input
              type="number"
              className="mt-1 block w-full bg-[var(--bg-surface)] border border-[var(--cs-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--cs-accent)]"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
          </label>
        </div>

        <label className="text-xs font-bold text-[var(--text-muted)] block mt-4">
          Name
          <input className="mt-1 block w-full bg-[var(--bg-surface)] border border-[var(--cs-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--cs-accent)]" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <label className="text-xs font-bold text-[var(--text-muted)]">
            Duration
            <input className="mt-1 block w-full bg-[var(--bg-surface)] border border-[var(--cs-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--cs-accent)]" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="15 min" />
          </label>
          <label className="text-xs font-bold text-[var(--text-muted)]">
            Video URL (optional)
            <input className="mt-1 block w-full bg-[var(--bg-surface)] border border-[var(--cs-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--cs-accent)]" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
          </label>
        </div>

        <label className="text-xs font-bold text-[var(--text-muted)] block mt-4">
          Description
          <textarea className="mt-1 block w-full bg-[var(--bg-surface)] border border-[var(--cs-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--cs-accent)]" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <label className="text-xs font-bold text-[var(--text-muted)] block mt-4">
          Steps (one per line)
          <textarea className="cs-input mt-1 font-mono text-xs" rows={6} value={steps} onChange={(e) => setSteps(e.target.value)} />
        </label>

        <label className="flex items-center gap-2 mt-4 text-sm text-[var(--text-main)]">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active (visible to players)
        </label>

        {error && <div className="text-sm text-red-400 mt-3">{error}</div>}

        <div className="flex gap-3 justify-end mt-6">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-50">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {initial ? "Save changes" : "Create drill"}
          </button>
        </div>
      </form>
    </div>
  );
}
