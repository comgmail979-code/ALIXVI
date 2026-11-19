"use client";

import { FormEvent, useEffect, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";

const COOLDOWN_SECONDS = 60;

export default function Admin() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error" | "info">("info");
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  async function sendLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setMessageKind("error");
      setMessage("Login service is not configured. Please contact the site administrator.");
      return;
    }
    if (busy || secondsLeft > 0) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/admin/dashboard`,
      },
    });
    setBusy(false);

    if (error) {
      const rateLimited = error.status === 429 || /rate.?limit|too many requests|over_email_send_rate_limit/i.test(error.message);
      setMessageKind("error");
      if (rateLimited) {
        setSecondsLeft(COOLDOWN_SECONDS);
        setMessage("Email limit reached. Do not keep pressing Send. Supabase's built-in email service has a very small sending quota; this lockout may last longer than the 60-second safety timer. For reliable admin login, ALIXVI needs custom SMTP configured.");
      } else {
        setMessage(error.message || "We couldn't send the sign-in link. Please try again later.");
      }
      return;
    }

    setSecondsLeft(COOLDOWN_SECONDS);
    setMessageKind("success");
    setMessage("Sign-in link sent. Check your inbox and spam folder. You can request another link after the countdown if needed.");
  }

  const locked = busy || secondsLeft > 0;
  return (
    <>
      <Header />
      <main className="shell" style={{ minHeight: "72vh", display: "grid", placeItems: "center", paddingTop: 42, paddingBottom: 64 }}>
        <section className="adminbox" style={{ width: "100%", maxWidth: 480, padding: "clamp(22px,5vw,38px)", borderRadius: 22, boxShadow: "0 24px 80px rgba(0,0,0,.28)" }}>
          <div className="tag" style={{ letterSpacing: 2 }}>ALIXVI · ADMIN ACCESS</div>
          <h1 style={{ font: "700 clamp(28px,5vw,36px) 'Space Grotesk'", lineHeight: 1.15, margin: "14px 0 10px" }}>Welcome back</h1>
          <p className="muted" style={{ lineHeight: 1.65, marginBottom: 26 }}>Sign in with the authorized administrator email. We will send one secure, single-use link.</p>

          <form onSubmit={sendLink}>
            <label htmlFor="admin-email" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Administrator email</label>
            <input
              id="admin-email"
              name="email"
              className="field"
              style={{ width: "100%", margin: "0 0 16px", boxSizing: "border-box" }}
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="you@example.com"
              disabled={busy}
            />
            <button className="button" style={{ width: "100%", justifyContent: "center", opacity: locked ? .72 : 1 }} disabled={locked} type="submit">
              {busy ? "Sending secure link..." : secondsLeft > 0 ? `Try again in ${secondsLeft}s` : "Send secure sign-in link"}
            </button>
          </form>

          {message && (
            <div role="status" aria-live="polite" style={{
              marginTop: 18, padding: "13px 15px", borderRadius: 12, lineHeight: 1.6,
              border: messageKind === "error" ? "1px solid rgba(248,113,113,.35)" : "1px solid rgba(74,222,128,.25)",
              background: messageKind === "error" ? "rgba(127,29,29,.16)" : "rgba(21,128,61,.12)",
              color: messageKind === "error" ? "#fecaca" : "#bbf7d0",
              fontSize: 13,
            }}>{message}</div>
          )}

          <div style={{ borderTop: "1px solid rgba(148,163,184,.16)", marginTop: 25, paddingTop: 18 }}>
            <p className="muted" style={{ fontSize: 12, lineHeight: 1.7, margin: 0 }}>
              Protected administrator area. Only existing authorized accounts can sign in. Never share your sign-in link with anyone.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
