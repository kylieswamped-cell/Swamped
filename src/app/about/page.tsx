import type { Metadata } from "next";
import Nav from "@/components/Nav";
import AboutHero from "@/components/about/AboutHero";
import AboutFeatures from "@/components/about/AboutFeatures";
import AboutCta from "@/components/about/AboutCta";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About — Swamped",
  description:
    "Swamped was built for contractors who want a simple way to manage customers, jobs, quotes, invoices, and payments without adding more complexity to their business.",
};

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <AboutHero />
        <AboutFeatures />
        <AboutCta />
      </main>
      <Footer />
    </>
  );
}
