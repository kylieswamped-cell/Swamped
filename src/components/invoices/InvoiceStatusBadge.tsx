import { invoiceStateLabel, type InvoiceState } from "@/lib/invoices/data";

// Paid, Awaiting Payment, Draft, and Overdue come from the Figma table; the others follow the same pattern.
const STYLES: Record<InvoiceState, string> = {
  draft: "bg-[#f3f4f6] text-[#4b5563]",
  sent: "bg-[#ffedd5] text-[#c2410c]",
  partially_paid: "bg-[#dbeafe] text-[#1d4ed8]",
  paid: "bg-[#dcfce7] text-[#15803d]",
  overdue: "bg-[#fee2e2] text-[#b91c1c]",
  void: "bg-[#f1f5f9] text-[#64748b] line-through",
  archived: "bg-[#f1f5f9] text-[#475569]",
};

export default function InvoiceStatusBadge({ state }: { state: InvoiceState }) {
  return (
    <span className={`inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase leading-[17px] tracking-[0.55px] ${STYLES[state] ?? STYLES.draft}`}>
      {invoiceStateLabel(state)}
    </span>
  );
}
