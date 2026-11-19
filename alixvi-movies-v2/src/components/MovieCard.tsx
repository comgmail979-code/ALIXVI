import Link from "next/link";
import type { Movie } from "@/lib/types";
export default function MovieCard({ movie }: { movie: Movie }) {
  const title = movie.title_en || movie.title_rw || "Untitled";
  return <Link className="moviecard" href={`/movies/${movie.id}`}><div className="poster">{movie.poster_path ? <img src={movie.poster_path} alt={title}/> : <span>ALIXVI</span>}</div><div className="movieinfo"><div className="tag">{movie.content_type || "movie"} · {movie.release_year || "New"}</div><h3>{title}</h3><div className="muted" style={{fontSize:12}}>{movie.genre || "Featured"}</div></div></Link>;
}