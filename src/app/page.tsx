import Navbar from "@/components/ui/Navbar";
import Hero from "@/components/landing/Hero";
import WhySection from "@/components/landing/WhySection";
import StatsBand from "@/components/landing/StatsBand";
import EventShowcase from "@/components/landing/EventShowcase";
import FilmShowcase from "@/components/landing/FilmShowcase";
import HowItWorks from "@/components/landing/HowItWorks";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";
import VersionSwitcher from "@/components/ui/VersionSwitcher";

/**
 * Susunan halaman: buka dengan pernyataan, lalu alasan, lalu bukti, baru
 * penawaran. Pintu per jenis acara datang setelah bukti — bukan sebelum —
 * karena pengunjung baru mau memilih pintu setelah percaya ada isinya.
 *
 * Ritme terang/gelap: hero GELAP → krem → GELAP → GELAP → GELAP → krem → krem
 * → krem → GELAP. Tiga seksi gelap berturut-turut di tengah bukan kelalaian:
 * ketiganya soal foto, dan foto tampil paling bagus di atas hitam. Yang
 * memisahkan mereka pergantian bentuk — angka, slide menempel, etalase — bukan
 * pergantian warna latar.
 */
export default function HomePage() {
  return (
    <main>
      <Navbar overHero />
      <Hero />
      <WhySection />
      <StatsBand />
      <EventShowcase />
      <FilmShowcase />
      <HowItWorks />
      <Pricing />
      <FAQ />
      <Footer />
      <VersionSwitcher />
    </main>
  );
}
