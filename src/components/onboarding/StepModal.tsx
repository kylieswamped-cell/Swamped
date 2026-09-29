"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type StepModalProps = {
  label: string;
  title: string;
  description?: ReactNode;
  width?: string;
  children: ReactNode;
};

/** The dark-header card every onboarding step sits in. */
export default function StepModal({ label, title, description, width = "max-w-[672px]", children }: StepModalProps) {
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="step-title"
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`w-full ${width} overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]`}
    >
      <div className="bg-[#0b192c] px-6 py-8 sm:px-10">
        <p className="text-[12px] font-bold uppercase leading-4 tracking-[1.2px] text-[#00c9a7]">{label}</p>
        <h2 id="step-title" className="mt-2 text-[22px] font-bold leading-8 text-white sm:text-[28px]">
          {title}
        </h2>
        {description && <div className="mt-2 text-[15px] leading-6 text-[#94a3b8]">{description}</div>}
      </div>
      <div className="px-6 py-8 sm:px-10">{children}</div>
    </motion.div>
  );
}
