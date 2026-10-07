// Settings choices shared by the settings form and the server actions that validate it.

export const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
] as const;

export type DayKey = (typeof DAYS)[number]["key"];
export type DayHours = { open: boolean; from: string; to: string };
export type OperatingHours = Record<DayKey, DayHours>;

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function resolveHours(saved: unknown): OperatingHours {
  const out = {} as OperatingHours;
  for (const { key } of DAYS) {
    const d = (saved as Record<string, Partial<DayHours>> | null)?.[key];
    const weekday = key !== "sat" && key !== "sun";
    out[key] = {
      open: typeof d?.open === "boolean" ? d.open : weekday,
      from: typeof d?.from === "string" && TIME_RE.test(d.from) ? d.from : "09:00",
      to: typeof d?.to === "string" && TIME_RE.test(d.to) ? d.to : "17:00",
    };
  }
  return out;
}

export const TIME_ZONES = [
  { value: "America/New_York", label: "(GMT-05:00) Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "(GMT-06:00) Central Time (US & Canada)" },
  { value: "America/Denver", label: "(GMT-07:00) Mountain Time (US & Canada)" },
  { value: "America/Phoenix", label: "(GMT-07:00) Arizona" },
  { value: "America/Los_Angeles", label: "(GMT-08:00) Pacific Time (US & Canada)" },
  { value: "America/Anchorage", label: "(GMT-09:00) Alaska" },
  { value: "Pacific/Honolulu", label: "(GMT-10:00) Hawaii" },
  { value: "America/Halifax", label: "(GMT-04:00) Atlantic Time (Canada)" },
  { value: "America/St_Johns", label: "(GMT-03:30) Newfoundland" },
  { value: "Europe/London", label: "(GMT+00:00) London" },
  { value: "Europe/Paris", label: "(GMT+01:00) Central European Time" },
  { value: "Asia/Dubai", label: "(GMT+04:00) Dubai" },
  { value: "Asia/Karachi", label: "(GMT+05:00) Pakistan" },
  { value: "Asia/Kolkata", label: "(GMT+05:30) India" },
  { value: "Asia/Singapore", label: "(GMT+08:00) Singapore" },
  { value: "Australia/Sydney", label: "(GMT+10:00) Sydney" },
];

export const DUE_DAY_OPTIONS = [7, 10, 14, 15, 30, 45, 60, 90];

export const QUOTE_REMINDER_OPTIONS = [1, 2, 3, 5, 7];
export const INVOICE_REMINDER_OPTIONS = [1, 2, 3, 5, 7];
export const PAST_DUE_REMINDER_OPTIONS = [3, 7, 14, 30];

export const NOTIFICATIONS = [
  { key: "quote_accepted", label: "Quote Accepted" },
  { key: "deposit_paid", label: "Deposit Paid" },
  { key: "invoice_paid", label: "Invoice Paid" },
  { key: "invoice_past_due", label: "Invoice Past Due" },
] as const;

export const COMMUNICATIONS = [
  { key: "product_updates", label: "Product Updates" },
  { key: "educational_guides", label: "Educational Guides & Resources" },
  { key: "feature_announcements", label: "Feature Announcements" },
  { key: "marketing", label: "Marketing Emails & Promotions" },
  { key: "onboarding", label: "Account Setup and Onboarding Emails" },
] as const;

/** Preferences are stored as opt-outs, so every key defaults to on. */
export function resolvePrefs<K extends string>(keys: readonly { key: K }[], saved: unknown): Record<K, boolean> {
  const out = {} as Record<K, boolean>;
  for (const { key } of keys) out[key] = (saved as Record<string, unknown> | null)?.[key] !== false;
  return out;
}

export const PAYOUT_SCHEDULES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly (Every Monday)" },
  { value: "monthly", label: "Monthly (1st of the month)" },
  { value: "manual", label: "Manual" },
] as const;

export type PayoutSchedule = (typeof PAYOUT_SCHEDULES)[number]["value"];

export const LOGO_TYPES = ["image/jpeg", "image/png", "image/svg+xml"];
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
