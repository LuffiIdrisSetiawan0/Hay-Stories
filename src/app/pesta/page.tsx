import { Metadata } from "next";
import EventPageTemplate from "@/components/events/EventPageTemplate";

export const metadata: Metadata = {
  title: "Kamera Sekali Pakai untuk Pesta & Nightout · HAY Stories",
  description:
    "Tangkap vibes pesta malam, lantai dansa, dan after party dengan roll film Neon Night 1600. Direct flash candid, tanpa jaim.",
};

export default function PestaPage() {
  return (
    <EventPageTemplate
      slug="pesta"
      badge="Pesta, Music Event & Nightout 🪩"
      title="Tangkap Energi Malam Tanpa Jaim & Tanpa Filter Palsu"
      subtitle="Musik kencang, lampu warna-warni, dan tawa lepas bersama circle. Abadikan atmosfer pesta malam dengan tone direct flash analog 90s yang ikonik."
      heroImage="/img/scenes/05-lantai-dansa.jpg"
      benefits={[
        {
          title: "Roll Neon Night 1600",
          description: "Dikalibrasi khusus untuk lampu redup dan pendar neon. Memberikan saturasi warna elektrik dan grain film yang khas.",
          icon: "sparkles",
        },
        {
          title: "Direct Flash Candid",
          description: "Sensasi kamera analog disposable klasik saat lampu kilat menyala di tengah lantai dansa gelap.",
          icon: "camera",
        },
        {
          title: "Live Screen Visual",
          description: "Sambungkan galeri live ke proyektor atau LED screen panggung untuk visual interaktif sepanjang malam.",
          icon: "qr",
        },
        {
          title: "Unduh Album Full HD",
          description: "Semua momen gila dan candid terkumpul otomatis tanpa perlu repot minta foto di grup WhatsApp.",
          icon: "film",
        },
      ]}
      steps={[
        {
          step: "01",
          title: "Buat Album Pesta",
          desc: "Tentukan nama party, kunci tanggal, dan aktifkan fitur live slideshow.",
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
        { name: "Neon Night 1600", desc: "Saturasi elektrik & halation lampu malam", tag: "Club & Party" },
        { name: "Noir 400", desc: "Kontras monokrom tajam untuk suasana intimate", tag: "After Party" },
        { name: "Sunday Chrome", desc: "Warna pop kontras tinggi ala majalah retro", tag: "Rooftop Sunset" },
      ]}
      sampleGallery={[
        { img: "/img/scenes/05-lantai-dansa.jpg", caption: "Dansa malam dengan filter Neon Night 1600" },
        { img: "/img/scenes/03-kue.jpg", caption: "Keseruan kumpul sahabat & selebrasi" },
        { img: "/img/scenes/02-meja-dekorasi.jpg", caption: "Suasana hangat & toast bersama kawan" },
      ]}
      storyQuote={{
        quote: "Visual live di layar panggung bikin party kita pecah banget! Semua orang rebutan scan QR dan motret teman-temannya yang lagi joget.",
        author: "Reza & Tim Komunitas",
        role: "Jakarta Soundwave Party · 250 Tamu",
      }}
      packageHighlight={{
        name: "Paket Party Vibes",
        price: "Rp 199.000",
        guests: "Hingga 200 Tamu",
        features: [
          "Preset Neon Night 1600 eksklusif",
          "Live screen visual feed untuk proyektor",
          "Kamera web instan tanpa download aplikasi",
          "Watermark nama party kustom",
          "Unduh ZIP seluruh foto resolusi penuh",
          "Masa aktif galeri 1 tahun penuh",
        ],
      }}
      faqs={[
        {
          q: "Apakah aplikasinya support di ruangan gelap?",
          a: "Ya! Kamera HAY Stories otomatis mengaktifkan flash kamera HP untuk menghasilkan foto direct flash khas kamera disposable 90s.",
        },
        {
          q: "Bisa untuk acara festival musik atau gigs?",
          a: "Sangat cocok. Anda bisa menampilkan QR code di layar panggung sebelum konser dimulai.",
        },
      ]}
    />
  );
}
