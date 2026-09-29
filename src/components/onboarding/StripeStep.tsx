"use client";

import { Check } from "lucide-react";
import { continueFromStripe } from "@/lib/onboarding/actions";
import { FormError } from "./fields";
import StepModal from "./StepModal";
import { useStepSubmit } from "./useStepSubmit";

const benefits = [
  "Accept credit and debit card payments",
  "Collect deposits and invoice payments online",
  "Receive payouts directly to your bank account",
  "Secure payment processing powered by Stripe",
];

export default function StripeStep({ onDone }: { onDone: () => void }) {
  const { pending, error, run } = useStepSubmit();

  return (
    <StepModal
      label="Step 2 of 4"
      title="Connect Stripe"
      description="Connect your Stripe account to start accepting online payments."
    >
      <p className="text-[17px] leading-[29px] text-[#475569]">
        Already have a Stripe account? You can connect it in just a few clicks. New to Stripe? Create an account now and start accepting payments in minutes.
      </p>

      <div className="mt-8 rounded-2xl border border-[#f1f5f9] bg-[#f8fafc] p-8">
        <p className="flex items-baseline gap-3">
          <span className="text-[28px] font-extrabold tracking-[-1px] text-[#635bff]">stripe</span>
          <span className="text-[22px] font-bold text-[#1e293b]">Benefits</span>
        </p>
        <ul className="mt-5 flex flex-col gap-4">
          {benefits.map((b) => (
            <li key={b} className="flex items-center gap-3 text-[14px] text-[#475569]">
              <Check className="size-4 shrink-0 text-[#00c9a7]" strokeWidth={3} />
              {b}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <FormError message={error} />
      </div>
      {/* Stripe Connect isn't wired up yet — for now this just moves onboarding on. */}
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => continueFromStripe(), onDone)}
        className="mt-2 h-[60px] w-full rounded-2xl bg-[#00c9a7] text-[18px] font-bold text-white shadow-[0_10px_15px_-3px_rgba(0,201,167,0.2),0_4px_6px_-4px_rgba(0,201,167,0.2)] transition-colors hover:bg-[#00b394] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Connect Stripe"}
      </button>
    </StepModal>
  );
}
