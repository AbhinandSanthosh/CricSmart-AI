"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowRight, Check } from "lucide-react";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess("Check your email for reset instructions");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send reset email";
      if (msg.includes("auth/user-not-found")) {
        setError("No account found with this email");
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

      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/criceye-mark.png"
            alt="CricEye"
            className="w-12 h-12 mx-auto mb-3 block"
          />
          <h1 className="text-xl font-bold text-[var(--text-main)] mb-1">CricEye AI</h1>
          <p className="text-sm text-[var(--text-muted)]">Password recovery</p>
        </div>

        <div className="panel p-8">
          {success ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-500/15 flex items-center justify-center mx-auto mb-5">
                <Check className="w-7 h-7 text-[var(--cs-accent)]" />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-main)] mb-2">Email Sent</h2>
              <p className="text-sm text-[var(--text-muted)] mb-6">{success}</p>
              <Link href="/login" className="btn btn-primary w-full py-3 no-underline">
                Back to Sign In
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[var(--text-main)] mb-1">Find Account</h2>
                <p className="text-sm text-[var(--text-muted)]">Enter the email address associated with your account.</p>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && (
                  <div className="text-sm text-[var(--cs-danger)] bg-red-50 dark:bg-red-500/10 p-3 rounded-lg">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full bg-[var(--bg-surface)] border border-[var(--cs-border)] rounded-lg px-4 py-3 text-sm text-[var(--text-main)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--cs-accent)] focus:ring-2 focus:ring-[var(--cs-accent-light)] transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full py-3 text-base disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
          <p className="text-center text-sm text-[var(--text-muted)] mt-5">
            <Link href="/login" className="text-[var(--cs-accent)] font-medium hover:underline no-underline">
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
