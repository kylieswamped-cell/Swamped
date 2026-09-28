"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Reveal, { Stagger, StaggerItem } from "../Reveal";

const benefits = [
  {
    icon: "/partner/commissions-icon.svg",
    title: "Generous Commissions",
    body: "Earn 20% recurring revenue for every contractor you refer for their first 12 months. No caps on earnings.",
  },
  {
    icon: "/partner/support-icon.svg",
    title: "Dedicated Support",
    body: "Get access to a dedicated partner manager and priority support to ensure your clients have a smooth transition.",
  },
  {
    icon: "/partner/marketing-icon.svg",
    title: "Co-Marketing",
    body: "Collaborate on webinars, case studies, and content to reach new audiences and grow your personal brand.",
  },
];

export default function PartnerBenefits() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1440px] px-6 py-24 sm:px-16 sm:py-32">
        <Reveal className="text-center">
          <h2 className="text-[30px] font-extrabold leading-tight text-navy sm:text-[36px] sm:leading-[54px]">
            Why Partner with Us
          </h2>
        </Reveal>

        <Stagger className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {benefits.map((b) => (
            <StaggerItem key={b.title} className="h-full">
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25 }}
                className="flex h-full flex-col gap-4 rounded-3xl border border-border bg-surface p-8 sm:p-10"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-[rgba(0,193,133,0.1)]">
                  <Image src={b.icon} alt="" width={20} height={20} />
                </div>
                <h3 className="pt-2 text-[20px] font-bold leading-[30px] text-navy">
                  {b.title}
                </h3>
                <p className="text-[16px] leading-[26px] text-muted">{b.body}</p>
              </motion.div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
