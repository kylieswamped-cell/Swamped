"use server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/** Marks every current notification as read. */
export async function markNotificationsRead(): Promise<{ error?: string }> {
  if (!isSupabaseConfigured) return { error: "Notifications aren't available right now." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Your session has expired. Please log in again." };

  const { error } = await supabase
    .from("profiles")
    .update({ notifications_seen_at: new Date().toISOString() })
    .eq("id", data.user.id);
  return error ? { error: "Couldn't update your notifications. Please try again." } : {};
}
