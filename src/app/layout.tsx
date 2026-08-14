import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
});

const mono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "HAY Stories • Premium Digital Disposable Camera",
    template: "%s • HAY Stories",
  },
  description:
    "Abadikan momen otentik tanpa filter. Berikan tamu Anda pengalaman kamera analog digital premium. Satu QR code, satu preset eksklusif, kenangan yang terungkap bersama.",
  applicationName: "HAY Stories",
  authors: [{ name: "HAY Stories", url: "https://haystories.id" }],
  keywords: [
    "kamera sekali pakai",
    "kamera sekali pakai pernikahan",
    "disposable camera wedding",
    "QR foto tamu",
    "foto tamu pernikahan",
    "album foto acara",
    "album foto pernikahan",
    "preset film",
    "foto pernikahan online",
    "galeri foto tamu",
    "HAY Stories",
  ],
  creator: "HAY Stories",
  publisher: "HAY Stories",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "HAY Stories",
    title: "HAY Stories • Kamera Sekali Pakai untuk Acaramu",
    description:
      "Buat pengalaman kamera sekali pakai untuk acaramu. Tamu memotret lewat QR dengan preset film. Semua foto terungkap bersama.",
  },
  twitter: {
    card: "summary_large_image",
    title: "HAY Stories • Kamera Sekali Pakai untuk Acaramu",
    description:
      "Buat pengalaman kamera sekali pakai untuk acaramu. Tamu memotret lewat QR dengan preset film. Semua foto terungkap bersama.",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${cormorant.variable} ${montserrat.variable} ${mono.variable}`}>
        {/*
          Animasi masuk mulai dari opacity 0 dan baru dilepas oleh
          IntersectionObserver. Tanpa JavaScript, observer itu tidak pernah
          jalan dan seluruh halaman akan kosong. Aturan di bawah memastikan
          kontennya tetap terbaca.
        */}
        <noscript>
          <style>{`.reveal { opacity: 1 !important; transform: none !important; filter: none !important; clip-path: none !important; transition: none !important; } .reveal-sweep { transform: scaleX(1) !important; }`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
