import type { Metadata } from "next";
import Nav from "@/components/Nav";
import ContactHero from "@/components/contact/ContactHero";
import ContactForm from "@/components/contact/ContactForm";
import FaqAccordion from "@/components/contact/FaqAccordion";
import ContactCta from "@/components/contact/ContactCta";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Contact — Swamped",
  description:
    "Have questions about Swamped? Send us a message and a member of our team will get back to you as soon as possible.",
};

export default function ContactPage() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <ContactHero />
        <ContactForm />
        <FaqAccordion />
        <ContactCta />
      </main>
      <Footer />
    </>
  );
}
