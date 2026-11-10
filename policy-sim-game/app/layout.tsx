import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, Caveat, Source_Serif_4, Barlow_Semi_Condensed } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The desk: bill titles and headings (Playfair), handwriting (Caveat).
// next/font serves these from the app itself, so nothing is loaded from Google at runtime.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
});

// Reading text in a serif: the morning paper, and what's said at the press conference.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  style: ["normal", "italic"],
});

// Election night and the press conference: TV captions and graphics (a news-graphics face).
// Only up to 700: heavier asks (800/900) use the 700, which keeps it readable.
const broadcast = Barlow_Semi_Condensed({
  variable: "--font-broadcast",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Policy Sim Game",
  description: "PhD Project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${sourceSerif.variable} ${broadcast.variable} ${caveat.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}