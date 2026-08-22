import { Metadata } from "next";
import EventPageTemplate from "@/components/events/EventPageTemplate";

export const metadata: Metadata = {
  title: "Kamera Tamu Digital untuk Acara Kantor",
  description:
    "Solusi kamera tamu interaktif untuk annual gathering, team outing, dan gala dinner perusahaan. Satu QR di setiap meja, pererat bonding tim secara natural.",
  alternates: { canonical: "/acara-kantor" },
};

export default function AcaraKantorPage() {
  return (
    <EventPageTemplate
      slug="acara-kantor"
      badge="Acara Kantor & Gathering 🏢"
      title="Team Gathering, Outing, dan Perayaan Tahunan Perusahaan"
      subtitle="Cairkan suasana antar divisi lewat kamera yang dapat dipakai semua orang. Rekan satu tim ikut mengabadikan tawa di meja, permainan, dan momen kebersamaan yang biasanya terlewat."
      heroImage="/img/scenes/04-potret-v2.webp"
      benefits={[
        {
          title: "Pererat Bonding Karyawan",
          description: "Mendorong interaksi spontan antar divisi tanpa kecanggungan, saling foto dengan gaya bebas.",
          icon: "users",
        },
        {
          title: "QR Siap Masuk Desain",
          description: "Unduh QR dalam format SVG lalu tempatkan sendiri di standee, rundown, atau materi internal perusahaan.",
          icon: "building",
        },
        {
          title: "Galeri Berbasis Tautan",
          description: "Album tidak dicantumkan di daftar publik, tetapi siapa pun yang memiliki tautan dapat membukanya setelah reveal.",
          icon: "shield",
        },
        {
          title: "Unduhan Foto Kualitas Tinggi",
          description: "Setiap foto yang tersimpan dapat dibuka dan diunduh satu per satu untuk dokumentasi internal.",
          icon: "download",
        },
      ]}
      steps={[
        {
          step: "01",
          title: "Cetak QR di Meja Acara",
          desc: "Taruh standee QR di meja banquet gala dinner atau bagikan saat registrasi outing.",
        },
        {
          step: "02",
          title: "Karyawan Jepret Bersama",
          desc: "Setiap tim memotret keseruan acara, doorprize, dan game dari sudut pandang meja mereka.",
        },
        {
          step: "03",
          title: "Buka Galeri & Pilih Foto",
          desc: "Setelah reveal, buka galeri acara lalu unduh foto yang dibutuhkan satu per satu untuk dokumentasi HR.",
        },
      ]}
      presets={[
        { name: "Everyday 160", desc: "Warna netral hangat untuk suasana formal-kasual", tag: "Gala Dinner" },
        { name: "Pastel 100", desc: "Warna lapang untuk outdoor team building", tag: "Outing & Outbound" },
        { name: "Golden Hour 400", desc: "Warm flattering tone untuk perayaan malam", tag: "Awarding Night" },
      ]}
      sampleGallery={[
        { img: "/img/scenes/04-potret-v2.webp", caption: "Keseruan tim di acara perusahaan" },
        { img: "/img/scenes/02-meja-dekorasi-v2.webp", caption: "Kehangatan meja perayaan tahunan" },
        { img: "/img/scenes/06-konfeti-v2.webp", caption: "Selebrasi dan tawa bersama" },
      ]}
      faqs={[
        {
          q: "Bagaimana membagikan QR di kanal internal?",
          a: "Unduh QR SVG dari dashboard, masukkan ke desain materi acara, lalu bagikan melalui kanal internal yang Anda pilih.",
        },
        {
          q: "Apakah data dan foto karyawan kami aman?",
          a: "Album tidak muncul di daftar publik, tetapi tautannya bukan autentikasi. Siapa pun yang menerima link dapat melihat foto setelah reveal, jadi bagikan hanya melalui kanal yang sesuai.",
        },
        {
          q: "Apakah ada batas jumlah foto yang bisa diambil karyawan?",
          a: "Ada. Starter gratis mendukung hingga 5 tamu. Untuk gathering yang lebih besar tersedia paket Party (50 tamu), Pesta (150 tamu), dan Skala Besar (hingga 100.000 tamu); semuanya memberi 100 jepretan per tamu.",
        },
      ]}
    />
  );
}
