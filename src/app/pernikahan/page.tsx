import { Metadata } from "next";
import EventPageTemplate from "@/components/events/EventPageTemplate";

export const metadata: Metadata = {
  title: "Kamera Tamu Digital untuk Pernikahan",
  description:
    "Satu QR di meja resepsi, kamera langsung terbuka tanpa aplikasi, dan semua foto candid tamu terkumpul di satu galeri pernikahan.",
  alternates: { canonical: "/pernikahan" },
};

export default function PernikahanPage() {
  return (
    <EventPageTemplate
      slug="pernikahan"
      badge="Pernikahan & Resepsi 💍"
      title="Momen Pernikahan yang Tak Tertangkap Fotografer"
      subtitle="Fotografer resmi menangkap momen utama. HAY Stories menyimpan tawa sahabat, reuni keluarga, dan dansa spontan dari sudut pandang para tamu."
      heroImage="/img/scenes/01-pelaminan-v2.webp"
      benefits={[
        {
          title: "Satu QR di Setiap Meja",
          description: "Cukup cetak kartu QR di meja atau selipkan di undangan. Tamu langsung buka kamera tanpa aplikasi.",
          icon: "qr",
        },
        {
          title: "Bingkai Pilihan di Kamera",
          description: "Tamu dapat memilih foto polos, bingkai cetak bernama acara, atau tepi film sebelum menjepret.",
          icon: "sparkles",
        },
        {
          title: "Reveal Sesuai Pilihan",
          description: "Tentukan apakah galeri langsung terlihat, dibuka terjadwal, atau dibuka sendiri oleh tuan rumah.",
          icon: "monitor",
        },
        {
          title: "Unduh Foto Berkualitas Tinggi",
          description: "Setiap foto yang tersimpan dapat dibuka dan diunduh satu per satu dari galeri acara.",
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
          title: "Buka Galeri & Unduh",
          desc: "Foto yang berhasil disimpan terkumpul di galeri acara dan dapat diunduh satu per satu.",
        },
      ]}
      presets={[
        {
          name: "Golden Hour 400",
          desc: "Tone hangat bernuansa senja untuk resepsi outdoor & intimate garden",
          tag: "Outdoor Vibes",
        },
        {
          name: "Pastel 100",
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
        { img: "/img/scenes/01-pelaminan-v2.webp", caption: "Senyum bahagia bersama pengantin" },
        { img: "/img/scenes/02-meja-dekorasi-v2.webp", caption: "Kehangatan meja jamuan tamu" },
        { img: "/img/scenes/06-konfeti-v2.webp", caption: "Taburan bunga dan doa restu keluarga" },
      ]}
      faqs={[
        {
          q: "Bagaimana cara meletakkan QR code di resepsi?",
          a: "Dashboard menyediakan QR dalam format SVG. Unduh lalu masukkan ke desain kartu meja atau undangan pilihan Anda sebelum dicetak.",
        },
        {
          q: "Apakah fotografer utama kami tetap dibutuhkan?",
          a: "Tentu. Fotografer utama mengurus momen resmi di pelaminan, sedangkan HAY Stories melengkapinya dengan sudut pandang candid dari para tamu.",
        },
      ]}
    />
  );
}
