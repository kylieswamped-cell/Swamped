import type { SupabaseClient } from "@supabase/supabase-js";
import type { AmountType } from "@/lib/quotes/totals";

export type PublicQuote = {
  number: string;
  title: string | null;
  status: "sent" | "accepted" | "declined";
  quoteDate: string;
  expiresOn: string | null;
  expired: boolean;
  message: string | null;
  terms: string | null;
  acceptedAt: string | null;
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    deposit: number;
    taxValue: number;
    taxType: AmountType;
    depositValue: number;
    depositType: AmountType;
  };
  depositReceived: number | null;
  customer: { name: string; address: string | null };
  business: {
    name: string | null;
    street: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
  };
  items: { description: string; quantity: number; unitPrice: number; taxable: boolean }[];
  attachments: { name: string; path: string; sizeBytes: number | null }[];
};

export const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The quote behind a customer link, or null if the link is wrong or the quote isn't shared. */
export async function getPublicQuote(supabase: SupabaseClient, token: string): Promise<PublicQuote | null> {
  if (!TOKEN_RE.test(token)) return null;
  const { data, error } = await supabase.rpc("get_public_quote", { p_token: token });
  if (error) throw new Error(`Couldn't load the quote: ${error.message}`);
  if (!data) return null;

  const q = data as PublicQuote;
  const num = (v: unknown) => Number(v) || 0;
  return {
    ...q,
    totals: {
      ...q.totals,
      subtotal: num(q.totals.subtotal),
      discount: num(q.totals.discount),
      tax: num(q.totals.tax),
      total: num(q.totals.total),
      deposit: num(q.totals.deposit),
      taxValue: num(q.totals.taxValue),
      depositValue: num(q.totals.depositValue),
    },
    depositReceived: q.depositReceived == null ? null : num(q.depositReceived),
    items: q.items.map((i) => ({ ...i, quantity: num(i.quantity), unitPrice: num(i.unitPrice) })),
  };
}
