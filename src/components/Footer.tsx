"use client";

import Image from "next/image";
import Link from "next/link";
import Reveal from "./Reveal";

const company = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Pricing and Fees", href: "#" },
  { label: "Partner Program", href: "/partner" },
];
const account = ["Login", "Create Account"];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <Reveal className="mx-auto max-w-[1440px] px-6 pb-8 pt-16 sm:px-16">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <Image src="/images/logo.png" alt="Swamped" width={32} height={32} />
              <span className="text-[24px] font-bold tracking-[-0.6px] text-logo">
                SWAMPED
              </span>
            </div>
            <p className="mt-4 max-w-[220px] text-[14px] leading-[1.6] text-muted">
              Providing practical tools and resources for contractors and
              service businesses.
            </p>
          </div>

          <div>
            <h4 className="text-[14px] font-bold text-navy">Company</h4>
            <ul className="mt-5 flex flex-col gap-4">
              {company.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-[12px] font-semibold text-muted-light hover:text-brand"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[14px] font-bold text-navy">Account</h4>
            <ul className="mt-5 flex flex-col gap-4">
              {account.map((item) => (
                <li key={item}>
                  <a href="#" className="text-[12px] font-semibold text-muted-light hover:text-brand">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-[12px] font-semibold text-muted-light">
            © 2026 Swamped Inc. All rights reserved.
          </p>
          <div className="flex gap-8">
            <a href="#" className="text-[12px] font-semibold text-muted-light hover:text-brand">
              Terms of Service
            </a>
            <a href="#" className="text-[12px] font-semibold text-muted-light hover:text-brand">
              Privacy Policy
            </a>
          </div>
        </div>
      </Reveal>
    </footer>
  );
}
