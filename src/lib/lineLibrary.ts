"use server";

import { MAX_LINE_TEXT, itemName } from "@/lib/lineItems";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type LibraryItem = { id: string; description: string; unitPrice: number; taxable: boolean };

const MAX_ITEMS = 500;

async function signedIn() {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? supabase : null;
}

/** The user's saved line items, newest first. */
export async function listLibraryItems(): Promise<{ items?: LibraryItem[]; error?: string }> {
  const supabase = await signedIn();
  if (!supabase) return { error: "Your session has expired. Please log in again." };
  const { data, error } = await supabase
    .from("line_item_library")
    .select("id, description, unit_price, taxable")
    .order("created_at", { ascending: false })
    .limit(MAX_ITEMS);
  if (error) return { error: "Couldn't load your saved line items." };
  return { items: (data ?? []).map((r) => ({ id: r.id, description: r.description, unitPrice: Number(r.unit_price), taxable: r.taxable })) };
}

/**
 * Saves a line item for reuse. Without an `id`, an item with the same text is
 * updated instead of duplicated; with one, that saved item is edited.
 */
export async function saveLibraryItem(input: {
  id?: string;
  description: string;
  unitPrice: number;
  taxable: boolean;
}): Promise<{ item?: LibraryItem; error?: string }> {
  const supabase = await signedIn();
  if (!supabase) return { error: "Your session has expired. Please log in again." };
  const description = String(input.description ?? "").trim().slice(0, MAX_LINE_TEXT);
  const unitPrice = Math.round(Number(input.unitPrice) * 100) / 100;
  if (!itemName(description)) return { error: "Enter a line item name." };
  if (!(unitPrice >= 0)) return { error: "Enter a unit price." };

  const row = { description, unit_price: unitPrice, taxable: Boolean(input.taxable) };
  const { data: existing } = await supabase.from("line_item_library").select("id").eq("description", description).limit(1).maybeSingle();
  if (input.id && existing && existing.id !== input.id) {
    return { error: "Another saved line item already has this name and description." };
  }
  const targetId = input.id ?? existing?.id;
  const { data, error } = targetId
    ? await supabase.from("line_item_library").update(row).eq("id", targetId).select("id").maybeSingle()
    : await supabase.from("line_item_library").insert(row).select("id").single();
  if (error || !data) return { error: "Couldn't save the line item to your library." };
  return { item: { id: data.id, description, unitPrice, taxable: row.taxable } };
}

export async function deleteLibraryItem(id: string): Promise<{ error?: string }> {
  const supabase = await signedIn();
  if (!supabase) return { error: "Your session has expired. Please log in again." };
  const { error } = await supabase.from("line_item_library").delete().eq("id", id);
  return error ? { error: "Couldn't remove the saved line item." } : {};
}
