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
      heroImage="/img/genz/phone-3.jpg"
      benefits={[
        {
          title: "Filter Retro Sweet 17",
          description: "Tone warna 90s yang hangat dengan timestamp tanggal ulang tahun di sudut foto ala kamera film lawas.",
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
          description: "Kumpulkan ratusan foto candid dari seluruh teman dalam 1 link album privat beresolusi penuh.",
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
        { name: "Pastel 400", desc: "Warna lembut, dreamy, estetik untuk pesta siang", tag: "Cafe Party" },
        { name: "Neon Night 1600", desc: "Vibrant flash untuk pesta malam & lilin", tag: "Night Party" },
        { name: "Sunday Chrome", desc: "Saturasi kaya, kontras tajam, warna pop", tag: "Outdoor Picnic" },
      ]}
      sampleGallery={[
        { img: "/img/genz/phone-3.jpg", caption: "Candid tiup lilin & kue ulang tahun" },
        { img: "/img/scenes/03-kue.jpg", caption: "Detail kue & dekorasi pesta" },
        { img: "/img/scenes/06-konfeti.jpg", caption: "Lemparan konfeti dan tawa bersama sahabat" },
      ]}
      storyQuote={{
        quote: "Pesta Sweet 17 anak saya jadi seru banget! Teman-temannya heboh foto pakai filter analog dan hasilnya langsung muncul di layar TV cafe.",
        author: "Mama Cindy & Cindy",
        role: "Sweet 17 Party di Bandung · 80 Tamu",
      }}
      packageHighlight={{
        name: "Paket Pesta Teman",
        price: "Rp 149.000",
        guests: "Hingga 100 Tamu",
        features: [
          "Akses kamera web instan tanpa download app",
          "6 Preset roll film analog otentik",
          "Timestamp tanggal ulang tahun kustom",
          "Galeri foto live & slideshow otomatis",
          "Unduh ZIP seluruh foto kualitas penuh",
          "QR kit siap cetak atau share WhatsApp",
        ],
      }}
      faqs={[
        {
          q: "Apakah bisa dipakai untuk acara di cafe atau restoran?",
          a: "Bisa banget! Anda cukup menaruh standee QR kecil di meja cafe atau menampilkan QR di layar HP/laptop.",
        },
        {
          q: "Berapa jatah foto per tamu?",
          a: "Anda bisa mengatur limit jepretan per orang (misalnya 10 atau 25 jepretan) agar pengalaman terasa persis seperti kamera roll film sekali pakai!",
        },
        {
          q: "Apakah bisa dibagikan link galerinya ke semua teman setelah pesta?",
          a: "Bisa! Anda bisa membagikan link galeri lengkap ke semua teman agar mereka bisa mengunduh foto mereka sendiri.",
        },
      ]}
    />
  );
}
