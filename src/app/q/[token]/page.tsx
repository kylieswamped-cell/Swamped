import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CustomerQuoteView from "@/components/portal/CustomerQuoteView";
import { getPublicQuote } from "@/lib/portal/quotes";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your Quote — Swamped",
  // Customer links are private; keep them out of search results.
  robots: { index: false, follow: false },
};

export default async function CustomerQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isSupabaseConfigured) notFound();
  const quote = await getPublicQuote(await createClient(), token);
  if (!quote) notFound();

  return <CustomerQuoteView token={token} quote={quote} />;
}
