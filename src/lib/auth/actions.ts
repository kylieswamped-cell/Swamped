"use server";

import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { homePathFor } from "@/lib/onboarding/server";
import { PARTNER_TYPES } from "@/lib/partners/options";
import { REFERRAL_CODE_RE, REFERRAL_COOKIE } from "@/lib/partners/program";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type AuthResult = { error?: string; needsVerification?: boolean };

const NOT_CONFIGURED: AuthResult = {
  error: "Sign-in isn't available right now. Please try again later.",
};

/** Only allow same-site relative paths, so `?next=` can't redirect off-site. */
function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

const UNVERIFIED =
  "Your email isn't verified yet. Check your inbox for the confirmation link before logging in.";

function friendlyError(message: string) {
  // Supabase deliberately returns the same error for "no such user" and
  // "wrong password", so one message has to cover both cases.
  if (/invalid login credentials/i.test(message))
    return "No account found with that email and password. Check your details or sign up.";
  if (/email not confirmed/i.test(message)) return UNVERIFIED;
  if (/already registered|already exists/i.test(message))
    return "An account with this email already exists. Log in instead.";
  if (/rate limit|too many/i.test(message))
    return "Too many attempts. Please wait a moment and try again.";
  return message;
}

async function confirmRedirect(next = "/onboarding") {
  return `${await siteOrigin()}/auth/confirm?next=${next}`;
}

/** The partner code from a referral link the visitor opened (set by the proxy). */
async function referralCode() {
  const code = (await cookies()).get(REFERRAL_COOKIE)?.value?.toLowerCase();
  return code && REFERRAL_CODE_RE.test(code) ? code : undefined;
}

export async function signIn(input: {
  email: string;
  password: string;
  next?: string | null;
}): Promise<AuthResult & { unverified?: boolean }> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email.trim(),
    password: input.password,
  });
  if (error) {
    return {
      error: friendlyError(error.message),
      unverified: /email not confirmed/i.test(error.message),
    };
  }
  // Belt and braces: never keep a session for an unverified email, even if
  // the "Confirm email" setting is ever switched off in Supabase.
  if (!data.user?.email_confirmed_at) {
    await supabase.auth.signOut();
    return { error: UNVERIFIED, unverified: true };
  }
  // Finished onboarding → the app; otherwise back to the step they left off on.
  // A `next` page still gates itself the same way.
  redirect(safeNext(input.next) ?? (await homePathFor(supabase, data.user.id)));
}

export async function resendConfirmation(email: string, next?: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim(),
    options: { emailRedirectTo: await confirmRedirect(safeNext(next) ?? undefined) },
  });
  if (error) return { error: friendlyError(error.message) };
  return {};
}

export async function signUp(input: {
  fullName: string;
  businessName: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  if (input.password.length < 8) return { error: "Password must be at least 8 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: { full_name: input.fullName.trim(), business_name: input.businessName.trim(), referral_code: await referralCode() },
      emailRedirectTo: await confirmRedirect(),
    },
  });
  if (error) return { error: friendlyError(error.message) };

  // Supabase returns a user with no identities when the email is already
  // registered and confirmed (it doesn't raise an error for that case).
  if (data.user && data.user.identities?.length === 0) {
    return { error: "An account with this email already exists. Log in instead." };
  }

  // Email must be verified before anyone gets in: drop any session Supabase
  // hands back (only happens if "Confirm email" is turned off).
  if (data.session) await supabase.auth.signOut();
  return { needsVerification: true };
}

/**
 * Applying to the Partner Program without a Swamped account: creates the
 * login and keeps the application on it until the email is confirmed (see
 * requirePartner). Partners don't go through contractor onboarding.
 */
export async function signUpAsPartner(input: {
  fullName: string;
  email: string;
  password: string;
  businessName: string;
  partnerType: string;
  audience: string;
  agreed: boolean;
}): Promise<AuthResult & { fieldErrors?: Record<string, string> }> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const fullName = input.fullName.trim().slice(0, 120);
  const email = input.email.trim();
  const type = PARTNER_TYPES.find((t) => t.value === input.partnerType);
  const fieldErrors: Record<string, string> = {};
  if (fullName.length < 2) fieldErrors.fullName = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Enter a valid email address.";
  if (input.password.length < 8) fieldErrors.password = "Password must be at least 8 characters.";
  if (!type) fieldErrors.partnerType = "Choose the option that best describes you.";
  if (!input.agreed) fieldErrors.terms = "Please agree to the Partner Program terms.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        full_name: fullName,
        business_name: input.businessName.trim().slice(0, 200),
        partner_application: {
          fullName,
          businessName: input.businessName.trim().slice(0, 200),
          partnerType: type!.value,
          audience: input.audience.trim().slice(0, 2000),
        },
      },
      emailRedirectTo: await confirmRedirect("/partner/dashboard"),
    },
  });
  if (error) return { error: friendlyError(error.message) };
  if (data.user && data.user.identities?.length === 0) {
    return { error: "An account with this email already exists. Log in to the partner portal to apply." };
  }
  if (data.session) await supabase.auth.signOut();
  return { needsVerification: true };
}

/** Partner portal Log Out goes back to the partner login. */
export async function signOutPartner() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/partner/login");
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  // Implicit flow, not PKCE: the link carries the session in its #fragment,
  // so it works in any browser or mail app. A PKCE link only works in the
  // browser holding the code-verifier cookie from this request.
  const supabase = createStatelessClient(supabaseUrl!, supabaseKey!, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${await siteOrigin()}/login?view=reset-password`,
  });
  // Only surface rate limiting — never reveal whether the email has an account.
  if (error && /rate limit|too many/i.test(error.message)) {
    return { error: friendlyError(error.message) };
  }
  return {};
}

export async function updatePassword(password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return { error: "Your reset link has expired. Please request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: friendlyError(error.message) };

  await supabase.auth.signOut();
  redirect("/login?notice=password-updated");
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
