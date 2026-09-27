"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Reveal, { Stagger, StaggerItem } from "./Reveal";

const features = [
  {
    icon: "/icons/feature-close-jobs.svg",
    bg: "bg-[rgba(0,200,151,0.1)]",
    title: "Close More Jobs",
    desc: "Professional quotes help customers feel confident saying yes.",
  },
  {
    icon: "/icons/feature-get-paid.svg",
    bg: "bg-[#eff6ff]",
    title: "Get Paid Faster",
    desc: "Make it easy for customers to pay deposits and invoices online.",
  },
  {
    icon: "/icons/feature-organized.svg",
    bg: "bg-[#faf5ff]",
    title: "Stay Organized",
    desc: "Keep customers, jobs, quotes, invoices, and payments all in one place.",
  },
  {
    icon: "/icons/feature-protect.svg",
    bg: "bg-[#fff7ed]",
    title: "Protect Yourself",
    desc: "Protect yourself from scope creep and payment disputes with clear quotes and approvals.",
  },
  {
    icon: "/icons/feature-save-money.svg",
    bg: "bg-[#f0fdf4]",
    title: "Save Money",
    desc: "No monthly software fees. Only pay standard payment processing fees when you collect money online.",
  },
  {
    icon: "/icons/feature-save-time.svg",
    bg: "bg-[#f0fdf4]",
    title: "Save Time",
    desc: "Spend less time managing paperwork and more time running your business.",
  },
];

export default function Features() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1440px] px-6 py-24 sm:px-16">
        <Reveal className="text-center">
          <h2 className="text-[30px] font-extrabold text-navy sm:text-[36px]">
            Everything You Need. Nothing You Don&apos;t.
          </h2>
          <div className="mx-auto mt-4 h-1.5 w-16 rounded-full bg-brand" />
        </Reveal>

        <Stagger
          stagger={0.08}
          className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((f) => (
            <StaggerItem key={f.title}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="h-full rounded-3xl border border-border bg-white p-10 shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-xl"
              >
                <div className={`flex size-14 items-center justify-center rounded-2xl ${f.bg}`}>
                  <Image src={f.icon} alt="" width={28} height={28} />
                </div>
                <h3 className="mt-8 text-[20px] font-bold text-navy">{f.title}</h3>
                <p className="mt-3 text-[16px] leading-[1.6] text-muted">{f.desc}</p>
              </motion.div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
