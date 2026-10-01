"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * Job times are shown in the viewer's zone, which the server doesn't know.
 * The server render (and hydration) use UTC; the browser switches to local after.
 */
export function useLocalTime() {
  return useSyncExternalStore(noop, () => true, () => false);
}

export function shortDate(iso: string, local: boolean) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: local ? undefined : "UTC",
  });
}

/** "Oct 24, 2023 — 09:00 AM", as in the scheduling fields. */
export function dateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return `${date} — ${time}`;
}

/** ISO timestamp to the value a datetime-local input expects, in local time. */
export function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
