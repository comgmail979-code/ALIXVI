import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import type { Movie } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";

function safeHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default async function MovieDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!supabase) {
    return <><Header /><main className="shell"><p className="muted">Configure Supabase to view titles.</p></main></>;
  }

  const { data } = await supabase
    .from("movies")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (!data) notFound();

  const movie = data as Movie;
  const title = movie.title_en || movie.title_rw || "Untitled";
  const isFree = movie.access_type !== "premium";
  const watchLink = safeHttpsUrl(movie.external_watch_url);
  const downloadLink = safeHttpsUrl(movie.download_path);
  const trailerLink = safeHttpsUrl(movie.trailer_url);

  let videoUrl: string | null = null;
  let videoDownloadUrl: string | null = null;

  // Uploaded videos are private. Only published free titles receive signed URLs.
  if (isFree && movie.video_path) {
    const { data: signed } = await supabase.storage
      .from("movie-videos")
      .createSignedUrl(movie.video_path, 60 * 60);
    videoUrl = signed?.signedUrl || null;

    const { data: downloadable } = await supabase.storage
      .from("movie-videos")
      .createSignedUrl(movie.video_path, 60 * 60, {
        download: `${title}.mp4`,
      });
    videoDownloadUrl = downloadable?.signedUrl || null;
  }

  return (
    <>
      <Header />
      <main className="shell detail">
        <div className="detailposter">
          {movie.poster_path ? (
            <img src={movie.poster_path} alt={title} />
          ) : (
            <div className="poster">ALIXVI</div>
          )}
        </div>
        <div>
          <div className="tag">
            {movie.content_type || "movie"} · {movie.release_year || "New"}
          </div>
          <h1 style={{ font: "700 42px 'Space Grotesk'", margin: "12px 0" }}>
            {title}
          </h1>
          {movie.title_rw && <p className="muted">{movie.title_rw}</p>}
          <p style={{ lineHeight: 1.8, color: "#d2d0dc" }}>
            {movie.description_en || movie.description_rw || "More details coming soon."}
          </p>
          <div className="controls">
            {movie.genre && <span className="pill">{movie.genre}</span>}
            {movie.quality && <span className="pill">{movie.quality}</span>}
            <span className="pill">{movie.language || "Multi-language"}</span>
          </div>

          {videoUrl && (
            <section style={{ margin: "22px 0" }}>
              <video
                controls
                playsInline
                preload="metadata"
                style={{
                  width: "100%",
                  maxWidth: 900,
                  borderRadius: 14,
                  background: "#000",
                }}
                src={videoUrl}
              >
                Your browser does not support HTML video.
              </video>
            </section>
          )}

          {!isFree && (
            <p className="muted">
              This title is Premium. Premium access will be enabled when membership payments are ready.
            </p>
          )}

          <div className="controls">
            {!videoUrl && watchLink && (
              <a className="button" href={watchLink} target="_blank" rel="noopener noreferrer">
                Watch now ↗
              </a>
            )}
            {trailerLink && (
              <a className="button secondary" href={trailerLink} target="_blank" rel="noopener noreferrer">
                Watch trailer ↗
              </a>
            )}
            {videoDownloadUrl && (
              <a className="button secondary" href={videoDownloadUrl}>
                Download movie ↓
              </a>
            )}
            {!videoDownloadUrl && downloadLink && (
              <a className="button secondary" href={downloadLink} target="_blank" rel="noopener noreferrer">
                Download ↗
              </a>
            )}
          </div>

          {movie.video_path && isFree && !videoUrl && (
            <p className="muted">
              The uploaded video is not available yet. Check that the movie is published and the movie-videos Storage read policy allows published free movies.
            </p>
          )}
          <Link className="gold" href="/movies">← Back to library</Link>
        </div>
      </main>
    </>
  );
}
