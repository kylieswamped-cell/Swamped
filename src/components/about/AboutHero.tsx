"use client";

import { Stagger, StaggerItem } from "../Reveal";

export default function AboutHero() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-[1000px] px-6 py-20 text-center sm:px-16 sm:py-24">
        <Stagger>
          <StaggerItem className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(0,193,133,0.1)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.6px] text-brand">
              <span className="size-2 rounded-full bg-brand" />
              Simple Tools. Real Results.
            </span>
          </StaggerItem>

          <StaggerItem className="mt-6">
            <h1 className="text-[36px] font-extrabold leading-[1.1] text-navy sm:text-[60px] sm:leading-[66px]">
              Built for Contractors.
              <br />
              Powered by Stripe.
            </h1>
          </StaggerItem>

          <StaggerItem className="mt-8 flex flex-col gap-6 text-[16px] leading-[1.6] text-muted sm:text-[20px] sm:leading-[32.5px]">
            <p>
              Swamped was built for contractors who want a simple way to
              manage customers, jobs, quotes, invoices, and payments without
              adding more complexity to their business.
            </p>
            <p>
              Many small service businesses still rely on a mix of paper,
              spreadsheets, text messages, and disconnected tools to keep
              things moving. Others find themselves paying for large
              software platforms packed with features they rarely use.
            </p>
            <p>
              We built Swamped to provide a cleaner alternative. A simple
              platform that helps contractors stay organized, look
              professional, close more jobs, and get paid faster.
            </p>
          </StaggerItem>
        </Stagger>
      </div>
    </section>
  );
}
