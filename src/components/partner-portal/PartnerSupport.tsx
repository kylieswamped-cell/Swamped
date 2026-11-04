"use client";

import { ChevronDown, Clock, Send } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { submitPartnerSupport } from "@/lib/partners/actions";
import { PARTNER_SUPPORT_CATEGORIES, PROGRAM } from "@/lib/partners/program";
import { Card } from "./ui";

const field =
  "w-full rounded-xl border border-line bg-[#f8fafc] px-4 text-[14px] text-navy outline-none transition-colors placeholder:text-[#94a3b8] focus:border-[#10b981] focus:bg-white aria-invalid:border-[#ef4444]";

// Partner Help Center FAQ (Figma 926:3225), answered for this program.
const FAQ = [
  {
    q: "How do Partner commissions work?",
    a: `You earn ${PROGRAM.commissionRate}% of the qualifying revenue Swamped earns from each contractor who signs up with your link, for ${PROGRAM.commissionMonths} months from the date they activate their account.`,
  },
  { q: "Why are my commissions still pending?", a: `New commissions are held for ${PROGRAM.holdingDays} days to allow for refunds and payment processing, then become eligible for payout.` },
  { q: "When do I get paid?", a: `Payouts go out on the ${PROGRAM.payoutDay}th of each month once your eligible balance reaches $${PROGRAM.minimumPayout}.` },
  { q: "How do I connect my payout account?", a: "Payouts are sent through Stripe Connect. The Connect Stripe button on Earnings & Payouts opens when partner payouts launch; we'll email you." },
  { q: "Where can I find marketing resources?", a: "Open Marketing Resources in the menu for ready-to-copy posts, email templates, and the Swamped logo. Every caption already includes your referral link." },
  { q: "How do I update my Partner information?", a: "Go to Settings to change your name, partner email, business details, and notification choices." },
  {
    q: "How do I know if someone signed up using my referral link?",
    a: "They appear in Recent Activity on your Dashboard as soon as they sign up, and again as Referral Activated once they finish setting up their account.",
  },
];

export default function PartnerSupport() {
  const [v, setV] = useState({ category: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ error?: string; notice?: string }>({});
  const [open, setOpen] = useState<number | null>(0);
  const [pending, startTransition] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setStatus({});
    startTransition(async () => {
      const r = await submitPartnerSupport(v);
      setErrors(r.fieldErrors ?? {});
      if (r.ok) {
        setV({ category: "", subject: "", message: "" });
        setStatus({ notice: "Thanks! Your ticket was sent. We'll reply by email, usually within 24 hours." });
      } else if (r.error) setStatus({ error: r.error });
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
      <Card title="Submit a Support Ticket" subtitle="Have questions or suggestions? Our team is here to help.">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-[#334155]">Inquiry Category</span>
            <span className="relative block">
              <select value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} aria-invalid={!!errors.category} className={`${field} h-11 appearance-none pr-10`}>
                <option value="">Select a category...</option>
                {PARTNER_SUPPORT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
            </span>
            {errors.category && <span className="mt-1 block text-[12px] text-[#dc2626]">{errors.category}</span>}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-[#334155]">Subject</span>
            <input value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} maxLength={200} placeholder="e.g., Question about a referral" aria-invalid={!!errors.subject} className={`${field} h-11`} />
            {errors.subject && <span className="mt-1 block text-[12px] text-[#dc2626]">{errors.subject}</span>}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-[#334155]">How can we help you?</span>
            <textarea value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} maxLength={5000} rows={6} placeholder="Please describe your question in detail..." aria-invalid={!!errors.message} className={`${field} resize-y py-3 leading-5`} />
            {errors.message && <span className="mt-1 block text-[12px] text-[#dc2626]">{errors.message}</span>}
          </label>
          {(status.error || status.notice) && (
            <p role={status.error ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-[13px] ${status.error ? "bg-[#fef2f2] text-[#b91c1c]" : "bg-[#ecfdf5] text-[#047857]"}`}>
              {status.error ?? status.notice}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[12px] text-[#94a3b8]">
              <Clock className="size-3.5" /> Average response time: 24 hours
            </span>
            <button type="submit" disabled={pending} className="flex h-11 items-center gap-2 rounded-xl bg-[#10b981] px-6 text-[14px] font-semibold text-white transition-colors hover:bg-[#059669] disabled:opacity-60">
              {pending ? "Sending…" : "Submit Ticket"} <Send className="size-4" />
            </button>
          </div>
        </form>
      </Card>

      <section>
        <h2 className="mb-3 text-[17px] font-bold text-navy">Frequently Asked Questions</h2>
        <ul className="flex flex-col gap-3">
          {FAQ.map((f, i) => (
            <li key={f.q} className="rounded-xl border border-line bg-white">
              <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[14px] font-semibold text-navy">
                {f.q}
                <ChevronDown className={`size-4 shrink-0 text-[#94a3b8] transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && <p className="px-4 pb-4 text-[13px] leading-5 text-[#64748b]">{f.a}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
