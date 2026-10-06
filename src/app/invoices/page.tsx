import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import InvoicesView from "@/components/invoices/InvoicesView";
import { listInvoices, nextInvoiceNumber } from "@/lib/invoices/data";
import { listJobCustomers } from "@/lib/jobs/data";
import { requireOnboardingUser } from "@/lib/onboarding/server";

export const metadata: Metadata = {
  title: "Invoices — Swamped",
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase, user, profile } = await requireOnboardingUser("/invoices");
  if (!profile.onboarding_completed_at) redirect("/onboarding");

  const params = await searchParams;
  const [{ invoices, stats, now }, customers, invoiceNumber] = await Promise.all([
    listInvoices(supabase),
    listJobCustomers(supabase),
    nextInvoiceNumber(supabase),
  ]);
  const customer = typeof params.customer === "string" ? params.customer : undefined;

  return (
    <DashboardShell name={profile.contact_name || user.email || ""} title="Invoices">
      <InvoicesView
        invoices={invoices}
        stats={stats}
        now={now}
        customers={customers}
        defaults={{
          number: invoiceNumber,
          terms: profile.invoice_terms ?? "",
          dueDays: profile.invoice_due_days,
          taxRate: Number(profile.tax_rate) || 0,
        }}
        openNew={params.new === "1"}
        newForCustomer={customers.some((c) => c.id === customer) ? customer : undefined}
      />
    </DashboardShell>
  );
}
