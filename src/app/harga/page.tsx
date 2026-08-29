import type { Metadata } from "next";
import SiteHeader from "@/components/home/SiteHeader";
import Plans from "@/components/home/Plans";
import Questions from "@/components/home/Questions";
import Invite from "@/components/home/Invite";
import SiteFooter from "@/components/home/SiteFooter";

export const metadata: Metadata = {
  title: "Harga",
  description:
    "Mulai dengan paket Starter gratis untuk lima tamu, atau pilih paket berbayar hingga kapasitas 100.000 tamu dengan pembayaran aman lewat Midtrans.",
  alternates: { canonical: "/harga" },
};

export default function HargaPage() {
  return (
    <main>
      <SiteHeader />
      <div style={{ paddingTop: "var(--nav-height)" }}>
        <Plans />
        <Questions />
        <Invite />
      </div>
      <SiteFooter />
    </main>
  );
}
