"use client";

import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { nextStep, type OnboardingStep } from "@/lib/onboarding/steps";
import { BusinessAboutStep, BusinessDefaultsStep, BusinessDetailsStep, type BusinessProfileDefaults } from "./BusinessSteps";
import CustomerStep, { type CustomerOption } from "./CustomerStep";
import QuoteStep, { type QuoteDefaults } from "./QuoteStep";
import SetupComplete from "./SetupComplete";
import StripeStep from "./StripeStep";

type OnboardingFlowProps = {
  /** The step saved on the profile — where the user left off. */
  initialStep: OnboardingStep;
  business: BusinessProfileDefaults;
  customers: CustomerOption[];
  quote: QuoteDefaults;
};

/**
 * Shows the current onboarding step over the dashboard. Each step saves to
 * the server before moving on, so logging out mid-way resumes here next time.
 */
export default function OnboardingFlow({ initialStep, business, customers: initialCustomers, quote }: OnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [customers, setCustomers] = useState(initialCustomers);
  const [completeNote, setCompleteNote] = useState<string>();

  const advance = () => {
    setStep((s) => nextStep(s));
    // Refresh the server-rendered checklist behind the modal.
    router.refresh();
  };

  // Keep the page behind the modal from scrolling.
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  let content;
  switch (step) {
    case "business-details":
      content = <BusinessDetailsStep key={step} defaults={business} onDone={advance} />;
      break;
    case "business-about":
      content = <BusinessAboutStep key={step} defaults={business} onDone={advance} />;
      break;
    case "business-defaults":
      content = <BusinessDefaultsStep key={step} defaults={business} onDone={advance} />;
      break;
    case "stripe":
      content = <StripeStep key={step} onDone={advance} />;
      break;
    case "customer":
      content = (
        <CustomerStep
          key={step}
          onDone={(customer) => {
            setCustomers((cs) => [customer, ...cs.filter((c) => c.id !== customer.id)]);
            advance();
          }}
        />
      );
      break;
    case "quote":
      content = (
        <QuoteStep
          key={step}
          customers={customers}
          defaults={quote}
          onDone={(note) => {
            // No refresh here: onboarding is now complete, and a refresh would
            // redirect to the dashboard before "Setup Complete" is seen.
            setCompleteNote(note);
            setStep("complete");
          }}
        />
      );
      break;
    default:
      content = <SetupComplete key="complete" note={completeNote} />;
  }

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-white/50 backdrop-blur-[6px] lg:left-64">
      <div className="flex min-h-full items-center justify-center px-4 py-20 sm:px-8 lg:py-10">
        <AnimatePresence mode="wait">{content}</AnimatePresence>
      </div>
    </div>
  );
}
