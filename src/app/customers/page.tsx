import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CustomerStatCards from "@/components/customers/CustomerStatCards";
import CustomersView from "@/components/customers/CustomersView";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { customerStats, listCustomers } from "@/lib/customers/data";
import { requireOnboardingUser } from "@/lib/onboarding/server";

export const metadata: Metadata = {
  title: "Customers — Swamped",
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase, user, profile } = await requireOnboardingUser("/customers");
  if (!profile.onboarding_completed_at) redirect("/onboarding");

  const params = await searchParams;
  const archived = params.tab === "archived";
  const [{ customers, now }, stats] = await Promise.all([listCustomers(supabase, archived), customerStats(supabase)]);

  return (
    <DashboardShell
      name={profile.contact_name || user.email || ""}
      title="Customers"
      subtitle="View and manage your customer information."
    >
      <div className="px-4 pb-12 pt-6 sm:pl-10 sm:pr-8 sm:pt-[55px]">
        <CustomerStatCards stats={stats} />
        <div className="mt-[34px]">
          <CustomersView
            key={archived ? "archived" : "active"}
            customers={customers}
            archived={archived}
            now={now}
            openNew={!archived && params.new === "1"}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
