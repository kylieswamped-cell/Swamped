import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "./config";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/customers", "/jobs", "/quotes"];
const GUEST_ONLY = ["/login", "/signup"];

/**
 * Refreshes the Supabase session cookie on every request and gates routes:
 * signed-out users can't reach protected pages, signed-in users skip the
 * login/signup forms (unless a popup like reset-password is open).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Don't put code between createServerClient and getClaims — it must run
  // first so an expired session gets refreshed before anything reads it.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname, searchParams } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    if (path === "/login") url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    // Carry any refreshed session cookies over to the redirect.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!signedIn && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return redirectTo("/login");
  }
  if (signedIn && GUEST_ONLY.includes(pathname) && !searchParams.has("view")) {
    // The dashboard sends anyone mid-onboarding on to /onboarding.
    return redirectTo("/dashboard");
  }

  return response;
}
