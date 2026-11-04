// Preset date ranges shared by the list filters (quotes, invoices, customers).

const DAY = 24 * 60 * 60 * 1000;

export const DATE_RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "this_year", label: "This year" },
  { value: "last_year", label: "Last year" },
];

export const rangeLabel = (value: string) => DATE_RANGES.find((r) => r.value === value)?.label ?? "";

/** Whether a timestamp falls in a preset range ending at `now`. No range matches everything. */
export function withinRange(iso: string | null, range: string, now: number): boolean {
  if (!range) return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  const year = new Date(now).getFullYear();
  if (range === "this_year") return new Date(iso).getFullYear() === year && t <= now;
  if (range === "last_year") return new Date(iso).getFullYear() === year - 1;
  return t >= now - Number(range) * DAY && t <= now;
}

const pad = (n: number) => String(n).padStart(2, "0");
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** From/to dates (YYYY-MM-DD) for a preset, for pages with their own date pickers. */
export function presetDates(range: string, now: number): { from: string; to: string } {
  const today = new Date(now);
  const year = today.getFullYear();
  if (range === "this_year") return { from: `${year}-01-01`, to: isoDay(today) };
  if (range === "last_year") return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
  return { from: isoDay(new Date(now - (Number(range) - 1) * DAY)), to: isoDay(today) };
}
