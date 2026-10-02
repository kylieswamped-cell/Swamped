import { quoteStateLabel, type QuoteState } from "@/lib/quotes/data";

// Draft, Sent, and Accepted come from the Figma table; the others follow the same pattern.
const STYLES: Record<QuoteState, { badge: string; dot: string }> = {
  draft: { badge: "border-[#fef3c7] bg-[#fffbeb] text-[#d97706]", dot: "bg-[#f59e0b]" },
  sent: { badge: "border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8]", dot: "bg-[#3b82f6]" },
  accepted: { badge: "border-[#d1fae5] bg-[#ecfdf5] text-[#059669]", dot: "bg-[#10b981]" },
  declined: { badge: "border-[#fee2e2] bg-[#fef2f2] text-[#b91c1c]", dot: "bg-[#ef4444]" },
  archived: { badge: "border-[#e2e8f0] bg-[#f8fafc] text-[#475569]", dot: "bg-[#94a3b8]" },
};

export default function QuoteStatusBadge({ state }: { state: QuoteState }) {
  const s = STYLES[state] ?? STYLES.draft;
  return (
    <span className={`inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[12px] font-medium leading-[18px] ${s.badge}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {quoteStateLabel(state)}
    </span>
  );
}
