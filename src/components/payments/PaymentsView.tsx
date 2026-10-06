"use client";

import { Ellipsis } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type RefObject } from "react";
import { useLocalTime } from "@/components/jobs/format";
import { resendReceipt } from "@/lib/payments/actions";
import {
  METHOD_FILTERS,
  STATUS_FILTERS,
  TYPE_FILTERS,
  type PaymentStats,
  type TransactionRow,
  type TransactionStatus,
  type TransactionType,
} from "@/lib/payments/data";
import { formatMoney } from "@/lib/quotes/totals";
import PaymentStatusBadge from "./PaymentStatusBadge";

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

/** The Figma filter select: a pale box with an uppercase label and a checkbox menu. */
function FilterSelect<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative min-w-0 flex-1 sm:w-[177px] sm:flex-none">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`flex h-[38px] w-full items-center justify-between gap-2 rounded-xl border px-4 transition-colors ${
          selected.length ? "border-[#00c185] bg-[#ecfdf5]" : "border-[#e2e8f0] bg-[#f8fafc] hover:bg-white"
        }`}
      >
        <span className={`truncate text-[11px] font-semibold uppercase leading-[16.5px] tracking-[0.55px] ${selected.length ? "text-[#0f172a]" : "text-[#9ca3af]"}`}>
          {label}
          {selected.length > 0 && ` (${selected.length})`}
        </span>
        <Image src="/payments/filter-chevron.svg" alt="" width={12} height={12} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-[224px] rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_10px_-6px_rgba(0,0,0,0.1),0_20px_25px_-5px_rgba(0,0,0,0.1)]">
          <div className="flex flex-col gap-3">
            {options.map((o) => {
              const checked = selected.includes(o.value);
              return (
                <label key={o.value} className="flex h-5 cursor-pointer items-center gap-3 text-[14px] leading-5">
                  <input type="checkbox" checked={checked} onChange={() => onToggle(o.value)} className="size-4 accent-[#0075ff]" />
                  <span className={checked ? "font-semibold text-[#1e293b]" : "text-[#475569]"}>{o.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, value, onRemove }: { label: string; value: string; onRemove: () => void }) {
  return (
    <span className="flex h-8 items-center gap-2 rounded-full border border-[#e2e8f0] bg-white pl-3 pr-2 text-[12px] leading-4 drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
      <span className="text-[#64748b]">{label}:</span>
      <span className="font-semibold text-[#1e293b]">{value}</span>
      <button type="button" onClick={onRemove} aria-label={`Remove ${label} filter`} className="flex size-5 items-center justify-center rounded-full hover:bg-[#f1f5f9]">
        <Image src="/payments/chip-x.svg" alt="" width={7.5} height={10} />
      </button>
    </span>
  );
}

/** The Figma "Transaction Options" menu on each row. */
function RowActions({ row, onResult }: { row: TransactionRow; onResult: (message: { error?: string; notice?: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useDismiss(open, () => setOpen(false));
  // Invoices still awaiting payment have nothing to send yet.
  if (!row.receipt) return null;
  const { kind, id } = row.receipt;

  const resend = () =>
    startTransition(async () => {
      setOpen(false);
      const result = await resendReceipt(kind, id);
      onResult(result.error ? { error: result.error } : { notice: `Receipt sent to ${result.sentTo}.` });
    });

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Options for ${row.number}`}
        disabled={pending}
        onClick={() => setOpen(!open)}
        className="flex size-8 items-center justify-center rounded-lg text-[#94a3b8] transition-colors hover:bg-[#f1f5f9] hover:text-[#475569] disabled:opacity-50"
      >
        <Ellipsis className="size-4" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+4px)] z-30 flex w-[240px] flex-col items-center rounded-2xl border border-[#f3f4f6] bg-white py-2 text-left shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)]">
          <p className="w-full border-b border-[#f3f4f6] px-4 py-2 text-[11px] font-bold uppercase leading-[16.5px] tracking-[0.275px] text-[#9ca3af]">Transaction Options</p>
          <button
            type="button"
            role="menuitem"
            onClick={resend}
            className="mt-1 flex w-[222px] items-center gap-3 rounded-lg px-3 pb-2 pt-3 transition-colors hover:bg-[#f9fafb]"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#eff6ff]">
              <Image src="/payments/send.svg" alt="" width={14} height={14} />
            </span>
            <span className="text-[14px] font-bold leading-[21px] text-[#0a1b33]">{kind === "refund" ? "Resend Refund Receipt" : "Resend Receipt"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

const AVATAR_TONES = ["bg-[#dbeafe] text-[#2563eb]", "bg-[#f1f5f9] text-[#475569]", "bg-[#dcfce7] text-[#15803d]", "bg-[#fef3c7] text-[#b45309]"];

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const tone = (name: string) => AVATAR_TONES[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_TONES.length];

const dayLabel = (d: string, withYear = false) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: withYear ? "numeric" : undefined, timeZone: "UTC" });

const statCard = "flex h-[144px] flex-col rounded-[24px] border border-[#f3f4f6] bg-white px-[31px] pt-[31px] drop-shadow-[0_4px_10px_rgba(0,0,0,0.03)]";

