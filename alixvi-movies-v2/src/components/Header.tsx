import Link from "next/link";
export default function Header() {
  return <header className="shell nav"><Link href="/" className="brand"><span className="gold">ALIXVI</span> MOVIES</Link><nav className="navlinks"><Link href="/movies">Explore</Link><Link href="/movies?type=series">Series</Link><Link href="/movies?type=documentary">Documentaries</Link><Link href="/admin" className="pill">Admin</Link></nav></header>;
}