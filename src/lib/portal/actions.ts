"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getPublicInvoice } from "./invoices";
import { getPublicQuote, TOKEN_RE } from "./quotes";

const ACCEPT_ERRORS: Record<string, string> = {
  not_found: "This quote is no longer available.",
  declined: "This quote was declined and can't be approved.",
  expired: "This quote has expired. Please contact the business for an updated quote.",
};

/** The customer approves the quote behind their link. */
export async function acceptPublicQuote(token: string): Promise<{ ok?: true; error?: string }> {
  if (!isSupabaseConfigured || !TOKEN_RE.test(token)) return { error: ACCEPT_ERRORS.not_found };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_public_quote", { p_token: token });
  if (error || !data) return { error: "Couldn't approve the quote. Please try again." };
  const result = data as { status?: string; error?: string };
  if (result.error) return { error: ACCEPT_ERRORS[result.error] ?? ACCEPT_ERRORS.not_found };

  revalidatePath(`/q/${token}`);
  revalidatePath("/quotes", "layout");
  return { ok: true };
}

/** A short-lived link to one of the customer-facing files on a quote or invoice. */
export async function publicFileUrl(kind: "quote" | "invoice", token: string, path: string): Promise<{ url?: string; error?: string }> {
  if (!isSupabaseConfigured) return { error: "File not found." };
  const supabase = await createClient();
  // Only hand out files that belong to the document behind this link.
  const doc = kind === "quote" ? await getPublicQuote(supabase, token) : await getPublicInvoice(supabase, token);
  const file = doc?.attachments.find((a) => a.path === path);
  if (!file) return { error: "File not found." };
  const { data, error } = await supabase.storage.from("attachments").createSignedUrl(path, 60, { download: file.name });
  if (error || !data) return { error: "Couldn't open the file. Please try again." };
  return { url: data.signedUrl };
}
