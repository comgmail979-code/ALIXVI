import Header from "@/components/Header";
import MovieCard from "@/components/MovieCard";
import { supabase } from "@/lib/supabase";
import type { Movie } from "@/lib/types";

export const revalidate = 60;

type SearchParams = { q?: string; type?: string; genre?: string };

function cleanFilter(value: string | undefined, maxLength = 80) {
  return (value || "").replace(/[,%()]/g, " ").replace(/\\s+/g, " ").trim().slice(0, maxLength);
}

export default async function Movies({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const search = cleanFilter(params.q, 100);
  const genre = cleanFilter(params.genre);
  const type = ["movie", "series", "documentary"].includes(params.type || "")
    ? params.type
    : "";

  let movies: Movie[] = [];
  if (supabase) {
    let query = supabase
      .from("movies")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (type) query = query.eq("content_type", type);
    if (genre) query = query.ilike("genre", `%${genre}%`);
    if (search) {
      query = query.or(
        `title_en.ilike.%${search}%,title_rw.ilike.%${search}%`,
      );
    }

    const { data } = await query.limit(60);
    movies = (data || []) as Movie[];
  }

  return (
    <>
      <Header />
      <main className="shell" style={{ paddingTop: 38 }}>
        <div className="tag">THE ALIXVI LIBRARY</div>
        <h1 style={{ font: "700 42px 'Space Grotesk'", margin: "8px 0" }}>
          Explore
        </h1>
        <p className="muted">Movies, series and documentaries.</p>

        <form className="controls" role="search">
          <label className="sr-only" htmlFor="movie-search">Search titles</label>
          <input
            id="movie-search"
            className="field"
            name="q"
            placeholder="Search titles..."
            defaultValue={search}
            maxLength={100}
          />
          <label className="sr-only" htmlFor="content-type">Content type</label>
          <select
            id="content-type"
            className="field"
            name="type"
            defaultValue={type}
          >
            <option value="">All content</option>
            <option value="movie">Movies</option>
            <option value="series">Series</option>
            <option value="documentary">Documentaries</option>
          </select>
          {genre && <input type="hidden" name="genre" value={genre} />}
          <button className="button" type="submit">Search</button>
          {(search || type || genre) && (
            <a className="pill" href="/movies">Clear filters</a>
          )}
        </form>

        {movies.length ? (
          <div className="gridmovies">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <p className="muted" role="status">
            No published titles found. Try another search or check back soon.
          </p>
        )}
      </main>
      <footer className="shell footer">ALIXVI MOVIES</footer>
    </>
  );
}
