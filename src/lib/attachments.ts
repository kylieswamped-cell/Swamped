import type { SupabaseClient } from "@supabase/supabase-js";

type FileRef = { path: string };
type Folder = "quotes" | "jobs" | "invoices";
const TABLE: Record<Folder, string> = { quotes: "quotes", jobs: "jobs", invoices: "invoices" };

/** Customer files live under "<user>/customers/"; quotes, jobs and invoices may point at them. */
export const isCustomerFile = (path: string) => /^[^/]+\/customers\//.test(path);

/**
 * The files a quote, job, or invoice may attach: ones uploaded to its own
 * folder, plus existing files of the record's own customer (reused without
 * uploading again).
 */
export async function allowedFiles<T extends FileRef>(
  supabase: SupabaseClient,
  userId: string,
  folder: Folder,
  recordId: string,
  files: T[] | undefined,
): Promise<T[]> {
  const safe = (files ?? []).filter((f) => typeof f.path === "string" && !f.path.includes(".."));
  const own = safe.filter((f) => f.path.startsWith(`${userId}/${folder}/`));
  const reused = safe.filter((f) => f.path.startsWith(`${userId}/customers/`));
  if (!reused.length) return own;

  const { data: record } = await supabase.from(TABLE[folder]).select("customer_id").eq("id", recordId).maybeSingle();
  if (!record) return own;
  const { data: rows } = await supabase
    .from("customer_attachments")
    .select("path")
    .eq("customer_id", record.customer_id)
    .in("path", reused.map((f) => f.path));
  const allowed = new Set((rows ?? []).map((r) => r.path as string));
  return [...own, ...reused.filter((f) => allowed.has(f.path))];
}

/** Stored files that can be deleted with a quote, job, or invoice; reused customer files stay. */
export const deletablePaths = (paths: string[]) => paths.filter((p) => !isCustomerFile(p));

/** True when a quote, job, or invoice still attaches this file. */
export async function fileInUse(supabase: SupabaseClient, path: string) {
  const counts = await Promise.all(
    ["quote_attachments", "job_attachments", "invoice_attachments"].map((t) =>
      supabase.from(t).select("id", { count: "exact", head: true }).eq("path", path),
    ),
  );
  return counts.some((c) => (c.count ?? 0) > 0);
}
