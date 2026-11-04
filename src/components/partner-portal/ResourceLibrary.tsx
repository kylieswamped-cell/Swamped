"use client";

import { Download, FileText, Mail, MessageSquare, Search, Share2 } from "lucide-react";
import Image from "next/image";
import { useMemo, useState, type ComponentType } from "react";
import { CopyButton, EmptyState } from "./ui";

type Category = "social" | "email" | "text" | "brand";
type Resource = { id: string; category: Category; title: string; description: string; body?: string; download?: { href: string; name: string } };

const CATEGORIES: { value: "" | Category; label: string }[] = [
  { value: "", label: "All Resources" },
  { value: "social", label: "Social Posts" },
  { value: "email", label: "Email Templates" },
  { value: "text", label: "Text Messages" },
  { value: "brand", label: "Logos & Brand Assets" },
];

const BADGE: Record<Category, { label: string; tone: string; icon: ComponentType<{ className?: string }> }> = {
  social: { label: "Social Post", tone: "bg-[#eff6ff] text-[#2563eb]", icon: Share2 },
  email: { label: "Email", tone: "bg-[#f5f3ff] text-[#7c3aed]", icon: Mail },
  text: { label: "Text Message", tone: "bg-[#fff7ed] text-[#ea580c]", icon: MessageSquare },
  brand: { label: "Logos", tone: "bg-[#ecfdf5] text-[#059669]", icon: FileText },
};

/** Copy-ready marketing content; every piece carries the partner's own referral link. */
function resources(url: string): Resource[] {
  return [
    {
      id: "launch",
      category: "social",
      title: "Introduce Swamped",
      description: "A short post for Facebook, LinkedIn, or a contractor group.",
      body: `Contractors: if you're still juggling spreadsheets, paper quotes, and chasing payments, take a look at Swamped. Customers, jobs, quotes, invoices, and payments all in one place, and it's free to start. ${url}`,
    },
    {
      id: "quotes",
      category: "social",
      title: "Faster Quotes",
      description: "Focus on sending professional quotes and getting approvals.",
      body: `Send a professional quote in minutes, let your customer approve it online, and turn it into a job and invoice with a click. That's Swamped. Free for contractors: ${url}`,
    },
    {
      id: "getpaid",
      category: "social",
      title: "Get Paid Faster",
      description: "Focus on deposits, invoices, and payment tracking.",
      body: `Stop chasing payments. Swamped tracks deposits, invoices, and what's still owed so you always know where your money is. Try it free: ${url}`,
    },
    {
      id: "outreach",
      category: "email",
      title: "Outreach Email",
      description: "A friendly note to a contractor you know.",
      body: `Subject: A simpler way to run quotes and invoices\n\nHi [Name],\n\nI wanted to pass along a tool I think you'd like. Swamped keeps your customers, jobs, quotes, invoices, and payments in one place. You can send a quote, have the customer approve it online, and invoice them when the job's done, without a pricey monthly subscription.\n\nYou can set up a free account here: ${url}\n\nHappy to answer any questions.\n\n[Your name]`,
    },
    {
      id: "newsletter",
      category: "email",
      title: "Newsletter Blurb",
      description: "A short paragraph for your newsletter or blog.",
      body: `Tool of the month: Swamped. Built for contractors and small service businesses, Swamped puts customers, jobs, quotes, invoices, and payments in one simple app. It's free to get started: ${url}`,
    },
    {
      id: "sms",
      category: "text",
      title: "Quick Text",
      description: "A one-line message for text or chat.",
      body: `Hey! This is the app I mentioned for quotes and invoices. Free to sign up: ${url}`,
    },
    {
      id: "logo",
      category: "brand",
      title: "Swamped Logo",
      description: "The Swamped logo mark as a PNG with a transparent background.",
      download: { href: "/images/logo.png", name: "swamped-logo.png" },
    },
  ];
}

export default function ResourceLibrary({ url }: { url: string }) {
  const [category, setCategory] = useState<"" | Category>("");
  const [query, setQuery] = useState("");
  const all = useMemo(() => resources(url), [url]);
  const q = query.trim().toLowerCase();
  const shown = all.filter((r) => (!category || r.category === category) && (!q || `${r.title} ${r.description} ${r.body ?? ""}`.toLowerCase().includes(q)));

  return (
    <>
      <div className="flex flex-col gap-3">
        <label className="relative">
          <span className="sr-only">Search resources</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources..."
            className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-[14px] text-navy outline-none placeholder:text-[#94a3b8] focus:border-[#10b981]"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Resource type">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={category === c.value}
              onClick={() => setCategory(c.value)}
              className={`h-8 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
                category === c.value ? "border-navy bg-navy text-white" : "border-line bg-white text-[#475569] hover:border-navy"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white">
          <EmptyState icon={Search} title="No resources match" body="Try a different search or resource type." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((r) => {
            const badge = BADGE[r.category];
            return (
              <article key={r.id} className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <span className={`flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.4px] ${badge.tone}`}>
                  <badge.icon className="size-3" /> {badge.label}
                </span>
                <h3 className="mt-3 text-[16px] font-bold text-navy">{r.title}</h3>
                <p className="mt-1 text-[13px] leading-5 text-[#64748b]">{r.description}</p>
                {r.body && <p className="mt-3 line-clamp-5 flex-1 whitespace-pre-line rounded-lg bg-[#f8fafc] p-3 text-[13px] leading-5 text-[#475569]">{r.body}</p>}
                {r.download && (
                  <div className="mt-3 flex flex-1 items-center justify-center rounded-lg bg-[#f8fafc] py-6">
                    <Image src={r.download.href} alt="" width={56} height={56} className="mix-blend-multiply" />
                  </div>
                )}
                <div className="mt-4">
                  {r.body ? (
                    <CopyButton text={r.body} label={r.category === "email" ? "Copy Template" : "Copy Caption"} className="w-full" />
                  ) : (
                    r.download && (
                      <a href={r.download.href} download={r.download.name} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line text-[14px] font-semibold text-navy transition-colors hover:bg-[#f8fafc]">
                        <Download className="size-4" /> Download
                      </a>
                    )
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
