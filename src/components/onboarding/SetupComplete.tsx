"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function SetupComplete({ note }: { note?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-complete-title"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[392px] rounded-3xl bg-white px-8 py-10 text-center shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
    >
      <Image src="/images/logo.png" alt="" width={48} height={48} className="mx-auto mix-blend-multiply" />
      <h2 id="setup-complete-title" className="mt-4 text-[28px] font-extrabold text-logo">
        Setup Complete!
      </h2>
      <p className="mx-auto mt-4 max-w-[260px] text-[14px] leading-[22px] text-[#64748b]">
        You are now ready to start using Swamped with real customers.
      </p>
      {note && (
        <p className="mt-4 rounded-lg border border-[#fef3c7] bg-[#fffbeb] px-3 py-2 text-[12px] text-[#92400e]">
          {note}
        </p>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => router.replace("/dashboard"))}
        className="mt-8 h-12 w-full rounded-lg bg-[#00c9a7] text-[18px] font-medium text-white shadow-[0_10px_15px_-3px_rgba(0,201,167,0.2)] transition-colors hover:bg-[#00b394] disabled:opacity-60"
      >
        {pending ? "Loading…" : "Go to Dashboard"}
      </button>
    </motion.div>
  );
}
