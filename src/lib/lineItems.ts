// A line item's `description` column holds its name on the first line and any
// longer details after it. The customer quote/invoice pages already render it
// that way, so existing items keep working and no schema change is needed.

export const MAX_LINE_TEXT = 2000;

export function splitItem(description: string): { name: string; details: string } {
  const i = description.indexOf("\n");
  return i === -1
    ? { name: description, details: "" }
    : { name: description.slice(0, i), details: description.slice(i + 1) };
}

export function joinItem(name: string, details: string): string {
  // Newlines in the name would shift text into the details.
  const n = name.replace(/\s*\n\s*/g, " ");
  return details.trim() ? `${n}\n${details}` : n;
}

/** The item's name, used for "every line item needs a name" checks. */
export const itemName = (description: string) => splitItem(description).name.trim();

/** Email cell: bold name with the details underneath. */
export function itemHtml(description: string, escape: (s: string) => string): string {
  const { name, details } = splitItem(description);
  return `<strong style="font-weight:600">${escape(name)}</strong>${
    details.trim() ? `<br><span style="font-size:12px;color:#64748b">${escape(details).replace(/\n/g, "<br>")}</span>` : ""
  }`;
}
