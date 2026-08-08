import Navbar from "@/components/ui/Navbar";
import Hero from "@/components/landing/Hero";
import SocialProof from "@/components/landing/SocialProof";
import ProblemSection from "@/components/landing/ProblemSection";
import HowItWorks from "@/components/landing/HowItWorks";
import FilmShowcase from "@/components/landing/FilmShowcase";
import Testimonials from "@/components/landing/Testimonials";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";

/**
 * Ritme terang/gelap halaman, mengikuti pola jeda SNXP Studio:
 * hero foto → krem → krem → GELAP (showcase) → krem → krem bernuansa → krem.
 * Band gelap tunggal itu memberi jeda sekaligus menempatkan foto pada latar
 * yang membuatnya paling bagus.
 */
export default function HomePage() {
  return (
    <main>
      <Navbar overHero />
      <Hero />
      <SocialProof />
      <ProblemSection />
      <HowItWorks />
      <FilmShowcase />
      <Testimonials />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  );
}
