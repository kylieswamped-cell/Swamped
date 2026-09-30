import { formatMoney } from "@/lib/quotes/totals";

type Stats = { totalRevenue: number; outstandingBalance: number; activeJobs: number };

export default function CustomerStatCards({ stats }: { stats: Stats }) {
  const cards = [
    { label: "Total Revenue", value: formatMoney(stats.totalRevenue) },
    { label: "Outstanding Balance", value: formatMoney(stats.outstandingBalance) },
    { label: "Active Jobs", value: String(stats.activeJobs) },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-[41px]">
      {cards.map((card) => (
        <div
          key={card.label}
          className="h-[110px] rounded-xl border border-[#e2e8f0] bg-white px-[23px] pt-[23px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
        >
          <p className="text-[12px] font-bold uppercase leading-[18px] tracking-[0.6px] text-[#64748b]">{card.label}</p>
          <p className="mt-2 truncate text-[24px] font-bold leading-9 tracking-[0.14px] text-[#0f172a]">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
