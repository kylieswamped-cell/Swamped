"use client";

import { Stagger, StaggerItem } from "../Reveal";

export default function ContactHero() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[900px] px-6 py-20 text-center sm:px-16">
        <Stagger>
          <StaggerItem className="flex justify-center">
            <span className="inline-flex items-center rounded-full bg-[rgba(0,193,133,0.1)] px-4 py-1.5 text-[12px] font-bold uppercase tracking-[1.2px] text-brand">
              Get in Touch
            </span>
          </StaggerItem>

          <StaggerItem className="mt-6">
            <h1 className="text-[32px] font-extrabold leading-[1.15] text-navy sm:text-[48px] sm:leading-[60px]">
              Have Questions About Swamped?
            </h1>
          </StaggerItem>

          <StaggerItem className="mt-6">
            <p className="text-[16px] leading-[1.6] text-muted sm:text-[20px] sm:leading-[32.5px]">
              Whether you&apos;re considering Swamped for your business or
              simply have a question, we&apos;re happy to help. Send us a
              message and a member of our team will get back to you as soon
              as possible.
            </p>
          </StaggerItem>
        </Stagger>
      </div>
    </section>
  );
}
