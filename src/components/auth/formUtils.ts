import { useSyncExternalStore } from "react";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const NETWORK_ERROR = "Something went wrong. Check your connection and try again.";

const noopSubscribe = () => () => {};

/**
 * False during SSR and until React hydrates. Auth forms keep their submit
 * button disabled until then — a click before hydration would fall back to a
 * native form submit and silently reload the page with no feedback.
 */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
