export type Movie = {
  id: string; title_en: string | null; title_rw: string | null;
  description_en: string | null; description_rw: string | null;
  release_year: number | null; genre: string | null;
  content_type: "movie" | "series" | "documentary" | string | null;
  language: string | null; poster_path: string | null; video_path: string | null;
  download_path: string | null; quality: string | null; access_type: string | null;
  status: string | null; trailer_url: string | null; external_watch_url: string | null; source_url: string | null;
};
