"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowRight } from "lucide-react";

const ROLES = ["Batter", "Bowler", "All-Rounder", "Wicketkeeper"];
const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced"];
const BOWLING_STYLES = ["Fast", "Medium", "Off-Spin", "Leg-Spin"];

export default function SignupPage() {
  const router = useRouter();
  const { signupWithEmail, loginWithGoogle } = useAuth();
  const [form, setForm] = useState({
    username: "",
    email: "",
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
      await signupWithEmail(form.email, form.password, {
        username: form.username,
        role: form.role,
        skillLevel: form.skillLevel,
        bowlingStyle: form.bowlingStyle,
      });
      router.push("/dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Signup failed";
      if (msg.includes("auth/email-already-in-use")) {
        setError("An account with this email already exists");
      } else if (msg.includes("auth/weak-password")) {
        setError("Password should be at least 6 characters");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push("/dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Google sign-in failed";
      if (msg.includes("auth/popup-closed-by-user")) {
        setError("Sign-in cancelled");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-4">
      {/* Theme toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[480px]">
        {/* Logo */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/criceye-mark.png"
            alt="CricEye"
            className="w-12 h-12 mx-auto mb-3 block"
          />
          <h1 className="text-xl font-bold text-[var(--text-main)] mb-1">CricEye AI</h1>
          <p className="text-sm text-[var(--text-muted)]">Join the AI cricket coach</p>
        </div>

        {/* Card */}
        <div className="panel p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[var(--text-main)] mb-1">Create Account</h2>
            <p className="text-sm text-[var(--text-muted)]">Set up your player profile to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="text-sm text-[var(--cs-danger)] bg-red-50 dark:bg-red-500/10 p-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">Full Name</label>
              <input
                value={form.username}
                onChange={(e) => update("username", e.target.value)}
                placeholder="Your full name"
                required
                className="w-full bg-[var(--bg-surface)] border border-[var(--cs-border)] rounded-lg px-4 py-3 text-sm text-[var(--text-main)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--cs-accent)] focus:ring-2 focus:ring-[var(--cs-accent-light)] transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full bg-[var(--bg-surface)] border border-[var(--cs-border)] rounded-lg px-4 py-3 text-sm text-[var(--text-main)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--cs-accent)] focus:ring-2 focus:ring-[var(--cs-accent-light)] transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full bg-[var(--bg-surface)] border border-[var(--cs-border)] rounded-lg px-4 py-3 text-sm text-[var(--text-main)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--cs-accent)] focus:ring-2 focus:ring-[var(--cs-accent-light)] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">Confirm</label>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => update("confirm", e.target.value)}
                  placeholder="Confirm"
                  required
                  className="w-full bg-[var(--bg-surface)] border border-[var(--cs-border)] rounded-lg px-4 py-3 text-sm text-[var(--text-main)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--cs-accent)] focus:ring-2 focus:ring-[var(--cs-accent-light)] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-2">Primary Role</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => update("role", r)}
                    className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                      form.role === r
                        ? "bg-[var(--cs-accent-light)] text-[var(--cs-accent)] border-[var(--cs-accent)]"
                        : "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--cs-border)] hover:border-[var(--cs-border-strong)]"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {form.role === "Bowler" && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-main)] mb-2">Bowling Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {BOWLING_STYLES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => update("bowlingStyle", s)}
                      className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                        form.bowlingStyle === s
                          ? "bg-[var(--cs-accent-light)] text-[var(--cs-accent)] border-[var(--cs-accent)]"
                          : "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--cs-border)] hover:border-[var(--cs-border-strong)]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-2">Skill Level</label>
              <div className="grid grid-cols-3 gap-2">
                {SKILL_LEVELS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => update("skillLevel", s)}
                    className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                      form.skillLevel === s
                        ? "bg-[var(--cs-accent-light)] text-[var(--cs-accent)] border-[var(--cs-accent)]"
                        : "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--cs-border)] hover:border-[var(--cs-border-strong)]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-3 text-base disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create Account"}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="btn btn-secondary w-full py-3 text-base disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            <p className="text-center text-sm text-[var(--text-muted)]">
              Already have an account?{" "}
              <Link href="/login" className="text-[var(--cs-accent)] font-medium hover:underline no-underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
