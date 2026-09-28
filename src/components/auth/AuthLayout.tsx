"use client";

import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export const authEase = [0.16, 1, 0.3, 1] as const;

type AuthLayoutProps = {
  children: ReactNode;
  aside: ReactNode;
  /** Put the dark panel on the right (sign up) instead of the left (log in). */
  asideRight?: boolean;
};

export default function AuthLayout({ children, aside, asideRight = false }: AuthLayoutProps) {
  return (
    <div
      className={`flex min-h-screen flex-1 overflow-x-hidden ${
        asideRight ? "flex-row-reverse bg-white" : "bg-surface"
      }`}
    >
      <motion.aside
        initial={{ x: asideRight ? 80 : -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: authEase }}
        className={`relative hidden min-h-screen shrink-0 items-center justify-center bg-[#0f172a] lg:flex ${
          asideRight ? "w-[54%] rounded-l-[2000px]" : "w-[52%] rounded-r-[512px]"
        }`}
      >
        {aside}
      </motion.aside>

      <main className="flex flex-1 flex-col px-6 py-10 sm:px-16">
        <div className={`flex ${asideRight ? "justify-start" : "justify-end"}`}>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[16px] font-medium text-[#64748b] transition-colors hover:text-brand"
          >
            {asideRight ? <ChevronLeft className="size-4" strokeWidth={2.5} /> : "<"} Home Page
          </Link>
        </div>

        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: authEase }}
          className={`mx-auto flex w-full flex-1 flex-col justify-center py-12 ${
            asideRight ? "max-w-[480px]" : "max-w-[448px]"
          }`}
        >
          <Link href="/" className="flex items-center justify-center gap-2">
            <Image
              src="/images/logo.png"
              alt="Swamped"
              width={36}
              height={36}
              priority
              className="mix-blend-multiply"
            />
            <span className="text-[24px] font-bold tracking-[-0.6px] text-logo">SWAMPED</span>
          </Link>
          {children}
        </motion.div>
      </main>
    </div>
  );
}
