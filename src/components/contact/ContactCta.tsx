"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Reveal from "../Reveal";

export default function ContactCta() {
  return (
    <section className="bg-[#f8f9fa] px-6 pb-24 sm:px-16">
      <Reveal y={40} className="mx-auto max-w-[1252px]">
        <motion.div
          whileHover={{ scale: 1.005 }}
          className="relative overflow-hidden rounded-3xl bg-navy px-6 py-10 text-center sm:px-16"
        >
          <Image
            src="/contact/bolt-icon.svg"
            alt=""
            width={84}
            height={97}
            className="pointer-events-none absolute right-8 top-3 opacity-10"
          />

          <h2 className="text-[20px] font-bold text-white">Ready to Get Started?</h2>
          <p className="mx-auto mt-4 max-w-[720px] text-[16px] text-[#bfdbfe]">
            Create your free account and start managing customers, jobs,
            quotes, invoices, and payments in one place
          </p>

          <motion.a
            href="#get-started"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="mt-6 inline-flex h-9 items-center justify-center rounded-lg bg-white px-6 text-[14px] font-bold text-navy"
          >
            Create Free Account
          </motion.a>

          <p className="mt-8 text-[12px] font-semibold uppercase tracking-[1.2px] text-[#6b7280]">
            no credit card required &nbsp;•&nbsp; no monthly software fees
            &nbsp;•&nbsp; only when{" "}
            <span className="font-semibold">pay standard processing fees</span>
          </p>
        </motion.div>
      </Reveal>
    </section>
  );
}
