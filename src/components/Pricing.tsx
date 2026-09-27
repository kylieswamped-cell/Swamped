"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Reveal from "./Reveal";

const items = [
  "No monthly software fees",
  "No credit card required",
  "No subscriptions",
  "Only pay standard processing fees when customers pay online",
];

export default function Pricing() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1440px] px-6 py-24 sm:px-16">
        <Reveal className="text-center">
          <p className="text-[12px] font-extrabold uppercase tracking-[2.4px] text-brand">
            Simple Pricing
          </p>
          <h2 className="mt-3 text-[30px] font-extrabold text-navy sm:text-[36px]">
            Only Pay When You Get Paid.
          </h2>
          <p className="mx-auto mt-6 max-w-[672px] text-[16px] leading-[1.6] text-muted sm:text-[18px]">
            Create your account for free and start using Swamped today. No
            monthly software fees. No subscriptions. No hidden charges.
          </p>
        </Reveal>

        <Reveal delay={0.15} y={40} className="mx-auto mt-16 max-w-[576px]">
          <motion.div
            whileHover={{ y: -4 }}
            className="relative rounded-[40px] border-2 border-brand bg-white p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] sm:p-14"
          >
            <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand px-6 py-2 text-[12px] font-black uppercase tracking-[1.2px] text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)]">
              One Simple Plan
            </span>

            <div className="text-center">
              <h3 className="text-[22px] font-bold text-navy sm:text-[24px]">
                No Subscriptions Required
              </h3>
              <div className="mt-2 flex items-end justify-center gap-2">
                <span className="text-[50px] font-black leading-none text-navy sm:text-[60px]">
                  $0
                </span>
                <span className="pb-2 text-[18px] font-bold text-muted sm:text-[20px]">
                  / month
                </span>
              </div>
            </div>

            <ul className="mx-auto mt-10 flex max-w-[320px] flex-col gap-5">
              {items.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand">
                    <Image src="/icons/check.svg" alt="" width={9} height={10} />
                  </span>
                  <span className="text-[16px] font-semibold text-navy">{item}</span>
                </li>
              ))}
            </ul>

            <motion.a
              href="#get-started"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="mt-10 flex h-[68px] w-full items-center justify-center rounded-2xl bg-brand text-[20px] font-black text-white shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] transition-colors hover:bg-brand-dark"
            >
              Get Started for Free
            </motion.a>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
