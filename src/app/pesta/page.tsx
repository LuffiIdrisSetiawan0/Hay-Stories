import { Metadata } from "next";
import EventPageTemplate from "@/components/events/EventPageTemplate";

export const metadata: Metadata = {
  title: "Kamera Sekali Pakai untuk Pesta & Nightout · HAY Stories",
  description:
    "Bikin festival, rooftop party, rave, dan afterparty makin liar dan estetik. Jepret foto candid dengan flash kamera analog langsung tayang di layar panggung.",
};

export default function PestaPage() {
  return (
    <EventPageTemplate
      slug="pesta"
      badge="Pesta, Rooftop & Festival 🎉"
      title="Malam Panjang, Lampu Warna, dan Flash Spontan"
      subtitle="Musik menghentak, lampu neon berpendar, dan minuman dingin di tangan. Tangkap energi pesta dan kegilaan malam lewat kamera disposable analog di genggaman setiap orang."
      heroImage="/img/genz/phone-2.jpg"
      benefits={[
        {
          title: "Direct Flash & Halation",
          description: "Filter analog yang meniru kilatan flash kamera saku 90s dengan glow neon dan grain tajam.",
          icon: "zap",
        },
        {
          title: "Live Projector Stream",
          description: "Foto yang dijepret tamu langsung tayang di layar LED panggung atau dinding proyektor venue.",
          icon: "monitor",
        },
        {
          title: "Tanpa Download App",
          description: "Di tengah musik keras, tamu tak perlu instal app berat. Scan QR 1 detik, langsung motret.",
          icon: "qr",
        },
        {
          title: "Koleksi Liar Tanpa Jaim",
          description: "Momen dansa gila, toast sahabat, dan tawa lepas terekam jujur dari ratusan sudut pandang.",
          icon: "party",
        },
      ]}
      steps={[
        {
          step: "01",
          title: "Tempel QR di Bar & Meja",
          desc: "Pasang QR code di meja bar, tiket masuk, atau tayangkan di layar backdrop DJ.",
        },
        {
          step: "02",
          title: "Semua Ikut Motret",
          desc: "Tamu memotret vibes festival & teman-teman dengan filter Neon Night 1600.",
        },
        {
          step: "03",
          title: "Visual Layar Live",
          desc: "Layar proyektor menampilkan feed foto langsung secara real-time sepanjang malam.",
        },
      ]}
      presets={[
        { name: "Neon Night 1600", desc: "Kontras tinggi, glow neon, flash 90s", tag: "Club & Rooftop" },
        { name: "Golden Hour 400", desc: "Hangat sunset glow untuk festival sore", tag: "Sunset Party" },
        { name: "Noir 400", desc: "Hitam putih pekat berbutir film grain", tag: "Underground Rave" },
      ]}
      sampleGallery={[
        { img: "/img/genz/phone-2.jpg", caption: "Dansa malam dengan filter Neon Night 1600" },
        { img: "/img/genz/phone-1.jpg", caption: "Rooftop golden hour toast bersama sahabat" },
        { img: "/img/genz/yellow-card-1.jpg", caption: "Atmosfer festival musik & crowd ceria" },
      ]}
      storyQuote={{
        quote: "Visual layar LED di belakang DJ jadi super interaktif karena foto-foto partygoer langsung muncul live. Vibe pestanya naik 1000%!",
        author: "Kevin Arya",
        role: "Event Organizer · Jakarta Sunset Festival",
      }}
      packageHighlight={{
        name: "Paket Party & Festival",
        price: "Rp 249.000",
        guests: "Hingga 250 Tamu",
        features: [
          "Akses kamera web instan tanpa download",
          "Preset Neon Night 1600 & 5 filter analog lainnya",
          "Live stream slideshow untuk proyektor & LED screen",
          "Kustom watermark nama pesta / event DJ",
          "Unduh ZIP seluruh galeri resolusi penuh",
          "Dukungan proyektor mode layar penuh",
        ],
      }}
      faqs={[
        {
          q: "Apakah bisa disambungkan ke LED Screen panggung festival?",
          a: "Sangat bisa! Anda cukup membuka link Live Slideshow dari laptop operator VJ / visual di resolusi Full HD atau 4K.",
        },
        {
          q: "Bagaimana jika koneksi internet venue pesta lambat?",
          a: "HAY Stories dikembangkan secara sangat ringan (WebAssembly & WebGL), foto dikompresi optimal di browser sebelum diunggah sehingga tetap lancar meski di keramaian.",
        },
        {
          q: "Apakah ada batas jumlah foto yang bisa diunggah?",
          a: "Tidak ada batasan total foto di dalam paket! Semua jepretan tamu akan tersimpan aman di album acara Anda.",
        },
      ]}
    />
  );
}
