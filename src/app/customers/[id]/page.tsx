import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import CustomerDetail from "@/components/customers/CustomerDetail";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getCustomer } from "@/lib/customers/data";
import { requireOnboardingUser } from "@/lib/onboarding/server";

export const metadata: Metadata = {
  title: "Customer — Swamped",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await requireOnboardingUser(`/customers/${id}`);
  if (!profile.onboarding_completed_at) redirect("/onboarding");
  if (!UUID_RE.test(id)) notFound();

  const customer = await getCustomer(supabase, id);
  if (!customer) notFound();

  return (
    <DashboardShell
      name={profile.contact_name || user.email || ""}
      title="Customers"
      subtitle="View and manage your customer information."
    >
      <CustomerDetail customer={customer} />
    </DashboardShell>
  );
}
