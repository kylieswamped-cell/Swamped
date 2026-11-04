"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { updatePartnerSettings } from "@/lib/partners/actions";
import { PARTNER_TYPES } from "@/lib/partners/options";
import type { Partner } from "@/lib/partners/server";
import { Card } from "./ui";

const input =
  "h-11 w-full rounded-xl border border-line bg-white px-4 text-[14px] text-navy outline-none transition-colors placeholder:text-[#94a3b8] focus:border-[#10b981] aria-invalid:border-[#ef4444] read-only:bg-[#f8fafc] read-only:text-[#64748b]";

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2 text-[13px] font-semibold text-[#334155]">
        {label}
        {hint && <span className="text-[12px] font-normal text-[#94a3b8]">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-[12px] text-[#dc2626]">{error}</span>}
    </label>
  );
}

function Switch({ checked, onChange, label, body }: { checked: boolean; onChange: (v: boolean) => void; label: string; body: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-line px-4 py-3">
      <span>
        <span className="block text-[14px] font-semibold text-navy">{label}</span>
        <span className="mt-0.5 block text-[13px] leading-5 text-[#64748b]">{body}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#10b981] ${checked ? "bg-[#10b981]" : "bg-line"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </span>
    </label>
  );
}

export default function PartnerSettingsForm({ partner, loginEmail }: { partner: Partner; loginEmail: string }) {
  const initial = {
    fullName: partner.fullName,
    email: partner.email,
    businessName: partner.businessName ?? "",
    phone: partner.phone ?? "",
    website: partner.website ?? "",
    audience: partner.audience ?? "",
    notifySignups: partner.notifySignups,
    notifyPayouts: partner.notifyPayouts,
  };
  const [saved, setSaved] = useState(initial);
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ error?: string; notice?: string }>({});
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV((s) => ({ ...s, [k]: value }));
  const dirty = JSON.stringify(v) !== JSON.stringify(saved);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setStatus({});
    startTransition(async () => {
      const r = await updatePartnerSettings(v);
      setErrors(r.fieldErrors ?? {});
      if (r.ok) {
        setSaved(v);
        setStatus({ notice: "Settings saved." });
      } else if (r.error) setStatus({ error: r.error });
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <Card title="Partner Profile" subtitle="How we know you and where we send partner updates.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name" error={errors.fullName}>
            <input value={v.fullName} onChange={(e) => set("fullName", e.target.value)} maxLength={120} autoComplete="name" aria-invalid={!!errors.fullName} className={input} />
          </Field>
          <Field label="Partner Email" hint="For partner updates" error={errors.email}>
            <input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} maxLength={254} autoComplete="email" aria-invalid={!!errors.email} className={input} />
          </Field>
          <Field label="Business Name" hint="Optional">
            <input value={v.businessName} onChange={(e) => set("businessName", e.target.value)} maxLength={200} autoComplete="organization" className={input} />
          </Field>
          <Field label="Phone" hint="Optional">
            <input type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} maxLength={40} autoComplete="tel" className={input} />
          </Field>
          <Field label="Website or Social Profile" hint="Optional" error={errors.website}>
            <input value={v.website} onChange={(e) => set("website", e.target.value)} maxLength={300} placeholder="https://" aria-invalid={!!errors.website} className={input} />
          </Field>
          <Field label="Partner Type" hint="Contact Support to change">
            <input readOnly value={PARTNER_TYPES.find((t) => t.value === partner.partnerType)?.label ?? "Other"} className={input} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="How You Share Swamped" hint="Optional">
              <textarea value={v.audience} onChange={(e) => set("audience", e.target.value)} maxLength={2000} rows={3} className={`${input} h-auto resize-y py-3 leading-5`} />
            </Field>
          </div>
        </div>
      </Card>

      <Card title="Notifications" subtitle="Partner emails start once Swamped email delivery is switched on.">
        <div className="flex flex-col gap-3">
          <Switch checked={v.notifySignups} onChange={(c) => set("notifySignups", c)} label="Referral activity" body="Email me when someone signs up with my link and when a referral activates." />
          <Switch checked={v.notifyPayouts} onChange={(c) => set("notifyPayouts", c)} label="Commissions & payouts" body="Email me when a payout is sent or needs attention." />
        </div>
      </Card>

      <Card title="Login & Security">
        <dl className="grid grid-cols-1 gap-4 text-[14px] sm:grid-cols-2">
          <div>
            <dt className="text-[13px] font-semibold text-[#334155]">Login Email</dt>
            <dd className="mt-1 text-navy">{loginEmail}</dd>
          </div>
          <div>
            <dt className="text-[13px] font-semibold text-[#334155]">Referral Code</dt>
            <dd className="mt-1 font-mono text-navy">{partner.referralCode}</dd>
          </div>
        </dl>
        <Link href="/partner/login?view=forgot-password" className="mt-4 inline-block text-[14px] font-semibold text-[#059669] hover:underline">
          Change password
        </Link>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        {(status.error || status.notice) && (
          <p role={status.error ? "alert" : "status"} className={`text-[14px] sm:mr-auto ${status.error ? "text-[#dc2626]" : "text-[#059669]"}`}>
            {status.error ?? status.notice}
          </p>
        )}
        <button type="button" disabled={!dirty || pending} onClick={() => (setV(saved), setErrors({}))} className="h-11 rounded-xl border border-line px-6 text-[14px] font-semibold text-[#475569] hover:bg-[#f8fafc] disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={!dirty || pending} className="h-11 rounded-xl bg-[#10b981] px-6 text-[14px] font-semibold text-white transition-colors hover:bg-[#059669] disabled:opacity-60">
          {pending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
