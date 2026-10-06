import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import PaymentsView from "@/components/payments/PaymentsView";
import { requireOnboardingUser } from "@/lib/onboarding/server";
import { listTransactions } from "@/lib/payments/data";

export const metadata: Metadata = {
  title: "Payments — Swamped",
};

export default async function PaymentsPage() {
  const { supabase, user, profile } = await requireOnboardingUser("/payments");
  if (!profile.onboarding_completed_at) redirect("/onboarding");

  const { transactions, stats, now } = await listTransactions(supabase);

  return (
    <DashboardShell name={profile.contact_name || user.email || ""} title="Payments">
      <PaymentsView transactions={transactions} stats={stats} now={now} />
    </DashboardShell>
  );
}
