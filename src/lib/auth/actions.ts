"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type AuthResult = { error?: string; needsVerification?: boolean };

const NOT_CONFIGURED: AuthResult = {
  error: "Sign-in isn't available right now. Please try again later.",
};

/** Only allow same-site relative paths, so `?next=` can't redirect off-site. */
function safeNext(next: unknown, fallback = "/onboarding") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : fallback;
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

async function confirmRedirect() {
  return `${await siteOrigin()}/auth/confirm?next=/onboarding`;
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
  redirect(safeNext(input.next));
}

export async function resendConfirmation(email: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim(),
    options: { emailRedirectTo: await confirmRedirect() },
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
      data: { full_name: input.fullName.trim(), business_name: input.businessName.trim() },
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

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/reset-password`,
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
