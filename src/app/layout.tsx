import type { Metadata } from "next";
import { Suspense } from "react";
import PageTransition from "@/components/ui/PageTransition";
import "./globals.css";

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
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body>
        <noscript>
          <style>{`.reveal { opacity: 1 !important; transform: none !important; filter: none !important; clip-path: none !important; transition: none !important; } .reveal-sweep { transform: scaleX(1) !important; }`}</style>
        </noscript>
        <Suspense fallback={null}>
          <PageTransition />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
