import { Check } from "lucide-react";
import Image from "next/image";
import type { ChecklistStatus } from "@/lib/onboarding/steps";

type Step = {
  key: keyof ChecklistStatus;
  title: string;
  description: string;
  required?: boolean;
};

const steps: Step[] = [
  {
    key: "businessProfile",
    title: "Complete Business Profile",
    description: "Add your business details and logo.",
  },
  {
    key: "stripe",
    title: "Connect Stripe",
    description: "Connect your Stripe account to start accepting online payments.",
    required: true,
  },
  {
    key: "customer",
    title: "Add Your First Customer",
    description: "Create your first customer to start managing jobs, quotes, and invoices.",
  },
  {
    key: "quote",
    title: "Create Your First Quote",
    description: "Create your first quote and see how customers experience Swamped.",
  },
];

export default function GettingStarted({ status }: { status: ChecklistStatus }) {
  return (
    <section className="border-[#e2e8f0] bg-white px-8 py-8 xl:min-h-[570px] xl:border-b xl:border-l">
      <div className="flex items-center gap-3">
        <span className="h-6 w-1.5 rounded-full bg-[#00c185]" />
        <h2 className="text-[20px] font-extrabold tracking-[-0.5px] text-[#0a1b33]">
          Getting Started
        </h2>
      </div>
      <p className="mt-2 pl-[18px] text-[12px] leading-4 text-muted">
        Complete these steps to set up your account and start using Swamped.
      </p>

      <ol className="mt-8 flex flex-col gap-6">
        {steps.map((step) => {
          const done = status[step.key];
          return (
            <li key={step.key} className="flex gap-4">
              <span
                aria-label={done ? "Done" : "Not done"}
                className={`mt-1 flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${
                  done ? "border-[#00c185] bg-[#00c185] text-white" : "border-[#e2e8f0] bg-white"
                }`}
              >
                {done && <Check className="size-4" strokeWidth={3} />}
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-[14px] font-bold leading-5 underline decoration-[#00c185] underline-offset-2 ${
                      done ? "text-muted line-through" : "text-[#0a1b33]"
                    }`}
                  >
                    {step.title}
                  </p>
                  {step.required && !done && (
                    <span className="size-2.5 rounded-full bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  )}
                </div>
                <p className="mt-2 text-[12px] leading-4 text-muted">{step.description}</p>
                {step.required && !done && (
                  <p className="mt-3 flex items-center gap-1 rounded-lg border border-[#fef3c7] bg-[#fffbeb] px-3 py-3.5 text-[10px] font-semibold text-[#92400e]">
                    <Image src="/onboarding/warning.svg" alt="" width={10} height={10} />
                    Required for Payment Processing
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
