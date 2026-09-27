"use client";

import Image from "next/image";
import { Stagger, StaggerItem } from "./Reveal";

const items = [
  { icon: "/icons/strip-contractors.svg", label: "Built for Contractors" },
  { icon: "/icons/strip-stripe.svg", label: "Powered by Stripe" },
  { icon: "/icons/strip-mobile.svg", label: "Mobile Friendly" },
  { icon: "/icons/strip-nofees.svg", label: "No Monthly Fees" },
];

export default function LogoStrip() {
  return (
    <section className="border-y border-border bg-surface">
      <Stagger
        stagger={0.08}
        className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-center gap-x-14 gap-y-6 px-6 py-8 sm:px-16"
      >
        {items.map((item) => (
          <StaggerItem key={item.label} y={12}>
            <div className="flex items-center gap-3">
              <Image src={item.icon} alt="" width={20} height={20} />
              <span className="text-[14px] font-bold uppercase tracking-[1.4px] text-muted-light">
                {item.label}
              </span>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
