import { Metadata } from "next";
import EventPageTemplate from "@/components/events/EventPageTemplate";

export const metadata: Metadata = {
  title: "Kamera Sekali Pakai untuk Pernikahan · HAY Stories",
  description:
    "Berikan pengalaman kamera analog digital bagi para tamu pernikahanmu. Satu QR code di meja resepsi, semua foto candid tersimpan dengan look warna terkalibrasi.",
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
          title: "Unduh Foto Resolusi Penuh",
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
      faqs={[
        {
          q: "Bagaimana cara meletakkan QR code di resepsi?",
          a: "Dashboard menyediakan QR dalam format SVG. Unduh lalu masukkan ke desain kartu meja atau undangan pilihan Anda sebelum dicetak.",
        },
        {
          q: "Apakah fotografer utama kami tetap dibutuhkan?",
          a: "Tentu! Fotografer utama mengurus momen resmi di paminan, sedangkan HAY Stories menangkap sudut pandang candid dari ratusan tamu di meja.",
        },
      ]}
    />
  );
}
