"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Reveal from "../Reveal";

const MotionLink = motion.create(Link);

export default function PartnerCta() {
  return (
    <section id="apply" className="scroll-mt-24 bg-white px-6 py-16 sm:px-16 sm:py-24">
      <Reveal y={40} className="mx-auto max-w-[1312px]">
        <motion.div
          whileHover={{ scale: 1.005 }}
          className="relative flex flex-col items-center gap-6 overflow-hidden rounded-[40px] bg-navy px-6 py-20 text-center sm:px-16"
        >
          <div className="pointer-events-none absolute -left-10 -top-10 size-64 rounded-full bg-brand opacity-10 blur-[30px]" />
          <div className="pointer-events-none absolute -bottom-10 -right-10 size-64 rounded-full bg-brand opacity-10 blur-[30px]" />

          <h2 className="relative pb-4 text-[28px] font-extrabold leading-tight text-white sm:text-[36px] sm:leading-[54px]">
            Ready to become a Swamped Partner today?
          </h2>

          <MotionLink
            href="/contact"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="relative inline-flex items-center justify-center rounded-2xl bg-brand px-10 py-4 text-[18px] font-bold leading-[27px] text-white transition-colors hover:bg-brand-dark"
          >
            Apply for the Partner Program
          </MotionLink>

          <p className="relative text-[12px] font-semibold uppercase leading-[18px] tracking-[1.2px] text-muted">
            • No minimum referral requirements
          </p>
        </motion.div>
      </Reveal>
    </section>
  );
}
