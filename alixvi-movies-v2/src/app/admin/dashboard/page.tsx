"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import * as tus from "tus-js-client";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import type { Movie } from "@/lib/types";

type Draft = {
  title_en: string;
  title_rw: string;
  description_en: string;
  description_rw: string;
  release_year: string;
  genre: string;
  content_type: "movie" | "series" | "documentary";
  language: string;
  poster_path: string;
  video_path: string;
  external_watch_url: string;
  download_path: string;
  trailer_url: string;
  access_type: "free" | "premium";
  status: "draft" | "published" | "archived";
};

const emptyDraft: Draft = {
  title_en: "", title_rw: "", description_en: "", description_rw: "",
  release_year: "", genre: "", content_type: "movie", language: "English",
  poster_path: "", video_path: "", external_watch_url: "", download_path: "", trailer_url: "",
  access_type: "free", status: "draft",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 13px", borderRadius: 10,
  border: "1px solid #303746", background: "#111722", color: "#f4f6fb",
};

export default function Dashboard() {
  const [email, setEmail] = useState<string | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState("Checking administrator session...");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const videoUploadRef = useRef<tus.Upload | null>(null);

  const loadMovies = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("movies")
      .select("id,title_en,title_rw,description_en,description_rw,release_year,genre,content_type,language,poster_path,video_path,download_path,quality,access_type,status,trailer_url,external_watch_url,source_url")
      .order("created_at", { ascending: false });
    if (error) {
      setMessage("Could not load content. Check that this account has the ALIXVI admin role and database policies allow access. " + error.message);
      return;
    }
    setMovies((data || []) as Movie[]);
  }, []);

  useEffect(() => {
    if (!supabase) { setStatus("Supabase is not configured."); return; }
    let alive = true;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!alive) return;
      if (error || !data.session) {
        setStatus("No active session. Sign in again.");
        return;
      }
      setEmail(data.session.user.email || null);
      const role = data.session.user.app_metadata?.role;
      if (role !== "admin") {
        setStatus("This account does not have the administrator role.");
        return;
      }
      setStatus("Administrator session verified.");
      await loadMovies();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setEmail(session?.user.email || null);
      if (!session) setStatus("No active session. Sign in again.");
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, [loadMovies]);

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft(current => ({ ...current, [key]: value }));
  }

  function editMovie(movie: Movie) {
    setEditingId(movie.id);
    setDraft({
      title_en: movie.title_en || "", title_rw: movie.title_rw || "",
      description_en: movie.description_en || "", description_rw: movie.description_rw || "",
      release_year: movie.release_year?.toString() || "", genre: movie.genre || "",
      content_type: movie.content_type === "series" || movie.content_type === "documentary" ? movie.content_type : "movie",
      language: movie.language || "English", poster_path: movie.poster_path || "",
      video_path: movie.video_path || "",
      external_watch_url: movie.external_watch_url || "", download_path: movie.download_path || "",
      trailer_url: movie.trailer_url || "",
      access_type: movie.access_type === "premium" ? "premium" : "free",
      status: movie.status === "published" || movie.status === "archived" ? movie.status : "draft",
    });
    setMessage("Editing: " + (movie.title_en || "Untitled"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadPoster() {
    if (!supabase || !posterFile) return;
    if (!posterFile.type.startsWith("image/")) { setMessage("Please choose an image file."); return; }
    if (posterFile.size > 8 * 1024 * 1024) { setMessage("Poster must be 8 MB or smaller."); return; }
    setUploadingPoster(true); setMessage("");
    const extension = posterFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `posters/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("movie-posters").upload(path, posterFile, {
      upsert: false, contentType: posterFile.type, cacheControl: "3600",
    });
    setUploadingPoster(false);
    if (error) { setMessage("Poster upload failed: " + error.message); return; }
    const { data } = supabase.storage.from("movie-posters").getPublicUrl(path);
    setField("poster_path", data.publicUrl);
    setPosterFile(null);
    setMessage("Poster uploaded. Save the content to keep this poster attached.");
  }

  async function uploadVideo() {
    if (!supabase || !videoFile) return;
    if (!videoFile.type.startsWith("video/")) { setMessage("Please choose a valid video file."); return; }
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) { setMessage("Your admin session expired. Sign in again."); return; }
    const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
    const extension = videoFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
    const path = `videos/${crypto.randomUUID()}.${extension}`;
    setUploadingVideo(true); setVideoProgress(0); setMessage("Starting secure resumable upload...");
    const upload = new tus.Upload(videoFile, {
      endpoint: `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${session.access_token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: { bucketName: "movie-videos", objectName: path, contentType: videoFile.type || "video/mp4", cacheControl: "3600" },
      onError: (error) => { setUploadingVideo(false); setMessage("Video upload failed: " + error.message); videoUploadRef.current = null; },
      onProgress: (uploaded, total) => setVideoProgress(Math.min(100, Math.round((uploaded / total) * 100))),
      onSuccess: () => {
        setField("video_path", path);
        setUploadingVideo(false); setVideoProgress(100); setVideoFile(null);
        setMessage("Video uploaded securely. Click Save content to attach it to this movie.");
        videoUploadRef.current = null;
      },
    });
    videoUploadRef.current = upload;
    try {
      const previous = await upload.findPreviousUploads();
      if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    } catch (error) {
      setUploadingVideo(false);
      setMessage("Could not start upload: " + (error instanceof Error ? error.message : "Unknown error"));
      videoUploadRef.current = null;
    }
  }

  function cancelVideoUpload() {
    videoUploadRef.current?.abort(true);
    videoUploadRef.current = null;
    setUploadingVideo(false);
    setMessage("Video upload cancelled.");
  }

  async function saveMovie(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !email) return;
    if (!draft.title_en.trim()) { setMessage("English title is required."); return; }
    setBusy(true); setMessage("");
    const payload = {
      title_en: draft.title_en.trim(), title_rw: draft.title_rw.trim() || null,
      description_en: draft.description_en.trim() || null,
      description_rw: draft.description_rw.trim() || null,
      release_year: draft.release_year ? Number(draft.release_year) : null,
      genre: draft.genre.trim() || null, content_type: draft.content_type,
      language: draft.language.trim() || null, poster_path: draft.poster_path.trim() || null,
      video_path: draft.video_path.trim() || null,
      external_watch_url: draft.external_watch_url.trim() || null,
      download_path: draft.download_path.trim() || null, trailer_url: draft.trailer_url.trim() || null,
      access_type: draft.access_type, status: draft.status,
    };
    const result = editingId
      ? await supabase.from("movies").update(payload).eq("id", editingId)
      : await supabase.from("movies").insert(payload);
    setBusy(false);
    if (result.error) { setMessage("Save failed: " + result.error.message); return; }
    setMessage(editingId ? "Movie updated." : "Movie added.");
    setDraft(emptyDraft); setEditingId(null);
    await loadMovies();
  }

  async function archiveMovie(movie: Movie) {
    if (!supabase || !window.confirm(`Archive "${movie.title_en || "this item"}"?`)) return;
    const { error } = await supabase.from("movies").update({ status: "archived" }).eq("id", movie.id);
    if (error) { setMessage("Archive failed: " + error.message); return; }
    setMessage("Content archived."); await loadMovies();
  }

  async function logout() { if (supabase) await supabase.auth.signOut(); }

  const verified = status === "Administrator session verified.";
  return <><Header/><main className="shell" style={{ paddingTop: 48, paddingBottom: 70 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <div><div className="tag">ALIXVI CONTROL ROOM</div><h1 style={{ font: "700 34px 'Space Grotesk'", marginBottom: 8 }}>Content manager</h1><p className="muted">{status}</p>{email && <p className="muted">Signed in as {email}</p>}</div>
      {email && <button className="button secondary" onClick={logout}>Sign out</button>}
    </div>

    {verified && <section className="adminbox" style={{ maxWidth: 900, margin: "28px 0" }}>
      <h2 style={{ font: "700 23px 'Space Grotesk'", marginTop: 0 }}>{editingId ? "Edit content" : "Add new content"}</h2>
      <form onSubmit={saveMovie} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        <label>Title (English)<input required style={inputStyle} value={draft.title_en} onChange={e=>setField("title_en",e.target.value)} /></label>
        <label>Title (Kinyarwanda)<input style={inputStyle} value={draft.title_rw} onChange={e=>setField("title_rw",e.target.value)} /></label>
        <label>Year<input type="number" min="1888" max="2100" style={inputStyle} value={draft.release_year} onChange={e=>setField("release_year",e.target.value)} /></label>
        <label>Genre<input style={inputStyle} value={draft.genre} onChange={e=>setField("genre",e.target.value)} placeholder="Action, Drama..." /></label>
        <label>Content type<select style={inputStyle} value={draft.content_type} onChange={e=>setField("content_type",e.target.value as Draft["content_type"])}><option value="movie">Movie</option><option value="series">Series</option><option value="documentary">Documentary</option></select></label>
        <label>Language<input style={inputStyle} value={draft.language} onChange={e=>setField("language",e.target.value)} /></label>
        <label>Access<select style={inputStyle} value={draft.access_type} onChange={e=>setField("access_type",e.target.value as Draft["access_type"])}><option value="free">Free</option><option value="premium">Premium</option></select></label>
        <label>Publish status<select style={inputStyle} value={draft.status} onChange={e=>setField("status",e.target.value as Draft["status"])}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <div style={{ gridColumn: "1 / -1", display: "grid", gap: 9 }}>
          <label>Upload poster image (JPG, PNG, WebP · max 8 MB)<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ ...inputStyle, padding: 9 }} onChange={e=>setPosterFile(e.target.files?.[0] || null)} /></label>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="button secondary" type="button" disabled={!posterFile || uploadingPoster} onClick={uploadPoster}>{uploadingPoster ? "Uploading poster..." : "Upload poster"}</button>
            {draft.poster_path && <span className="muted">Poster attached</span>}
          </div>
          <label>Or paste poster image URL<input style={inputStyle} value={draft.poster_path} onChange={e=>setField("poster_path",e.target.value)} placeholder="https://..." /></label>
        </div>
        <div style={{ gridColumn: "1 / -1", display: "grid", gap: 10 }}>
          <label>Upload movie video (MP4, MOV, WebM and other browser video formats)<input type="file" accept="video/*" style={{ ...inputStyle, padding: 9 }} disabled={uploadingVideo} onChange={e=>setVideoFile(e.target.files?.[0] || null)} /></label>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="button secondary" type="button" disabled={!videoFile || uploadingVideo} onClick={uploadVideo}>{uploadingVideo ? `Uploading ${videoProgress}%` : "Upload video (resumable)"}</button>
            {uploadingVideo && <button className="button secondary" type="button" onClick={cancelVideoUpload}>Cancel upload</button>}
            {draft.video_path && <span className="muted">Video attached: {draft.video_path.split("/").pop()}</span>}
          </div>
          {(uploadingVideo || videoProgress === 100) && <div style={{ height: 8, borderRadius: 99, background: "#273142", overflow: "hidden" }}><div style={{ width: `${videoProgress}%`, height: "100%", background: "#d6b46a", transition: "width .2s" }} /></div>}
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>Large files use resumable 6 MB chunks and automatic retries. The maximum file size is controlled by your Supabase project plan/settings and available storage quota.</p>
        </div>
        <label style={{ gridColumn: "1 / -1" }}>Watch link<input type="url" style={inputStyle} value={draft.external_watch_url} onChange={e=>setField("external_watch_url",e.target.value)} placeholder="https://..." /></label>
        <label style={{ gridColumn: "1 / -1" }}>Download link or storage path<input style={inputStyle} value={draft.download_path} onChange={e=>setField("download_path",e.target.value)} /></label>
        <label style={{ gridColumn: "1 / -1" }}>Trailer URL<input type="url" style={inputStyle} value={draft.trailer_url} onChange={e=>setField("trailer_url",e.target.value)} /></label>
        <label style={{ gridColumn: "1 / -1" }}>Description (English)<textarea rows={3} style={inputStyle} value={draft.description_en} onChange={e=>setField("description_en",e.target.value)} /></label>
        <label style={{ gridColumn: "1 / -1" }}>Description (Kinyarwanda)<textarea rows={3} style={inputStyle} value={draft.description_rw} onChange={e=>setField("description_rw",e.target.value)} /></label>
        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="button" disabled={busy} type="submit">{busy ? "Saving..." : editingId ? "Save changes" : "Add content"}</button>
          {editingId && <button className="button secondary" type="button" onClick={()=>{setEditingId(null);setDraft(emptyDraft);setMessage("");}}>Cancel edit</button>}
        </div>
      </form>
    </section>}

    {message && <p role="status" className="muted" style={{ margin: "18px 0" }}>{message}</p>}
    {verified && <section style={{ marginTop: 34 }}>
      <h2 style={{ font: "700 24px 'Space Grotesk'" }}>Library <span className="muted">({movies.length})</span></h2>
      {movies.length === 0 ? <p className="muted">No content found yet.</p> : <div style={{ display: "grid", gap: 12 }}>
        {movies.map(movie => <article key={movie.id} className="adminbox" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div><strong>{movie.title_en || "Untitled"}</strong>{movie.title_rw && <span className="muted"> · {movie.title_rw}</span>}<p className="muted" style={{ margin: "5px 0 0" }}>{movie.content_type || "movie"} · {movie.release_year || "Year unknown"} · {movie.access_type || "free"} · {movie.status || "draft"}</p></div>
          <div style={{ display: "flex", gap: 8 }}><button className="button secondary" onClick={()=>editMovie(movie)}>Edit</button>{movie.status !== "archived" && <button className="button secondary" onClick={()=>archiveMovie(movie)}>Archive</button>}</div>
        </article>)}
      </div>}
    </section>}
    <p className="muted" style={{ marginTop: 28, fontSize: 13 }}>Changes are protected by existing Supabase administrator policies. Posters use the public movie-posters bucket; videos use the private movie-videos bucket with resumable uploads. Only upload movies you own or are authorized to distribute.</p>
  </main></>;
}
