"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/store/auth";
import { Camera } from "lucide-react";

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profileForm, setProfileForm] = useState({ email: user?.email || "", phone: user?.phone || "" });
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [profileMsg, setProfileMsg] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [uploading, setUploading] = useState(false);

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

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Image too large. Max 2MB."); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch("/api/users/photo", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photo: base64 }) });
        if (res.ok) { setUser({ ...user!, profile_photo: base64 }); }
      } catch { /* ignore */ } finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
  }

  const inputClasses = "w-full bg-[var(--bg-surface)] border border-[var(--cs-border)] rounded-lg px-4 py-3 text-sm text-[var(--text-main)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--cs-accent)] focus:ring-2 focus:ring-[var(--cs-accent-light)] transition-all";

  return (
    <div className="grid grid-cols-12 gap-6 max-w-[800px]">
      <div className="col-span-12 py-5">
        <p className="label-bracket mb-3">account_settings</p>
        <h1 className="text-4xl font-bold text-[var(--text-main)] tracking-tight">Settings</h1>
      </div>

      {/* Profile Photo */}
      <div className="panel col-span-12">
        <div className="panel-header">
          <span className="label-bracket">avatar</span>
          <h2 className="panel-title">Profile Photo</h2>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div
              onClick={() => fileRef.current?.click()}
              className="w-20 h-20 rounded-full cursor-pointer flex items-center justify-center border-[3px] border-[var(--cs-border-strong)] transition-all text-[28px] font-black text-black"
              style={{
                background: user?.profile_photo ? `url(${user.profile_photo}) center/cover` : 'linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #4ade80 100%)',
              }}
            >
              {!user?.profile_photo && user?.username?.charAt(0).toUpperCase()}
              <div className="absolute bottom-0 right-0 w-7 h-7 bg-[var(--cs-accent)] rounded-full flex items-center justify-center border-2 border-[var(--bg-base)]">
                <Camera className="w-3.5 h-3.5 text-black" />
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            {uploading && <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-[10px] text-[var(--cs-accent)]">...</div>}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-main)]">{user?.username}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Click on the photo to upload a new image (max 2MB)</p>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="panel col-span-12">
        <div className="panel-header">
          <span className="label-bracket">profile</span>
          <h2 className="panel-title">Information</h2>
        </div>
        <form onSubmit={saveProfile} className="flex flex-col gap-4">
          <div>
            <div className="label-bracket mb-1.5">display_name</div>
            <input value={user?.username || ""} disabled className={`${inputClasses} opacity-50 cursor-not-allowed`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="label-bracket mb-1.5">email</div>
              <input value={user?.email || ""} disabled className={`${inputClasses} opacity-50 cursor-not-allowed`} />
              <p className="text-[11px] text-[var(--text-muted)] mt-1">Email is used for login and cannot be changed</p>
            </div>
            <div>
              <div className="label-bracket mb-1.5">phone</div>
              <input value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 234 567 890" className={inputClasses} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary self-start" style={{ padding: '8px 8px 8px 24px', fontSize: 14 }}>
            Save Changes
            <div className="btn-icon-circle" style={{ width: 28, height: 28 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
            </div>
          </button>
          {profileMsg && <p className="text-sm text-[var(--cs-accent)]">{profileMsg}</p>}
        </form>
      </div>

      {/* Password */}
      <div className="panel col-span-12">
        <div className="panel-header">
          <span className="label-bracket">security</span>
          <h2 className="panel-title">Password</h2>
        </div>
        <form onSubmit={changePassword} className="flex flex-col gap-4">
          <div>
            <div className="label-bracket mb-1.5">current_password</div>
            <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))} required className={inputClasses} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="label-bracket mb-1.5">new_password</div>
              <input type="password" value={passwordForm.newPass} onChange={(e) => setPasswordForm((p) => ({ ...p, newPass: e.target.value }))} required className={inputClasses} />
            </div>
            <div>
              <div className="label-bracket mb-1.5">confirm</div>
              <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))} required className={inputClasses} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary self-start" style={{ padding: '8px 8px 8px 24px', fontSize: 14 }}>
            Change Password
            <div className="btn-icon-circle" style={{ width: 28, height: 28 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
            </div>
          </button>
          {passwordMsg && <p className="text-sm text-[var(--cs-accent)]">{passwordMsg}</p>}
        </form>
      </div>

      {/* AI Services */}
      <div className="panel col-span-12">
        <div className="panel-header">
          <span className="label-bracket">integrations</span>
          <h2 className="panel-title">AI Services</h2>
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--cs-border)]">
            <div className="text-base font-bold text-[var(--text-main)]">Ollama (Local AI)</div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              For AI Mentor chat, install Ollama and run: <code className="text-[var(--cs-accent)]">ollama run llama3.2</code>
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--cs-border)]">
            <div className="text-base font-bold text-[var(--text-main)]">Ball Tracking ML</div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Start the Python service: <code className="text-[var(--cs-accent)]">cd ml-service && python server.py</code>
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--cs-border)]">
            <div className="text-base font-bold text-[var(--text-main)]">CricAPI (Live Scores)</div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Set <code className="text-[var(--cs-accent)]">CRICAPI_KEY</code> in <code>.env.local</code> for live match data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
