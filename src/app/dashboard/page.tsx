import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getDashboardStats } from "@/lib/dashboard/stats";
import { requireOnboardingUser } from "@/lib/onboarding/server";
import { checklistStatus } from "@/lib/onboarding/steps";

export const metadata: Metadata = {
  title: "Dashboard — Swamped",
};

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireOnboardingUser("/dashboard");
  // Anyone who hasn't finished onboarding goes back to the step they left off on.
  if (!profile.onboarding_completed_at) redirect("/onboarding");

  const stats = await getDashboardStats(supabase);

  return (
    <DashboardShell
      name={profile.contact_name || user.email || ""}
      checklist={checklistStatus(profile.onboarding_step, Boolean(profile.stripe_connected_at))}
    >
      <DashboardOverview stats={stats} />
    </DashboardShell>
  );
}
