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
          title: "Tayang & Unduh ZIP",
          desc: "Foto tayang di proyektor dan tersimpan otomatis ke galeri digital pribadi tuan rumah.",
        },
      ]}
      presets={[
        {
          name: "Warm Gold 200",
          desc: "Tone hangat bernuansa senja untuk resepsi outdoor & intimate garden",
          tag: "Outdoor Vibes",
        },
        {
          name: "Portra Soft 400",
          desc: "Warna kulit natural bercahaya, ideal untuk ballroom & gaun pengantin",
          tag: "Bridal Favorite",
        },
        {
          name: "B&W Noir 400",
          desc: "Kontras monokrom klasik nan emosional untuk momen haru akad & sungkeman",
          tag: "Timeless Emotion",
        },
      ]}
      sampleGallery={[
        { img: "/img/scenes/01-pelaminan.jpg", caption: "Sapaan Hangat Sahabat" },
        { img: "/img/scenes/02-akad.jpg", caption: "Haru & Doa Keluarga" },
        { img: "/img/scenes/03-table-candid.jpg", caption: "Tawa Spontan Meja Tamu" },
      ]}
      storyQuote={{
        quote:
          "Foto terbaik di resepsi kami bukan dari fotografer panggung, tapi selfie candid sepupu dan teman kantor yang kami dapatkan lewat HAY Stories!",
        author: "Dimas & Sarah",
        role: "Pengantin · Resepsi Jakarta",
      }}
      packageHighlight={{
        name: "Paket Pernikahan Pilihan",
        price: "Rp 349.000",
        guests: "200 tamu",
        features: [
          "QR code meja tak terbatas",
          "Batas jepretan 25 foto / tamu",
          "Semua filter roll film analog",
          "Live Slideshow proyektor ballroom",
          "Custom watermark nama pengantin",
          "Download ZIP resolusi penuh (1 tahun)",
        ],
      }}
      faqs={[
        {
          q: "Bagaimana cara meletakkan QR code di meja resepsi?",
          a: "Kami menyediakan file PDF cetak berukuran A6 & tenda meja yang siap dicetak di percetakan atau disematkan ke bingkai meja resepsi Anda.",
        },
        {
          q: "Apakah tamu bisa melihat foto orang lain?",
          a: "Bisa, galeri live bisa dibuka bersama atau Anda dapat mengatur mode privat di mana foto hanya terlihat oleh pengantin & layar utama.",
        },
      ]}
    />
  );
}
