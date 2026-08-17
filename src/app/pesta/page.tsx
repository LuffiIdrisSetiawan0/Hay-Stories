import { Metadata } from "next";
import EventPageTemplate from "@/components/events/EventPageTemplate";

export const metadata: Metadata = {
  title: "Kamera Sekali Pakai untuk Pesta & Nightout · HAY Stories",
  description:
    "Tangkap vibes pesta malam, lantai dansa, dan after party dengan look Resepsi 800 langsung dari browser tanpa instalasi aplikasi.",
};

export default function PestaPage() {
  return (
    <EventPageTemplate
      slug="pesta"
      badge="Pesta, Music Event & Nightout 🪩"
      title="Tangkap Energi Malam Tanpa Jaim & Tanpa Filter Palsu"
      subtitle="Musik kencang, lampu warna-warni, dan tawa lepas bersama circle. Abadikan atmosfer pesta malam dengan look film yang disiapkan untuk pencahayaan indoor."
      heroImage="/img/scenes/05-lantai-dansa.jpg"
      benefits={[
        {
          title: "Look Resepsi 800",
          description: "Dikalibrasi khusus untuk lampu redup dan pendar neon. Memberikan saturasi warna elektrik dan grain film yang khas.",
          icon: "sparkles",
        },
        {
          title: "Kontrol Cahaya Praktis",
          description: "Sesuaikan exposure dari panel kamera dan pilih Resepsi 800 untuk membantu menjaga warna lampu pesta.",
          icon: "camera",
        },
        {
          title: "Galeri Berbasis Tautan",
          description: "Foto yang berhasil disimpan terkumpul dalam satu galeri acara untuk dibuka setelah reveal.",
          icon: "qr",
        },
        {
          title: "Unduh Per Foto",
          description: "Buka hasil beresolusi penuh dari galeri dan unduh foto yang diinginkan satu per satu.",
          icon: "film",
        },
      ]}
      steps={[
        {
          step: "01",
          title: "Buat Album Pesta",
          desc: "Tentukan nama party, tanggal, preset awal, dan kapan galeri boleh dibuka.",
        },
        {
          step: "02",
          title: "Tempel QR di Bar & Meja",
          desc: "Cetak kartu QR di bar, meja VIP, atau jadikan backdrop photospot pesta.",
        },
        {
          step: "03",
          title: "Semua Tamu Motret",
          desc: "Tamu scan dan jepret vibes pesta secara real-time sepanjang malam.",
        },
      ]}
      presets={[
        { name: "Resepsi 800", desc: "Warna malam hidup dengan pendar hangat terkontrol", tag: "Club & Party" },
        { name: "Noir 400", desc: "Kontras monokrom tajam untuk suasana intimate", tag: "After Party" },
        { name: "Golden Hour 400", desc: "Warna hangat untuk rooftop menjelang malam", tag: "Rooftop Sunset" },
      ]}
      sampleGallery={[
        { img: "/img/scenes/05-lantai-dansa.jpg", caption: "Dansa malam dengan look Resepsi 800" },
        { img: "/img/scenes/03-kue.jpg", caption: "Keseruan kumpul sahabat & selebrasi" },
        { img: "/img/scenes/02-meja-dekorasi.jpg", caption: "Suasana hangat & toast bersama kawan" },
      ]}
      storyQuote={{
        quote: "Semua orang rebutan scan QR dan motret teman-temannya yang lagi joget. Candid dari banyak sudut akhirnya terkumpul di satu tempat.",
        author: "Reza & Tim Komunitas",
        role: "Jakarta Soundwave Party · 250 Tamu",
      }}
      faqs={[
        {
          q: "Apakah aplikasinya support di ruangan gelap?",
          a: "Kamera menyediakan kontrol exposure dan look Resepsi 800, tetapi tidak menyalakan lampu kilat perangkat secara otomatis. Hasil tetap bergantung pada sensor dan cahaya yang tersedia.",
        },
        {
          q: "Bisa untuk acara festival musik atau gigs?",
          a: "Sangat cocok. Anda bisa menampilkan QR code di layar panggung sebelum konser dimulai.",
        },
      ]}
    />
  );
}
