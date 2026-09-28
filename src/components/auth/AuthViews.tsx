"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import AuthModal from "./AuthModal";
import { CheckEmailCard, ForgotPasswordCard, NewPasswordCard } from "./AuthPopups";

/**
 * Auth popups are driven by `?view=` so each one has a shareable URL
 * (e.g. the reset-password email link lands on /login?view=reset-password).
 */
export type AuthView = "forgot-password" | "reset-email-sent" | "verify-email" | "reset-password";

export function authViewHref(pathname: string, view: AuthView) {
  return `${pathname}?view=${view}`;
}

export default function AuthViews() {
  const router = useRouter();
  const pathname = usePathname();
  const view = useSearchParams().get("view") as AuthView | null;

  const show = useCallback(
    (next: AuthView) => router.replace(authViewHref(pathname, next), { scroll: false }),
    [router, pathname],
  );
  const close = useCallback(() => router.replace(pathname, { scroll: false }), [router, pathname]);
  const toLogin = useCallback(() => router.push("/login", { scroll: false }), [router]);

  const labels: Record<AuthView, string> = {
    "forgot-password": "Reset your password",
    "reset-email-sent": "Check your email",
    "verify-email": "Check your email",
    "reset-password": "Create new password",
  };

  return (
    <AuthModal open={view !== null && view in labels} onClose={close} label={view ? labels[view] : ""}>
      {view === "forgot-password" && (
        <ForgotPasswordCard onSent={() => show("reset-email-sent")} onBack={close} />
      )}
      {view === "reset-email-sent" && (
        <CheckEmailCard
          message="If an admin account exists for this email address, a password reset link has been sent."
          onBack={toLogin}
        />
      )}
      {view === "verify-email" && (
        <CheckEmailCard
          message="We've sent a verification link to your email address. Click it to activate your Swamped account."
          onBack={toLogin}
        />
      )}
      {view === "reset-password" && <NewPasswordCard onBack={toLogin} />}
    </AuthModal>
  );
}
