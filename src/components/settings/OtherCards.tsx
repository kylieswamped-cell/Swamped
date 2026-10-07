"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { saveCommunicationPrefs, saveEmailTemplate, saveNotificationPrefs, savePayoutSettings } from "@/lib/settings/actions";
import type { SettingsData } from "@/lib/settings/data";
import { COMMUNICATIONS, NOTIFICATIONS, PAYOUT_SCHEDULES } from "@/lib/settings/options";
import { DEFAULT_TEMPLATES, type EmailTemplate } from "@/lib/settings/templates";
import { RefundTemplateFields } from "./TemplateEditor";
import { CardFooter, FieldError, SettingsCard, StatusLine, Toggle, type Status } from "./ui";
import { useSettingsForm } from "./useSettingsForm";

const STRIPE_NOT_READY = "Stripe Connect is coming soon.";

/** Banner at the top of Settings with the Stripe connection state. */
export function StripeStatusCard({ connected }: { connected: boolean }) {
  return (
    <section className="flex flex-col gap-6 rounded-[16px] border border-[#e2e8f0] bg-white p-5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] sm:p-8 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-5 sm:items-center">
        <Image src="/settings/stripe-logo.svg" alt="Stripe" width={37.5} height={30} className="ml-1 mt-1 shrink-0 sm:mt-0" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[18px] font-bold leading-7 text-[#0f172a]">Stripe Connection Status</h2>
            <span
              className={`inline-flex h-5 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold leading-4 ${
                connected ? "bg-[#d1fae5] text-[#047857]" : "bg-[#f1f5f9] text-[#475569]"
              }`}
            >
              <span className={`size-1.5 rounded-full ${connected ? "bg-[#10b981]" : "bg-[#94a3b8]"}`} />
              {connected ? "Connected" : "Not Connected"}
            </span>
          </div>
          <p className="text-[14px] leading-5 text-[#64748b]">
            {connected
              ? "Your account is successfully linked to Stripe for handling payments and payouts."
              : "Connect Stripe to accept card payments and receive payouts. Stripe Connect is coming soon."}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-3">
        <button
          type="button"
          disabled
          title={STRIPE_NOT_READY}
          className="h-11 rounded-[12px] border border-[#e2e8f0] px-5 text-[16px] font-semibold text-[#334155] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Open Stripe Dashboard
        </button>
        <button
          type="button"
          disabled
          title={STRIPE_NOT_READY}
          className="h-11 rounded-[12px] bg-[#0f172a] px-5 text-[16px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {connected ? "Reconnect Stripe" : "Connect Stripe"}
        </button>
      </div>
    </section>
  );
}

export function RefundCard({ template }: { template: EmailTemplate }) {
  const form = useSettingsForm({ refund: template }, (v) => saveEmailTemplate("refund", v.refund));
  return (
    <SettingsCard
      id="refunds"
      title="Refund Settings"
      titleClass="text-[20px] font-semibold leading-5 tracking-[-0.08px] text-[#0f172a]"
      subtitle="Manage your automated refund receipt templates sent to customers."
      className="border-[rgba(226,232,240,0.6)]! shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
    >
      <form onSubmit={form.submit} noValidate>
        <RefundTemplateFields value={form.values.refund} onChange={(t) => form.set("refund", t)} errors={form.errors} />
        <div className="mt-8 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-end">
          <StatusLine status={form.status} className="sm:mr-auto" />
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => form.set("refund", DEFAULT_TEMPLATES.refund)}
              className="h-[41px] flex-1 rounded-[12px] border border-[#e2e8f0] bg-white px-6 text-[14px] font-bold tracking-[-0.16px] text-[#64748b] transition-colors hover:bg-[#f8fafc] sm:flex-none"
            >
              Reset to Default
            </button>
            <button
              type="submit"
              disabled={form.pending}
              className="h-[41px] flex-1 rounded-[12px] bg-[#00c185] px-8 text-[14px] font-bold tracking-[-0.16px] text-white shadow-[0_2px_8px_rgba(0,193,133,0.25)] transition-colors hover:bg-[#00ad77] disabled:opacity-60 sm:flex-none"
            >
              {form.pending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </SettingsCard>
  );
}

export function NotificationsCard({ prefs }: { prefs: Record<string, boolean> }) {
  const form = useSettingsForm(prefs, saveNotificationPrefs);
  return (
    <SettingsCard
      id="notifications"
      title="Notification Settings"
      titleClass="text-[16px] font-semibold leading-6 text-[#0f172a]"
      subtitle="These notifications control email alerts. In-app notifications remain enabled."
      className="border-[rgba(226,232,240,0.6)]!"
    >
      <form onSubmit={form.submit} noValidate>
        <ul>
          {NOTIFICATIONS.map((n, i) => (
            <li key={n.key} className={`flex h-[52px] items-center justify-between ${i ? "border-t border-[#f1f5f9]" : ""}`}>
              <span className="text-[14px] font-medium leading-5 text-[#0f172a]">{n.label}</span>
              <Toggle size="notify" checked={form.values[n.key]} onChange={(c) => form.set(n.key, c)} label={`${n.label} emails`} />
            </li>
          ))}
        </ul>
        <CardFooter
          pending={form.pending}
          dirty={form.dirty}
          onCancel={form.cancel}
          status={form.status}
          hideCancel
          compact
          className="mt-6 border-t border-[#f1f5f9] pt-2"
        />
      </form>
    </SettingsCard>
  );
}

/** Marketing preferences save as soon as a switch is flipped (the design has no Save button). */
export function CommunicationCard({ prefs }: { prefs: Record<string, boolean> }) {
  const [values, setValues] = useState(prefs);
  const [status, setStatus] = useState<Status>(null);
  const [, startTransition] = useTransition();

  function toggle(key: string, on: boolean) {
    const previous = values;
    const next = { ...values, [key]: on };
    setValues(next);
    setStatus(null);
    startTransition(async () => {
      const result = await saveCommunicationPrefs(next);
      if (result.error) {
        setValues(previous);
        setStatus({ error: result.error });
      } else setStatus({ notice: "Preferences saved." });
    });
  }

  return (
    <SettingsCard
      id="communication"
      title="Communication Preferences"
      titleClass="text-[16px] font-semibold leading-6 text-[#0f172a]"
      subtitle="Marketing communication preferences."
      className="rounded-[12px]! border-[rgba(226,232,240,0.6)]!"
    >
      <ul className="flex flex-col gap-4">
        {COMMUNICATIONS.map((c, i) => (
          <li
            key={c.key}
            className={`flex h-9 items-center justify-between ${i < COMMUNICATIONS.length - 1 ? "border-b border-[#f8fafc]" : ""}`}
          >
            <span className="text-[14px] font-medium leading-5 text-[#334155]">{c.label}</span>
            <Toggle size="sm" checked={values[c.key]} onChange={(on) => toggle(c.key, on)} label={c.label} />
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#f1f5f9] pt-4">
        <p className="flex items-center gap-2 text-[12px] leading-[19.5px] text-[#94a3b8]">
          <Image src="/settings/comm-info.svg" alt="" width={12} height={12} />
          Required account, billing, security, and operational emails cannot be disabled.
        </p>
        <StatusLine status={status} className="text-[12px]" />
      </div>
    </SettingsCard>
  );
}

const payoutLabel = "text-[14px] font-bold leading-[21px] tracking-[-0.35px] text-[#0f172a]";

export function PayoutCard({ data }: { data: SettingsData["stripe"] }) {
  const form = useSettingsForm({ schedule: data.schedule as string, minimum: data.minimum }, savePayoutSettings);
  const { values: v, set, errors } = form;
  const tiles = ["Available Balance", "Pending Balance", "Next Payout Date", "Next Payout Amount"];

  return (
    <SettingsCard
      id="payouts"
      title="Stripe & Payout Settings"
      titleClass="text-[20px] font-bold leading-7 tracking-[0.04px] text-[#0f172a]"
      subtitle="Configure how and when you receive your funds."
      className="border-transparent!"
      aside={
        <span
          className={`flex h-9 items-center gap-3 rounded-full border px-4 text-[12px] font-bold uppercase leading-4 tracking-[0.6px] ${
            data.connected ? "border-[#ccfbf1] bg-[#f0fdfa] text-[#115e59]" : "border-[#e2e8f0] bg-[#f8fafc] text-[#64748b]"
          }`}
        >
          <Image src="/settings/stripe-wordmark.svg" alt="Stripe" width={25} height={10.3} />
          {data.connected ? "Linked / Active" : "Not Linked"}
        </span>
      }
    >
      <form onSubmit={form.submit} noValidate className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-[12px] border border-[#f3f4f6] bg-[#f9fafb] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-10 w-11 shrink-0 items-center justify-center rounded-[8px] bg-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
              <Image src="/settings/link.svg" alt="" width={18.88} height={14.69} />
            </span>
            <div>
              <p className="text-[16px] font-semibold leading-6 text-[#0f172a]">Stripe Payout Connection</p>
              <p className="text-[12px] leading-4 text-[#6b7280]">
                {data.connected && data.connectedAt
                  ? `Connected ${new Date(data.connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                  : "No Stripe account connected yet."}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled
            title={STRIPE_NOT_READY}
            className="h-[37px] rounded-[8px] border border-[#d1d5db] bg-white px-4 text-[14px] font-semibold text-[#4b5563] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Manage Stripe
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="payoutSchedule" className={payoutLabel}>
            Payout Schedule Preference
          </label>
          <div className="relative">
            <select
              id="payoutSchedule"
              value={v.schedule}
              onChange={(e) => set("schedule", e.target.value)}
              className="h-12 w-full appearance-none rounded-[8px] border border-[#e5e7eb] bg-white px-4 pr-10 text-[16px] text-[#111827] outline-none focus:border-[#10b981]"
            >
              {PAYOUT_SCHEDULES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <Image src="/settings/select-chevron-lg.svg" alt="" width={14} height={8} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
          </div>
          <FieldError id="payoutSchedule-error" message={errors.schedule} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="payoutMinimum" className={payoutLabel}>
            Payout Preferences &amp; Thresholds
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[16px] text-[#9ca3af]">$</span>
            <input
              id="payoutMinimum"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={Number.isNaN(v.minimum) ? "" : v.minimum}
              onChange={(e) => set("minimum", e.target.value === "" ? NaN : Number(e.target.value))}
              aria-invalid={errors.minimum ? true : undefined}
              className="h-12 w-full rounded-[8px] border border-[#e5e7eb] bg-white pl-[31px] pr-24 text-[16px] tracking-[0.13px] text-[#111827] outline-none focus:border-[#10b981] aria-invalid:border-[#ef4444]"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold tracking-[1.2px] text-[#9ca3af]">
              USD MIN
            </span>
          </div>
          <FieldError id="payoutMinimum-error" message={errors.minimum} />
        </div>

        <div className="flex flex-col gap-2">
          <span className={payoutLabel}>Payout Account Information</span>
          <div className="flex h-12 items-center justify-between rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb] px-4 text-[16px] text-[#6b7280]">
            {data.connected ? "Managed in Stripe" : "No payout account connected"}
            <Image src="/settings/lock.svg" alt="" width={14} height={16} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[14px] font-bold leading-5 text-[#0f172a]">Payout Visibility</span>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {tiles.map((t) => (
              <div key={t} className="rounded-[12px] border border-[#f1f5f9] bg-[rgba(248,250,252,0.5)] p-4">
                <p className="text-[12px] font-medium uppercase leading-4 tracking-[0.6px] text-[#64748b]">{t}</p>
                <p className="mt-1 text-[18px] font-bold leading-7 text-[#0f172a]">—</p>
              </div>
            ))}
          </div>
        </div>

        <CardFooter
          pending={form.pending}
          dirty={form.dirty}
          onCancel={form.cancel}
          status={form.status}
          hideCancel
          compact
          className="mt-2 border-t border-[#f3f4f6] pt-6"
        />
      </form>
    </SettingsCard>
  );
}
