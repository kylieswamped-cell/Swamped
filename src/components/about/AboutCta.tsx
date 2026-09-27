"use client";

import { motion } from "framer-motion";
import Reveal from "../Reveal";

export default function AboutCta() {
  return (
    <section className="bg-white px-6 py-8 sm:px-16">
      <Reveal y={40} className="mx-auto max-w-[1440px]">
        <motion.div
          whileHover={{ scale: 1.005 }}
          className="relative overflow-hidden rounded-[40px] bg-navy px-6 py-20 text-center sm:px-16"
        >
          <div className="pointer-events-none absolute -left-10 -top-10 size-64 rounded-full bg-brand opacity-10 blur-[30px]" />
          <div className="pointer-events-none absolute -right-10 bottom-10 size-64 rounded-full bg-brand opacity-10 blur-[30px]" />

          <h2 className="relative mx-auto max-w-[600px] text-[28px] font-extrabold leading-tight text-white sm:text-[36px]">
            Ready to experience a simpler
            <br />
            way to run your business?
          </h2>

          <motion.a
            href="#get-started"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="relative mt-14 inline-flex h-[59px] w-full max-w-[225px] items-center justify-center rounded-2xl bg-brand text-[18px] font-bold text-white transition-colors hover:bg-brand-dark"
          >
            Get Started Now
          </motion.a>

          <p className="relative mt-16 text-[12px] font-semibold uppercase tracking-[1.2px] text-[#6b7280]">
            no credit card required &nbsp;•&nbsp; no monthly software fees
            &nbsp;•&nbsp; only when{" "}
            <span className="font-semibold">pay standard processing fees</span>
          </p>
        </motion.div>
      </Reveal>
    </section>
  );
}
