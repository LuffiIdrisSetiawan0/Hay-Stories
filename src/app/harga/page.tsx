import { Metadata } from "next";
import Navbar from "@/components/ui/Navbar";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Harga · HAY Stories",
  description:
    "Mulai dengan Starter gratis untuk 5 tamu dan penyimpanan 90 hari. Paket HAY Stories berbayar masih dalam daftar tunggu dan belum dapat dibeli.",
};

export default function HargaPage() {
  return (
    <main>
      <Navbar />
      <div style={{ paddingTop: "2rem" }}>
        <Pricing />
        <FAQ />
      </div>
      <Footer />
    </main>
  );
}
