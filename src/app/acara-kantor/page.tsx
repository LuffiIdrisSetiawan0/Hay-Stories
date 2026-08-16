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
          title: "Branding Logo Perusahaan",
          description: "Sematkan logo perusahaan & tema gathering di kartu QR dan watermark setiap foto yang dihasilkan.",
          icon: "building",
        },
        {
          title: "Privasi & Keamanan Data",
          description: "Galeri terlindungi secara privat. Hanya karyawan yang memiliki QR code internal yang dapat mengakses.",
          icon: "shield",
        },
        {
          title: "Invoice & Pembayaran Resmi",
          description: "Mendukung pembayaran transfer bank perusahaan, e-invoice resmi, dan kwitansi untuk reimbursement tim.",
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
          title: "Slideshow & Arsip HD",
          desc: "Tayang langsung di panggung utama dan unduh seluruh ZIP foto beresolusi penuh untuk dokumentasi HR.",
        },
      ]}
      presets={[
        { name: "Everyday 100", desc: "Warna natural, cerah, ramah untuk suasana formal-kasual", tag: "Gala Dinner" },
        { name: "Sunday Chrome", desc: "Kontras tajam, warna ceria untuk outdoor team building", tag: "Outing & Outbound" },
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
      packageHighlight={{
        name: "Paket Corporate & Gathering",
        price: "Rp 499.000",
        guests: "Hingga 600 Karyawan",
        features: [
          "Akses kamera web instan tanpa instalasi app",
          "Kustom logo & tema gathering perusahaan",
          "Live slideshow projector stream real-time",
          "Unduh ZIP seluruh arsip foto resolusi penuh (HD)",
          "Privasi data perusahaan terjamin aman",
          "Invoice & kwitansi resmi untuk reimbursement",
        ],
      }}
      faqs={[
        {
          q: "Apakah perusahaan bisa meminta invoice resmi dan faktur?",
          a: "Tentu saja! Kami menyediakan invoice resmi atas nama perusahaan lengkap dengan rincian acara untuk kebutuhan klaim dan administrasi keuangan.",
        },
        {
          q: "Apakah data dan foto karyawan kami aman?",
          a: "Sangat aman. Galeri bersifat privat terkunci dan tidak dipublikasikan ke publik. Hanya pemegang link album yang dapat melihatnya.",
        },
        {
          q: "Apakah ada batas jumlah foto yang bisa diambil karyawan?",
          a: "Tidak ada batasan total foto! Anda dapat menentukan jatah roll per karyawan (misal: 15-20 foto per orang) untuk menjaga kualitas foto yang diambil.",
        },
      ]}
    />
  );
}
