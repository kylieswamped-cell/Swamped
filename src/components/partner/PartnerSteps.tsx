"use client";

import { motion } from "framer-motion";
import Reveal, { Stagger, StaggerItem } from "../Reveal";

const steps = [
  {
    title: "Apply",
    body: "Fill out our simple partner application. We review applications within 48 hours.",
  },
  {
    title: "Refer",
    body: "Share your unique link or introduce clients directly to our onboarding team.",
  },
  {
    title: "Earn",
    body: "Get paid monthly for every active referral. Track your earnings in your dashboard.",
  },
];

export default function PartnerSteps() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-white">
      <div className="mx-auto max-w-[1440px] px-6 py-24 sm:px-16 sm:py-32">
        <Reveal className="text-center">
          <h2 className="text-[30px] font-extrabold leading-tight text-navy sm:text-[36px] sm:leading-[54px]">
            How it Works
          </h2>
        </Reveal>

        <div className="relative mt-20">
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-[16.67%] right-[16.67%] top-8 hidden h-[2px] origin-left bg-border md:block"
          />
          <Stagger stagger={0.15} className="relative grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
            {steps.map((s, i) => (
              <StaggerItem key={s.title} className="flex flex-col items-center text-center">
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  className="flex size-16 items-center justify-center rounded-full bg-brand text-[24px] font-bold text-white"
                >
                  {i + 1}
                </motion.div>
                <h3 className="mt-6 text-[20px] font-bold leading-[30px] text-navy">
                  {s.title}
                </h3>
                <p className="mt-3 max-w-[400px] text-[16px] leading-[24px] text-muted">
                  {s.body}
                </p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
