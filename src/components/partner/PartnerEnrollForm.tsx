"use client";

import { Briefcase, ChevronDown, Mail, User } from "lucide-react";
import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { applyToPartnerProgram, type PartnerResult } from "@/lib/partners/actions";
import { PARTNER_TYPES } from "@/lib/partners/options";

const input =
  "h-12 w-full rounded-xl border border-line bg-[#f8fafc] pl-11 pr-4 text-[15px] text-navy outline-none transition-colors placeholder:text-[#94a3b8] focus:border-brand focus:bg-white aria-invalid:border-[#ef4444]";

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between text-[14px] font-semibold text-navy">
        {label}
        {hint && <span className="text-[12px] font-normal text-[#94a3b8]">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-[13px] text-[#dc2626]">{error}</span>}
    </label>
  );
}

export default function PartnerEnrollForm({
  defaults,
}: {
  defaults: { fullName: string; email: string; businessName: string };
}) {
  const [state, action, pending] = useActionState<PartnerResult, FormData>(applyToPartnerProgram, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <Field label="Full Name" error={fe.fullName}>
        <span className="relative block">
          <User className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
          <input name="fullName" defaultValue={defaults.fullName} placeholder="Jane Doe" autoComplete="name" aria-invalid={!!fe.fullName} className={input} />
        </span>
      </Field>

      <Field label="Email Address" hint="Where we'll send partner updates" error={fe.email}>
        <span className="relative block">
          <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
          <input name="email" type="email" defaultValue={defaults.email} placeholder="jane@example.com" autoComplete="email" aria-invalid={!!fe.email} className={input} />
        </span>
      </Field>

      <Field label="Business Name" hint="Optional">
        <span className="relative block">
          <Briefcase className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
          <input name="businessName" defaultValue={defaults.businessName} placeholder="Acme Plumbing" autoComplete="organization" className={input} />
        </span>
      </Field>

      <Field label="Partner Type" error={fe.partnerType}>
        <span className="relative block">
          <select name="partnerType" defaultValue="" aria-invalid={!!fe.partnerType} className={`${input} appearance-none pl-4 pr-10`}>
            <option value="" disabled>
              Which best describes you?
            </option>
            {PARTNER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
        </span>
      </Field>

      <Field label="How will you share Swamped?" hint="Optional">
        <textarea
          name="audience"
          rows={3}
          maxLength={2000}
          placeholder="e.g. I run a Facebook group for local contractors, or I'll refer the trade partners I work with."
          className="w-full resize-y rounded-xl border border-line bg-[#f8fafc] px-4 py-3 text-[15px] leading-6 text-navy outline-none transition-colors placeholder:text-[#94a3b8] focus:border-brand focus:bg-white"
        />
      </Field>

      <div>
        <label className="flex items-start gap-3 text-[14px] leading-5 text-[#475569]">
          <input name="terms" type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[#0481ff]" aria-invalid={!!fe.terms} />
          <span>
            I agree to the Partner Program terms and the Swamped{" "}
            <Link href="/terms" target="_blank" className="font-semibold text-brand hover:text-brand-dark">
              Terms of Service
            </Link>
            .
          </span>
        </label>
        {fe.terms && <span className="mt-1.5 block text-[13px] text-[#dc2626]">{fe.terms}</span>}
      </div>

      {state.error && <p className="rounded-lg bg-[#fef2f2] px-4 py-3 text-[14px] text-[#b91c1c]">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-xl bg-brand text-[16px] font-bold text-white shadow-[0_10px_15px_-3px_rgba(4,129,255,0.2)] transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Apply to Partner Program"}
      </button>
    </form>
  );
}
