import { Metadata } from "next";
import EventPageTemplate from "@/components/events/EventPageTemplate";

export const metadata: Metadata = {
  title: "Kamera Sekali Pakai untuk Pernikahan · HAY Stories",
  description:
    "Berikan pengalaman kamera analog digital bagi para tamu pernikahanmu. Satu QR code di meja resepsi, semua foto candid terabadikan dengan emulsi film otentik.",
};

export default function PernikahanPage() {
  return (
    <EventPageTemplate
      slug="pernikahan"
      badge="Pernikahan & Resepsi 💍"
      title="Momen Pernikahan yang Tak Tertangkap Fotografer"
      subtitle="Fotografer resmi berdiri di depan pelaminan. Namun tawa haru sahabat, reuni keluarga jauh, dan dansa spontan tamu terabadikan nyata lewat kamera disposable di tangan mereka."
      heroImage="/img/scenes/01-pelaminan.jpg"
      benefits={[
        {
          title: "Satu QR di Setiap Meja",
          description: "Cukup cetak kartu QR di meja atau selipkan di undangan. Tamu langsung buka kamera tanpa aplikasi.",
          icon: "qr",
        },
        {
          title: "Bingkai Kustom Nama Pengantin",
          description: "Setiap foto tamu otomatis berbingkai tanggal & monogram pernikahan Anda ala kamera analog 90s.",
          icon: "sparkles",
        },
        {
          title: "Live Slideshow Ballroom",
          description: "Foto yang dijepret tamu otomatis tayang di proyektor ballroom resepsi secara real-time.",
          icon: "monitor",
        },
        {
          title: "Download Seluruh Roll HD",
          description: "Unduh semua roll foto dalam kualitas cetak resolusi tinggi untuk dicetak ke album fisik kenangan.",
          icon: "image",
        },
      ]}
      steps={[
        {
          step: "01",
          title: "Letakkan QR di Meja",
          desc: "Cetak kartu QR cantik kami atau sematkan di buku tamu & undangan resepsi.",
        },
        {
          step: "02",
          title: "Tamu Scan & Motret",
          desc: "Tamu langsung masuk ke kamera web analog dengan batas 10-25 roll jepretan per orang.",
        },
        {
          step: "03",
          title: "Terungkap Bersama",
          desc: "Semua foto langsung tayang di proyektor panggung dan tersimpan aman di album pernikahan.",
        },
      ]}
      presets={[
        { name: "Golden Hour 400", desc: "Hangat, glowing, tone kulit flattering", tag: "Resepsi Malam" },
        { name: "Everyday 100", desc: "Warna natural, jernih, tone film Kodak Gold", tag: "Akad Siang" },
        { name: "Noir 400", desc: "Hitam putih kontras klasik berkarakter", tag: "Intimate Toast" },
      ]}
      sampleGallery={[
        { img: "/img/scenes/01-pelaminan.jpg", caption: "Senyum haru pelaminan dengan tone Golden Hour" },
        { img: "/img/scenes/02-meja-dekorasi.jpg", caption: "Detail meja resepsi & kartu QR tamu" },
        { img: "/img/scenes/05-lantai-dansa.jpg", caption: "Dansa malam spontan sahabat di ballroom" },
      ]}
      storyQuote={{
        quote: "Tamu-tamu kami sangat menikmati memotret lewat QR di meja. Hasil fotonya jauh lebih candid, hangat, dan seru daripada foto formal pelaminan!",
        author: "Rian & Anisa",
        role: "Menikah di Jakarta · 450 Tamu",
      }}
      packageHighlight={{
        name: "Paket Pernikahan Penuh",
        price: "Rp 349.000",
        guests: "300 - 500 Tamu",
        features: [
          "Akses kamera web instan tanpa batas download",
          "6 Preset roll film analog lengkap",
          "Live slideshow projector stream real-time",
          "Bingkai kustom nama pengantin & tanggal",
          "Unduh ZIP seluruh roll foto resolusi penuh (HD)",
          "QR kit siap cetak berkualitas tinggi",
        ],
      }}
      faqs={[
        {
          q: "Apakah tamu perlu download aplikasi?",
          a: "Tidak sama sekali! Tamu cukup mengarahkan kamera HP ke kartu QR, dan kamera web analog HAY Stories langsung terbuka di browser HP (Chrome, Safari, dll).",
        },
        {
          q: "Bagaimana cara menyambungkan ke proyektor ballroom?",
          a: "Buka halaman Live Slideshow dari laptop operator acara, lalu tekan tombol 'Full Screen' (Layar Penuh). Foto baru akan otomatis muncul bergantian.",
        },
        {
          q: "Apakah foto aman dan privat?",
          a: "Ya! Album dilindungi URL unik privat dan enkripsi, hanya Anda dan tamu yang memiliki link QR yang dapat mengakses galeri.",
        },
        {
          q: "Berapa lama foto tersimpan di sistem?",
          a: "Foto tersimpan aman di cloud selama 1 tahun penuh, dan Anda dapat mengunduh seluruh arsip foto HD kapan saja.",
        },
      ]}
    />
  );
}
