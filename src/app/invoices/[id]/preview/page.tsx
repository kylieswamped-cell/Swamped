import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import CustomerInvoiceView from "@/components/portal/CustomerInvoiceView";
import { requireOnboardingUser } from "@/lib/onboarding/server";
import { getInvoicePreview } from "@/lib/portal/preview";

export const metadata: Metadata = {
  title: "Customer Preview — Swamped",
  robots: { index: false, follow: false },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The business owner's view of what the customer sees on this invoice's link. */
export default async function InvoicePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireOnboardingUser(`/invoices/${id}/preview`);
  if (!profile.onboarding_completed_at) redirect("/onboarding");
  if (!UUID_RE.test(id)) notFound();

  const result = await getInvoicePreview(supabase, id);
  if (!result) notFound();

  return <CustomerInvoiceView token="" invoice={result.invoice} preview={{ backHref: `/invoices/${id}`, draft: result.draft }} />;
}
