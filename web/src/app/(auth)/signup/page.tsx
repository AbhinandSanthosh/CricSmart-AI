"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/store/auth";

const ROLES = ["Batter", "Bowler", "All-Rounder", "Wicketkeeper"];
const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced"];
const BOWLING_STYLES = ["Fast", "Medium", "Off-Spin", "Leg-Spin"];

export default function SignupPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirm: "",
    role: "Batter",
    skillLevel: "Beginner",
    bowlingStyle: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(data.user);
      router.push("/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-14 h-14 bg-amber rounded-xl flex items-center justify-center text-3xl">
            🏏
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-widest text-amber">
              JOIN CRICSMART
            </CardTitle>
            <p className="text-xs tracking-[0.2em] text-muted-foreground mt-1">
              CREATE YOUR ACCOUNT
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={form.username}
                onChange={(e) => update("username", e.target.value)}
                placeholder="Choose a username"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="Password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm</Label>
                <Input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => update("confirm", e.target.value)}
                  placeholder="Confirm"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Primary Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => update("role", r)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.role === r
                        ? "bg-amber text-black border-amber"
                        : "border-border text-muted-foreground hover:border-amber/50"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {form.role === "Bowler" && (
              <div className="space-y-2">
                <Label>Bowling Style</Label>
                <div className="grid grid-cols-2 gap-2">
                  {BOWLING_STYLES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => update("bowlingStyle", s)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        form.bowlingStyle === s
                          ? "bg-amber text-black border-amber"
                          : "border-border text-muted-foreground hover:border-amber/50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Skill Level</Label>
              <div className="grid grid-cols-3 gap-2">
                {SKILL_LEVELS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => update("skillLevel", s)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.skillLevel === s
                        ? "bg-amber text-black border-amber"
                        : "border-border text-muted-foreground hover:border-amber/50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-amber hover:bg-amber-dark text-black font-semibold"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-amber hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
