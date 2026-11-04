import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import CustomerQuoteView from "@/components/portal/CustomerQuoteView";
import { requireOnboardingUser } from "@/lib/onboarding/server";
import { getQuotePreview } from "@/lib/portal/preview";

export const metadata: Metadata = {
  title: "Customer Preview — Swamped",
  robots: { index: false, follow: false },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The business owner's view of what the customer sees on this quote's link. */
export default async function QuotePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireOnboardingUser(`/quotes/${id}/preview`);
  if (!profile.onboarding_completed_at) redirect("/onboarding");
  if (!UUID_RE.test(id)) notFound();

  const result = await getQuotePreview(supabase, id);
  if (!result) notFound();

  return <CustomerQuoteView token="" quote={result.quote} preview={{ backHref: `/quotes/${id}`, draft: result.draft }} />;
}
