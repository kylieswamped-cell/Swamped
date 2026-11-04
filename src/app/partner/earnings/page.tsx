import { CalendarClock, CircleDollarSign, Download, History, Landmark, ReceiptText, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { referenceTime } from "@/lib/jobs/data";
import PartnerShell from "@/components/partner-portal/PartnerShell";
import { Card, EmptyState, StatCard, longDay, money } from "@/components/partner-portal/ui";
import { PROGRAM, nextPayoutDate } from "@/lib/partners/program";
import { requirePartner } from "@/lib/partners/server";

export const metadata: Metadata = { title: "Earnings & Payouts — Swamped Partners" };

// Figma 926:2164. Commissions and payouts need Swamped revenue from referred
// accounts and Stripe Connect; until then every figure is zero and the history
// explains what will appear.
export default async function EarningsPage() {
  const { partner } = await requirePartner();
  const now = await referenceTime();

  return (
    <PartnerShell title="Earnings & Payouts" subtitle="Track your commission earnings, payout eligibility, and payment history." name={partner.fullName} status={partner.status}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={CircleDollarSign} tone="bg-[#ecfdf5] text-[#059669]" label="Lifetime Earnings" value={money(0)} help="All commissions you've earned, including ones still in the holding period." />
        <StatCard icon={Landmark} tone="bg-[#eff6ff] text-[#2563eb]" label="Earnings (Last 30 Days)" value={money(0)} help="Commissions earned in the last 30 days." />
        <StatCard
          icon={History}
          tone="bg-[#fff7ed] text-[#ea580c]"
          label="Pending Commissions"
          value={money(0)}
          help={`New commissions stay pending for ${PROGRAM.holdingDays} days to account for refunds and processing.`}
        />
        <StatCard icon={Wallet} tone="bg-[#f0f9ff] text-[#0284c7]" label="Commission Balance" value={money(0)} help={`Eligible commissions waiting to be paid. Payouts start once this reaches ${money(PROGRAM.minimumPayout)}.`} />
        <StatCard
          icon={CalendarClock}
          tone="bg-[#f1f5f9] text-[#475569]"
          label="Upcoming Payout"
          value={longDay(nextPayoutDate(now))}
          sub={<span className="font-semibold text-[#059669]">{money(0)}</span>}
          help={`Payouts are sent on the ${PROGRAM.payoutDay}th of each month when your balance meets the minimum.`}
        />
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:flex-row sm:items-center sm:p-6">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#635bff] text-[15px] font-bold text-white">stripe</span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[17px] font-bold text-navy">
            Connect Stripe to receive your payouts
            <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.5px] text-[#64748b]">Coming soon</span>
          </p>
          <p className="mt-1 text-[14px] leading-5 text-[#64748b]">
            Commissions are paid through Stripe Connect. Payout setup opens here once partner payouts launch; we&apos;ll email you when it&apos;s ready.
          </p>
        </div>
        <button type="button" disabled className="h-11 shrink-0 cursor-not-allowed rounded-full bg-[#635bff] px-6 text-[14px] font-semibold text-white opacity-50">
          Connect Stripe
        </button>
      </section>

      <Card
        title="Earnings & Payout History"
        action={
          <button type="button" disabled title="Nothing to export yet" className="flex items-center gap-1.5 text-[14px] font-semibold text-[#94a3b8]">
            <Download className="size-4" /> Export CSV
          </button>
        }
      >
        <EmptyState
          icon={ReceiptText}
          title="No commission activity yet"
          body={`Commissions you earn from your referrals, adjustments, and payouts will be listed here with their status and dates. You earn ${PROGRAM.commissionRate}% of qualifying Swamped revenue from each referral for ${PROGRAM.commissionMonths} months.`}
        />
      </Card>
    </PartnerShell>
  );
}
