import Link from "next/link";
import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";

export type LegalSection = { heading: string; body: ReactNode };

export default function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <section className="bg-surface">
          <div className="mx-auto max-w-[800px] px-6 py-16 sm:px-16 sm:py-20">
            <h1 className="text-[36px] font-extrabold leading-[1.1] text-navy sm:text-[48px]">{title}</h1>
            <p className="mt-4 text-[14px] font-semibold text-muted">Last updated {updated}</p>
          </div>
        </section>

        <article className="mx-auto max-w-[800px] px-6 py-14 text-[16px] leading-[1.7] text-[#334155] sm:px-16">
          <div className="flex flex-col gap-4">{intro}</div>
          {sections.map((s, i) => (
            <section key={s.heading} className="mt-10">
              <h2 className="text-[20px] font-bold text-navy">
                {i + 1}. {s.heading}
              </h2>
              <div className="mt-3 flex flex-col gap-3 [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2">
                {s.body}
              </div>
            </section>
          ))}
          <p className="mt-12 border-t border-line pt-8 text-[14px] text-muted">
            Questions? Reach us through our{" "}
            <Link href="/contact" className="font-semibold text-brand hover:text-brand-dark">
              contact page
            </Link>
            .
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}
