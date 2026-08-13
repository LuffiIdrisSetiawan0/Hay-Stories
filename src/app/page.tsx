import Navbar from "@/components/ui/Navbar";
import Hero from "@/components/landing/Hero";
import EventTypes from "@/components/landing/EventTypes";
import ProblemSection from "@/components/landing/ProblemSection";
import StatsBand from "@/components/landing/StatsBand";
import FilmShowcase from "@/components/landing/FilmShowcase";
import HowItWorks from "@/components/landing/HowItWorks";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";

/**
 * Susunan halaman mengikuti pola situs agensi: pintu masuk per kategori tepat
 * setelah hero, lalu "kenapa", angka bukti, carousel penawaran, dan cara kerja.
 *
 * Dua seksi lama dihapus, bukan dipindah. `Testimonials` dan `SocialProof`
 * keduanya berisi kutipan dan logo karangan — README proyek ini sendiri
 * menandainya harus diganti sebelum dipromosikan. Referensinya membangun
 * kredibilitas lewat angka yang bisa diperiksa, bukan lewat testimoni, dan
 * angka yang bisa diperiksa memang kita punya. Testimoni asli yang mengganti
 * keduanya nanti jauh lebih kuat daripada yang dikarang sekarang.
 *
 * Ritme terang/gelap tetap dijaga: hero foto → krem → krem → bernuansa →
 * GELAP (showcase) → krem → krem → krem.
 */
export default function HomePage() {
  return (
    <main>
      <Navbar overHero />
      <Hero />
      <EventTypes />
      <ProblemSection />
      <StatsBand />
      <FilmShowcase />
      <HowItWorks />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  );
}
