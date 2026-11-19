"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";

const COOLDOWN_KEY = "alixvi-admin-email-cooldown-until";
const RATE_LIMIT_COOLDOWN_MS = 15 * 60 * 1000;

export default function Admin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "email">("password");
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error" | "info">("info");
  const [busy, setBusy] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(COOLDOWN_KEY) || 0);
    if (saved > Date.now()) setCooldownUntil(saved);
    else window.localStorage.removeItem(COOLDOWN_KEY);
  }, []);

  useEffect(() => {
    if (!cooldownUntil) { setSecondsLeft(0); return; }
    const update = () => {
      const left = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        window.localStorage.removeItem(COOLDOWN_KEY);
        setCooldownUntil(0);
      }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) {
      if (!supabase) { setMessageKind("error"); setMessage("Login service is not configured. Contact the administrator."); }
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    setBusy(true);
    setMessage("");

    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      setBusy(false);
      if (error) {
        setMessageKind("error");
        setMessage(/invalid login credentials/i.test(error.message)
          ? "Email cyangwa password si byo. Reba amakuru yawe wongere ugerageze."
          : "Ntibyashobotse kwinjira. Ongera ugerageze nyuma.");
        return;
      }
      setMessageKind("success");
      setMessage("Winjiye neza. Turakujyana kuri Admin Dashboard...");
      router.replace("/admin/dashboard");
      return;
    }

    if (secondsLeft > 0) { setBusy(false); return; }
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/admin/dashboard` },
    });
    setBusy(false);
    if (error) {
      setMessageKind("error");
      const rateLimited = error.status === 429 || /rate.?limit|too many requests|over_email_send_rate_limit/i.test(error.message);
      if (rateLimited) {
        const until = Date.now() + RATE_LIMIT_COOLDOWN_MS;
        window.localStorage.setItem(COOLDOWN_KEY, String(until));
        setCooldownUntil(until);
        setMessage("Email yageze ku gipimo cyo kohereza. Ntukande kenshi kuri send. Koresha Password login cyangwa utegereze mbere yo kongera kohereza email. Igihe nyacyo cya Supabase gishobora kurenga iyi minota 15.");
      } else {
        setMessage(error.message || "Ntitwashoboye kohereza login link. Ongera ugerageze nyuma.");
      }
      return;
    }
    setMessageKind("success");
    setMessage("Login link yoherejwe. Reba inbox na spam folder. Ntusabe indi link kenshi.");
  }

  const locked = busy || (mode === "email" && secondsLeft > 0);
  return (
    <>
      <Header />
      <main className="shell" style={{ minHeight: "72vh", display: "grid", placeItems: "center", paddingTop: 42, paddingBottom: 64 }}>
        <section className="adminbox" style={{ width: "100%", maxWidth: 480, padding: "clamp(22px,5vw,38px)", borderRadius: 22, boxShadow: "0 24px 80px rgba(0,0,0,.28)" }}>
          <div className="tag" style={{ letterSpacing: 2 }}>ALIXVI · ADMIN ACCESS</div>
          <h1 style={{ font: "700 clamp(28px,5vw,36px) 'Space Grotesk'", lineHeight: 1.15, margin: "14px 0 10px" }}>Welcome back</h1>
          <p className="muted" style={{ lineHeight: 1.65, marginBottom: 22 }}>Injira ukoresheje uburyo bwizewe. Password login ntisaba koherezwa kwa email buri gihe.</p>
          <div role="group" aria-label="Login method" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 5, borderRadius: 12, background: "rgba(148,163,184,.1)", marginBottom: 20 }}>
            <button type="button" className={mode === "password" ? "button" : "button secondary"} onClick={() => { setMode("password"); setMessage(""); }} aria-pressed={mode === "password"}>Password login</button>
            <button type="button" className={mode === "email" ? "button" : "button secondary"} onClick={() => { setMode("email"); setMessage(""); }} aria-pressed={mode === "email"}>Email link</button>
          </div>
          <form onSubmit={submit}>
            <label htmlFor="admin-email" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Administrator email</label>
            <input id="admin-email" name="email" className="field" style={{ width: "100%", margin: "0 0 16px", boxSizing: "border-box" }} type="email" autoComplete="username" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" disabled={busy} />
            {mode === "password" ? <>
              <label htmlFor="admin-password" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Password</label>
              <input id="admin-password" name="password" className="field" style={{ width: "100%", margin: "0 0 16px", boxSizing: "border-box" }} type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your admin password" disabled={busy} />
            </> : <p className="muted" style={{ fontSize: 13, margin: "0 0 16px" }}>Tuzohereza link imwe yo kwinjira kuri email ya admin yemewe.</p>}
            <button className="button" style={{ width: "100%", justifyContent: "center", opacity: locked ? .72 : 1 }} disabled={locked} type="submit">
              {busy ? "Checking..." : mode === "password" ? "Sign in securely" : secondsLeft > 0 ? `Wait ${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s` : "Send secure sign-in link"}
            </button>
          </form>
          {message && <div role="status" aria-live="polite" style={{ marginTop: 18, padding: "13px 15px", borderRadius: 12, lineHeight: 1.6, border: messageKind === "error" ? "1px solid rgba(248,113,113,.35)" : "1px solid rgba(74,222,128,.25)", background: messageKind === "error" ? "rgba(127,29,29,.16)" : "rgba(21,128,61,.12)", color: messageKind === "error" ? "#fecaca" : "#bbf7d0", fontSize: 13 }}>{message}</div>}
          <div style={{ borderTop: "1px solid rgba(148,163,184,.16)", marginTop: 25, paddingTop: 18 }}>
            <p className="muted" style={{ fontSize: 12, lineHeight: 1.7, margin: 0 }}>Protected administrator area. Only existing authorized accounts can sign in. Ntuzasangize password cyangwa login link n'undi muntu.</p>
          </div>
        </section>
      </main>
    </>
  );
}
