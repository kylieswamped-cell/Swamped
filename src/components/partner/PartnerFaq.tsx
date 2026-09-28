"use client";

import Reveal, { Stagger, StaggerItem } from "../Reveal";

const faqs = [
  {
    q: "How much can I earn as a partner?",
    a: "Partners earn 20% of the subscription revenue for every client they refer. For a typical contractor team, this can range from $200 to $1,000+ per year per referral.",
  },
  {
    q: "Is there a cost to join the program?",
    a: "No, joining the Swamped Partner Program is completely free. We provide all the marketing materials and support you need to succeed.",
  },
  {
    q: "When do I get paid?",
    a: "Commissions are calculated monthly and paid out via Stripe within the first 10 days of the following month.",
  },
];

export default function PartnerFaq() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-[928px] px-6 py-24 sm:px-16 sm:py-32">
        <Reveal className="text-center">
          <h2 className="text-[30px] font-extrabold leading-tight text-navy sm:text-[36px] sm:leading-[54px]">
            Frequently Asked Questions
          </h2>
        </Reveal>

        <Stagger stagger={0.08} className="mt-16 flex flex-col gap-6">
          {faqs.map((faq) => (
            <StaggerItem key={faq.q}>
              <div className="flex flex-col gap-3 rounded-[20px] border border-border bg-white p-6 sm:p-8">
                <h4 className="text-[18px] font-bold leading-[27px] text-navy">{faq.q}</h4>
                <p className="text-[16px] leading-[24px] text-muted">{faq.a}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
