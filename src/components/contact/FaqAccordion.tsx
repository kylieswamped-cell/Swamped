"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Reveal, { Stagger, StaggerItem } from "../Reveal";

const faqs = [
  {
    q: "Is there a monthly fee to use Swamped?",
    a: "No. Swamped does not charge any monthly software fees. You can create an account for free with no credit card required. The only fees are standard payment processing fees when customers pay online.",
  },
  {
    q: "How Do Payments Work?",
    a: "After creating your account and connecting Stripe, you'll be able to create customers, send quotes and invoices, and accept online payments. When a customer pays, the payment is securely processed through Stripe and deposited into your connected bank account based on your Stripe payout settings. Swamped helps you manage the workflow, while Stripe handles the payment processing.",
  },
  {
    q: "Do I Need a Stripe Account?",
    a: "Yes. Swamped uses Stripe to power online payments. Don't worry, getting set up is simple. After creating your Swamped account, you'll be guided through Stripe's secure onboarding process, which typically only takes a few minutes to complete.",
  },
  {
    q: "How Long Do Payouts Take?",
    a: "Payout timing is managed by Stripe and can depend on your account, bank, business type, location, and payout settings. For many accounts, the first payout can take longer while Stripe verifies the account. After that, eligible payments are typically paid out based on your Stripe payout schedule. You can view payout timing, payout history, and bank deposit details inside your connected Stripe account.",
  },
  {
    q: "Do my customers need a Swamped account to pay?",
    a: "No. Your customers do not need to create a Swamped account to pay an invoice or deposit. They can open your quote or invoice, review the details, and pay online in just a few clicks.",
  },
  {
    q: "What can I manage inside Swamped?",
    a: "Swamped helps you manage the core flow of your business from customer to payment. You can create customers, track jobs, manage quotes and invoices, and view payment activity from your dashboard.",
  },
  {
    q: "Can I use Swamped on my phone?",
    a: "Yes. Swamped is designed to work across desktop, tablet, and mobile devices. We know contractors are often working from the field, so the goal is to make it easy to check information, manage work, and view payment activity wherever you are.",
  },
  {
    q: "How quickly can I get started?",
    a: "You do not need to be tech-savvy to get started. Create your free account, set up your business profile, connect Stripe, and you can begin adding customers and sending your first quote or invoice in minutes.",
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[896px] px-6 py-24 sm:px-16">
        <Reveal className="text-center">
          <h2 className="text-[30px] font-extrabold text-navy sm:text-[36px]">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-[16px] text-muted">
            Quick answers to common questions about Swamped, online payments, and getting started.
          </p>
        </Reveal>

        <Stagger stagger={0.06} className="mt-14 flex flex-col gap-4">
          {faqs.map((faq, i) => {
            const open = openIndex === i;
            return (
              <StaggerItem key={faq.q}>
                <div className="overflow-hidden rounded-2xl border border-border shadow-[0_1px_2px_0px_rgba(0,0,0,0.05)]">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? null : i)}
                    className="flex w-full items-center justify-between gap-4 bg-white px-6 py-6 text-left"
                  >
                    <span className="text-[18px] font-bold text-navy">{faq.q}</span>
                    <motion.span
                      animate={{ rotate: open ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="shrink-0"
                    >
                      <Image src="/contact/plus-icon.svg" alt="" width={14} height={16} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="border-t border-[#f9fafb] bg-white"
                      >
                        <p className="px-6 py-6 text-[16px] leading-[1.6] text-muted">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
