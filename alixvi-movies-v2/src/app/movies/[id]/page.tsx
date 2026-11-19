import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import type { Movie } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";
export default async function MovieDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabase) return <><Header/><main className="shell"><p className="muted">Configure Supabase to view titles.</p></main></>;
  const { data } = await supabase.from("movies").select("*").eq("id", id).eq("status", "published").maybeSingle();
  if (!data) notFound();
  const movie = data as Movie; const title = movie.title_en || movie.title_rw || "Untitled";
  return <><Header/><main className="shell detail"><div className="detailposter">{movie.poster_path?<img src={movie.poster_path} alt={title}/>:<div className="poster">ALIXVI</div>}</div><div><div className="tag">{movie.content_type} · {movie.release_year}</div><h1 style={{font:"700 42px 'Space Grotesk'",margin:"12px 0"}}>{title}</h1><p className="muted">{movie.title_rw}</p><p style={{lineHeight:1.8,color:"#d2d0dc"}}>{movie.description_en||movie.description_rw||"More details coming soon."}</p><div className="controls">{movie.genre&&<span className="pill">{movie.genre}</span>}{movie.quality&&<span className="pill">{movie.quality}</span>}<span className="pill">{movie.language||"Multi-language"}</span></div><div className="controls">{movie.external_watch_url&&<a className="button" href={movie.external_watch_url} target="_blank" rel="noreferrer">Watch now ↗</a>}{movie.download_path&&<a className="button secondary" href={movie.download_path} target="_blank" rel="noreferrer">Download ↗</a>}</div><Link className="gold" href="/movies">← Back to library</Link></div></main></>;
}