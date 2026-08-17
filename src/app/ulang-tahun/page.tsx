import { Metadata } from "next";
import EventPageTemplate from "@/components/events/EventPageTemplate";

export const metadata: Metadata = {
  title: "Kamera Sekali Pakai untuk Pesta Ulang Tahun · HAY Stories",
  description:
    "Bikin pesta ulang tahunmu lebih berkesan dengan kamera analog disposable digital. Tamu scan QR, tiup lilin bersama, foto candid terkumpul otomatis.",
};

export default function UlangTahunPage() {
  return (
    <EventPageTemplate
      slug="ulang-tahun"
      badge="Pesta Ulang Tahun & Sweet 17 🎂"
      title="Tiup Lilin Sampai Tawa Terakhir Bersama Circle-mu"
      subtitle="Ulang tahun cuma datang setahun sekali. Abadikan momen pelukan teman terdekat, tawa saat tiup lilin, dan ekspresi konyol dengan roll kamera analog sekali pakai digital."
      heroImage="/img/scenes/03-kue.jpg"
      benefits={[
        {
          title: "Bingkai Cetak Retro",
          description: "Pilih bingkai cetak yang menampilkan nama acara dan waktu jepretan, atau tepi film bersprocket.",
          icon: "film",
        },
        {
          title: "Photobooth Tanpa Antre",
          description: "Semua tamu memegang kamera sendiri di tangan mereka. Tak perlu antre di mesin photobooth sempit.",
          icon: "camera",
        },
        {
          title: "Candid & Spontan",
          description: "Foto jujur saat teman-teman tertawa, makan kue bersama, dan berjoget di pesta ulang tahunmu.",
          icon: "sparkles",
        },
        {
          title: "Unduh Album Kenangan",
          description: "Foto candid yang berhasil disimpan terkumpul dalam satu galeri berbasis tautan dan dapat diunduh satu per satu.",
          icon: "qr",
        },
      ]}
      steps={[
        {
          step: "01",
          title: "Buat Album Ultah",
          desc: "Setel nama yang berulang tahun, pilih preset film favorit, dan dapatkan QR code instan.",
        },
        {
          step: "02",
          title: "Share QR ke Teman",
          desc: "Tampilkan QR di proyektor cafe, tempel di meja makan, atau kirim di grup chat WhatsApp.",
        },
        {
          step: "03",
          title: "Jepret Sepuasnya",
          desc: "Teman-teman jepret momen tiup lilin dan keseruan pesta secara langsung.",
        },
      ]}
      presets={[
        { name: "Pastel 100", desc: "Warna lembut dan lapang untuk pesta siang", tag: "Cafe Party" },
        { name: "Resepsi 800", desc: "Warna malam hidup dengan pendar yang terkontrol", tag: "Night Party" },
        { name: "Everyday 160", desc: "Netral hangat untuk pilihan aman indoor maupun outdoor", tag: "Outdoor Picnic" },
      ]}
      sampleGallery={[
        { img: "/img/scenes/03-kue.jpg", caption: "Tiup lilin & kue ulang tahun bersama sahabat" },
        { img: "/img/scenes/05-lantai-dansa.jpg", caption: "Keseruan pesta malam & candid tawa" },
        { img: "/img/scenes/02-meja-dekorasi.jpg", caption: "Suasana santai & toasting di cafe" },
      ]}
      storyQuote={{
        quote: "Pesta ulang tahun anak saya jadi seru banget! Teman-temannya heboh saling foto, lalu semua candidnya terkumpul di satu galeri.",
        author: "Mama Cindy & Cindy",
        role: "Birthday Party di Bandung · 80 Tamu",
      }}
      faqs={[
        {
          q: "Apakah teman-teman harus install aplikasi?",
          a: "Tidak sama sekali. Cukup scan QR code lewat kamera smartphone, langsung terbuka di browser safari/chrome.",
        },
        {
          q: "Bagaimana membagikan album ke teman?",
          a: "Unduh QR dari dashboard untuk dicetak, atau salin tautan album lalu bagikan lewat grup chat. Siapa pun yang memegang tautan dapat membukanya setelah reveal.",
        },
        {
          q: "Berapa lama albumnya tersimpan?",
          a: "Paket Starter menyimpan foto selama 90 hari. Selama masa itu, setiap foto dapat diunduh satu per satu dalam resolusi hasilnya.",
        },
      ]}
    />
  );
}
