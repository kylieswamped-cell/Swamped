"use client";

import { useState, useTransition } from "react";
import type { StepResult } from "@/lib/onboarding/actions";

/** Runs a step's server action and tracks pending state and errors. */
export function useStepSubmit() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function run<T extends StepResult>(action: () => Promise<T>, onSuccess: (result: T) => void) {
    setError(undefined);
    setFieldErrors({});
    startTransition(async () => {
      try {
        const result = await action();
        if (result.error || result.fieldErrors) {
          setError(result.error);
          setFieldErrors(result.fieldErrors ?? {});
          return;
        }
        onSuccess(result);
      } catch {
        setError("Something went wrong. Check your connection and try again.");
      }
    });
  }

  return { pending, error, fieldErrors, run };
}

export const formValues = (form: HTMLFormElement) =>
  Object.fromEntries(
    [...new FormData(form).entries()].filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;
