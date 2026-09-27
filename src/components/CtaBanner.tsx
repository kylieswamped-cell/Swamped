"use client";

import { motion } from "framer-motion";
import Reveal from "./Reveal";

export default function CtaBanner() {
  return (
    <section className="bg-white px-6 py-8 sm:px-16">
      <Reveal y={40} className="mx-auto max-w-[1440px]">
        <motion.div
          whileHover={{ scale: 1.005 }}
          className="overflow-hidden rounded-[48px] bg-navy px-6 py-20 text-center sm:px-16"
        >
          <h2 className="mx-auto max-w-[900px] text-[34px] font-black leading-tight text-white sm:text-[48px]">
            Ready to Close More Jobs and Get Paid Faster?
          </h2>
          <p className="mx-auto mt-6 max-w-[672px] text-[18px] text-[#9ca3af] sm:text-[20px]">
            Create your free account and spend less time chasing paperwork
            and more time running your business.
          </p>

          <motion.a
            href="#get-started"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="mt-10 inline-flex h-20 w-full max-w-[291px] items-center justify-center rounded-2xl bg-brand text-[24px] font-black text-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] transition-colors hover:bg-brand-dark"
          >
            Get Started Now
          </motion.a>

          <p className="mt-14 text-[12px] font-semibold uppercase tracking-[1.2px] text-[#6b7280]">
            no credit card required &nbsp;•&nbsp; no monthly software fees
            &nbsp;•&nbsp; only when{" "}
            <span className="font-semibold">pay standard processing fees</span>
          </p>
        </motion.div>
      </Reveal>
    </section>
  );
}
