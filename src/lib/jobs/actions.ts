"use server";

import { revalidatePath } from "next/cache";
import { sendJobEmail } from "@/lib/email/jobEmail";
import { getProfile } from "@/lib/onboarding/server";
import { quoteTotals } from "@/lib/quotes/totals";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getJob, JOB_STATUSES, nextJobNumber, type JobDetail, type JobStatus } from "./data";

export type JobResult = { error?: string; fieldErrors?: Record<string, string>; id?: string; notice?: string };

export type JobItemInput = { description: string; quantity: number; unitPrice: number; taxable: boolean };

export type JobInput = {
  customerId: string;
  title: string;
  status: JobStatus;
  /** ISO timestamps, or "" when not scheduled. */
  startsAt: string;
  endsAt: string;
  notes: string;
  terms: string;
  internalNotes: string;
  items: JobItemInput[];
};

export type UploadedJobFile = { path: string; name: string; size: number; type: string; internal: boolean };

const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function signedInUser() {
  if (!isSupabaseConfigured) return { error: "Jobs aren't available right now." } as const;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email_confirmed_at) return { error: "Your session has expired. Please log in again." } as const;
  return { supabase, userId: data.user.id } as const;
}

const toDate = (v: string) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

function validate(input: JobInput) {
  const fieldErrors: Record<string, string> = {};
  if (!UUID_RE.test(input.customerId ?? "")) fieldErrors.customerId = "Select a customer.";
  if (!clean(input.title)) fieldErrors.title = "Enter a job title.";
  if (!JOB_STATUSES.some((s) => s.value === input.status)) fieldErrors.status = "Select a job status.";
  const start = toDate(input.startsAt);
  const end = toDate(input.endsAt);
  if (input.startsAt && !start) fieldErrors.startsAt = "Enter a valid start date.";
  if (input.endsAt && !end) fieldErrors.endsAt = "Enter a valid end date.";
  if (start && end && end < start) fieldErrors.endsAt = "The end can't be before the start.";
  if (input.status !== "unscheduled" && !start) fieldErrors.startsAt = "Add a start date to schedule this job.";
  const items = input.items ?? [];
  if (items.some((i) => !clean(i.description))) fieldErrors.items = "Every line item needs a description.";
  else if (items.some((i) => !(Number(i.quantity) > 0))) fieldErrors.items = "Line item quantities must be more than 0.";
  else if (items.some((i) => !(Number(i.unitPrice) >= 0))) fieldErrors.items = "Line item prices can't be negative.";
  return fieldErrors;
}

function toRow(input: JobInput, taxRate: number) {
  const items = (input.items ?? []).map((i, position) => ({
    position,
    description: i.description.trim().slice(0, 500),
    quantity: Number(i.quantity),
    unit_price: Number(i.unitPrice),
    taxable: Boolean(i.taxable),
  }));
  const totals = quoteTotals(
    items.map((i) => ({ quantity: i.quantity, unitPrice: i.unit_price, taxable: i.taxable })),
    { discountValue: 0, discountType: "fixed", taxValue: taxRate, taxType: "percent", depositValue: 0, depositType: "fixed" },
  );
  return {
    items,
    job: {
      customer_id: input.customerId,
      title: clean(input.title),
      status: input.status,
      starts_at: toDate(input.startsAt)?.toISOString() ?? null,
      ends_at: toDate(input.endsAt)?.toISOString() ?? null,
      notes: clean(input.notes),
      terms: clean(input.terms),
      internal_notes: clean(input.internalNotes),
      tax_rate: taxRate,
      subtotal: totals.subtotal,
      tax_amount: totals.tax,
      total: totals.total,
    },
  };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Uploaded files must sit in the user's own jobs folder (storage policies enforce it too). */
async function attach(supabase: Supabase, userId: string, jobId: string, files: UploadedJobFile[] | undefined) {
  const own = (files ?? []).filter(
    (f) => typeof f.path === "string" && f.path.startsWith(`${userId}/jobs/`) && !f.path.includes(".."),
  );
  if (!own.length) return null;
  const { error } = await supabase.from("job_attachments").insert(
    own.map((f) => ({
      job_id: jobId,
      internal: Boolean(f.internal),
      path: f.path,
      name: f.name.slice(0, 200),
      size_bytes: f.size,
      content_type: f.type || null,
    })),
  );
  return error;
}

/** Emails the job to the customer and stamps it as sent. Returns a notice if it couldn't go out. */
async function send(supabase: Supabase, userId: string, jobId: string): Promise<string | undefined> {
  const [{ data: job }, { data: items }, profile] = await Promise.all([
    supabase
      .from("jobs")
      .select("job_number, title, starts_at, ends_at, notes, terms, subtotal, tax_amount, total, customers(name, email)")
      .eq("id", jobId)
      .maybeSingle<{
        job_number: string;
        title: string;
        starts_at: string | null;
        ends_at: string | null;
        notes: string | null;
        terms: string | null;
        subtotal: number;
        tax_amount: number;
        total: number;
        customers: { name: string; email: string | null } | null;
      }>(),
    supabase.from("job_items").select("description, quantity, unit_price").eq("job_id", jobId).order("position"),
    getProfile(supabase, userId),
  ]);
  if (!job) return "Job saved, but it couldn't be sent.";
  if (!job.customers?.email) return "Job saved, but it wasn't sent because this customer has no email address.";

  const sent = await sendJobEmail({
    to: job.customers.email,
    customerName: job.customers.name,
    businessName: profile.legal_business_name || "Your contractor",
    replyTo: profile.business_email || "",
    jobNumber: job.job_number,
    title: job.title,
    startsAt: job.starts_at,
    endsAt: job.ends_at,
    notes: job.notes,
    terms: job.terms,
    items: (items ?? []).map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unit_price),
    })),
    totals: { subtotal: Number(job.subtotal), tax: Number(job.tax_amount), total: Number(job.total) },
  });
  if (!sent.ok) return `Job saved, but the email wasn't sent: ${sent.reason}`;
  await supabase.from("jobs").update({ sent_at: new Date().toISOString() }).eq("id", jobId);
  return undefined;
}

