"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";
import Reveal, { Stagger, StaggerItem } from "./Reveal";

const points = [
  {
    title: "Simple by Design",
    desc: "Focus on your work, not on learning complex software.",
  },
  {
    title: "Designed for Service",
    desc: "Optimized for electricians, plumbers, roofers, and more.",
  },
  {
    title: "Everything in One Place",
    desc: "No more hunting for phone numbers or quote details.",
  },
  {
    title: "Less Paperwork",
    desc: "More time on the tools, less time behind the desk.",
  },
];

export default function ContractorWork() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <section ref={ref} className="bg-white">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-16 px-6 py-24 sm:px-16 lg:grid-cols-2">
        <div>
          <Reveal>
            <h2 className="text-[30px] font-extrabold leading-tight text-navy sm:text-[36px]">
              Built for the Way Contractors Work.
            </h2>
            <p className="mt-6 max-w-[560px] text-[16px] leading-[1.6] text-muted sm:text-[18px]">
              Most contractors don&apos;t need expensive, complicated software
              packed with features they&apos;ll never use. Swamped gives you a
              simple way to manage customers, jobs, quotes, invoices, and
              payments without juggling paperwork, spreadsheets, or multiple
              tools.
            </p>
          </Reveal>

          <Stagger stagger={0.1} className="mt-12 grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-2">
            {points.map((p) => (
              <StaggerItem key={p.title}>
                <div className="flex items-center gap-3">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[rgba(0,200,151,0.1)]">
                    <Image src="/icons/check-green.svg" alt="" width={10} height={10} />
                  </div>
                  <h4 className="text-[16px] font-bold text-navy">{p.title}</h4>
                </div>
                <p className="mt-2 text-[14px] text-muted">{p.desc}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <Reveal delay={0.15} y={40} className="mx-auto w-full max-w-[380px]">
          <motion.div
            style={{ y }}
            animate={{ y: [0, -10, 0] }}
            transition={{ y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
          >
            <Image
              src="/images/phone-mockup.png"
              alt="Swamped mobile app overview"
              width={632}
              height={1264}
              className="w-full drop-shadow-2xl"
            />
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
