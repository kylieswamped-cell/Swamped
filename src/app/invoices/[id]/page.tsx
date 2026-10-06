import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import InvoiceDetailView from "@/components/invoices/InvoiceDetailView";
import { getInvoice } from "@/lib/invoices/data";
import { listJobCustomers } from "@/lib/jobs/data";
import { requireOnboardingUser } from "@/lib/onboarding/server";

export const metadata: Metadata = {
  title: "Invoice — Swamped",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { supabase, user, profile } = await requireOnboardingUser(`/invoices/${id}`);
  if (!profile.onboarding_completed_at) redirect("/onboarding");
  if (!UUID_RE.test(id)) notFound();

  const [invoice, customers, query] = await Promise.all([getInvoice(supabase, id), listJobCustomers(supabase), searchParams]);
  if (!invoice) notFound();

  // The invoice's own customer stays selectable when editing, even if archived since.
  const options =
    invoice.customer && !customers.some((c) => c.id === invoice.customerId)
      ? [{ id: invoice.customerId, name: invoice.customer.name }, ...customers]
      : customers;

  return (
    <DashboardShell name={profile.contact_name || user.email || ""} title="Invoices">
      <InvoiceDetailView
        invoice={invoice}
        customers={options}
        defaults={{
          number: invoice.number,
          terms: profile.invoice_terms ?? "",
          dueDays: profile.invoice_due_days,
          taxRate: Number(profile.tax_rate) || 0,
        }}
        openSend={query.send === "1"}
      />
    </DashboardShell>
  );
}
