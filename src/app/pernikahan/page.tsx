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
          desc: "Tamu langsung masuk ke kamera web analog dengan batas jepretan yang Anda tentukan.",
        },
        {
          step: "03",
          title: "Tayang & Unduh ZIP",
          desc: "Foto tayang di proyektor dan tersimpan otomatis ke galeri digital pribadi tuan rumah.",
        },
      ]}
      presets={[
        {
          name: "Golden Hour 400",
          desc: "Tone hangat bernuansa senja untuk resepsi outdoor & intimate garden",
          tag: "Outdoor Vibes",
        },
        {
          name: "Pastel 400",
          desc: "Warna kulit natural bercahaya, ideal untuk ballroom & kebaya pengantin",
          tag: "Bridal Favorite",
        },
        {
          name: "Noir 400",
          desc: "Kontras monokrom klasik nan emosional untuk momen haru akad & sungkeman",
          tag: "Timeless Emotion",
        },
      ]}
      sampleGallery={[
        { img: "/img/scenes/01-pelaminan.jpg", caption: "Senyum Bahagia Bersama Pengantin" },
        { img: "/img/scenes/02-meja-dekorasi.jpg", caption: "Kehangatan Meja Jamuan Tamu" },
        { img: "/img/scenes/06-konfeti.jpg", caption: "Taburan Bunga & Doa Restu Keluarga" },
      ]}
      storyQuote={{
        quote:
          "Foto terbaik di resepsi kami bukan cuma dari fotografer panggung, tapi candid hangat teman dan keluarga di meja makan yang kami dapatkan lewat HAY Stories!",
        author: "Dimas & Sarah",
        role: "Resepsi Pernikahan di Jakarta · 300 Tamu",
      }}
      packageHighlight={{
        name: "Paket Pernikahan Pilihan",
        price: "Rp 299.000",
        guests: "Hingga 300 Tamu",
        features: [
          "Akses kamera web instan tanpa download app",
          "6 Preset roll film analog otentik",
          "Watermark nama pengantin & tanggal",
          "Live slideshow ballroom proyektor",
          "Unduh ZIP seluruh foto resolusi penuh",
          "Masa aktif album 1 tahun penuh",
        ],
      }}
      faqs={[
        {
          q: "Bagaimana cara meletakkan QR code di resepsi?",
          a: "Kami menyediakan template kartu QR meja siap cetak yang cantik dan serasi dengan dekorasi meja makan tamu.",
        },
        {
          q: "Apakah fotografer utama kami tetap dibutuhkan?",
          a: "Tentu! Fotografer utama mengurus momen resmi di paminan, sedangkan HAY Stories menangkap sudut pandang candid dari ratusan tamu di meja.",
        },
      ]}
    />
  );
}
