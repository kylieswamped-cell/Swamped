"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import PasswordInput from "./PasswordInput";

const inputClass =
  "h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-4 text-[14px] text-navy shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] outline-none transition-colors placeholder:text-[#94a3b8] focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "block text-[14px] font-bold leading-[20px] text-navy";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Auth backend not wired yet — the form only validates and shows a loading state.
    setSubmitting(true);
    setTimeout(() => setSubmitting(false), 800);
  };

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

      <form onSubmit={handleSubmit} className="mt-10 flex flex-col">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className={labelClass}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className={inputClass}
          />
        </div>

        <div className="mt-[17px] flex flex-col gap-2">
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
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
          disabled={submitting}
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
