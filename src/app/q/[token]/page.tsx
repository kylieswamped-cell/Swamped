import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CustomerQuoteView, { ExpiredQuoteView } from "@/components/portal/CustomerQuoteView";
import { getPublicQuote } from "@/lib/portal/quotes";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your Quote — Swamped",
  // Customer links are private; keep them out of search results.
  robots: { index: false, follow: false },
  // Don't pass the private link on to sites the customer clicks through to.
  referrer: "no-referrer",
};

export default async function CustomerQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isSupabaseConfigured) notFound();
  const quote = await getPublicQuote(await createClient(), token);
  if (!quote) notFound();
  if (quote.expired) return <ExpiredQuoteView quote={quote} />;

  return <CustomerQuoteView token={token} quote={quote} />;
}
