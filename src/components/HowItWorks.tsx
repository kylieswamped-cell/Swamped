"use client";

import { motion } from "framer-motion";
import Reveal, { Stagger, StaggerItem } from "./Reveal";

const steps = [
  { n: 1, title: "Add Customer", desc: "Keep info organized and easy to find." },
  { n: 2, title: "Send Quote", desc: "Professional quotes sent in seconds." },
  { n: 3, title: "Start Job", desc: "Convert quote to active job with one tap." },
  { n: 4, title: "Send Invoice", desc: "Digital invoicing with simple payment links." },
  { n: 5, title: "Get Paid", desc: "Funds land directly in your bank account." },
];

export default function HowItWorks() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-[1440px] px-6 py-24 sm:px-16">
        <Reveal className="text-center">
          <h2 className="text-[30px] font-extrabold text-navy sm:text-[36px]">
            How It Works
          </h2>
          <p className="mx-auto mt-4 max-w-[720px] text-[16px] text-muted sm:text-[18px]">
            From the first quote to the final payment, keep everything organized in one place.
          </p>
        </Reveal>

        <div className="relative mt-20">
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "left" }}
            className="absolute left-0 right-0 top-10 hidden h-0.5 border-t-2 border-dashed border-[rgba(0,200,151,0.3)] md:block"
          />

          <Stagger
            stagger={0.12}
            className="relative grid grid-cols-1 gap-12 sm:grid-cols-2 md:grid-cols-5"
          >
            {steps.map((step) => (
              <StaggerItem key={step.n} className="flex flex-col items-center text-center">
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  className="flex size-20 items-center justify-center rounded-full border-2 border-brand bg-white text-[20px] font-bold text-brand shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]"
                >
                  {step.n}
                </motion.div>
                <h3 className="mt-4 text-[16px] font-bold text-navy">{step.title}</h3>
                <p className="mt-2 max-w-[190px] text-[12px] text-muted">{step.desc}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <Reveal delay={0.1} className="mt-16 flex justify-center">
          <motion.a
            href="#get-started"
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex h-[60px] w-full max-w-[308px] items-center justify-center rounded-xl bg-brand text-[18px] font-extrabold text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] transition-colors hover:bg-brand-dark"
          >
            Create Your Free Account
          </motion.a>
        </Reveal>
      </div>
    </section>
  );
}
