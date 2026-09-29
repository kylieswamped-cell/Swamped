import Image from "next/image";
import Link from "next/link";

type Step = {
  title: string;
  description: string;
  href: string;
  required?: boolean;
};

const steps: Step[] = [
  {
    title: "Complete Business Profile",
    description: "Add your business details and logo.",
    href: "#",
  },
  {
    title: "Connect Stripe",
    description: "Connect your Stripe account to start accepting online payments.",
    href: "#",
    required: true,
  },
  {
    title: "Add Your First Customer",
    description: "Create your first customer to start managing jobs, quotes, and invoices.",
    href: "#",
  },
  {
    title: "Create Your First Quote",
    description: "Create your first quote and see how customers experience Swamped.",
    href: "#",
  },
];

export default function GettingStarted() {
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
        {steps.map((step) => (
          <li key={step.title} className="flex gap-4">
            <span
              aria-hidden
              className="mt-1 size-6 shrink-0 rounded-md border-2 border-[#e2e8f0] bg-white"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={step.href}
                  className="text-[14px] font-bold leading-5 text-[#0a1b33] underline decoration-[#00c185] underline-offset-2 transition-colors hover:text-[#00c185]"
                >
                  {step.title}
                </Link>
                {step.required && (
                  <span className="size-2.5 rounded-full bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                )}
              </div>
              <p className="mt-2 text-[12px] leading-4 text-muted">{step.description}</p>
              {step.required && (
                <p className="mt-3 flex items-center gap-1 rounded-lg border border-[#fef3c7] bg-[#fffbeb] px-3 py-3.5 text-[10px] font-semibold text-[#92400e]">
                  <Image src="/onboarding/warning.svg" alt="" width={10} height={10} />
                  Required for Payment Processing
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
