import { CalendarCheck, CircleDollarSign, Clock, Lock, Percent, PiggyBank, Rocket, TrendingUp, Users } from "lucide-react";
import type { Metadata } from "next";
import { referenceTime } from "@/lib/jobs/data";
import Link from "next/link";
import PartnerShell from "@/components/partner-portal/PartnerShell";
import RecentActivity from "@/components/partner-portal/RecentActivity";
import { Card, ReferralLinkBox, StatCard, longDay, money } from "@/components/partner-portal/ui";
import { referralUrl } from "@/lib/partners/portal";
import { PROGRAM, PROGRAM_TERMS, nextPayoutDate } from "@/lib/partners/program";
import { listReferrals, requirePartner } from "@/lib/partners/server";

export const metadata: Metadata = { title: "Partner Dashboard — Swamped" };

const TERM_ICONS = { rate: Percent, term: Clock, schedule: CalendarCheck, hold: Lock, minimum: PiggyBank } as const;

export default async function PartnerDashboardPage() {
  const { supabase, partner } = await requirePartner();
  const [referrals, url] = await Promise.all([listReferrals(supabase), referralUrl(partner)]);
  const now = await referenceTime();
  const since30 = now - 30 * 864e5;
  const active = referrals.filter((r) => r.activatedAt).length;
  const newSignups = referrals.filter((r) => new Date(r.signedUpAt).getTime() >= since30).length;
  const firstName = partner.fullName.split(/\s+/)[0];

  // Commission figures stay at zero until Swamped earns revenue from referred
  // accounts and Stripe payouts are connected.
  return (
    <PartnerShell title={`Welcome Back, ${firstName}`} subtitle="Here's a snapshot of what's happening in your partner account today." name={partner.fullName} status={partner.status}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={TrendingUp} tone="bg-[#eff6ff] text-[#2563eb]" label="Lifetime Earnings" value={money(0)} />
        <StatCard icon={Users} tone="bg-[#fff7ed] text-[#ea580c]" label="Active Referrals" value={String(active)} sub={`${referrals.length} signed up in total`} help="Referred contractors who finished setting up their Swamped account." />
        <StatCard icon={Rocket} tone="bg-[#f5f3ff] text-[#7c3aed]" label="New Signups (30d)" value={String(newSignups)} />
        <StatCard icon={CircleDollarSign} tone="bg-[#ecfdf5] text-[#059669]" label="Commission Paid (30d)" value={money(0)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Your Referral Link" subtitle="Share this link to receive credit when someone signs up for Swamped.">
          <ReferralLinkBox url={url} stacked />
        </Card>
        <Card title="Upcoming Payout Summary">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            {[
              ["Pending Balance", money(0)],
              ["Next Payout Eligible", money(0)],
              ["Expected Date", longDay(nextPayoutDate(now))],
              ["Min. Threshold", money(PROGRAM.minimumPayout)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] font-bold uppercase tracking-[0.6px] text-[#64748b]">{k}</dt>
                <dd className="mt-1 text-[18px] font-bold text-navy">{v}</dd>
              </div>
            ))}
          </dl>
          <Link href="/partner/earnings" className="mt-5 flex h-11 items-center justify-center rounded-xl border border-line text-[14px] font-semibold text-navy transition-colors hover:bg-[#f8fafc]">
            View Earnings &amp; Payouts
          </Link>
        </Card>
      </div>

      <RecentActivity referrals={referrals} now={now} />

      <Card title="Partner Program Summary">
        <ul className="flex flex-col gap-3">
          {PROGRAM_TERMS.map((t) => {
            const Icon = TERM_ICONS[t.key];
            return (
              <li key={t.key} className="flex items-start gap-4 rounded-xl bg-[#f8fafc] px-4 py-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#059669]">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-navy">{t.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-5 text-[#64748b]">{t.body}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </PartnerShell>
  );
}
