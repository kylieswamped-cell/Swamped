// Onboarding steps in order. Shared by server and client code.
export const ONBOARDING_STEPS = [
  "business-details",
  "business-about",
  "business-defaults",
  "stripe",
  "customer",
  "quote",
  "complete",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function nextStep(step: OnboardingStep): OnboardingStep {
  const i = ONBOARDING_STEPS.indexOf(step);
  return ONBOARDING_STEPS[Math.min(i + 1, ONBOARDING_STEPS.length - 1)];
}

/** True once the user has moved past `step`. */
export function isPast(current: OnboardingStep, step: OnboardingStep) {
  return ONBOARDING_STEPS.indexOf(current) > ONBOARDING_STEPS.indexOf(step);
}

export type ChecklistStatus = {
  businessProfile: boolean;
  stripe: boolean;
  customer: boolean;
  quote: boolean;
};

export function checklistStatus(
  step: OnboardingStep,
  stripeConnected: boolean,
): ChecklistStatus {
  return {
    businessProfile: isPast(step, "business-defaults"),
    stripe: stripeConnected,
    customer: isPast(step, "customer"),
    quote: step === "complete",
  };
}
