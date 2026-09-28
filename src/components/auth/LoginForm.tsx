"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { resendConfirmation, signIn } from "@/lib/auth/actions";
import { EMAIL_RE, NETWORK_ERROR, useHydrated } from "./formUtils";
import FormNotice from "./FormNotice";
import PasswordInput from "./PasswordInput";

const inputClass =
  "h-11 w-full rounded-xl border bg-white px-4 text-[14px] text-navy shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] outline-none transition-colors placeholder:text-[#94a3b8] focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "block text-[14px] font-bold leading-[20px] text-navy";

const notices: Record<string, { tone: "success" | "error"; text: string }> = {
  "password-updated": { tone: "success", text: "Password updated. Log in with your new password." },
  "email-confirmed": { tone: "success", text: "Email confirmed. Log in to continue." },
  "reset-other-browser": {
    tone: "error",
    text: "Open the reset link in the same browser you requested it from, or request a new one here.",
  },
  "link-expired": {
    tone: "error",
    text: "That link is invalid or has expired. Please request a new one.",
  },
};

type Banner = { tone: "success" | "error"; text: string };

export default function LoginForm({ next, notice }: { next: string | null; notice: string | null }) {
  const hydrated = useHydrated();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Banner | null>(notice ? (notices[notice] ?? null) : null);
  const [invalidField, setInvalidField] = useState<"email" | "password" | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [submitting, startTransition] = useTransition();
  const [resending, startResend] = useTransition();

  const fail = (text: string, field: "email" | "password" | null = null) => {
    setStatus({ tone: "error", text });
    setInvalidField(field);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setUnverified(false);
    if (!EMAIL_RE.test(email.trim())) return fail("Please enter a valid email address.", "email");
    if (!password) return fail("Please enter your password.", "password");
    setStatus(null);
    setInvalidField(null);

    startTransition(async () => {
      try {
        const result = await signIn({ email, password, next });
        if (result?.error) {
          fail(result.error);
          setUnverified(Boolean(result.unverified));
        }
      } catch (err) {
        // A successful sign-in redirects by throwing; let that propagate.
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
        fail(NETWORK_ERROR);
      }
    });
  };

  const handleResend = () => {
    startResend(async () => {
      try {
        const result = await resendConfirmation(email);
        setUnverified(false);
        setStatus(
          result.error
            ? { tone: "error", text: result.error }
            : { tone: "success", text: `We've sent a new confirmation link to ${email.trim()}.` },
        );
      } catch {
        fail(NETWORK_ERROR);
      }
    });
  };

  const borderFor = (field: "email" | "password") =>
    invalidField === field ? "border-red-400" : "border-[#e2e8f0]";

  return (
    <>
      <div className="mt-6 text-center">
        <h1 className="text-[30px] font-bold leading-[40px] tracking-[-0.9px] text-[#0f172a] sm:text-[36px]">
          Welcome Back
        </h1>
        <p className="mt-3 text-[14px] leading-[20px] text-[#64748b]">
          Log in to access your Swamped account
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-10 flex flex-col">
        {status && (
          <motion.div
            key={status.text}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0, x: status.tone === "error" ? [0, -6, 6, -4, 4, 0] : 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6"
          >
            <FormNotice tone={status.tone} text={status.text} />
            {unverified && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="mt-2 text-[14px] font-semibold text-brand hover:text-brand-dark disabled:opacity-60"
              >
                {resending ? "Sending…" : "Resend confirmation email"}
              </button>
            )}
          </motion.div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="email" className={labelClass}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={invalidField === "email"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className={`${inputClass} ${borderFor("email")}`}
          />
        </div>

        <div className="mt-[17px] flex flex-col gap-2">
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={invalidField === "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={`${inputClass} ${borderFor("password")}`}
          />
        </div>

        <div className="mt-2 flex justify-end">
          <Link
            href="/login?view=forgot-password"
            scroll={false}
            className="text-[14px] font-medium leading-[20px] text-brand transition-colors hover:text-brand-dark"
          >
            Forgot Password?
          </Link>
        </div>

        <motion.button
          type="submit"
          disabled={!hydrated || submitting}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          className="mt-6 h-12 w-full rounded-xl bg-brand text-[14px] font-semibold text-white shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition-colors hover:bg-brand-dark disabled:opacity-70"
        >
          {submitting ? "Logging In…" : "Log In"}
        </motion.button>
      </form>

      <p className="mt-8 text-center text-[14px] text-[#64748b] lg:hidden">
        New to Swamped?{" "}
        <Link href="/signup" className="font-semibold text-brand hover:text-brand-dark">
          Sign Up
        </Link>
      </p>
    </>
  );
}
