export const SUPPORT_CATEGORIES = [
  { value: "payments", label: "Payments & Payouts" },
  { value: "quotes-invoices", label: "Quotes & Invoices" },
  { value: "jobs-customers", label: "Jobs & Customers" },
  { value: "account", label: "Account & Settings" },
  { value: "bug", label: "Report a Bug" },
  { value: "feature", label: "Feature Request" },
  { value: "other", label: "Other" },
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number]["value"];

export const SUPPORT_UPLOAD_TYPES = ["image/svg+xml", "image/png", "image/jpeg", "image/gif"];
export const MAX_SUPPORT_FILES = 5;
