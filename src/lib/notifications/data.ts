import type { SupabaseClient } from "@supabase/supabase-js";
import { stateOf, todayIso } from "@/lib/invoices/data";
import { formatMoney } from "@/lib/quotes/totals";

export type NotificationKind = "quote-approved" | "deposit" | "payment" | "overdue";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  /** Bold lead-in, e.g. the customer's name. */
  title: string;
  body: string;
  href: string;
  at: string;
  unread: boolean;
};

const WINDOW_DAYS = 30;
const LIMIT = 20;

type Named = { name: string } | null;

/**
 * Notifications are derived from records the app already keeps, newest first:
 * customer quote approvals, deposits and invoice payments received, and
 * invoices that went past due. "Unread" means newer than notifications_seen_at.
 */
export async function getNotifications(
  supabase: SupabaseClient,
  seenAt: string | null,
): Promise<{ items: AppNotification[]; now: number }> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const today = todayIso();

  const [approved, deposits, payments, overdue] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, quote_number, customer_accepted_at, accepted_by_name, customers(name)")
      .gte("customer_accepted_at", since)
      .returns<{ id: string; quote_number: string; customer_accepted_at: string; accepted_by_name: string | null; customers: Named }[]>(),
    supabase
      .from("quotes")
      .select("id, quote_number, deposit_received_at, deposit_received_amount, customers(name)")
      .gte("deposit_received_at", since)
      .returns<{ id: string; quote_number: string; deposit_received_at: string; deposit_received_amount: number; customers: Named }[]>(),
    supabase
      .from("invoice_payments")
      .select("id, amount, created_at, invoice_id, invoices(invoice_number, customers(name))")
      .gte("created_at", since)
      .returns<{ id: string; amount: number; created_at: string; invoice_id: string; invoices: { invoice_number: string; customers: Named } | null }[]>(),
    supabase
      .from("invoices")
      .select("id, invoice_number, status, archived_at, due_on, total, deposit_credit, amount_paid, customers(name)")
      .eq("status", "sent")
      .is("archived_at", null)
      .lt("due_on", today)
      .gte("due_on", since.slice(0, 10))
      .returns<{
        id: string;
        invoice_number: string;
        status: "sent";
        archived_at: null;
        due_on: string;
        total: number;
        deposit_credit: number;
        amount_paid: number;
        customers: Named;
      }[]>(),
  ]);

  const items: Omit<AppNotification, "unread">[] = [
    ...(approved.data ?? []).map((q) => ({
      id: `approved-${q.id}`,
      kind: "quote-approved" as const,
      title: q.accepted_by_name || q.customers?.name || "Your customer",
      body: `approved Quote ${q.quote_number}.`,
      href: `/quotes/${q.id}`,
      at: q.customer_accepted_at,
    })),
    ...(deposits.data ?? []).map((q) => ({
      id: `deposit-${q.id}`,
      kind: "deposit" as const,
      title: `Deposit of ${formatMoney(Number(q.deposit_received_amount))}`,
      body: `received for Quote ${q.quote_number}${q.customers ? ` from ${q.customers.name}` : ""}.`,
      href: `/quotes/${q.id}`,
      at: q.deposit_received_at,
    })),
    ...(payments.data ?? []).map((p) => ({
      id: `payment-${p.id}`,
      kind: "payment" as const,
      title: `Payment of ${formatMoney(Number(p.amount))}`,
      body: `received for Invoice ${p.invoices?.invoice_number ?? ""}${p.invoices?.customers ? ` from ${p.invoices.customers.name}` : ""}.`,
      href: `/invoices/${p.invoice_id}`,
      at: p.created_at,
    })),
    ...(overdue.data ?? [])
      .filter((i) => stateOf(i, today) === "overdue")
      .map((i) => ({
        id: `overdue-${i.id}`,
        kind: "overdue" as const,
        title: `Invoice ${i.invoice_number}`,
        body: `for ${i.customers?.name ?? "your customer"} is past due.`,
        href: `/invoices/${i.id}`,
        // It became overdue the day after its due date.
        at: new Date(Date.parse(`${i.due_on}T00:00:00Z`) + 86_400_000).toISOString(),
      })),
  ];

  const sorted = items
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, LIMIT)
    .map((n) => ({ ...n, unread: !seenAt || n.at > seenAt }));
  // `now` is the reference time for "2h ago", so server and browser agree.
  return { items: sorted, now: Date.now() };
}
