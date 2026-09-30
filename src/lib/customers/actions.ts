"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type CustomerResult = { error?: string; fieldErrors?: Record<string, string>; id?: string };

export type CustomerInput = {
  name: string;
  email: string;
  phone: string;
  streetAddress: string;
  notes: string;
};

export type UploadedFile = { path: string; name: string; size: number; type: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

async function signedInUser() {
  if (!isSupabaseConfigured) return { error: "Customers aren't available right now." } as const;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email_confirmed_at) return { error: "Your session has expired. Please log in again." } as const;
  return { supabase, userId: data.user.id } as const;
}

function validate(input: CustomerInput) {
  const fieldErrors: Record<string, string> = {};
  if (!clean(input.name)) fieldErrors.name = "Enter the customer's name.";
  const email = clean(input.email);
  if (email && !EMAIL_RE.test(email)) fieldErrors.email = "Enter a valid email address.";
  return fieldErrors;
}

const toRow = (input: CustomerInput) => ({
  name: clean(input.name),
  email: clean(input.email),
  phone: clean(input.phone),
  street_address: clean(input.streetAddress),
  notes: clean(input.notes),
});

/** Uploaded files must sit in the user's own customers folder (storage policies enforce it too). */
function ownFiles(files: UploadedFile[] | undefined, userId: string) {
  return (files ?? []).filter(
    (f) => typeof f.path === "string" && f.path.startsWith(`${userId}/customers/`) && !f.path.includes(".."),
  );
}

async function attach(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerId: string,
  files: UploadedFile[],
) {
  if (!files.length) return null;
  const { error } = await supabase.from("customer_attachments").insert(
    files.map((f) => ({
      customer_id: customerId,
      path: f.path,
      name: f.name.slice(0, 200),
      size_bytes: f.size,
      content_type: f.type || null,
    })),
  );
  return error;
}

export async function createCustomer(input: CustomerInput, files?: UploadedFile[]): Promise<CustomerResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const fieldErrors = validate(input);
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const { data, error } = await ctx.supabase.from("customers").insert(toRow(input)).select("id").single();
  if (error || !data) return { error: "Couldn't add the customer. Please try again." };

  const attachError = await attach(ctx.supabase, data.id, ownFiles(files, ctx.userId));
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  if (attachError) return { id: data.id, error: "Customer added, but the files couldn't be saved." };
  return { id: data.id };
}

export async function updateCustomer(
  id: string,
  input: CustomerInput,
  files?: UploadedFile[],
): Promise<CustomerResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const fieldErrors = validate(input);
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  // RLS limits this to the user's own customer; no row means not theirs.
  const { data, error } = await ctx.supabase.from("customers").update(toRow(input)).eq("id", id).select("id");
  if (error || !data?.length) return { error: "Couldn't save the changes. Please try again." };

  const attachError = await attach(ctx.supabase, id, ownFiles(files, ctx.userId));
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  if (attachError) return { id, error: "Changes saved, but the files couldn't be added." };
  return { id };
}

export async function setCustomerArchived(id: string, archived: boolean): Promise<CustomerResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const { data, error } = await ctx.supabase
    .from("customers")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    return { error: `Couldn't ${archived ? "archive" : "unarchive"} this customer. Please try again.` };
  }
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return { id };
}

export async function deleteCustomer(id: string): Promise<CustomerResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };

  // Quotes are financial records: never delete them along with the customer.
  const { count } = await ctx.supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", id);
  if (count) {
    return {
      error: `This customer has ${count} quote${count === 1 ? "" : "s"}, so they can't be deleted. Archive them instead.`,
    };
  }

  const { data: files } = await ctx.supabase.from("customer_attachments").select("path").eq("customer_id", id);
  const { data, error } = await ctx.supabase.from("customers").delete().eq("id", id).select("id");
  if (error || !data?.length) return { error: "Couldn't delete this customer. Please try again." };

  // Attachment rows cascade; remove the stored files too.
  const paths = (files ?? []).map((f) => f.path);
  if (paths.length) await ctx.supabase.storage.from("attachments").remove(paths);
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return {};
}

export async function addCustomerFiles(customerId: string, files: UploadedFile[]): Promise<CustomerResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const error = await attach(ctx.supabase, customerId, ownFiles(files, ctx.userId));
  if (error) return { error: "Couldn't save the files. Please try again." };
  revalidatePath(`/customers/${customerId}`);
  return {};
}

export async function deleteCustomerFile(attachmentId: string): Promise<CustomerResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const { data } = await ctx.supabase
    .from("customer_attachments")
    .delete()
    .eq("id", attachmentId)
    .select("path, customer_id")
    .maybeSingle();
  if (!data) return { error: "Couldn't delete the file. Please try again." };
  await ctx.supabase.storage.from("attachments").remove([data.path]);
  revalidatePath(`/customers/${data.customer_id}`);
  return {};
}

/** A short-lived link to view or download one attachment. */
export async function customerFileUrl(attachmentId: string): Promise<{ url?: string; error?: string }> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const { data: row } = await ctx.supabase
    .from("customer_attachments")
    .select("path")
    .eq("id", attachmentId)
    .maybeSingle();
  if (!row) return { error: "File not found." };
  const { data, error } = await ctx.supabase.storage.from("attachments").createSignedUrl(row.path, 60);
  if (error || !data) return { error: "Couldn't open the file. Please try again." };
  return { url: data.signedUrl };
}
