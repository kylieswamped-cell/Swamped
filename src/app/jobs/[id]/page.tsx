import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import JobDetailView from "@/components/jobs/JobDetailView";
import { getJob, listJobCustomers, referenceTime } from "@/lib/jobs/data";
import { requireOnboardingUser } from "@/lib/onboarding/server";

export const metadata: Metadata = {
  title: "Job — Swamped",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await requireOnboardingUser(`/jobs/${id}`);
  if (!profile.onboarding_completed_at) redirect("/onboarding");
  if (!UUID_RE.test(id)) notFound();

  const [job, customers] = await Promise.all([getJob(supabase, id), listJobCustomers(supabase)]);
  if (!job) notFound();

  // The job's own customer stays selectable when editing, even if archived since.
  const options =
    job.customer && !customers.some((c) => c.id === job.customerId)
      ? [{ id: job.customerId, name: job.customer.name }, ...customers]
      : customers;

  return (
    <DashboardShell name={profile.contact_name || user.email || ""} title="Jobs">
      <JobDetailView job={job} customers={options} defaultTerms={profile.quote_terms ?? ""} now={referenceTime()} />
    </DashboardShell>
  );
}
