"use client";

import { motion } from "framer-motion";
import { Stagger, StaggerItem } from "../Reveal";

export default function PartnerHero() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-[1000px] px-6 py-20 text-center sm:px-16 sm:py-[100px]">
        <Stagger>
          <StaggerItem className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(0,193,133,0.1)] px-3 py-1 text-[12px] font-bold uppercase leading-[18px] tracking-[0.6px] text-brand">
              <span className="size-2 rounded-full bg-brand" />
              Join Our Network
            </span>
          </StaggerItem>

          <StaggerItem className="mt-6">
            <h1 className="mx-auto max-w-[900px] text-[36px] font-extrabold leading-[1.1] text-navy sm:text-[60px] sm:leading-[66px]">
              Grow Your Business by
              <br className="hidden sm:block" /> Helping Others Grow Theirs
            </h1>
          </StaggerItem>

          <StaggerItem className="mt-8">
            <p className="mx-auto max-w-[800px] text-[16px] leading-[1.6] text-muted sm:text-[20px] sm:leading-[32.5px]">
              Join the Swamped Partner Program to earn recurring rewards while
              helping contractors simplify their business with the world&apos;s
              most intuitive operational workspace.
            </p>
          </StaggerItem>

          <StaggerItem className="mt-10 flex justify-center">
            <motion.a
              href="#apply"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center justify-center rounded-2xl bg-brand px-10 py-4 text-[18px] font-bold leading-[27px] text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] transition-colors hover:bg-brand-dark"
            >
              Apply to Program
            </motion.a>
          </StaggerItem>
        </Stagger>
      </div>
    </section>
  );
}
