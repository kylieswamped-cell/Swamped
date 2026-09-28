import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for links in Supabase auth emails (sign-up confirmation and
 * password reset). Handles both the default PKCE `?code=` links and custom
 * `?token_hash=&type=` templates, then sends the user on to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";
  const isReset = next === "/reset-password";

  let target = "/login?notice=link-expired";
  const supabase = isSupabaseConfigured ? await createClient() : null;

  if (!supabase || searchParams.has("error")) {
    // Not configured, or Supabase already rejected the link (expired/used).
  } else if (code) {
    if (!(await supabase.auth.exchangeCodeForSession(code)).error) {
      target = next;
    } else {
      // PKCE codes only exchange in the browser that made the request. For a
      // sign-up, Supabase has already verified the email by this point, so the
      // user just needs to log in; a reset has to be finished in that browser.
      target = isReset ? "/login?notice=reset-other-browser" : "/login?notice=email-confirmed";
    }
  } else if (tokenHash && type) {
    if (!(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error) target = next;
  }

  return NextResponse.redirect(new URL(target, origin));
}
