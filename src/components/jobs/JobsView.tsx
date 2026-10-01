"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { JOB_STATUSES, type JobCustomerOption, type JobRow, type JobStats, type JobStatus } from "@/lib/jobs/data";
import { formatMoney } from "@/lib/quotes/totals";
import { shortDate, useLocalTime } from "./format";
import JobFormModal from "./JobFormModal";
import JobStatusBadge from "./JobStatusBadge";

type State = "active" | "archived";
const STATES: { value: State; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const DAY = 24 * 60 * 60 * 1000;
// Negative days look back from now; positive days look ahead.
const PAST_RANGES = [
  { value: "-7", label: "Last 7 days" },
  { value: "-30", label: "Last 30 days" },
  { value: "-90", label: "Last 90 days" },
  { value: "-365", label: "Last 12 months" },
];
const SCHEDULE_RANGES = [
  { value: "7", label: "Next 7 days" },
  { value: "30", label: "Next 30 days" },
  { value: "-7", label: "Last 7 days" },
  { value: "-30", label: "Last 30 days" },
];

function inRange(iso: string | null, range: string, now: number) {
  if (!range) return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  const days = Number(range);
  return days < 0 ? t >= now + days * DAY && t <= now : t >= now && t <= now + days * DAY;
}

/** Filter button with a checkbox menu, as in the Figma status and state dropdowns. */
function FilterMenu<T extends string>({
  label,
  options,
  selected,
  onToggle,
  width,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
  width: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`flex h-9 items-center justify-between gap-2 rounded-lg border px-4 text-[14px] font-medium leading-5 transition-colors ${
          selected.length ? "border-[#00c185] bg-[#ecfdf5] text-[#0f172a]" : "border-[#e2e8f0] bg-[#f9fafb] text-[#475569] hover:bg-white"
        } ${width}`}
      >
        <span className="truncate">{label}</span>
        <Image src="/jobs/chevron.svg" alt="" width={9} height={5} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
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

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex h-6 items-center gap-1.5 rounded-full border border-[#e2e8f0] bg-[#f1f5f9] pl-3 pr-2 text-[12px] font-semibold leading-4 text-[#475569]">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove filter ${label}`} className="flex size-4 items-center justify-center rounded-full hover:bg-[#e2e8f0]">
        <Image src="/jobs/chip-x.svg" alt="" width={6} height={6} />
      </button>
    </span>
  );
}

const statCard = "h-[113px] rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]";

export default function JobsView({
  jobs,
  stats,
  now,
  customers,
  nextNumber,
  defaultTerms,
  openNew,
  newForCustomer,
}: {
  jobs: JobRow[];
  stats: JobStats;
  now: number;
  customers: JobCustomerOption[];
  nextNumber: string;
  defaultTerms: string;
  openNew: boolean;
  newForCustomer?: string;
}) {
  const router = useRouter();
  const local = useLocalTime();
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<JobStatus[]>([]);
  const [states, setStates] = useState<State[]>(["active"]);
  const [created, setCreated] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [creating, setCreating] = useState(openNew);
  const [notice, setNotice] = useState<string>();

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  const single = (current: string, value: string) => (current === value ? "" : value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/[$,]/g, "");
    return jobs.filter((j) => {
      if (statuses.length && !statuses.includes(j.status)) return false;
      if (states.length && !states.includes(j.archived ? "archived" : "active")) return false;
      if (!inRange(j.createdAt, created, now)) return false;
      if (!inRange(j.startsAt, start, now)) return false;
      if (!inRange(j.endsAt, end, now)) return false;
      if (!q) return true;
      return [j.number, j.customer, j.title, j.total.toFixed(2), j.quoteNumber].some((v) => v?.toLowerCase().includes(q));
    });
  }, [jobs, query, statuses, states, created, start, end, now]);

  const label = (ranges: { value: string; label: string }[], v: string) => ranges.find((r) => r.value === v)?.label ?? "";
  const chips = [
    ...statuses.map((s) => ({ key: `s-${s}`, label: `Status: ${JOB_STATUSES.find((o) => o.value === s)?.label}`, remove: () => setStatuses(toggle(statuses, s)) })),
    ...states.map((s) => ({ key: `st-${s}`, label: `State: ${STATES.find((o) => o.value === s)?.label}`, remove: () => setStates(toggle(states, s)) })),
    ...(created ? [{ key: "c", label: `Created: ${label(PAST_RANGES, created)}`, remove: () => setCreated("") }] : []),
    ...(start ? [{ key: "st", label: `Start: ${label(SCHEDULE_RANGES, start)}`, remove: () => setStart("") }] : []),
    ...(end ? [{ key: "e", label: `End: ${label(SCHEDULE_RANGES, end)}`, remove: () => setEnd("") }] : []),
  ];
  const clearAll = () => {
    setStatuses([]);
    setStates([]);
    setCreated("");
    setStart("");
    setEnd("");
  };
  const filtering = Boolean(query) || chips.length > 0;
  const onlyActiveDefault = !query && chips.length === 1 && states[0] === "active";

  const cards = [
    { label: "Jobs Created (Last 30 Days)", value: stats.created30d },
    { label: "Unscheduled Jobs", value: stats.unscheduled },
    { label: "Jobs In Progress", value: stats.inProgress },
    { label: "Completed Jobs (Last 30 Days)", value: stats.completed30d },
  ];

  const dateCell = (iso: string | null) => (iso ? shortDate(iso, local) : "—");

  return (
    <div className="px-4 pb-12 pt-6 sm:px-10 sm:pt-[22px]">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
        {cards.map((c) => (
          <div key={c.label} className={statCard}>
            <p className="truncate text-[14px] font-medium leading-[21px] text-[#64748b]">{c.label}</p>
            <p className="mt-2 text-[24px] font-bold leading-9 text-[#0f172a]">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex h-[51px] w-[150px] items-center justify-center gap-2 rounded-lg bg-[#00c185] text-[16px] font-semibold leading-6 text-white transition-colors hover:bg-[#00a873]"
        >
          <span className="text-[18px] font-bold leading-[27px]">+</span>
          Create Job
        </button>
      </div>

      <div className="mt-[14px] flex flex-col gap-3 rounded-xl border border-[#e2e8f0] bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] xl:h-[60px] xl:flex-row xl:items-center xl:gap-0 xl:py-0">
        <label className="relative min-w-0 xl:w-[425px] xl:shrink-0">
          <span className="sr-only">Search jobs</span>
          <Image src="/onboarding/search.svg" alt="" width={17} height={16} className="pointer-events-none absolute left-[17px] top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID, customer or amount..."
            className="h-9 w-full rounded-lg border border-[#e5e7eb] bg-[#f9fafb] pl-10 pr-3 text-[14px] text-[#0f172a] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#00c185]"
          />
        </label>
        <div className="flex flex-wrap gap-[13px] xl:ml-4">
          <FilterMenu label="Status" options={JOB_STATUSES} selected={statuses} onToggle={(v) => setStatuses(toggle(statuses, v))} width="w-[93px]" />
          <FilterMenu label="State" options={STATES} selected={states} onToggle={(v) => setStates(toggle(states, v))} width="w-[85px]" />
          <FilterMenu label="Created Date" options={PAST_RANGES} selected={created ? [created] : []} onToggle={(v) => setCreated(single(created, v))} width="w-[139px]" />
          <FilterMenu label="Start Date" options={SCHEDULE_RANGES} selected={start ? [start] : []} onToggle={(v) => setStart(single(start, v))} width="w-[118px]" />
          <FilterMenu label="End Date" options={SCHEDULE_RANGES} selected={end ? [end] : []} onToggle={(v) => setEnd(single(end, v))} width="w-[111px]" />
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {chips.map((c) => (
            <Chip key={c.key} label={c.label} onRemove={c.remove} />
          ))}
          <button type="button" onClick={clearAll} className="ml-2 text-[12px] font-medium leading-4 text-[#94a3b8] hover:text-[#475569]">
            Clear All
          </button>
        </div>
      )}

      {notice && (
        <p role="status" className="mt-4 flex items-start justify-between gap-3 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2.5 text-[13px] text-[#92400e]">
          {notice}
          <button type="button" onClick={() => setNotice(undefined)} aria-label="Dismiss" className="shrink-0 font-semibold hover:opacity-70">
            ×
          </button>
        </p>
      )}

      <section className={`${chips.length ? "mt-[23px]" : "mt-[19px]"} overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]`}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <h2 className="text-[16px] font-bold text-[#1e293b]">
              {jobs.length === 0 ? "No jobs yet" : filtering && !onlyActiveDefault ? "No matching jobs" : "No active jobs"}
            </h2>
            <p className="mt-1 max-w-[380px] text-[14px] leading-5 text-[#64748b]">
              {jobs.length === 0
                ? customers.length
                  ? "Create your first job to schedule work for a customer."
                  : "Add a customer first, then create a job for them."
                : "Try a different search or clear the filters."}
            </p>
            {jobs.length === 0 && (
              <button
                type="button"
                onClick={() => (customers.length ? setCreating(true) : router.push("/customers?new=1"))}
                className="mt-5 h-10 rounded-lg bg-[#00c185] px-5 text-[14px] font-semibold text-white hover:bg-[#00a873]"
              >
                {customers.length ? "+ Create Job" : "+ Add Customer"}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] table-fixed text-left">
              <colgroup>
                {["w-[7.8%]", "w-[11.1%]", "w-[15.5%]", "w-[12%]", "w-[9.1%]", "w-[7.8%]", "w-[7.5%]", "w-[7.8%]", "w-[6.7%]", "w-[7%]", "w-[7.7%]"].map((c, i) => (
                  <col key={i} className={c} />
                ))}
              </colgroup>
              <thead className="bg-[#f8fafc] text-[11px] font-bold uppercase leading-[16.5px] tracking-[0.55px] text-[#64748b]">
                <tr className="h-[52px] border-b border-[#e2e8f0]">
                  <th className="pl-6">Job #</th>
                  <th className="pl-2">Customer</th>
                  <th className="pl-2">Job Title</th>
                  <th className="text-center">Status</th>
                  <th className="pl-2">Created</th>
                  <th className="pl-2">Start</th>
                  <th className="pl-2">End</th>
                  <th className="text-center">Total</th>
                  <th className="text-center">Quote</th>
                  <th className="text-center">Invoice</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-[13px] leading-[19.5px] text-[#64748b]">
                {filtered.map((j) => (
                  <tr key={j.id} className="h-[72px] border-b border-[#e2e8f0] last:border-b-0 hover:bg-[#f8fafc]">
                    <td className="pl-6 pr-2 text-[14px] font-medium leading-[21px] text-[#475569]">{j.number}</td>
                    <td className="truncate px-2 text-[14px] leading-[21px] text-[#475569]" title={j.customer}>{j.customer}</td>
                    <td className="px-2">
                      <Link href={`/jobs/${j.id}`} className="line-clamp-2 text-[14px] font-semibold leading-[21px] text-[#334155] hover:text-[#00c185]">
                        {j.title}
                      </Link>
                    </td>
                    <td className="text-center">
                      <JobStatusBadge status={j.status} />
                      {j.archived && <span className="mt-1 block text-[11px] text-[#94a3b8]">Archived</span>}
                    </td>
                    <td className="px-2">{dateCell(j.createdAt)}</td>
                    <td className="px-2">{dateCell(j.startsAt)}</td>
                    <td className="px-2">{dateCell(j.endsAt)}</td>
                    <td className="px-2 text-center text-[14px] font-semibold leading-[21px] text-[#334155]">{formatMoney(j.total)}</td>
                    <td className="px-1 text-center">{j.quoteNumber ?? "—"}</td>
                    {/* Invoices link here once they're built. */}
                    <td className="px-1 text-center">—</td>
                    <td className="text-center">
                      <Link href={`/jobs/${j.id}`} aria-label={`View ${j.number}`} className="inline-block rounded p-1 transition-opacity hover:opacity-70">
                        <Image src="/customers/eye.svg" alt="" width={23} height={23} />
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
        <JobFormModal
          customers={customers}
          nextNumber={nextNumber}
          defaultTerms={defaultTerms}
          defaultCustomer={newForCustomer}
          onClose={() => {
            setCreating(false);
            if (openNew) router.replace("/jobs", { scroll: false });
          }}
          onSaved={(message) => {
            setNotice(message);
            setCreating(false);
            if (openNew) router.replace("/jobs", { scroll: false });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
