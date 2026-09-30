"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { ActivityItem, ActivityStatus } from "@/lib/dashboard/stats";
import { formatMoney } from "@/lib/quotes/totals";

const STATUSES: ActivityStatus[] = ["Pending", "Draft", "Accepted", "Declined", "New"];

const DATE_RANGES = [
  { value: "", label: "Creation Date" },
  { value: "1", label: "Today" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const badge: Record<ActivityStatus, string> = {
  Pending: "bg-[#f1f5f9] text-[#64748b]",
  Draft: "bg-[#f8fafc] text-[#94a3b8]",
  Accepted: "text-[#00c9a7]",
  Declined: "bg-[#fef2f2] text-[#ef4444]",
  New: "bg-[#eff6ff] text-[#3b82f6]",
};

const COLLAPSED_ROWS = 5;

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function timeAgo(iso: string, now: number) {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  // A fixed zone keeps the server render and the browser in agreement.
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

const filterClass =
  "h-9 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] text-[14px] text-[#0f172a] outline-none transition-colors focus:border-[#00c9a7]";

export default function ActivityPanel({ items, now }: { items: ActivityItem[]; now: number }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [range, setRange] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/[$,\s]/g, "");
    const since = range ? now - Number(range) * 24 * 60 * 60 * 1000 : null;
    return items.filter((item) => {
      if (status && item.status !== status) return false;
      if (since !== null && new Date(item.at).getTime() < since) return false;
      if (!q) return true;
      return (
        item.customer.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        (item.reference?.toLowerCase().includes(q) ?? false) ||
        (digits !== "" && item.amount !== null && item.amount.toFixed(2).includes(digits))
      );
    });
  }, [items, query, status, range, now]);

  const filtering = Boolean(query || status || range);
  const rows = expanded ? filtered : filtered.slice(0, COLLAPSED_ROWS);

  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl border border-[#e2e8f0] bg-white p-[11px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] sm:h-[60px] sm:flex-row sm:items-center sm:gap-3.5 sm:px-[15px] sm:py-0">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search activity</span>
          <Image src="/onboarding/search.svg" alt="" width={17} height={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID, customer or amount..."
            className={`${filterClass} w-full pl-[39px] pr-3 placeholder:text-[#9ca3af]`}
          />
        </label>
        <div className="flex gap-3.5">
          <label className="relative flex-1 sm:w-[127px] sm:flex-none">
            <span className="sr-only">Filter by status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`${filterClass} w-full appearance-none pl-3.5 pr-8 ${status ? "" : "text-[#9ca3af]"}`}
            >
              <option value="">Status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Image src="/onboarding/dropdown.svg" alt="" width={24} height={24} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
          </label>
          <label className="relative flex-1 sm:w-[150px] sm:flex-none">
            <span className="sr-only">Filter by creation date</span>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className={`${filterClass} w-full appearance-none pl-[7px] pr-8 ${range ? "" : "text-[#9ca3af]"}`}
            >
              {DATE_RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <Image src="/onboarding/chevron-down.svg" alt="" width={12} height={6} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </label>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="flex h-[76px] items-center justify-between border-b border-[#e2e8f0] px-6 sm:px-8">
          <h2 className="text-[18px] font-bold leading-7 tracking-[0.018px] text-[#0f172a]">Recent Activity</h2>
          {filtered.length > COLLAPSED_ROWS && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-[14px] font-semibold leading-5 tracking-[0.041px] text-[#00c9a7] hover:underline"
            >
              {expanded ? "Show Less" : "View All Activity"}
            </button>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-[#f9fafb]">
              <Image src="/onboarding/activity-empty.svg" alt="" width={27} height={24} />
            </div>
            <h3 className="mt-4 text-[16px] font-bold text-[#1e293b]">
              {filtering ? "No matching activity" : "No Recent Activity"}
            </h3>
            <p className="mt-1 max-w-[384px] text-[14px] leading-5 text-[#64748b]">
              {filtering
                ? "Try a different search or clear the filters."
                : "Activity from customers, quotes, jobs, invoices, and payments will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] table-fixed text-left">
              <colgroup>
                <col className="w-[26.9%]" />
                <col className="w-[21.2%]" />
                <col className="w-[16.5%]" />
                <col className="w-[18.6%]" />
                <col className="w-[16.8%]" />
              </colgroup>
              <thead className="border-b border-[#e2e8f0] bg-[#f8fafc] text-[12px] font-bold uppercase leading-4 tracking-[0.6px] text-[#64748b]">
                <tr className="h-12">
                  <th className="pl-[38px]">Customer Name</th>
                  <th className="pl-8">Activity Type</th>
                  <th className="pl-8">Amount ($)</th>
                  <th className="pl-[41px]">Status</th>
                  <th className="pr-[39px] text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="h-[73px] border-t border-[#f1f5f9] first:border-t-0">
                    <td className="pl-[38px]">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f1f5f9] text-[12px] font-medium leading-4 tracking-[0.7px] text-[#475569]">
                          {initials(item.customer)}
                        </span>
                        <span className="truncate text-[14px] font-semibold leading-5 text-[#0f172a]">{item.customer}</span>
                      </div>
                    </td>
                    <td className="truncate pl-8 text-[14px] leading-5 tracking-[0.041px] text-[#475569]">{item.type}</td>
                    <td className="pl-8 text-[14px] font-medium leading-5 tracking-[0.11px] text-[#0f172a]">
                      {item.amount === null ? "—" : formatMoney(item.amount)}
                    </td>
                    <td className="pl-8">
                      <span className={`inline-flex h-[23px] items-center rounded-full px-3 text-[12px] font-semibold leading-4 ${badge[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="pr-[39px] text-right text-[14px] leading-5 tracking-[0.15px] text-[#64748b]">
                      <time dateTime={item.at}>
                        {timeAgo(item.at, now)}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
