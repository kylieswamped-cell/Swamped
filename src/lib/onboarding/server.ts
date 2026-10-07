import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { OnboardingStep } from "./steps";

export type Profile = {
  id: string;
  onboarding_step: OnboardingStep;
  onboarding_completed_at: string | null;
  legal_business_name: string | null;
  contact_name: string | null;
  business_email: string | null;
  business_phone: string | null;
  website_url: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  industry: string | null;
  years_in_business: number | null;
  employee_range: string | null;
  revenue_range: string | null;
  quote_expiration_days: number;
  deposit_value: number;
  deposit_type: "percent" | "fixed";
  quote_terms: string | null;
  invoice_due_days: number;
  invoice_terms: string | null;
  tax_rate: number;
  stripe_connected_at: string | null;
  // Settings (see supabase/migrations/20261007120000_settings.sql).
  first_name: string | null;
  last_name: string | null;
  personal_phone: string | null;
  avatar_path: string | null;
  logo_path: string | null;
  show_contact_on_docs: boolean;
  show_website_on_docs: boolean;
  show_address_on_docs: boolean;
  time_zone: string;
  operating_hours: unknown;
  show_hours_on_docs: boolean;
  tax_rates: number[] | null;
  quote_reminder_enabled: boolean;
  quote_reminder_days: number;
  invoice_reminder_enabled: boolean;
  invoice_reminder_days: number;
  past_due_notice_enabled: boolean;
  past_due_reminder_enabled: boolean;
  past_due_reminder_days: number;
  email_templates: unknown;
  notification_prefs: unknown;
  communication_prefs: unknown;
  payout_schedule: string;
  payout_minimum: number;
  updated_at: string;
};

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle<Profile>();
  if (error) throw new Error(`Couldn't load your profile: ${error.message}`);
  if (!data) throw new Error("No profile found for this account.");
  return data;
}

/** Where a signed-in user belongs: the app once onboarding is done, onboarding otherwise. */
export async function homePathFor(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", userId)
    .maybeSingle<Pick<Profile, "onboarding_completed_at">>();
  return data?.onboarding_completed_at ? "/dashboard" : "/onboarding";
}

/**
 * For signed-in pages: returns the verified user, their profile, and a client.
 * Pages must check auth themselves, not rely on the proxy alone.
 */
export async function requireOnboardingUser(returnTo: string): Promise<{
  supabase: SupabaseClient;
  user: User;
  profile: Profile;
}> {
  if (!isSupabaseConfigured) redirect("/login");
  const supabase = await createClient();
  // Fetch the profile alongside the user check (RLS returns only the caller's
  // row), so each page waits on one round trip instead of two.
  const [{ data }, { data: profile }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("*").maybeSingle<Profile>(),
  ]);
  if (!data.user) redirect(`/login?next=${returnTo}`);
  // Unverified emails never get in, even with a session somehow in hand.
  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    redirect("/login");
  }
  if (!profile || profile.id !== data.user.id) {
    return { supabase, user: data.user, profile: await getProfile(supabase, data.user.id) };
  }
  return { supabase, user: data.user, profile };
}
