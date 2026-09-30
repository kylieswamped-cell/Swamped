import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ActivityPanel from "@/components/dashboard/ActivityPanel";
import DashboardShell from "@/components/dashboard/DashboardShell";
import PartnerCta from "@/components/dashboard/PartnerCta";
import QuickActions from "@/components/dashboard/QuickActions";
import RevenueChart from "@/components/dashboard/RevenueChart";
import StatCards from "@/components/dashboard/StatCards";
import { getDashboardStats, getRecentActivity, getRevenueSeries } from "@/lib/dashboard/stats";
import { requireOnboardingUser } from "@/lib/onboarding/server";

export const metadata: Metadata = {
  title: "Dashboard — Swamped",
};

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireOnboardingUser("/dashboard");
  // Anyone who hasn't finished onboarding goes back to the step they left off on.
  if (!profile.onboarding_completed_at) redirect("/onboarding");

  const [stats, activity] = await Promise.all([getDashboardStats(supabase), getRecentActivity(supabase)]);

  return (
    <DashboardShell
      name={profile.contact_name || user.email || ""}
      subtitle="Here's a snapshot of what's happening in your business today."
    >
      <div className="flex flex-col px-4 pb-10 pt-6 sm:pl-8 sm:pr-[39px] sm:pt-[29px]">
        <StatCards stats={stats} />
        <div className="mt-[26px]">
          <QuickActions />
        </div>
        <div className="mt-[25px] flex flex-col gap-3.5">
          <ActivityPanel items={activity.items} now={activity.now} />
          <RevenueChart data={getRevenueSeries()} />
          <PartnerCta />
        </div>
      </div>
    </DashboardShell>
  );
}
