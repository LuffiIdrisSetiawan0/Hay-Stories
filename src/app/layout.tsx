import type { Metadata } from "next";
import { Suspense } from "react";
import PageTransition from "@/components/ui/PageTransition";
import { appOrigin } from "@/lib/origin";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(appOrigin()),
  title: {
    default: "HAY Stories • Kamera Tamu Digital untuk Acara",
    template: "%s • HAY Stories",
  },
  description:
    "Bagikan satu QR agar tamu dapat memotret tanpa aplikasi. Semua foto candid tersimpan otomatis di satu galeri acara.",
  applicationName: "HAY Stories",
  authors: [{ name: "HAY Stories", url: "/" }],
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
  category: "photography",
  manifest: "/manifest.webmanifest",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "HAY Stories",
    title: "HAY Stories • Kamera Tamu Digital untuk Acaramu",
    description:
      "Tamu memotret lewat QR tanpa aplikasi. Semua foto candid tersimpan otomatis dan dapat dibuka bersama setelah acara.",
    images: ["/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "HAY Stories • Kamera Tamu Digital untuk Acaramu",
    description:
      "Tamu memotret lewat QR tanpa aplikasi. Semua foto candid tersimpan otomatis dan dapat dibuka bersama setelah acara.",
    images: ["/opengraph-image.png"],
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
          <style>{`.reveal { opacity: 1 !important; transform: none !important; filter: none !important; clip-path: none !important; transition: none !important; transition-delay: 0ms !important; will-change: auto !important; } .reveal-sweep { transform: scaleX(1) !important; }`}</style>
        </noscript>
        <Suspense fallback={null}>
          <PageTransition />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
