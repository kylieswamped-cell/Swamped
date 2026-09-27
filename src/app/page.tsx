import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import LogoStrip from "@/components/LogoStrip";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import ContractorWork from "@/components/ContractorWork";
import TrustedInfra from "@/components/TrustedInfra";
import Pricing from "@/components/Pricing";
import CtaBanner from "@/components/CtaBanner";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <LogoStrip />
        <Features />
        <HowItWorks />
        <ContractorWork />
        <TrustedInfra />
        <Pricing />
        <CtaBanner />
      </main>
      <Footer />
    </>
  );
}
