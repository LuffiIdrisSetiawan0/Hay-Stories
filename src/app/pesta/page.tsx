import { Metadata } from "next";
import { SCENES } from "@/lib/scenes";
import EventPageTemplate from "@/components/events/EventPageTemplate";

export const metadata: Metadata = {
  title: "Kamera Tamu Digital untuk Pesta & Nightout",
  description:
    "Tangkap vibes pesta malam, lantai dansa, dan after party dengan look Resepsi 800 langsung dari browser tanpa instalasi aplikasi.",
  alternates: { canonical: "/pesta" },
};

export default function PestaPage() {
  return (
    <EventPageTemplate
      slug="pesta"
      badge="Pesta & Nightout"
      title="Energi Malam Itu, Terekam Apa Adanya"
      subtitle="Musik kencang, lampu warna-warni, dan tawa lepas bersama teman. Abadikan atmosfer pesta malam dengan nuansa film yang disiapkan untuk pencahayaan indoor."
      heroScene={SCENES.pestaMalam}
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
          description: "Buka hasil berkualitas tinggi dari galeri dan unduh foto yang diinginkan satu per satu.",
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
          title: "Semua Tamu Ikut Memotret",
          desc: "Tamu scan dan jepret vibes pesta secara real-time sepanjang malam.",
        },
      ]}
      presets={[
        { name: "Resepsi 800", desc: "Warna malam hidup dengan pendar hangat terkontrol", tag: "Club & Party" },
        { name: "Noir 400", desc: "Kontras monokrom tajam untuk suasana intimate", tag: "After Party" },
        { name: "Golden Hour 400", desc: "Warna hangat untuk rooftop menjelang malam", tag: "Rooftop Sunset" },
      ]}
      sampleGallery={[
        { scene: SCENES.pestaMalam, caption: "Dansa malam dengan nuansa Resepsi 800" },
        { scene: SCENES.ulangTahunTaman, caption: "Keseruan kumpul dan selebrasi bersama" },
        { scene: SCENES.tamuMemotret, caption: "Suasana hangat bersama kawan" },
      ]}
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
