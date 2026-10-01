import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import JobsView from "@/components/jobs/JobsView";
import { listJobCustomers, listJobs, nextJobNumber } from "@/lib/jobs/data";
import { requireOnboardingUser } from "@/lib/onboarding/server";

export const metadata: Metadata = {
  title: "Jobs — Swamped",
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase, user, profile } = await requireOnboardingUser("/jobs");
  if (!profile.onboarding_completed_at) redirect("/onboarding");

  const params = await searchParams;
  const [{ jobs, stats, now }, customers, jobNumber] = await Promise.all([
    listJobs(supabase),
    listJobCustomers(supabase),
    nextJobNumber(supabase),
  ]);
  const customer = typeof params.customer === "string" ? params.customer : undefined;

  return (
    <DashboardShell name={profile.contact_name || user.email || ""} title="Jobs">
      <JobsView
        jobs={jobs}
        stats={stats}
        now={now}
        customers={customers}
        nextNumber={jobNumber}
        defaultTerms={profile.quote_terms ?? ""}
        openNew={params.new === "1"}
        newForCustomer={customers.some((c) => c.id === customer) ? customer : undefined}
      />
    </DashboardShell>
  );
}
