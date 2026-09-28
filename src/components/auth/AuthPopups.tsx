"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { useState, useTransition, type FormEvent } from "react";
import { requestPasswordReset, updatePassword } from "@/lib/auth/actions";
import PasswordInput from "./PasswordInput";

const popupInput =
  "w-full rounded-lg border border-[#e5e7eb] bg-white px-4 text-navy outline-none transition-colors placeholder:text-[#9ca3af] focus:border-brand focus:ring-2 focus:ring-brand/20";
const greenButton =
  "w-full rounded-lg bg-[#10b981] text-[15px] font-medium text-white drop-shadow-[0_4px_7px_rgba(16,185,129,0.3)] transition-colors hover:bg-[#0ea371] disabled:opacity-70";

function PopupLogo({ size }: { size: number }) {
  return (
    <Image
      src="/images/logo.png"
      alt="Swamped"
      width={size}
      height={size}
      className="mx-auto mix-blend-multiply"
    />
  );
}

function BackToLogin({ onClick, color }: { onClick: () => void; color: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group mx-auto inline-flex items-center gap-2 text-[14px] font-medium ${color} hover:underline`}
    >
      <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" strokeWidth={2.5} />
      Back to Log In
    </button>
  );
}

function ErrorText({ text }: { text: string }) {
  return (
    <p role="alert" className="mt-2 min-h-5 text-[13px] text-red-500">
      {text}
    </p>
  );
}

export function ForgotPasswordCard({
  onSent,
  onBack,
}: {
  onSent: () => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, startTransition] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await requestPasswordReset(email);
      if (result.error) setError(result.error);
      else onSent();
    });
  };

  return (
    <div className="mx-auto max-w-[400px] overflow-hidden rounded-xl border border-[#e5e7eb]/50 bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
      <div className="px-6 pb-12 pt-10 sm:px-10">
        <PopupLogo size={56} />
        <h2 className="mt-4 text-center text-[24px] font-bold leading-[32px] tracking-[-0.6px] text-logo">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-[14px] leading-[21px] text-[#1f2937] sm:-mx-4">
          Enter your email to receive a password reset link.
        </p>

        <form onSubmit={submit} className="mt-10 flex flex-col">
          <label htmlFor="reset-email" className="text-[14px] font-medium leading-[21px] text-[#1f2937]">
            Email Address
          </label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className={`${popupInput} mt-1.5 h-[46.5px] text-[15px]`}
          />
          <ErrorText text={error} />
          <motion.button
            type="submit"
            disabled={submitting}
            whileTap={{ scale: 0.98 }}
            className={`${greenButton} mt-2 h-[47px]`}
          >
            {submitting ? "Sending…" : "Send Reset Link"}
          </motion.button>
        </form>

        <div className="mt-5 flex">
          <BackToLogin onClick={onBack} color="text-logo" />
        </div>
      </div>
      <div className="h-1 bg-[#10b981]/10" />
    </div>
  );
}

export function CheckEmailCard({
  message,
  onBack,
}: {
  message: string;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto max-w-[500px] rounded-3xl border border-[#cbd5e1] bg-surface px-6 py-10 text-center shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] sm:px-10">
      <PopupLogo size={40} />
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.15 }}
        className="mx-auto mt-8 flex size-16 items-center justify-center rounded-full bg-[rgba(0,193,133,0.1)]"
      >
        <Image src="/auth/email-check-icon.svg" alt="" width={38} height={30} />
      </motion.div>
      <h2 className="mt-6 text-[30px] font-bold leading-[45px] tracking-[-0.75px] text-[#0f172a]">
        Check Your Email
      </h2>
      <p className="mx-auto mt-2 max-w-[340px] text-[14px] leading-[21px] text-[#64748b]">{message}</p>
      <motion.button
        type="button"
        onClick={onBack}
        whileTap={{ scale: 0.98 }}
        className="mt-8 h-12 w-full rounded-xl bg-brand text-[16px] font-semibold text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] transition-colors hover:bg-brand-dark"
      >
        Back to Login
      </motion.button>
      <p className="mt-8 inline-flex items-center gap-2 text-[12px] leading-[18px] text-[#94a3b8]">
        <Image src="/auth/info-icon.svg" alt="" width={12} height={12} />
        Verification link expires in 24 hours.
      </p>
    </div>
  );
}

export function NewPasswordCard({ onBack }: { onBack: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setError("");
    // On success the action signs out and redirects to /login with a notice.
    startTransition(async () => {
      const result = await updatePassword(password);
      if (result?.error) setError(result.error);
    });
  };

  const inputClass = `${popupInput} h-12 text-[16px]`;
  const labelClass = "text-[14px] font-medium leading-[20px] text-[#374151]";

  return (
    <div className="mx-auto max-w-[418px] rounded-2xl bg-white px-6 py-8 drop-shadow-[0_8px_15px_rgba(0,0,0,0.12)] sm:px-8">
      <PopupLogo size={56} />
      <h2 className="mt-2 text-center text-[24px] font-bold leading-[30px] tracking-[-0.6px] text-[#000080]">
        Create new password
      </h2>
      <p className="mt-2 text-center text-[14px] leading-[20px] text-[#1f2937]">
        Please enter your new password below.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col">
        <label htmlFor="new-password" className={labelClass}>
          New password
        </label>
        <div className="mt-1.5">
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
            className={inputClass}
          />
        </div>

        <label htmlFor="confirm-password" className={`${labelClass} mt-5`}>
          Confirm new password
        </label>
        <div className="mt-1.5">
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            className={inputClass}
          />
        </div>

        <ErrorText text={error} />

        <motion.button
          type="submit"
          disabled={submitting}
          whileTap={{ scale: 0.98 }}
          className={`${greenButton} mt-3 h-[47px]`}
        >
          {submitting ? "Saving…" : "Save New Password"}
        </motion.button>
      </form>

      <div className="mt-8 flex">
        <BackToLogin onClick={onBack} color="text-[#000080]" />
      </div>
    </div>
  );
}
