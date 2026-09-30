import Image from "next/image";
import { Stagger, StaggerItem } from "@/components/Reveal";
import { formatMoney } from "@/lib/quotes/totals";

export type DashboardStats = {
  activeJobs: number;
  awaitingPayment: number;
  quotesSent30d: number;
  revenue30d: number;
};

const statCards = (stats: DashboardStats) => [
  { label: "Active Jobs", value: String(stats.activeJobs), icon: "stat-jobs", w: 18, bg: "bg-[#eff6ff]" },
  { label: "Awaiting Payment", value: formatMoney(stats.awaitingPayment), icon: "stat-awaiting", w: 16, bg: "bg-[#fff7ed]" },
  { label: "Quotes Sent (30d)", value: String(stats.quotesSent30d), icon: "stat-quotes", w: 16, bg: "bg-[#eef2ff]" },
  { label: "Revenue (30d)", value: formatMoney(stats.revenue30d), icon: "stat-revenue", w: 18, bg: "" },
];

export default function StatCards({
  stats,
  gridClassName = "grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-[27px]",
}: {
  stats: DashboardStats;
  gridClassName?: string;
}) {
  return (
    <Stagger className={`grid ${gridClassName}`} stagger={0.08}>
      {statCards(stats).map((stat) => (
        <StaggerItem
          key={stat.label}
          className="h-[164px] rounded-xl border border-[#e2e8f0] bg-white p-[23px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
        >
          <div className={`flex size-10 items-center justify-center rounded-lg ${stat.bg}`}>
            <Image src={`/onboarding/${stat.icon}.svg`} alt="" width={stat.w} height={16} />
          </div>
          <p className="mt-4 text-[14px] font-medium leading-5 text-[#64748b]">{stat.label}</p>
          <p className="mt-1 truncate text-[30px] font-bold leading-9 text-[#0f172a]">{stat.value}</p>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
