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
function safeNext(next: unknown, fallback = "/dashboard") {
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

function friendlyError(message: string) {
  if (/invalid login credentials/i.test(message)) return "Incorrect email or password.";
  if (/email not confirmed/i.test(message))
    return "Please verify your email first — check your inbox for the confirmation link.";
  if (/rate limit|too many/i.test(message))
    return "Too many attempts. Please wait a moment and try again.";
  return message;
}

export async function signIn(input: {
  email: string;
  password: string;
  next?: string | null;
}): Promise<AuthResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email.trim(),
    password: input.password,
  });
  if (error) return { error: friendlyError(error.message) };
  redirect(safeNext(input.next));
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
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/dashboard`,
    },
  });
  if (error) return { error: friendlyError(error.message) };

  // With email confirmation turned off, Supabase signs the user in immediately.
  if (data.session) redirect("/dashboard");
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
