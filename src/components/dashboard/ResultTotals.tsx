/**
 * Totals for the rows a list is currently showing, so a filtered view answers
 * "how much / how many" without adding records up by hand.
 */
export default function ResultTotals({
  scope,
  items,
  className = "",
}: {
  /** What the totals cover, e.g. "All active invoices" or "Filtered results". */
  scope: string;
  items: { label: string; value: string; sub?: string; tone?: "good" | "warn" | "bad" }[];
  className?: string;
}) {
  const tones = { good: "text-[#059669]", warn: "text-[#b45309]", bad: "text-[#dc2626]" };
  return (
    <section aria-label="Totals for the listed records" className={`rounded-xl border border-line bg-white px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ${className}`}>
      <p className="text-[11px] font-bold uppercase leading-4 tracking-[0.8px] text-[#94a3b8]">
        Totals · <span className="text-[#64748b]">{scope}</span>
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-10">
        {items.map((i) => (
          <div key={i.label} className="min-w-0">
            <dt className="truncate text-[12px] font-medium leading-4 text-[#64748b]">{i.label}</dt>
            <dd className={`mt-0.5 truncate text-[20px] font-bold leading-7 ${i.tone ? tones[i.tone] : "text-navy"}`}>
              {i.value}
              {i.sub && <span className="ml-1.5 text-[13px] font-medium text-[#94a3b8]">{i.sub}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
