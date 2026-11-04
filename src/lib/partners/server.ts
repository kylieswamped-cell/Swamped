import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { PARTNER_TYPES, type PartnerStatus } from "./options";

export type Partner = {
  id: string;
  status: PartnerStatus;
  fullName: string;
  email: string;
  businessName: string | null;
  partnerType: string;
  audience: string | null;
  phone: string | null;
  website: string | null;
  referralCode: string;
  notifySignups: boolean;
  notifyPayouts: boolean;
  createdAt: string;
};

export type Referral = { businessName: string; signedUpAt: string; activatedAt: string | null };

type Row = {
  id: string;
  status: PartnerStatus;
  full_name: string;
  email: string;
  business_name: string | null;
  partner_type: string;
  audience: string | null;
  phone: string | null;
  website: string | null;
  referral_code: string;
  notify_signups: boolean;
  notify_payouts: boolean;
  created_at: string;
};

const COLUMNS =
  "id, status, full_name, email, business_name, partner_type, audience, phone, website, referral_code, notify_signups, notify_payouts, created_at";

const toPartner = (r: Row): Partner => ({
  id: r.id,
  status: r.status,
  fullName: r.full_name,
  email: r.email,
  businessName: r.business_name,
  partnerType: r.partner_type,
  audience: r.audience,
  phone: r.phone,
  website: r.website,
  referralCode: r.referral_code,
  notifySignups: r.notify_signups,
  notifyPayouts: r.notify_payouts,
  createdAt: r.created_at,
});

type PendingApplication = { fullName?: string; businessName?: string; partnerType?: string; audience?: string };

/**
 * Applying while signed out stores the application on the new account until
 * the email is confirmed; it becomes a real application on the first visit.
 */
async function createFromSignup(supabase: SupabaseClient, user: User) {
  const app = user.user_metadata?.partner_application as PendingApplication | undefined;
  const type = PARTNER_TYPES.find((t) => t.value === app?.partnerType);
  if (!app || !type) return null;
  const { data } = await supabase
    .from("partner_applications")
    .insert({
      full_name: String(app.fullName ?? user.user_metadata?.full_name ?? "").slice(0, 120) || "Partner",
      email: user.email,
      business_name: app.businessName ? String(app.businessName).slice(0, 200) : null,
      partner_type: type.value,
      audience: app.audience ? String(app.audience).slice(0, 2000) : null,
    })
    .select(COLUMNS)
    .maybeSingle<Row>();
  return data;
}

/**
 * For partner portal pages: the signed-in user and their partner record.
 * Not partners yet → the application page. Cached per request so the layout
 * and page share one lookup.
 */
export const requirePartner = cache(async (): Promise<{ supabase: SupabaseClient; user: User; partner: Partner }> => {
  if (!isSupabaseConfigured) redirect("/partner/login");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/partner/login");
  if (!user.email_confirmed_at) {
    await supabase.auth.signOut();
    redirect("/partner/login");
  }

  const { data: row } = await supabase.from("partner_applications").select(COLUMNS).eq("owner_id", user.id).maybeSingle<Row>();
  const partner = row ?? (await createFromSignup(supabase, user));
  if (!partner) redirect("/partner/apply");
  return { supabase, user, partner: toPartner(partner) };
});

export async function listReferrals(supabase: SupabaseClient): Promise<Referral[]> {
  const { data, error } = await supabase.rpc("get_partner_referrals");
  if (error) {
    console.error("Couldn't load partner referrals", error);
    return [];
  }
  return ((data ?? []) as { business_name: string; signed_up_at: string; activated_at: string | null }[]).map((r) => ({
    businessName: r.business_name,
    signedUpAt: r.signed_up_at,
    activatedAt: r.activated_at,
  }));
}
