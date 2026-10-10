import type { SupabaseClient } from "@supabase/supabase-js";
import type { AmountType } from "@/lib/quotes/totals";
import { TOKEN_RE } from "./quotes";

/** What the customer sees: "outstanding" covers sent and partly paid invoices. */
export type PublicInvoiceState = "paid" | "outstanding" | "past_due" | "void";

export type PublicInvoice = {
  number: string;
  title: string | null;
  status: "sent" | "void";
  invoiceDate: string;
  dueOn: string;
  dueDays: number;
  message: string | null;
  terms: string | null;
  paidAt: string | null;
  quoteNumber: string | null;
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    depositCredit: number;
    amountPaid: number;
    taxValue: number;
    taxType: AmountType;
  };
  balance: number;
  state: PublicInvoiceState;
  customer: { name: string; email: string | null; phone: string | null; address: string | null };
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

/** The invoice behind a customer link, or null if the link is wrong or the invoice isn't shared. */
export async function getPublicInvoice(supabase: SupabaseClient, token: string): Promise<PublicInvoice | null> {
  if (!TOKEN_RE.test(token)) return null;
  const { data, error } = await supabase.rpc("get_public_invoice", { p_token: token });
  if (error) throw new Error(`Couldn't load the invoice: ${error.message}`);
  if (!data) return null;

  const i = data as Omit<PublicInvoice, "balance" | "state"> & { today: string };
  const num = (v: unknown) => Number(v) || 0;
  const totals = {
    ...i.totals,
    subtotal: num(i.totals.subtotal),
    discount: num(i.totals.discount),
    tax: num(i.totals.tax),
    total: num(i.totals.total),
    depositCredit: num(i.totals.depositCredit),
    amountPaid: num(i.totals.amountPaid),
    taxValue: num(i.totals.taxValue),
  };
  // Same rule as the contractor side (balanceOf in lib/invoices/data).
  const balance = Math.max(0, Math.round((totals.total - totals.depositCredit - totals.amountPaid) * 100) / 100);
  const state: PublicInvoiceState =
    i.status === "void" ? "void" : balance <= 0 ? "paid" : i.dueOn < i.today ? "past_due" : "outstanding";

  return {
    number: i.number,
    title: i.title,
    status: i.status,
    invoiceDate: i.invoiceDate,
    dueOn: i.dueOn,
    dueDays: num(i.dueDays),
    message: i.message,
    terms: i.terms,
    paidAt: i.paidAt,
    quoteNumber: i.quoteNumber,
    totals,
    balance,
    state,
    customer: i.customer,
    business: i.business,
    items: i.items.map((it) => ({ ...it, quantity: num(it.quantity), unitPrice: num(it.unitPrice) })),
    attachments: i.attachments,
  };
}
