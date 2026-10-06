import type { TransactionStatus } from "@/lib/payments/data";

// Paid, Processing, and Sent: Awaiting come from the Figma transaction log; the refund states follow the same pattern.
const STYLES: Record<TransactionStatus, { label: string; className: string }> = {
  succeeded: { label: "Paid", className: "border-[#bbf7d0] bg-[#dcfce7] text-[#15803d]" },
  partially_refunded: { label: "Partially Refunded", className: "border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]" },
  refunded: { label: "Refunded", className: "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]" },
  processing: { label: "Processing", className: "border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8]" },
  awaiting: { label: "Sent: Awaiting", className: "border-[#fde68a] bg-[#fffbeb] text-[#d97706]" },
};

export const paymentStatusLabel = (s: TransactionStatus) => STYLES[s].label;

export default function PaymentStatusBadge({ status }: { status: TransactionStatus }) {
  const s = STYLES[status];
  return (
    <span className={`inline-flex h-[25px] items-center whitespace-nowrap rounded-full border px-[9px] text-[10px] font-bold uppercase leading-[15px] ${s.className}`}>
      {s.label}
    </span>
  );
}
