import type { Metadata } from "next";
import SiteHeader from "@/components/home/SiteHeader";
import Hero from "@/components/home/Hero";
import ScrollStory from "@/components/home/ScrollStory";
import FeatureRail from "@/components/home/FeatureRail";
import HowItWorks from "@/components/home/HowItWorks";
import PhotoPanel from "@/components/home/PhotoPanel";
import Occasions from "@/components/home/Occasions";
import MomentWall from "@/components/home/MomentWall";
import Compare from "@/components/home/Compare";
import Plans from "@/components/home/Plans";
import Questions from "@/components/home/Questions";
import Invite from "@/components/home/Invite";
import SiteFooter from "@/components/home/SiteFooter";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Halaman utama.
 *
 * Urutannya mengikuti cara orang memutuskan: janji dulu, lalu isi produknya,
 * baru cara memakainya, kemudian bukti, dan penawaran paling akhir.
 *
 * Iramanya dijaga oleh permukaan, bukan warna blok: kanvas krem dan krem
 * hangat berselang-seling, sementara warna sesungguhnya muncul sebagai rona
 * kartu di dalam seksi. Tidak ada seksi gelap sama sekali.
 *
 * Dua seksi pertama sesudah hero memikul gerakannya. Keduanya dipaku di puncak
 * layar selama beberapa layar penuh sementara isinya menyapu mendatar, dan
 * keduanya bersudut atas sangat membulat supaya terbaca sebagai lembar yang
 * naik menutupi lembar di atasnya. Sesudah itu halaman sengaja menenang: seksi
 * sisanya mengalir biasa dengan animasi masuk saja.
 *
 * Urutan itu disengaja. Paku yang dipakai lebih dari dua kali berhenti terasa
 * sebagai sorotan dan mulai terasa sebagai halaman yang menolak digulir.
 */
export default function HomePage() {
  return (
    <main>
      <SiteHeader />
      <Hero />
      <ScrollStory />
      <FeatureRail />
      <HowItWorks />
      <PhotoPanel />
      <Occasions />
      <MomentWall />
      <Compare />
      <Plans />
      <Questions />
      <Invite />
      <SiteFooter />
    </main>
  );
}
