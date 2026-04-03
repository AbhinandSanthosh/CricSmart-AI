"use client";

import { useState } from "react";
import { useAuth } from "@/store/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { user } = useAuth();
  const [profileForm, setProfileForm] = useState({
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });
  const [profileMsg, setProfileMsg] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/users/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      if (res.ok) setProfileMsg("Profile updated!");
      else setProfileMsg("Failed to update");
    } catch {
      setProfileMsg("Error saving profile");
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) {
      setPasswordMsg("Passwords don't match");
      return;
    }
    try {
      const res = await fetch("/api/users/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.newPass,
        }),
      });
      if (res.ok) {
        setPasswordMsg("Password changed!");
        setPasswordForm({ current: "", newPass: "", confirm: "" });
      } else {
        const data = await res.json();
        setPasswordMsg(data.error || "Failed to change password");
      }
    } catch {
      setPasswordMsg("Error changing password");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account</p>
      </div>

      {/* Profile */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={user?.username || ""} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">Username cannot be changed</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="your@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+1 234 567 890"
                />
              </div>
            </div>
            <Button type="submit" className="bg-amber hover:bg-amber-dark text-black">
              Save Changes
            </Button>
            {profileMsg && (
              <p className="text-sm text-amber">{profileMsg}</p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={passwordForm.newPass}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPass: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm</Label>
                <Input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="bg-amber hover:bg-amber-dark text-black">
              Change Password
            </Button>
            {passwordMsg && (
              <p className="text-sm text-amber">{passwordMsg}</p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Setup Info */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">AI Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg bg-secondary/30">
            <div className="text-sm font-medium">Ollama (Local AI)</div>
            <div className="text-xs text-muted-foreground mt-1">
              For AI Mentor chat, install Ollama and run: <code className="text-amber">ollama run llama3.2</code>
            </div>
          </div>
          <Separator />
          <div className="p-3 rounded-lg bg-secondary/30">
            <div className="text-sm font-medium">Ball Tracking ML Service</div>
            <div className="text-xs text-muted-foreground mt-1">
              Start the Python service: <code className="text-amber">cd ml-service && python server.py</code>
            </div>
          </div>
          <Separator />
          <div className="p-3 rounded-lg bg-secondary/30">
            <div className="text-sm font-medium">CricAPI (Live Scores)</div>
            <div className="text-xs text-muted-foreground mt-1">
              Set <code className="text-amber">CRICAPI_KEY</code> in <code>.env.local</code> for live match data (free at cricapi.com)
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
