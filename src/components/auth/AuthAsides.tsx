"use client";

import { motion } from "framer-motion";
import { ArrowRight, Rocket } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { authEase } from "./AuthLayout";

const fadeUp = (delay: number) => ({
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { duration: 0.6, delay, ease: authEase },
});

export function LoginAside() {
  return (
    <div className="flex max-w-[448px] flex-col items-center px-8 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3, ease: authEase }}
        className="flex size-[68px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] backdrop-blur-[2px]"
      >
        <Rocket className="size-9 fill-brand text-brand" strokeWidth={1.5} />
      </motion.div>

      <motion.div {...fadeUp(0.45)} className="flex flex-col items-center">
        <h2 className="mt-8 text-[30px] font-bold leading-[36px] tracking-[-0.75px] text-brand">
          New to Swamped?
        </h2>
        <p className="mt-4 text-[18px] leading-[29.25px] text-[#cbd5e1]">
          Create your free account and join thousands of professionals managing
          customers, jobs, quotes, invoices, and payments in one place.
        </p>
        <Link
          href="/signup"
          className="group mt-6 inline-flex h-12 items-center gap-2 rounded-full border-[1.5px] border-white/40 px-6 text-[14px] font-semibold text-white backdrop-blur-[2px] transition-colors hover:border-brand hover:bg-brand"
        >
          Sign Up
          <ArrowRight
            className="size-3.5 transition-transform group-hover:translate-x-1"
            strokeWidth={3}
          />
        </Link>
      </motion.div>
    </div>
  );
}

export function SignupAside() {
  return (
    <div className="flex max-w-[560px] flex-col items-center pl-20 pr-8 text-center">
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.3, ease: authEase }}
        className="w-[350px] rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-[2px]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
              <Image src="/auth/mockup-icon.svg" alt="" width={14} height={12} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="h-2 w-24 rounded-full bg-white/20" />
              <span className="h-1.5 w-16 rounded-full bg-white/10" />
            </div>
          </div>
          <span className="h-6 w-16 rounded-md border border-brand/30 bg-brand/20" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <span className="h-16 rounded-xl border border-white/5 bg-white/5" />
          <span className="h-16 rounded-xl border border-white/5 bg-white/5" />
        </div>
      </motion.div>

      <motion.div {...fadeUp(0.45)} className="flex flex-col items-center">
        <h2 className="mt-12 text-[30px] font-extrabold leading-[1.3] text-white xl:whitespace-nowrap xl:text-[35px]">
          Already Have an Account?
        </h2>
        <p className="mt-4 max-w-[320px] text-[18px] leading-[28px] text-muted-light">
          Already Have an account with Swamped? Log in to access your Swamped dashboard.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex h-14 items-center rounded-full border-2 border-white/20 px-8 text-[16px] font-bold text-white transition-colors hover:border-brand hover:bg-brand"
        >
          Log In
        </Link>
      </motion.div>
    </div>
  );
}
