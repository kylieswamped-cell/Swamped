"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import PasswordInput from "./PasswordInput";

const inputClass =
  "h-14 w-full rounded-xl border border-[#f3f4f6] bg-[#f9fafb] px-4 text-[16px] text-navy outline-none transition-colors placeholder:text-[#9ca3af] focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20";
const labelClass = "block text-[14px] font-bold leading-[20px] text-navy";

const fields = [
  { id: "fullName", label: "Full Name", type: "text", placeholder: "John Doe", autoComplete: "name" },
  { id: "businessName", label: "Business Name", type: "text", placeholder: "Acme Contracting", autoComplete: "organization" },
  { id: "email", label: "E-mail Address", type: "email", placeholder: "john@example.com", autoComplete: "email" },
] as const;

type FieldId = (typeof fields)[number]["id"];

export default function SignupForm() {
  const router = useRouter();
  const [values, setValues] = useState<Record<FieldId, string>>({
    fullName: "",
    businessName: "",
    email: "",
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setError("");
    // Auth backend not wired yet — simulate the request, then show the verify-email popup.
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      router.replace("/signup?view=verify-email", { scroll: false });
    }, 800);
  };

  return (
    <>
      <h1 className="mt-4 text-center text-[32px] font-extrabold leading-[60px] text-navy sm:text-[40px]">
        Create Account
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
        {fields.map((f) => (
          <div key={f.id} className="flex flex-col gap-2">
            <label htmlFor={f.id} className={labelClass}>
              {f.label}
            </label>
            <input
              id={f.id}
              type={f.type}
              autoComplete={f.autoComplete}
              required
              value={values[f.id]}
              onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
              placeholder={f.placeholder}
              className={inputClass}
            />
          </div>
        ))}

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className={inputClass}
          />
          {error && (
            <p role="alert" className="text-[13px] text-red-500">
              {error}
            </p>
          )}
        </div>

        <motion.button
          type="submit"
          disabled={submitting}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          className="h-16 w-full rounded-xl bg-brand text-[18px] font-bold text-white drop-shadow-[0_4px_6px_rgba(0,193,133,0.25)] transition-colors hover:bg-brand-dark disabled:opacity-70"
        >
          {submitting ? "Creating Account…" : "Sign up"}
        </motion.button>
      </form>

      <p className="mt-8 text-center text-[14px] text-[#64748b] lg:hidden">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand hover:text-brand-dark">
          Log In
        </Link>
      </p>
    </>
  );
}
