import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CustomerInvoiceView from "@/components/portal/CustomerInvoiceView";
import { getPublicInvoice } from "@/lib/portal/invoices";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your Invoice — Swamped",
  // Customer links are private; keep them out of search results.
  robots: { index: false, follow: false },
};

export default async function CustomerInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isSupabaseConfigured) notFound();
  const invoice = await getPublicInvoice(await createClient(), token);
  if (!invoice) notFound();

  return <CustomerInvoiceView token={token} invoice={invoice} />;
}
