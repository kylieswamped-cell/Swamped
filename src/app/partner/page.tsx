import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PartnerHero from "@/components/partner/PartnerHero";
import PartnerBenefits from "@/components/partner/PartnerBenefits";
import PartnerAudience from "@/components/partner/PartnerAudience";
import PartnerSteps from "@/components/partner/PartnerSteps";
import PartnerFaq from "@/components/partner/PartnerFaq";
import PartnerCta from "@/components/partner/PartnerCta";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Partner Program — Swamped",
  description:
    "Join the Swamped Partner Program to earn recurring rewards while helping contractors simplify their business.",
};

export default function PartnerPage() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <PartnerHero />
        <PartnerBenefits />
        <PartnerAudience />
        <PartnerSteps />
        <PartnerFaq />
        <PartnerCta />
      </main>
      <Footer />
    </>
  );
}
