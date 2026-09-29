import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardStats } from "@/components/dashboard/DashboardOverview";

/** Jobs and payments don't exist yet, so only quotes contribute for now. */
export async function getDashboardStats(supabase: SupabaseClient): Promise<DashboardStats> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("sent_at", since);
  return { activeJobs: 0, awaitingPayment: 0, quotesSent30d: count ?? 0, revenue30d: 0 };
}
