import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "ALIXVI MOVIES | Stories without limits", description: "Discover movies, series and documentaries in English and Kinyarwanda." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}