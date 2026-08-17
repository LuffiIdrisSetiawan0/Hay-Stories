import { Metadata } from "next";
import EventPageTemplate from "@/components/events/EventPageTemplate";

export const metadata: Metadata = {
  title: "Kamera Sekali Pakai untuk Acara Kantor & Gathering · HAY Stories",
  description:
    "Solusi kamera tamu interaktif untuk annual gathering, team outing, dan gala dinner perusahaan. Satu QR di setiap meja, pererat bonding tim secara natural.",
};

export default function AcaraKantorPage() {
  return (
    <EventPageTemplate
      slug="acara-kantor"
      badge="Acara Kantor & Gathering 🏢"
      title="Team Gathering, Outing, dan Perayaan Tahunan Perusahaan"
      subtitle="Cairkan suasana antar divisi dengan pengalaman kamera analog sekali pakai. Semua karyawan ikut mengabadikan tawa di meja, game interaktif, dan momen kebersamaan tim."
      heroImage="/img/scenes/04-potret.jpg"
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
          title: "Unduhan Resolusi Penuh",
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
        { img: "/img/scenes/04-potret.jpg", caption: "Keseruan tim kantor berfoto di gala dinner" },
        { img: "/img/scenes/02-meja-dekorasi.jpg", caption: "Kartu QR di meja perayaan tahunan" },
        { img: "/img/scenes/06-konfeti.jpg", caption: "Selebrasi awarding night & tawa bersama" },
      ]}
      storyQuote={{
        quote: "Acara gathering tahunan kami jadi jauh lebih hidup. Karyawan yang biasanya kaku jadi heboh saling foto, dan dokumentasi yang terkumpul luar biasa banyak dan natural!",
        author: "Budi Santoso",
        role: "Head of People & Culture · Tech Company Jakarta",
      }}
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
          a: "Ada. Paket Starter yang tersedia saat ini mendukung hingga 5 tamu dengan 100 jepretan per tamu. Paket untuk acara lebih besar masih dalam daftar tunggu.",
        },
      ]}
    />
  );
}
