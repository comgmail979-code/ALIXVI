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

  const movie = data as Movie;
  const title = movie.title_en || movie.title_rw || "Untitled";
  const isFree = movie.access_type !== "premium";
  let videoUrl: string | null = null;
  let videoDownloadUrl: string | null = null;

  // Uploaded videos live in the private bucket. Create short-lived URLs only
  // for published free titles; Storage RLS remains the final access check.
  if (isFree && movie.video_path) {
    const { data: signed } = await supabase.storage
      .from("movie-videos")
      .createSignedUrl(movie.video_path, 60 * 60);
    videoUrl = signed?.signedUrl || null;

    const { data: downloadable } = await supabase.storage
      .from("movie-videos")
      .createSignedUrl(movie.video_path, 60 * 60, { download: `${title}.mp4` });
    videoDownloadUrl = downloadable?.signedUrl || null;
  }

  const externalDownload = movie.download_path?.startsWith("https://") || movie.download_path?.startsWith("http://")
    ? movie.download_path
    : null;

  return <><Header/><main className="shell detail">
    <div className="detailposter">{movie.poster_path?<img src={movie.poster_path} alt={title}/>:<div className="poster">ALIXVI</div>}</div>
    <div>
      <div className="tag">{movie.content_type} · {movie.release_year}</div>
      <h1 style={{font:"700 42px 'Space Grotesk'",margin:"12px 0"}}>{title}</h1>
      <p className="muted">{movie.title_rw}</p>
      <p style={{lineHeight:1.8,color:"#d2d0dc"}}>{movie.description_en||movie.description_rw||"More details coming soon."}</p>
      <div className="controls">{movie.genre&&<span className="pill">{movie.genre}</span>}{movie.quality&&<span className="pill">{movie.quality}</span>}<span className="pill">{movie.language||"Multi-language"}</span></div>
      {videoUrl && <section style={{ margin: "22px 0" }}>
        <video controls playsInline preload="metadata" style={{ width: "100%", maxWidth: 900, borderRadius: 14, background: "#000" }} src={videoUrl}>
          Your browser does not support HTML video.
        </video>
      </section>}
      {!isFree && <p className="muted">This title is Premium. Premium access will be enabled when membership payments are ready.</p>}
      {!videoUrl && movie.external_watch_url && <div className="controls"><a className="button" href={movie.external_watch_url} target="_blank" rel="noreferrer">Watch now ↗</a></div>}
      <div className="controls">
        {videoDownloadUrl && <a className="button secondary" href={videoDownloadUrl}>Download movie ↓</a>}
        {!videoDownloadUrl && externalDownload && <a className="button secondary" href={externalDownload} target="_blank" rel="noreferrer">Download ↗</a>}
      </div>
      {movie.video_path && isFree && !videoUrl && <p className="muted">The uploaded video is not available yet. Check that the movie is published and the movie-videos Storage read policy allows published free movies.</p>}
      <Link className="gold" href="/movies">← Back to library</Link>
    </div>
  </main></>;
}
