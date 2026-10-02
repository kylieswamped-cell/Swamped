import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import QuotesView from "@/components/quotes/QuotesView";
import { listJobCustomers } from "@/lib/jobs/data";
import { requireOnboardingUser } from "@/lib/onboarding/server";
import { listQuotes, nextQuoteNumber } from "@/lib/quotes/data";

export const metadata: Metadata = {
  title: "Quotes — Swamped",
};

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase, user, profile } = await requireOnboardingUser("/quotes");
  if (!profile.onboarding_completed_at) redirect("/onboarding");

  const params = await searchParams;
  const [{ quotes, stats, now }, customers, quoteNumber] = await Promise.all([
    listQuotes(supabase),
    listJobCustomers(supabase),
    nextQuoteNumber(supabase),
  ]);
  const customer = typeof params.customer === "string" ? params.customer : undefined;

  return (
    <DashboardShell name={profile.contact_name || user.email || ""} title="Quotes">
      <QuotesView
        quotes={quotes}
        stats={stats}
        now={now}
        customers={customers}
        defaults={{
          number: quoteNumber,
          terms: profile.quote_terms ?? "",
          expirationDays: profile.quote_expiration_days,
          taxRate: Number(profile.tax_rate) || 0,
          depositValue: Number(profile.deposit_value) || 0,
          depositType: profile.deposit_type,
        }}
        openNew={params.new === "1"}
        newForCustomer={customers.some((c) => c.id === customer) ? customer : undefined}
      />
    </DashboardShell>
  );
}
