"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Reveal, { Stagger, StaggerItem } from "../Reveal";

const audiences = [
  {
    tag: "Financial Pros",
    title: "Accountants & Bookkeepers",
    body: "Help your clients automate their invoicing and reconciliation, making your job easier and their business healthier.",
  },
  {
    tag: "Growth Experts",
    title: "Business Consultants",
    body: "Recommend a lightweight, effective operational tool that helps your contractor clients professionalize and scale.",
  },
  {
    tag: "Community Leaders",
    title: "Industry Influencers",
    body: "Share a tool you believe in with your community of tradespeople and earn rewards for every successful signup.",
  },
];

export default function PartnerAudience() {
  return (
    <section className="bg-navy">
      <div className="mx-auto max-w-[1440px] px-6 py-24 sm:px-16 sm:py-32">
        <Reveal>
          <h2 className="text-[30px] font-extrabold leading-tight text-white sm:text-[36px] sm:leading-[54px]">
            Who is this for?
          </h2>
          <p className="mt-4 text-[18px] leading-[27px] text-muted-light">
            We work with professionals who serve the trades and service industries.
          </p>
        </Reveal>

        <Stagger className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {audiences.map((a) => (
            <StaggerItem key={a.title} className="h-full">
              <motion.div
                whileHover={{ y: -6, borderColor: "rgba(0,193,133,0.5)" }}
                transition={{ duration: 0.25 }}
                className="flex h-full flex-col gap-3 rounded-3xl border border-white/10 p-8"
              >
                <h4 className="text-[14px] font-bold uppercase leading-[21px] tracking-[1px] text-brand">
                  {a.tag}
                </h4>
                <h3 className="text-[24px] font-bold leading-[36px] text-white">
                  {a.title}
                </h3>
                <p className="flex-1 pt-1 text-[16px] leading-[24px] text-muted-light">
                  {a.body}
                </p>
                <a
                  href="#how-it-works"
                  className="group inline-flex items-center gap-2 pt-3 text-[16px] font-semibold leading-[24px] text-brand"
                >
                  Learn more
                  <Image
                    src="/partner/arrow-right.svg"
                    alt=""
                    width={11}
                    height={12}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </a>
              </motion.div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
