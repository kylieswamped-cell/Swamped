"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { label: "HOME", href: "/" },
  { label: "ABOUT", href: "/about" },
  { label: "PARTNER", href: "/partner" },
  { label: "CONTACT", href: "/contact" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const pathname = usePathname();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 12);
  });

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled
          ? "border-border bg-white/80 backdrop-blur-md shadow-sm"
          : "border-border bg-white"
      }`}
    >
      <nav className="mx-auto flex h-22 max-w-[1440px] items-center justify-between px-6 sm:px-16">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/images/logo.png" alt="Swamped" width={40} height={40} priority />
          <span className="font-extrabold text-[24px] tracking-[-0.6px] text-logo">
            SWAMPED
          </span>
        </Link>

        <ul className="hidden gap-10 md:flex">
          {links.map((link) => {
            const active = link.href === pathname;
            return (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className={`text-[16px] tracking-[0.08px] transition-colors hover:text-brand ${
                    active ? "text-brand" : "text-navy-deep"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-6">
          <Link href="/login" className="hidden text-[14px] font-bold text-navy transition-colors hover:text-brand sm:inline">
            Log In
          </Link>
          <motion.a
            href="/signup"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-full bg-brand px-6 py-2.5 text-[14px] font-bold text-white shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition-colors hover:bg-brand-dark"
          >
            Get Started
          </motion.a>
        </div>
      </nav>
    </motion.header>
  );
}
