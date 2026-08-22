import { Metadata } from "next";
import Navbar from "@/components/ui/Navbar";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Harga",
  description:
    "Mulai dengan Starter gratis untuk 5 tamu, atau pilih paket HAY Stories berbayar hingga kapasitas 100.000 tamu dengan checkout aman Midtrans.",
  alternates: { canonical: "/harga" },
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
