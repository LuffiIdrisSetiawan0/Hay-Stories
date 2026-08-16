import { Metadata } from "next";
import Navbar from "@/components/ui/Navbar";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Harga · HAY Stories",
  description:
    "Harga HAY Stories transparan dalam Rupiah. Mulai gratis untuk 5 tamu, lalu sekali bayar per acara sesuai jumlah tamu, tanpa langganan, tanpa biaya tersembunyi.",
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