function revalidate(id?: string) {
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  revalidatePath("/customers", "layout");
  if (id) revalidatePath(`/jobs/${id}`);
}

export async function createJob(input: JobInput, files: UploadedJobFile[], sendNow: boolean): Promise<JobResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const fieldErrors = validate(input);
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const profile = await getProfile(ctx.supabase, ctx.userId);
  const { job, items } = toRow(input, Number(profile.tax_rate) || 0);

  // Two jobs saved at once can race for a number; retry once with a fresh one.
  let created: { id: string } | null = null;
  for (let attempt = 0; attempt < 2 && !created; attempt++) {
    const jobNumber = await nextJobNumber(ctx.supabase);
    const { data, error } = await ctx.supabase
      .from("jobs")
      .insert({ ...job, job_number: jobNumber })
      .select("id")
      .single();
    if (data) created = data;
    else if (error?.code !== "23505") break;
  }
  if (!created) return { error: "Couldn't create the job. Please try again." };

  if (items.length) {
    const { error } = await ctx.supabase.from("job_items").insert(items.map((i) => ({ ...i, job_id: created.id })));
    if (error) {
      await ctx.supabase.from("jobs").delete().eq("id", created.id);
      return { error: "Couldn't save the line items. Please try again." };
    }
  }

  const attachError = await attach(ctx.supabase, ctx.userId, created.id, files);
  const notice = sendNow ? await send(ctx.supabase, ctx.userId, created.id) : undefined;
  revalidate(created.id);
  return {
    id: created.id,
    notice: attachError ? "Job created, but the files couldn't be saved." : notice,
  };
}

export async function updateJob(
  id: string,
  input: JobInput,
  files: UploadedJobFile[],
  sendNow: boolean,
): Promise<JobResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const fieldErrors = validate(input);
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  // Keep the tax rate the job was created with.
  const { data: existing } = await ctx.supabase.from("jobs").select("tax_rate").eq("id", id).maybeSingle();
  if (!existing) return { error: "Couldn't find this job." };
  const { job, items } = toRow(input, Number(existing.tax_rate));

  const { data, error } = await ctx.supabase.from("jobs").update(job).eq("id", id).select("id");
  if (error || !data?.length) return { error: "Couldn't save the changes. Please try again." };

  // Add the new items before removing the old ones, so a failure never leaves the job empty.
  const { data: old } = await ctx.supabase.from("job_items").select("id").eq("job_id", id);
  if (items.length) {
    const { error: itemsError } = await ctx.supabase.from("job_items").insert(items.map((i) => ({ ...i, job_id: id })));
    if (itemsError) return { id, error: "The job was saved, but its line items couldn't be. Please try again." };
  }
  const oldIds = (old ?? []).map((i) => i.id);
  if (oldIds.length) await ctx.supabase.from("job_items").delete().in("id", oldIds);

  const attachError = await attach(ctx.supabase, ctx.userId, id, files);
  const notice = sendNow ? await send(ctx.supabase, ctx.userId, id) : undefined;
  revalidate(id);
  return { id, notice: attachError ? "Changes saved, but the files couldn't be added." : notice };
}

export async function setJobArchived(id: string, archived: boolean): Promise<JobResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const { data, error } = await ctx.supabase
    .from("jobs")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { error: `Couldn't ${archived ? "archive" : "unarchive"} this job. Please try again.` };
  revalidate(id);
  return { id };
}

export async function deleteJob(id: string): Promise<JobResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const { data: files } = await ctx.supabase.from("job_attachments").select("path").eq("job_id", id);
  const { data, error } = await ctx.supabase.from("jobs").delete().eq("id", id).select("id");
  if (error || !data?.length) return { error: "Couldn't delete this job. Please try again." };

  // Item and attachment rows cascade; remove the stored files too.
  const paths = (files ?? []).map((f) => f.path);
  if (paths.length) await ctx.supabase.storage.from("attachments").remove(paths);
  revalidate();
  return {};
}

export async function deleteJobFile(attachmentId: string): Promise<JobResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const { data } = await ctx.supabase
    .from("job_attachments")
    .delete()
    .eq("id", attachmentId)
    .select("path, job_id")
    .maybeSingle();
  if (!data) return { error: "Couldn't delete the file. Please try again." };
  await ctx.supabase.storage.from("attachments").remove([data.path]);
  revalidate(data.job_id);
  return {};
}

/** A short-lived link to view or download one attachment. */
export async function jobFileUrl(attachmentId: string): Promise<{ url?: string; error?: string }> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const { data: row } = await ctx.supabase.from("job_attachments").select("path").eq("id", attachmentId).maybeSingle();
  if (!row) return { error: "File not found." };
  const { data, error } = await ctx.supabase.storage.from("attachments").createSignedUrl(row.path, 60);
  if (error || !data) return { error: "Couldn't open the file. Please try again." };
  return { url: data.signedUrl };
}

/** The full job, for opening it in the job form. */
export async function loadJob(id: string): Promise<{ job?: JobDetail; error?: string }> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  if (!UUID_RE.test(id)) return { error: "Couldn't find this job." };
  const job = await getJob(ctx.supabase, id);
  return job ? { job } : { error: "Couldn't find this job." };
}
