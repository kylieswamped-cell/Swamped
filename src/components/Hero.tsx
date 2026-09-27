"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";
import Reveal, { Stagger, StaggerItem } from "./Reveal";

const badges = [
  "No monthly software fees",
  "No credit card required",
  "Only pay standard processing fees",
];

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 80]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-white">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-16 px-6 py-20 sm:px-16 lg:grid-cols-2 lg:py-28">
        <div>
          <Stagger className="max-w-[624px]">
            <StaggerItem>
              <h1 className="text-[44px] font-extrabold leading-[1.1] text-navy sm:text-[60px] sm:leading-[66px]">
                Close More Jobs.
                <br />
                Get Paid Faster.
              </h1>
            </StaggerItem>
            <StaggerItem className="mt-6">
              <p className="max-w-[512px] text-[18px] leading-[1.6] text-muted sm:text-[20px]">
                The easiest way for contractors to manage jobs, send quotes,
                collect payments, and stay organized.
              </p>
            </StaggerItem>
            <StaggerItem className="mt-9">
              <motion.a
                href="#get-started"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex h-[68px] w-full max-w-[308px] items-center justify-center rounded-xl bg-brand text-[18px] font-extrabold text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] transition-colors hover:bg-brand-dark"
              >
                Create Your Free Account
              </motion.a>
            </StaggerItem>
            <StaggerItem className="mt-8 flex flex-col gap-3">
              {badges.map((badge) => (
                <div key={badge} className="flex items-center gap-[18px]">
                  <Image src="/icons/check-green.svg" alt="" width={12} height={14} />
                  <span className="text-[14px] font-medium text-muted">{badge}</span>
                </div>
              ))}
            </StaggerItem>
          </Stagger>
        </div>

        <Reveal delay={0.2} y={40} className="relative mx-auto w-full max-w-[528px]">
          <motion.div
            style={{ y }}
            animate={{ y: [0, -14, 0] }}
            transition={{
              y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
            }}
            className="relative"
          >
            <Image
              src="/images/dashboard-mockup.png"
              alt="Swamped payments dashboard"
              width={1056}
              height={1092}
              priority
              className="w-full rounded-2xl"
            />
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
