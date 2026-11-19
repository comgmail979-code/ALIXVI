import Header from "@/components/Header";
import MovieCard from "@/components/MovieCard";
import { supabase } from "@/lib/supabase";
import type { Movie } from "@/lib/types";
export const revalidate = 60;
export default async function Movies({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; genre?: string }> }) {
  const params = await searchParams; let movies: Movie[] = [];
  if (supabase) {
    let query = supabase.from("movies").select("*").eq("status", "published").order("created_at", { ascending: false });
    if (params.type) query = query.eq("content_type", params.type);
    if (params.genre) query = query.ilike("genre", `%${params.genre}%`);
    if (params.q) query = query.or(`title_en.ilike.%${params.q}%,title_rw.ilike.%${params.q}%`);
    const { data } = await query.limit(60); movies = (data || []) as Movie[];
  }
  return <><Header/><main className="shell" style={{paddingTop:38}}><div className="tag">THE ALIXVI LIBRARY</div><h1 style={{font:"700 42px 'Space Grotesk'",margin:"8px 0"}}>Explore</h1><p className="muted">Movies, series and documentaries.</p>
    <form className="controls"><input className="field" name="q" placeholder="Search titles..." defaultValue={params.q}/><select className="field" name="type" defaultValue={params.type||""}><option value="">All content</option><option value="movie">Movies</option><option value="series">Series</option><option value="documentary">Documentaries</option></select><button className="button" type="submit">Search</button></form>
    {movies.length?<div className="gridmovies">{movies.map(m=><MovieCard key={m.id} movie={m}/>)}</div>:<p className="muted">No published titles found. Try another search or check back soon.</p>}
  </main><footer className="shell footer">ALIXVI MOVIES</footer></>;
}