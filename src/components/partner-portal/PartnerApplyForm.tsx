"use client";

import { ChevronDown, MailCheck } from "lucide-react";
import Link from "next/link";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import PasswordInput from "@/components/auth/PasswordInput";
import { signUpAsPartner } from "@/lib/auth/actions";
import { PARTNER_TYPES } from "@/lib/partners/options";

const input =
  "h-12 w-full rounded-xl border border-line bg-[#f8fafc] px-4 text-[15px] text-navy outline-none transition-colors placeholder:text-[#94a3b8] focus:border-brand focus:bg-white aria-invalid:border-[#ef4444]";

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
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

/** Partner application for people without a Swamped account: creates their partner login too. */
export default function PartnerApplyForm() {
  const [v, setV] = useState({ fullName: "", email: "", password: "", businessName: "", partnerType: "", audience: "", agreed: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV((s) => ({ ...s, [k]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const r = await signUpAsPartner(v);
      setErrors(r.fieldErrors ?? {});
      if (r.error) setError(r.error);
      if (r.needsVerification) setSentTo(v.email.trim());
    });
  };

  if (sentTo) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-[#ecfdf5] text-[#059669]">
          <MailCheck className="size-8" />
        </span>
        <h2 className="mt-5 text-[22px] font-bold text-navy">Check your email</h2>
        <p className="mt-3 max-w-[380px] text-[15px] leading-[1.6] text-[#64748b]">
          We sent a confirmation link to <strong className="text-navy">{sentTo}</strong>. Confirm your email to submit your application and open your partner portal.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Full Name" error={errors.fullName}>
          <input value={v.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Jane Doe" autoComplete="name" aria-invalid={!!errors.fullName} className={input} />
        </Field>
        <Field label="Business Name" hint="Optional">
          <input value={v.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder="Acme Marketing" autoComplete="organization" className={input} />
        </Field>
      </div>
      <Field label="Email Address" error={errors.email}>
        <input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@example.com" autoComplete="email" aria-invalid={!!errors.email} className={input} />
      </Field>
      <Field label="Create a Password" hint="At least 8 characters" error={errors.password}>
        <PasswordInput value={v.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" placeholder="••••••••" aria-invalid={!!errors.password} className={input} />
      </Field>
      <Field label="Partner Type" error={errors.partnerType}>
        <span className="relative block">
          <select value={v.partnerType} onChange={(e) => set("partnerType", e.target.value)} aria-invalid={!!errors.partnerType} className={`${input} appearance-none pr-10`}>
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
          value={v.audience}
          onChange={(e) => set("audience", e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="e.g. I run a Facebook group for local contractors, or I'll refer the trade partners I work with."
          className={`${input} h-auto resize-y py-3 leading-6`}
        />
      </Field>
      <div>
        <label className="flex items-start gap-3 text-[14px] leading-5 text-[#475569]">
          <input type="checkbox" checked={v.agreed} onChange={(e) => set("agreed", e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[#0481ff]" aria-invalid={!!errors.terms} />
          <span>
            I agree to the Partner Program terms and the Swamped{" "}
            <Link href="/terms" target="_blank" className="font-semibold text-brand hover:text-brand-dark">
              Terms of Service
            </Link>
            .
          </span>
        </label>
        {errors.terms && <span className="mt-1.5 block text-[13px] text-[#dc2626]">{errors.terms}</span>}
      </div>
      {error && <p role="alert" className="rounded-lg bg-[#fef2f2] px-4 py-3 text-[14px] text-[#b91c1c]">{error}</p>}
      <button type="submit" disabled={pending} className="h-12 rounded-xl bg-brand text-[16px] font-bold text-white shadow-[0_10px_15px_-3px_rgba(4,129,255,0.2)] transition-colors hover:bg-brand-dark disabled:opacity-60">
        {pending ? "Submitting…" : "Apply to Partner Program"}
      </button>
      <p className="text-center text-[14px] text-[#64748b]">
        Already a partner?{" "}
        <Link href="/partner/login" className="font-semibold text-brand hover:text-brand-dark">
          Log in
        </Link>
      </p>
    </form>
  );
}
