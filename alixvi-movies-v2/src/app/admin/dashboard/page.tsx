"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
export default function Dashboard() {
  const [email,setEmail] = useState<string|null>(null); const [status,setStatus] = useState("Checking session...");
  useEffect(() => { if (!supabase) { setStatus("Supabase is not configured."); return; }
    supabase.auth.getSession().then(({data}) => { setEmail(data.session?.user.email || null); setStatus(data.session ? "Signed in. Admin permissions still need to be verified server-side." : "No active session. Please sign in again."); });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,session) => { setEmail(session?.user.email || null); setStatus(session ? "Signed in." : "No active session."); });
    return () => subscription.unsubscribe();
  }, []);
  async function logout() { if (supabase) await supabase.auth.signOut(); }
  return <><Header/><main className="shell" style={{paddingTop:55}}><h1 style={{font:"700 34px 'Space Grotesk'"}}>Admin dashboard</h1><p className="muted">{status}</p>{email&&<><p>Signed in as {email}</p><button className="button secondary" onClick={logout}>Sign out</button></>}<p className="muted" style={{marginTop:28}}>Content upload and management will be added after the existing database permissions and storage policies are verified.</p></main></>;
}