import Link from "next/link";
import Header from "@/components/Header";
import MovieCard from "@/components/MovieCard";
import { supabase } from "@/lib/supabase";
import type { Movie } from "@/lib/types";
export const revalidate = 60;
async function getFeatured(): Promise<Movie[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("movies").select("*").eq("status", "published").order("created_at", { ascending: false }).limit(8);
  return (data || []) as Movie[];
}
export default async function Home() {
  const movies = await getFeatured();
  return <><Header/><main className="shell">
    <section className="hero"><div><div className="tag">YOUR WORLD OF STORIES</div><h1>Stories that move <span className="gold">you.</span></h1><p>Discover movies, series and documentaries in English and Kinyarwanda. Find your next favourite story on ALIXVI MOVIES.</p><div className="actions"><Link className="button" href="/movies">Explore movies ↗</Link><Link className="button secondary" href="/movies?type=documentary">Watch documentaries</Link></div></div><div className="heroart" aria-label="Cinematic artwork"/></section>
    <div className="sectionhead"><div><div className="tag">HANDPICKED FOR YOU</div><h2>Recently added</h2></div><Link className="gold" href="/movies">View all →</Link></div>
    {movies.length ? <div className="gridmovies">{movies.map(m=><MovieCard key={m.id} movie={m}/>)}</div> : <p className="muted">Your catalogue will appear here when published movies are available.</p>}
    <div className="sectionhead"><div><div className="tag">MORE TO DISCOVER</div><h2>Choose your mood</h2></div></div>
    <div className="controls">{["Action","Comedy","Drama","Romance","Documentary","Series","Horror"].map(x=><Link key={x} className="pill" href={`/movies?genre=${encodeURIComponent(x)}`}>{x}</Link>)}</div>
  </main><footer className="shell footer">© {new Date().getFullYear()} ALIXVI MOVIES · English + Kinyarwanda</footer></>;
}