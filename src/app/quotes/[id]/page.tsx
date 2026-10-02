import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import QuoteDetailView from "@/components/quotes/QuoteDetailView";
import { listJobCustomers, referenceTime } from "@/lib/jobs/data";
import { requireOnboardingUser } from "@/lib/onboarding/server";
import { getQuote } from "@/lib/quotes/data";

export const metadata: Metadata = {
  title: "Quote — Swamped",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { supabase, user, profile } = await requireOnboardingUser(`/quotes/${id}`);
  if (!profile.onboarding_completed_at) redirect("/onboarding");
  if (!UUID_RE.test(id)) notFound();

  const [quote, customers, query] = await Promise.all([getQuote(supabase, id), listJobCustomers(supabase), searchParams]);
  if (!quote) notFound();

  // The quote's own customer stays selectable when editing, even if archived since.
  const options =
    quote.customer && !customers.some((c) => c.id === quote.customerId)
      ? [{ id: quote.customerId, name: quote.customer.name }, ...customers]
      : customers;

  return (
    <DashboardShell name={profile.contact_name || user.email || ""} title="Quotes">
      <QuoteDetailView
        quote={quote}
        customers={options}
        defaults={{
          number: quote.number,
          terms: profile.quote_terms ?? "",
          expirationDays: profile.quote_expiration_days,
          taxRate: Number(profile.tax_rate) || 0,
          depositValue: Number(profile.deposit_value) || 0,
          depositType: profile.deposit_type,
        }}
        now={referenceTime()}
        openSend={query.send === "1"}
      />
    </DashboardShell>
  );
}
