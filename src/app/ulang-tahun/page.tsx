import { Metadata } from "next";
import { SCENES } from "@/lib/scenes";
import EventPageTemplate from "@/components/events/EventPageTemplate";

export const metadata: Metadata = {
  title: "Kamera Tamu Digital untuk Ulang Tahun",
  description:
    "Tamu memindai QR dan langsung memotret tanpa aplikasi. Semua foto candid ulang tahun terkumpul otomatis di satu galeri.",
  alternates: { canonical: "/ulang-tahun" },
};

export default function UlangTahunPage() {
  return (
    <EventPageTemplate
      slug="ulang-tahun"
      badge="Ulang Tahun & Sweet Seventeen"
      title="Dari Tiup Lilin Sampai Tawa Terakhir Malam Itu"
      subtitle="Ulang tahun datang setahun sekali. Simpan pelukan teman terdekat, tawa saat tiup lilin, dan ekspresi paling spontan dari kamera di tangan mereka."
      heroScene={SCENES.ulangTahunTaman}
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
        { scene: SCENES.ulangTahunTaman, caption: "Tiup lilin bersama sahabat" },
        { scene: SCENES.pestaMalam, caption: "Keseruan pesta malam dan candid tawa" },
        { scene: SCENES.tamuMemotret, caption: "Suasana santai bersama teman-teman" },
      ]}
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
