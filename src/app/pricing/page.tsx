import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import CtaBanner from "@/components/CtaBanner";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Pricing & Fees — Swamped",
  description:
    "Swamped is free to use. No monthly software fees and no credit card required. You only pay standard processing fees when customers pay online.",
};

const included = [
  "Unlimited customers, jobs, quotes, and invoices",
  "Shareable quote and invoice links your customers can open without an account",
  "Payment tracking, receipts, and refunds",
  "Works on desktop, tablet, and mobile",
  "No credit card required to sign up",
];

const questions = [
  {
    q: "Is there a monthly fee?",
    a: "No. Swamped doesn't charge a monthly software fee or a setup fee. Create your account for free, with no credit card required.",
  },
  {
    q: "When do I pay anything?",
    a: "Only when a customer pays you online. Each online payment is subject to standard processing fees, which come out of that payment before it reaches your bank account.",
  },
  {
    q: "What about cash or check payments?",
    a: "Payments you record manually, such as cash or check, don't go through online processing, so no processing fees apply.",
  },
  {
    q: "Who processes the payments?",
    a: "Stripe securely processes all online payments and pays them out to your connected bank account on your Stripe payout schedule.",
  },
];

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <section className="bg-surface">
          <div className="mx-auto max-w-[1000px] px-6 py-20 text-center sm:px-16 sm:py-24">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.6px] text-brand">
              <span className="size-2 rounded-full bg-brand" />
              Simple, Transparent Pricing
            </span>
            <h1 className="mt-6 text-[36px] font-extrabold leading-[1.1] text-navy sm:text-[60px] sm:leading-[66px]">
              Pricing &amp; Fees
            </h1>
            <p className="mx-auto mt-6 max-w-[680px] text-[16px] leading-[1.6] text-muted sm:text-[20px] sm:leading-[32.5px]">
              Swamped is free to use. No monthly software fees, no contracts. You only pay standard processing fees
              when your customers pay online.
            </p>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-[1000px] gap-6 px-6 py-16 sm:px-16 md:grid-cols-2">
            <div className="rounded-3xl border border-line bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.05)] sm:p-10">
              <h2 className="text-[14px] font-bold uppercase tracking-[1.2px] text-brand">Swamped Software</h2>
              <p className="mt-4 flex items-baseline gap-2 text-navy">
                <span className="text-[56px] font-black leading-none">$0</span>
                <span className="text-[16px] font-semibold text-muted">/ month</span>
              </p>
              <ul className="mt-8 flex flex-col gap-3">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[16px] leading-6 text-[#334155]">
                    <Check className="mt-0.5 size-5 shrink-0 text-brand" strokeWidth={2.5} />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-10 flex h-12 items-center justify-center rounded-xl bg-brand text-[16px] font-bold text-white transition-colors hover:bg-brand-dark"
              >
                Create Your Free Account
              </Link>
            </div>

            <div className="flex flex-col rounded-3xl bg-navy p-8 text-white sm:p-10">
              <h2 className="text-[14px] font-bold uppercase tracking-[1.2px] text-brand-accent">Online Payments</h2>
              <p className="mt-4 text-[28px] font-extrabold leading-tight">Standard processing fees, only when you get paid</p>
              <p className="mt-6 text-[16px] leading-[1.7] text-[#cbd5e1]">
                When a customer pays a deposit or invoice online, the payment is processed by Stripe. Standard
                processing fees are deducted from that payment, and the rest is paid out to your bank account.
              </p>
              <p className="mt-4 text-[16px] leading-[1.7] text-[#cbd5e1]">
                Recording cash or check payments is always free.
              </p>
              <a
                href="https://stripe.com/pricing"
                target="_blank"
                rel="noreferrer"
                className="mt-auto pt-8 text-[16px] font-bold text-brand-accent hover:text-white"
              >
                See Stripe&apos;s standard rates →
              </a>
            </div>
          </div>
        </section>

        <section className="bg-surface">
          <div className="mx-auto max-w-[800px] px-6 py-16 sm:px-16">
            <h2 className="text-center text-[28px] font-extrabold text-navy sm:text-[36px]">Common Questions</h2>
            <dl className="mt-10 flex flex-col gap-4">
              {questions.map(({ q, a }) => (
                <div key={q} className="rounded-2xl border border-line bg-white p-6">
                  <dt className="text-[18px] font-bold text-navy">{q}</dt>
                  <dd className="mt-2 text-[16px] leading-[1.6] text-muted">{a}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-8 text-center text-[14px] text-muted">
              More questions?{" "}
              <Link href="/contact" className="font-semibold text-brand hover:text-brand-dark">
                Contact us
              </Link>
              .
            </p>
          </div>
        </section>

        <CtaBanner />
      </main>
      <Footer />
    </>
  );
}
