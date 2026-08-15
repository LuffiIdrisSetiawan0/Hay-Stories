import type { Metadata } from "next";
import GenzHero from "@/components/genz/GenzHero";
import GenzPhoneMockups from "@/components/genz/GenzPhoneMockups";
import GenzVibesSplit from "@/components/genz/GenzVibesSplit";
import GenzPhotoGridYellow from "@/components/genz/GenzPhotoGridYellow";
import GenzFooter from "@/components/genz/GenzFooter";
import VersionSwitcher from "@/components/ui/VersionSwitcher";

export const metadata: Metadata = {
  title: "HAY Stories · Digital Disposable Camera untuk Circle Kamu",
  description:
    "Satu QR code, rame-rame jepret dengan filter roll film analog otentik tanpa perlu install aplikasi. Tangkap momen seru, candid, dan tak terlupakan bersama teman-temanmu.",
};

export default function GenZLandingPage() {
  return (
    <main style={{ backgroundColor: "#fbf9f3", minHeight: "100vh", overflowX: "hidden" }}>
      {/* 1. Hero 360 Circle Perspective */}
      <GenzHero />

      {/* 2. Meet your vibe tribe / 3D iPhone Fan */}
      <GenzPhoneMockups />

      {/* 3. Straight to the real vibes / Pastel Blue Split */}
      <GenzVibesSplit />

      {/* 4. Flow with the moment / Neon Yellow Live Slideshow */}
      <GenzPhotoGridYellow />

      {/* 5. Gen-Z Footer */}
      <GenzFooter />

      {/* Floating Version Switcher */}
      <VersionSwitcher />
    </main>
  );
}
