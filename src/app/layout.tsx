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
        {/* Dua keluarga huruf saja. Plus Jakarta Sans memikul judul sampai teks
            antarmuka; Caveat hanya dipakai untuk keterangan tulisan tangan di
            tepi foto — satu-satunya sisa sentuhan manual setelah serif dilepas. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Tanpa JavaScript, dua hal harus diselamatkan.

            Yang pertama animasi masuk: kelas `.reveal` mulai dari opacity nol
            dan yang menyalakannya adalah skrip, jadi tanpa skrip seluruh
            halaman tinggal ruang kosong.

            Yang kedua dua panggung berpaku di beranda. Kemajuan gulirnya
            (`--p`) juga ditulis skrip, jadi tanpa skrip rel fiturnya membeku di
            kartu pertama sementara dek langkahnya menumpuk seluruhnya di satu
            titik — dan yang terlihat cuma kartu paling atas. Keduanya
            diratakan: pakunya dilepas, rel jadi deret yang bisa digulir tangan,
            dek jadi tumpukan tegak biasa. Persis perlakuan yang sama dengan
            saat pengguna meminta gerakan dikurangi.

            Ditargetkan lewat atribut data, bukan kelas: nama kelas di CSS
            module diacak saat build dan tidak bisa ditulis di sini. */}
        <noscript>
          <style>{`.reveal { opacity: 1 !important; transform: none !important; filter: none !important; clip-path: none !important; transition: none !important; transition-delay: 0ms !important; will-change: auto !important; } .reveal-sweep { transform: scaleX(1) !important; } [data-stage] { position: static !important; height: auto !important; overflow: visible !important; padding-block: 4rem !important; } [data-overlay] { position: static !important; transform: none !important; margin-bottom: 2rem !important; } [data-rail] { position: static !important; transform: none !important; width: 100% !important; max-width: 100% !important; overflow-x: auto !important; padding-bottom: 1rem !important; } [data-spacer] { display: none !important; } [data-deck] { position: static !important; display: flex !important; flex-direction: column !important; align-items: center !important; gap: 1.25rem !important; perspective: none !important; } [data-deck] > li { transform: none !important; opacity: 1 !important; height: auto !important; min-height: 26rem !important; }`}</style>
        </noscript>
        <Suspense fallback={null}>
          <PageTransition />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