export default function PaymentsView({ transactions, stats }: { transactions: TransactionRow[]; stats: PaymentStats; now: number }) {
  const router = useRouter();
  const local = useLocalTime();
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<TransactionType[]>([]);
  const [methods, setMethods] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<TransactionStatus[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState<{ error?: string; notice?: string }>({});
  const fromInput = useRef<HTMLInputElement>(null);
  const toInput = useRef<HTMLInputElement>(null);

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/[$,]/g, "");
    return transactions.filter((row) => {
      if (types.length && !types.includes(row.type)) return false;
      if (methods.length && !methods.includes(row.channel)) return false;
      if (statuses.length && !statuses.includes(row.status)) return false;
      if (from && row.date < from) return false;
      if (to && row.date > to) return false;
      if (!q) return true;
      return [row.number, row.customer, row.customerEmail, row.related?.label, row.method, Math.abs(row.amount).toFixed(2)].some((v) => v?.toLowerCase().includes(q));
    });
  }, [transactions, query, types, methods, statuses, from, to]);

  const labelOf = <T extends string>(options: { value: T; label: string }[], values: T[]) => values.map((v) => options.find((o) => o.value === v)?.label).join(", ");
  const range = from || to ? `${from ? dayLabel(from) : "Any"} - ${to ? dayLabel(to) : "Today"}` : "";
  const chips = [
    ...(types.length ? [{ key: "t", label: "Type", value: labelOf(TYPE_FILTERS, types), remove: () => setTypes([]) }] : []),
    ...(methods.length ? [{ key: "m", label: "Method", value: labelOf(METHOD_FILTERS, methods), remove: () => setMethods([]) }] : []),
    ...(statuses.length ? [{ key: "s", label: "Status", value: labelOf(STATUS_FILTERS, statuses), remove: () => setStatuses([]) }] : []),
    ...(range ? [{ key: "r", label: "Range", value: range, remove: () => (setFrom(""), setTo("")) }] : []),
  ];

  const cards = [
    { label: "Total Revenue (Last 30 Days)", value: formatMoney(stats.revenue30d) },
    { label: "Outstanding Balance", value: formatMoney(stats.outstanding) },
    { label: "Upcoming Payouts", value: formatMoney(stats.upcomingPayouts), hint: "Connect Stripe" },
    { label: "Next Payout", value: formatMoney(stats.nextPayout), hint: "Connect Stripe" },
  ];

  const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: local ? undefined : "UTC" });

  const dateBox = (value: string, set: (v: string) => void, input: RefObject<HTMLInputElement | null>, placeholder: string, label: string) => (
    <label className="relative flex min-w-0 flex-1 cursor-pointer items-center">
      <span className="sr-only">{label}</span>
      <span className={`truncate text-[14px] font-medium leading-5 ${value ? "text-[#1e293b]" : "text-[#9ca3af]"}`}>{value ? dayLabel(value, true) : placeholder}</span>
      <input
        ref={input}
        type="date"
        value={value}
        onChange={(e) => set(e.target.value)}
        onClick={() => input.current?.showPicker?.()}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );

  return (
    <div className="px-4 pb-12 pt-6 sm:px-[27px] sm:pt-[50px]">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
        {cards.map((c) => (
          <div key={c.label} className={statCard}>
            <p className="truncate text-[12px] font-bold uppercase leading-[18px] tracking-[1.2px] text-[#9ca3af]" title={c.label}>{c.label}</p>
            <div className="mt-4 flex items-end justify-between gap-2">
              <p className="truncate text-[30px] font-extrabold leading-9 text-[#0a1b33] sm:text-[36px]">{c.value}</p>
              {c.hint && <span className="mb-1 shrink-0 rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-semibold leading-4 text-[#64748b]">{c.hint}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-[9px] flex flex-col gap-[10px] rounded-xl border border-[#e2e8f0] bg-white p-[15px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] sm:pt-3">
        <div className="flex flex-col gap-[10px] lg:flex-row lg:items-center lg:gap-[7px]">
          <label className="relative min-w-0 lg:w-[344px] lg:shrink-0">
            <span className="sr-only">Search payments</span>
            <Image src="/payments/search.svg" alt="" width={16} height={17} className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by ID, customer or amount..."
              className="h-[38px] w-full rounded-lg border border-[#e5e7eb] bg-[#f9fafb] pl-[39px] pr-3 text-[14px] text-[#0f172a] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#00c185]"
            />
          </label>
          <div className="flex flex-wrap gap-[7px]">
            <FilterSelect label="Transaction Type" options={TYPE_FILTERS} selected={types} onToggle={(v) => setTypes(toggle(types, v))} />
            <FilterSelect label="Collection Method" options={METHOD_FILTERS} selected={methods} onToggle={(v) => setMethods(toggle(methods, v))} />
            <FilterSelect label="Status" options={STATUS_FILTERS} selected={statuses} onToggle={(v) => setStatuses(toggle(statuses, v))} />
          </div>
        </div>
        <div className="flex h-[38px] items-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 lg:w-[342px]">
          <Image src="/payments/calendar.svg" alt="" width={12.25} height={14} className="mr-2 shrink-0" />
          {dateBox(from, setFrom, fromInput, "Start date", "From date")}
          <span className="px-2">
            <span className="block h-4 w-px bg-[#cbd5e1]" />
          </span>
          {dateBox(to, setTo, toInput, "End date", "To date")}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mt-[9px] flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <FilterChip key={c.key} label={c.label} value={c.value} onRemove={c.remove} />
          ))}
          <button
            type="button"
            onClick={() => {
              setTypes([]);
              setMethods([]);
              setStatuses([]);
              setFrom("");
              setTo("");
            }}
            className="ml-1 text-[12px] font-medium leading-4 text-[#94a3b8] hover:text-[#475569]"
          >
            Clear All
          </button>
        </div>
      )}

      {(message.error || message.notice) && (
        <p role="alert" className={`mt-4 flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-[13px] ${message.error ? "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]" : "border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]"}`}>
          {message.error ?? message.notice}
          <button type="button" onClick={() => setMessage({})} className="font-semibold opacity-70 hover:opacity-100">Dismiss</button>
        </p>
      )}

      <section className="mt-[18px] overflow-hidden rounded-[24px] border border-[#f3f4f6] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.02)]">
        <div className="border-b border-[#f3f4f6] px-8 pb-[15px] pt-8">
          <h2 className="text-[21px] font-extrabold leading-[30px] text-[#0a1b33]">Recent Transactions</h2>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <h3 className="text-[16px] font-bold text-[#1e293b]">{transactions.length === 0 ? "No payments yet" : "No matching transactions"}</h3>
            <p className="mt-1 max-w-[400px] text-[14px] leading-5 text-[#64748b]">
              {transactions.length === 0
                ? "Payments you record on invoices and deposits you record on quotes will show up here."
                : "Try a different search or clear the filters."}
            </p>
            {transactions.length === 0 && (
              <button type="button" onClick={() => router.push("/invoices")} className="mt-5 h-10 rounded-lg bg-[#00c185] px-5 text-[14px] font-semibold text-white hover:bg-[#00a873]">
                Go to Invoices
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] table-fixed text-left">
              <colgroup>
                {["w-[13%]", "w-[23.6%]", "w-[13%]", "w-[14.9%]", "w-[13%]", "w-[16.8%]", "w-[5.7%]"].map((c, i) => (
                  <col key={i} className={c} />
                ))}
              </colgroup>
              <thead className="whitespace-nowrap bg-[rgba(248,250,252,0.5)] text-[12px] font-semibold uppercase leading-[18px] tracking-[0.6px] text-[#64748b]">
                <tr className="h-[51px] border-b border-[#f3f4f6]">
                  <th className="pl-6 font-semibold">Date</th>
                  <th className="pl-6 font-semibold">Customer</th>
                  <th className="pl-6 font-semibold">Amount</th>
                  <th className="text-center font-semibold">Status</th>
                  <th className="pl-6 font-semibold">Method</th>
                  <th className="pl-6 font-semibold">Related Job</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.key} className="h-[75px] border-b border-[#f3f4f6] last:border-b-0 hover:bg-[#f8fafc]">
                    <td className="pl-6 pr-2 text-[14px] leading-[21px] text-[#475569]">
                      <Link href={row.href} className="hover:text-[#00c185]">
                        {dayLabel(row.date)}
                        {row.type !== "deposit" && <>, {time(row.at)}</>}
                      </Link>
                    </td>
                    <td className="px-6">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${tone(row.customer)}`}>{initials(row.customer)}</span>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-bold leading-[21px] text-[#1e293b]" title={row.customer}>{row.customer}</p>
                          <p className="truncate text-[12px] leading-[18px] text-[#64748b]" title={row.customerEmail ?? undefined}>{row.customerEmail ?? "No email"}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 text-[14px] font-bold leading-[21px] ${row.amount < 0 ? "text-[#dc2626]" : "text-[#1e293b]"}`}>
                      <Link href={row.href} className="hover:underline">
                        {row.amount < 0 ? `-${formatMoney(-row.amount)}` : formatMoney(row.amount)}
                      </Link>
                      <p className="truncate text-[11px] font-medium leading-4 text-[#94a3b8]">{row.number}</p>
                    </td>
                    <td className="px-2 text-center">
                      <PaymentStatusBadge status={row.status} />
                    </td>
                    <td className="px-6 text-[12px] leading-[18px] text-[#64748b]">
                      <p className="truncate font-medium text-[#475569]">{row.channel === "electronic" ? "Electronic" : "Manual"}</p>
                      <p className="truncate">{row.method}</p>
                    </td>
                    <td className="px-6 text-[12px] leading-[18px] text-[#64748b]">
                      {row.related ? (
                        <Link href={row.related.href} className="line-clamp-2 hover:text-[#00c185]" title={row.related.label}>
                          {row.related.label}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="pr-4 text-right">
                      <RowActions row={row} onResult={setMessage} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
