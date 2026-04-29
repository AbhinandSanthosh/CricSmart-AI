"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, EyeOff, Eye } from "lucide-react";
import { auth } from "@/lib/firebase";
import { DrillForm, type AdminDrill } from "@/components/admin/DrillForm";

const ROLES = ["Batter", "Bowler", "Wicketkeeper", "Fielding", "All-Rounder"];

export default function AdminDrillsPage() {
  const [drills, setDrills] = useState<AdminDrill[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminDrill | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch("/api/admin/drills", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setDrills(data.drills || []);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function deleteDrill(d: AdminDrill) {
    if (!window.confirm(`Delete drill "${d.name}"? This cannot be undone.`)) return;
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    await fetch(`/api/admin/drills/${d.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    refresh();
  }

  async function toggleActive(d: AdminDrill) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    await fetch(`/api/admin/drills/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active: d.is_active === 0 }),
    });
    refresh();
  }

  return (
    <div>
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">Drill Management</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">{drills.length} drills across {ROLES.length} roles</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn btn-primary text-sm">
          <Plus className="w-4 h-4" />
          New drill
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-[var(--text-muted)] text-sm">Loading drills...</div>
      ) : (
        <div className="flex flex-col gap-6">
          {ROLES.map((role) => {
            const roleDrills = drills.filter((d) => d.role === role);
            return (
              <div key={role} className="panel">
                <div className="panel-header">
                  <span className="label-bracket">{role.toLowerCase()}</span>
                  <h2 className="panel-title">{role}</h2>
                </div>
                {roleDrills.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] py-4">No drills for this role yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px] border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--cs-border)]">
                          {["Category", "Name", "Duration", "Status", "Actions"].map((h) => (
                            <th key={h} className="pb-2 font-bold text-[10px] tracking-widest text-[var(--text-muted)] text-left uppercase">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {roleDrills.map((d) => (
                          <tr key={d.id} className={`border-b border-[var(--cs-border)] ${d.is_active === 0 ? "opacity-50" : ""}`}>
                            <td className="py-2.5 text-[var(--text-muted)]">{d.category}</td>
                            <td className="py-2.5 font-semibold text-[var(--text-main)]">{d.name}</td>
                            <td className="py-2.5 text-[var(--text-muted)]">{d.duration}</td>
                            <td className="py-2.5">
                              {d.is_active === 1 ? (
                                <span className="text-[10px] font-bold text-emerald-400 tracking-wider">ACTIVE</span>
                              ) : (
                                <span className="text-[10px] font-bold text-zinc-400 tracking-wider">HIDDEN</span>
                              )}
                            </td>
                            <td className="py-2.5">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => toggleActive(d)}
                                  className="p-1.5 rounded hover:bg-[var(--bg-surface)] text-[var(--text-muted)]"
                                  title={d.is_active === 1 ? "Hide" : "Show"}
                                >
                                  {d.is_active === 1 ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => setEditing(d)}
                                  className="p-1.5 rounded hover:bg-[var(--bg-surface)] text-[var(--text-muted)]"
                                  title="Edit"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteDrill(d)}
                                  className="p-1.5 rounded hover:bg-red-500/10 text-red-400"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(editing || creating) && (
        <DrillForm
          initial={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
