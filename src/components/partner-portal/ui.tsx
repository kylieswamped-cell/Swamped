"use client";

import { Check, Copy, Info } from "lucide-react";
import { useState, type ComponentType, type ReactNode } from "react";

export function Card({ title, subtitle, action, className = "", children }: { title?: string; subtitle?: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-[17px] font-bold leading-6 text-navy">{title}</h2>}
            {subtitle && <p className="mt-1 text-[13px] leading-5 text-[#64748b]">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  sub,
  help,
}: {
  icon: ComponentType<{ className?: string }>;
  tone: string;
  label: string;
  value: string;
  sub?: ReactNode;
  help?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between">
        <span className={`flex size-10 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="size-5" />
        </span>
        {help && (
          <span title={help} aria-label={help} className="text-[#94a3b8]">
            <Info className="size-4" />
          </span>
        )}
      </div>
      <p className="mt-4 text-[13px] font-medium leading-5 text-[#64748b]">{label}</p>
      <p className="mt-0.5 truncate text-[24px] font-bold leading-8 text-navy">{value}</p>
      {sub && <div className="mt-0.5 text-[12px] leading-4 text-[#64748b]">{sub}</div>}
    </div>
  );
}

export function CopyButton({ text, label, copiedLabel = "Copied!", className = "" }: { text: string; label: string; copiedLabel?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const copy = () =>
    navigator.clipboard.writeText(text).then(
      () => {
        setState("copied");
        setTimeout(() => setState("idle"), 2000);
      },
      () => setState("failed"),
    );
  return (
    <button
      type="button"
      onClick={copy}
      className={`flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#10b981] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#059669] ${className}`}
    >
      {state === "copied" ? <Check className="size-4" /> : <Copy className="size-4" />}
      {state === "copied" ? copiedLabel : state === "failed" ? "Couldn't copy, select the text instead" : label}
    </button>
  );
}

/** The partner's referral link with a copy button. */
export function ReferralLinkBox({ url, stacked = false }: { url: string; stacked?: boolean }) {
  return (
    <div className={`flex gap-3 ${stacked ? "flex-col" : "flex-col sm:flex-row"}`}>
      <input
        readOnly
        value={url}
        aria-label="Your referral link"
        onFocus={(e) => e.currentTarget.select()}
        className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-[#f8fafc] px-4 font-mono text-[13px] text-navy outline-none focus:border-[#10b981]"
      />
      <CopyButton text={url} label="Copy Referral Link" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body }: { icon: ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-[#f1f5f9] text-[#94a3b8]">
        <Icon className="size-6" />
      </span>
      <p className="mt-4 text-[16px] font-semibold text-navy">{title}</p>
      <p className="mt-1 max-w-[420px] text-[14px] leading-5 text-[#64748b]">{body}</p>
    </div>
  );
}

export const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export const longDay = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" });
