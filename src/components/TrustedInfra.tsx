"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Reveal, { Stagger, StaggerItem } from "./Reveal";

const cards = [
  {
    icon: "/icons/trust-shield.svg",
    bg: "bg-[#eff6ff]",
    title: "Secure Payments",
    desc: "Bank-grade security ensures every transaction is safe and protected.",
  },
  {
    icon: "/icons/trust-stripe.svg",
    bg: "bg-[#eef2ff]",
    title: "Powered by Stripe",
    desc: "Leveraging the world's most reliable payment infrastructure.",
  },
  {
    icon: "/icons/trust-star.svg",
    bg: "bg-[rgba(0,200,151,0.1)]",
    title: "Professional Experience",
    desc: "Give your customers the high-end payment experience they expect.",
  },
];

export default function TrustedInfra() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-[1024px] px-6 py-24 sm:px-16">
        <Reveal className="text-center">
          <h2 className="text-[30px] font-extrabold text-navy sm:text-[36px]">
            Built on Trusted Infrastructure.
          </h2>
          <p className="mx-auto mt-4 max-w-[800px] text-[16px] leading-[1.6] text-muted sm:text-[18px]">
            Swamped was built for contractors and service businesses. For
            payment processing, we partnered with Stripe, one of the most
            trusted payment companies in the world.
          </p>
        </Reveal>

        <Stagger stagger={0.1} className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {cards.map((c) => (
            <StaggerItem key={c.title}>
              <motion.div
                whileHover={{ y: -6 }}
                className="flex h-full flex-col items-center rounded-3xl border border-border bg-white p-8 text-center shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-xl"
              >
                <div className={`flex size-16 items-center justify-center rounded-2xl ${c.bg}`}>
                  <Image src={c.icon} alt="" width={24} height={24} />
                </div>
                <h3 className="mt-6 text-[16px] font-bold text-navy">{c.title}</h3>
                <p className="mt-2 text-[14px] leading-[1.4] text-muted">{c.desc}</p>
              </motion.div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
