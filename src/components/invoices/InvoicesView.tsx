"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Chip, FilterMenu } from "@/components/dashboard/FilterMenu";
import { shortDate, useLocalTime } from "@/components/jobs/format";
import { INVOICE_FILTERS, todayIso, type InvoiceRow, type InvoiceState, type InvoiceStats } from "@/lib/invoices/data";
import type { JobCustomerOption } from "@/lib/jobs/data";
import { formatMoney } from "@/lib/quotes/totals";
import InvoiceFormModal, { type InvoiceDefaults } from "./InvoiceFormModal";
import InvoiceStatusBadge from "./InvoiceStatusBadge";

const DAY = 24 * 60 * 60 * 1000;
const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];
const DUE_RANGES = [
  { value: "past", label: "Past due" },
  { value: "7", label: "Due in 7 days" },
  { value: "30", label: "Due in 30 days" },
];

const inRange = (iso: string | null, days: string, now: number) =>
  !days || Boolean(iso && new Date(iso).getTime() >= now - Number(days) * DAY);

function dueMatches(dueOn: string, range: string, now: number) {
  if (!range) return true;
  const today = todayIso(now);
  if (range === "past") return dueOn < today;
  return dueOn >= today && dueOn <= todayIso(now + Number(range) * DAY);
}

const statCard = "h-[100px] rounded-xl border border-[#e5e7eb] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]";

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default function InvoicesView({
  invoices,
  stats,
  now,
  customers,
  defaults,
  openNew,
  newForCustomer,
}: {
  invoices: InvoiceRow[];
  stats: InvoiceStats;
  now: number;
  customers: JobCustomerOption[];
  defaults: InvoiceDefaults;
  openNew: boolean;
  newForCustomer?: string;
}) {
  const router = useRouter();
  const local = useLocalTime();
  const [query, setQuery] = useState("");
  const [states, setStates] = useState<InvoiceState[]>([]);
  const [created, setCreated] = useState("");
  const [sent, setSent] = useState("");
  const [due, setDue] = useState("");
  const [creating, setCreating] = useState(openNew);

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  const single = (current: string, value: string) => (current === value ? "" : value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/[$,]/g, "");
    return invoices.filter((row) => {
      // Archived invoices stay out of the way unless asked for.
      if (states.length ? !states.includes(row.state) : row.state === "archived") return false;
      if (!inRange(row.createdAt, created, now) || !inRange(row.sentAt, sent, now) || !dueMatches(row.dueOn, due, now)) return false;
      if (!q) return true;
      return [row.number, row.customer, row.customerEmail, row.title, row.total.toFixed(2), row.balance.toFixed(2)].some((v) => v?.toLowerCase().includes(q));
    });
  }, [invoices, query, states, created, sent, due, now]);

  const rangeLabel = (v: string) => RANGES.find((r) => r.value === v)?.label ?? "";
  const chips = [
    ...states.map((s) => ({ key: s, label: `Status: ${INVOICE_FILTERS.find((o) => o.value === s)?.label}`, remove: () => setStates(toggle(states, s)) })),
    ...(created ? [{ key: "c", label: `Created: ${rangeLabel(created)}`, remove: () => setCreated("") }] : []),
    ...(sent ? [{ key: "s", label: `Sent: ${rangeLabel(sent)}`, remove: () => setSent("") }] : []),
    ...(due ? [{ key: "d", label: `Due: ${DUE_RANGES.find((r) => r.value === due)?.label}`, remove: () => setDue("") }] : []),
  ];
  const filtering = Boolean(query) || chips.length > 0;

  const cards = [
    { label: "Invoices Created Last 30D", value: String(stats.created30d) },
    { label: "Invoices Paid Last 30D", value: String(stats.paid30d) },
    { label: "Outstanding Balance", value: formatMoney(stats.outstanding) },
    { label: "Overdue Balance", value: formatMoney(stats.overdue) },
  ];
  const day = (iso: string | null) => (iso ? shortDate(iso, local) : "—");
  // due_on is a plain date; show it as written.
  const dateOnly = (d: string) => shortDate(`${d}T00:00:00Z`, false);

  const startNew = () => (customers.length ? setCreating(true) : router.push("/customers?new=1"));
  const closeNew = () => {
    setCreating(false);
    if (openNew) router.replace("/invoices", { scroll: false });
  };

  return (
    <div className="px-4 pb-12 pt-6 sm:px-8 sm:pt-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
        {cards.map((c) => (
          <div key={c.label} className={statCard}>
            <p className="truncate text-[14px] font-medium uppercase leading-5 tracking-[0.7px] text-[#6b7280]">{c.label}</p>
            <p className="mt-1 truncate text-[30px] font-bold leading-9 text-[#111827]">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[#e2e8f0] bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)] xl:h-[61px] xl:flex-row xl:items-center xl:gap-0 xl:py-0 xl:pl-3 xl:pr-2">
        <label className="relative min-w-0 xl:w-[358px] xl:shrink-0">
          <span className="sr-only">Search invoices</span>
          <Image src="/onboarding/search.svg" alt="" width={17} height={16} className="pointer-events-none absolute left-[15px] top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID, customer or amount..."
            className="h-[37px] w-full rounded-lg border border-[#e5e7eb] bg-[#f9fafb] pl-10 pr-3 text-[14px] text-[#0f172a] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#00c185]"
          />
        </label>
        <div className="flex flex-wrap gap-3 xl:ml-4">
          <FilterMenu label="Created Date" options={RANGES} selected={created ? [created] : []} onToggle={(v) => setCreated(single(created, v))} width="min-w-[122px]" />
          <FilterMenu label="Sent Date" options={RANGES} selected={sent ? [sent] : []} onToggle={(v) => setSent(single(sent, v))} width="min-w-[104px]" />
          <FilterMenu label="Due Date" options={DUE_RANGES} selected={due ? [due] : []} onToggle={(v) => setDue(single(due, v))} width="min-w-[104px]" />
          <FilterMenu label="Status" options={INVOICE_FILTERS} selected={states} onToggle={(v) => setStates(toggle(states, v))} width="min-w-[82px]" />
        </div>
        <button
          type="button"
          onClick={startNew}
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#00c185] px-5 text-[16px] font-semibold leading-6 text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#00a873] xl:ml-auto xl:w-[145px] xl:px-0"
        >
          <Plus className="size-3.5" strokeWidth={3} />
          Create Invoice
        </button>
      </div>

      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {chips.map((c) => (
            <Chip key={c.key} label={c.label} onRemove={c.remove} />
          ))}
          <button
            type="button"
            onClick={() => {
              setStates([]);
              setCreated("");
              setSent("");
              setDue("");
            }}
            className="ml-2 text-[12px] font-medium leading-4 text-[#94a3b8] hover:text-[#475569]"
          >
            Clear All
          </button>
        </div>
      )}

      <section className={`${chips.length ? "mt-[23px]" : "mt-[38px]"} overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]`}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <h2 className="text-[16px] font-bold text-[#1e293b]">{invoices.length === 0 ? "No invoices yet" : filtering ? "No matching invoices" : "No active invoices"}</h2>
            <p className="mt-1 max-w-[380px] text-[14px] leading-5 text-[#64748b]">
              {invoices.length === 0
                ? customers.length
                  ? "Create your first invoice, or turn a job or accepted quote into one."
                  : "Add a customer first, then create an invoice for them."
                : "Try a different search or clear the filters."}
            </p>
            {invoices.length === 0 && (
              <button type="button" onClick={startNew} className="mt-5 h-10 rounded-lg bg-[#00c185] px-5 text-[14px] font-semibold text-white hover:bg-[#00a873]">
                {customers.length ? "+ Create Invoice" : "+ Add Customer"}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] table-fixed text-left">
              <colgroup>
                {["w-[11.7%]", "w-[17.2%]", "w-[10.5%]", "w-[13.9%]", "w-[9%]", "w-[9.2%]", "w-[10.3%]", "w-[8.5%]", "w-[9.7%]"].map((c, i) => (
                  <col key={i} className={c} />
                ))}
              </colgroup>
              <thead className="whitespace-nowrap bg-[#f9fafb] text-[12px] font-bold uppercase leading-4 tracking-[0.6px] text-[#6b7280]">
                <tr className="h-[65px] border-b border-[#e5e7eb]">
                  <th className="pl-4">Invoice Number</th>
                  <th className="pl-4">Customer</th>
                  <th className="pl-4">Grand Total</th>
                  <th className="pl-4">Status</th>
                  <th className="pl-4">Sent Date</th>
                  <th className="pl-4">Due Date</th>
                  <th className="pl-4">Amount Paid</th>
                  <th className="pl-4">Balance</th>
                  <th className="pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-[14px] leading-5 text-[#6b7280]">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="h-[74px] border-b border-[#e5e7eb] last:border-b-0 hover:bg-[#f9fafb]">
                    <td className="pl-4 pr-2">
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-[#0b0e14] hover:text-[#00c185]">
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e2e8f0] text-[11px] font-bold text-[#475569]">{initials(inv.customer)}</span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#111827]" title={inv.customer}>{inv.customer}</p>
                          <p className="truncate text-[12px] leading-4" title={inv.customerEmail ?? undefined}>{inv.customerEmail ?? "No email"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 font-semibold text-[#111827]">{formatMoney(inv.total)}</td>
                    <td className="px-4">
                      <InvoiceStatusBadge state={inv.state} />
                    </td>
                    <td className="px-4">{inv.sentAt ? day(inv.sentAt) : <span className="text-[#9ca3af]">—</span>}</td>
                    <td className="px-4">{dateOnly(inv.dueOn)}</td>
                    <td className="px-4">{formatMoney(inv.amountPaid)}</td>
                    <td className="px-4 font-medium">{formatMoney(inv.balance)}</td>
                    <td className="pr-4 text-right">
                      <Link href={`/invoices/${inv.id}`} aria-label={`View ${inv.number}`} className="inline-block rounded p-1 transition-opacity hover:opacity-70">
                        <Image src="/customers/eye.svg" alt="" width={24} height={24} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {creating && (
        <InvoiceFormModal
          customers={customers}
          defaults={defaults}
          defaultCustomer={newForCustomer}
          onClose={closeNew}
          onSaved={(id, send) => {
            setCreating(false);
            router.push(send ? `/invoices/${id}?send=1` : `/invoices/${id}`);
          }}
        />
      )}
    </div>
  );
}
