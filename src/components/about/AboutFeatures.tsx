"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Reveal, { Stagger, StaggerItem } from "../Reveal";

const points = [
  {
    title: "Stay Organized",
    desc: "Track your customers, jobs, quotes, invoices, and payments all in one place. No more digging through spreadsheets, text messages, email threads, or paper files to find what you need.",
  },
  {
    title: "Look More Professional",
    desc: "Send branded quotes and invoices that help build trust and make it easier for customers to say yes. Put your best foot forward and close more business without adding extra administrative work.",
  },
  {
    title: "Get Paid Faster",
    desc: "Accept online payments and give customers a simple, convenient way to pay. Spend less time chasing payments and more time focused on the work that grows your business.",
  },
  {
    title: "Get Started Quickly",
    desc: "Create an account, connect Stripe, and be ready to start collecting payments in minutes. No complicated setup. No lengthy onboarding. No time wasted learning features you'll never use.",
  },
];

const trustItems = [
  { icon: "/about/trust-icon-1.svg", label: "PCI-DSS Level 1 Compliance" },
  { icon: "/about/trust-icon-2.svg", label: "Secure, encrypted bank transfers" },
  { icon: "/about/trust-icon-3.svg", label: "Fast and Reliable Payout Infrastructure" },
];

export default function AboutFeatures() {
  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-start gap-16 px-6 py-24 sm:px-16 lg:grid-cols-2">
        <div>
          <Reveal>
            <h2 className="text-[26px] font-extrabold leading-tight text-navy sm:text-[30px]">
              Everything You Need. Nothing You Don&apos;t.
            </h2>
            <p className="mt-6 max-w-[616px] text-[16px] leading-[1.6] text-muted sm:text-[18px]">
              Most contractors don&apos;t need dozens of features, complicated
              setups, or another monthly subscription to manage their
              business. They need a simple way to keep track of customers,
              jobs, quotes, invoices, and payments without adding more work
              to their day. That&apos;s why Swamped focuses on the
              essentials and leaves the complexity behind.
            </p>
          </Reveal>

          <Stagger stagger={0.1} className="mt-10 flex flex-col gap-8">
            {points.map((p) => (
              <StaggerItem key={p.title} className="flex gap-4">
                <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand">
                  <Image src="/about/check-tick.svg" alt="" width={10} height={7} />
                </span>
                <div>
                  <h4 className="text-[16px] font-bold text-navy">{p.title}</h4>
                  <p className="mt-1 text-[14px] leading-[1.5] text-muted-light">{p.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <Reveal delay={0.15} y={40}>
          <motion.div
            whileHover={{ y: -4 }}
            className="rounded-3xl border border-border bg-surface p-10 shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
          >
            <h3 className="text-[22px] font-bold text-navy sm:text-[24px]">
              Built on Trusted Infrastructure
            </h3>
            <p className="mt-5 text-[16px] leading-[1.6] text-muted">
              When it comes to payments, security and reliability are not
              optional. By building on Stripe, Swamped gives contractors
              access to the same trusted payment infrastructure used by
              millions of businesses around the world. That means secure
              payments, reliable payouts, and a payment experience customers
              already know and trust.
            </p>

            <ul className="mt-6 flex flex-col gap-3">
              {trustItems.map((item) => (
                <li key={item.label} className="flex items-center gap-3">
                  <Image src={item.icon} alt="" width={14} height={14} />
                  <span className="text-[14px] text-muted">{item.label}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 border-t border-[#f1f5f9] pt-6 text-center">
              <p className="text-[14px] font-medium text-navy">Powered by Stripe</p>
              <p className="mt-2 text-[14px] text-muted">
                Trusted payment infrastructure used by millions of businesses worldwide.
              </p>
            </div>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
