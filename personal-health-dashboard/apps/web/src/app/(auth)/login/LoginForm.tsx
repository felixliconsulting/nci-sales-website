"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/today";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setError("Supabase is not configured. Add env vars to .env.local.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="shell" style={{ display: "grid", placeContent: "center" }}>
      <div className="panel rise" style={{ width: "min(420px, 100%)" }}>
        <p className="pill">Pulse Desk</p>
        <h1 style={{ margin: "12px 0 6px", fontSize: 34 }}>Sign in</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Private invite-only access. Open registration is disabled.
        </p>
        <form onSubmit={onSubmit} className="stack" style={{ marginTop: 18 }}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? (
            <p className="pill warn" role="alert">
              {error}
            </p>
          ) : null}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
