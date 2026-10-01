import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardStats } from "@/components/dashboard/StatCards";
import { countActiveJobs } from "@/lib/jobs/data";

/** Payments don't exist yet, so payment figures stay at zero for now. */
export async function getDashboardStats(supabase: SupabaseClient): Promise<DashboardStats> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ count }, activeJobs] = await Promise.all([
    supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", since),
    countActiveJobs(supabase),
  ]);
  return { activeJobs, awaitingPayment: 0, quotesSent30d: count ?? 0, revenue30d: 0 };
}

export type ActivityStatus = "Pending" | "Draft" | "Accepted" | "Declined" | "New";

export type ActivityItem = {
  id: string;
  /** Searchable reference, e.g. a quote number. */
  reference: string | null;
  customer: string;
  type: string;
  amount: number | null;
  status: ActivityStatus;
  at: string;
};

const QUOTE_ACTIVITY: Record<string, { type: string; status: ActivityStatus }> = {
  draft: { type: "Quote Saved", status: "Draft" },
  sent: { type: "Quote Sent", status: "Pending" },
  accepted: { type: "Quote Accepted", status: "Accepted" },
  declined: { type: "Quote Declined", status: "Declined" },
};

type QuoteRow = {
  id: string;
  quote_number: string;
  status: string;
  total: number;
  created_at: string;
  sent_at: string | null;
  customers: { name: string } | null;
};

/**
 * Newest-first feed built from quotes and customers (jobs/invoices/payments later).
 * `now` is the reference time for "2 hours ago", so server and browser agree.
 */
export async function getRecentActivity(
  supabase: SupabaseClient,
  limit = 50,
): Promise<{ items: ActivityItem[]; now: number }> {
  const [{ data: quotes }, { data: customers }] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, quote_number, status, total, created_at, sent_at, customers(name)")
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<QuoteRow[]>(),
    supabase
      .from("customers")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const items: ActivityItem[] = [
    ...(quotes ?? []).map((q) => {
      const kind = QUOTE_ACTIVITY[q.status] ?? QUOTE_ACTIVITY.draft;
      return {
        id: `quote-${q.id}`,
        reference: q.quote_number,
        customer: q.customers?.name ?? "Unknown customer",
        type: kind.type,
        amount: Number(q.total),
        status: kind.status,
        at: q.sent_at ?? q.created_at,
      };
    }),
    ...(customers ?? []).map((c) => ({
      id: `customer-${c.id}`,
      reference: null,
      customer: c.name as string,
      type: "Customer Added",
      amount: null,
      status: "New" as const,
      at: c.created_at as string,
    })),
  ];

  return { items: items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit), now: Date.now() };
}

export type RevenuePoint = { month: string; label: string; revenue: number };

/** The last 12 calendar months, oldest first. Payments aren't recorded yet, so revenue is 0. */
export function getRevenueSeries(now = new Date()): RevenuePoint[] {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return {
      month: d.toLocaleDateString("en-US", { month: "short" }),
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      revenue: 0,
    };
  });
}
