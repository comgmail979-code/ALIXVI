"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";

export default function Admin() {
  const router = useRouter();
  const [email, setEmail] = useState("comgmail979@gmail.com");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error" | "info">("info");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) {
      if (!supabase) {
        setMessageKind("error");
        setMessage("Login service is not configured. Contact the administrator.");
      }
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) return;

    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    setBusy(false);

    if (error) {
      setMessageKind("error");
      setMessage(/invalid login credentials/i.test(error.message)
        ? "Email cyangwa password si byo. Niba utarashyiraho password, banza uyishyireho kuri konti ya admin."
        : "Ntibyashobotse kwinjira. Ongera ugerageze nyuma.");
      return;
    }

    setMessageKind("success");
    setMessage("Winjiye neza. Turakujyana kuri Admin Dashboard...");
    router.replace("/admin/dashboard");
  }

  return (
    <>
      <Header />
      <main className="shell" style={{ minHeight: "72vh", display: "grid", placeItems: "center", paddingTop: 42, paddingBottom: 64 }}>
        <section className="adminbox" style={{ width: "100%", maxWidth: 480, padding: "clamp(22px,5vw,38px)", borderRadius: 22, boxShadow: "0 24px 80px rgba(0,0,0,.28)" }}>
          <div className="tag" style={{ letterSpacing: 2 }}>ALIXVI · ADMIN ACCESS</div>
          <h1 style={{ font: "700 clamp(28px,5vw,36px) 'Space Grotesk'", lineHeight: 1.15, margin: "14px 0 10px" }}>Welcome back</h1>
          <p className="muted" style={{ lineHeight: 1.65, marginBottom: 22 }}>Injira ukoresheje email na password. Nta OTP cyangwa email link bikenewe.</p>
          <form onSubmit={submit}>
            <label htmlFor="admin-email" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Administrator email</label>
            <input id="admin-email" name="email" className="field" style={{ width: "100%", margin: "0 0 16px", boxSizing: "border-box" }} type="email" autoComplete="username" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={busy} />
            <label htmlFor="admin-password" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Password</label>
            <input id="admin-password" name="password" className="field" style={{ width: "100%", margin: "0 0 16px", boxSizing: "border-box" }} type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your admin password" disabled={busy} />
            <button className="button" style={{ width: "100%", justifyContent: "center", opacity: busy ? .72 : 1 }} disabled={busy} type="submit">
              {busy ? "Checking..." : "Sign in securely"}
            </button>
          </form>
          {message && <div role="status" aria-live="polite" style={{ marginTop: 18, padding: "13px 15px", borderRadius: 12, lineHeight: 1.6, border: messageKind === "error" ? "1px solid rgba(248,113,113,.35)" : "1px solid rgba(74,222,128,.25)", background: messageKind === "error" ? "rgba(127,29,29,.16)" : "rgba(21,128,61,.12)", color: messageKind === "error" ? "#fecaca" : "#bbf7d0", fontSize: 13 }}>{message}</div>}
          <div style={{ borderTop: "1px solid rgba(148,163,184,.16)", marginTop: 25, paddingTop: 18 }}>
            <p className="muted" style={{ fontSize: 12, lineHeight: 1.7, margin: 0 }}>Protected administrator area. Only existing authorized accounts can sign in. Ntuzasangize password n'undi muntu.</p>
          </div>
        </section>
      </main>
    </>
  );
}
