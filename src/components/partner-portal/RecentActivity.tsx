"use client";

import { Activity, UserPlus, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import type { Referral } from "@/lib/partners/server";
import { EmptyState } from "./ui";

type Event = { key: string; type: "signup" | "activated"; at: string; who: string };

const TYPES = [
  { value: "", label: "All Activity" },
  { value: "signup", label: "New Referral Signed Up" },
  { value: "activated", label: "Referral Activated" },
];
const RANGES = [
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 90 Days" },
  { value: "365", label: "Last 12 Months" },
  { value: "", label: "All Time" },
];

const ago = (iso: string, now: number) => {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 60) return mins <= 1 ? "Just now" : `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? "Yesterday" : `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const select =
  "h-9 rounded-lg border border-line bg-[#f8fafc] px-3 text-[13px] text-[#475569] outline-none focus:border-[#10b981]";

/** Referral sign-ups and activations; commission and payout events join this once payouts are live. */
export default function RecentActivity({ referrals, now }: { referrals: Referral[]; now: number }) {
  const [type, setType] = useState("");
  const [range, setRange] = useState("30");

  const events = useMemo(() => {
    const all: Event[] = referrals.flatMap((r, i) => [
      { key: `s${i}`, type: "signup" as const, at: r.signedUpAt, who: r.businessName },
      ...(r.activatedAt ? [{ key: `a${i}`, type: "activated" as const, at: r.activatedAt, who: r.businessName }] : []),
    ]);
    const since = range ? now - Number(range) * 864e5 : 0;
    return all
      .filter((e) => (!type || e.type === type) && new Date(e.at).getTime() >= since)
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 50);
  }, [referrals, type, range, now]);

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:px-6">
        <h2 className="text-[17px] font-bold leading-6 text-navy">Recent Activity</h2>
        <div className="flex gap-2">
          <select aria-label="Filter by activity type" value={type} onChange={(e) => setType(e.target.value)} className={select}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select aria-label="Date range" value={range} onChange={(e) => setRange(e.target.value)} className={select}>
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {events.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={referrals.length ? "No activity in this period" : "No referral activity yet"}
          body={referrals.length ? "Try a longer date range." : "When someone signs up with your referral link, it shows up here, and again when they finish setting up their account."}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[14px]">
            <thead className="border-y border-line bg-[#f8fafc] text-[11px] font-bold uppercase tracking-[0.6px] text-[#64748b]">
              <tr className="h-10">
                <th className="pl-6">Activity Type</th>
                <th className="px-4">Referral</th>
                <th className="pr-6 text-right">Date / Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {events.map((e) => (
                <tr key={e.key} className="h-[52px]">
                  <td className="pl-6">
                    <span className="flex items-center gap-3 font-semibold text-navy">
                      <span className={`flex size-7 items-center justify-center rounded-full ${e.type === "signup" ? "bg-[#ecfdf5] text-[#059669]" : "bg-[#eff6ff] text-[#2563eb]"}`}>
                        {e.type === "signup" ? <UserPlus className="size-3.5" /> : <Zap className="size-3.5" />}
                      </span>
                      {e.type === "signup" ? "New Referral Signed Up" : "Referral Activated"}
                    </span>
                  </td>
                  <td className="truncate px-4 text-[#475569]">{e.who}</td>
                  <td className="pr-6 text-right text-[#64748b]" suppressHydrationWarning>
                    {ago(e.at, now)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
