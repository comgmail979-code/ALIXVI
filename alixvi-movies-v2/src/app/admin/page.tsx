"use client";
import { useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
export default function Admin() {
  const [email,setEmail] = useState(""); const [message,setMessage] = useState(""); const [busy,setBusy] = useState(false);
  async function sendLink(e: React.FormEvent) { e.preventDefault(); if (!supabase) { setMessage("Supabase environment variables are missing."); return; } setBusy(true); setMessage("");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/admin/dashboard` } });
    setMessage(error?.message || "Sign-in link sent. Check your email."); setBusy(false);
  }
  return <><Header/><main className="shell"><section className="adminbox"><div className="tag">SECURE AREA</div><h1 style={{font:"700 30px 'Space Grotesk'"}}>Admin sign in</h1><p className="muted">Use your authorized ALIXVI administrator email.</p><form onSubmit={sendLink}><label htmlFor="admin-email">Email address</label><input id="admin-email" name="email" className="field" style={{width:"100%",margin:"9px 0 16px"}} type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@example.com"/><button className="button" disabled={busy} type="submit">{busy?"Sending...":"Send secure sign-in link"}</button></form>{message&&<p className="muted" role="status">{message}</p>}</section></main></>;
}