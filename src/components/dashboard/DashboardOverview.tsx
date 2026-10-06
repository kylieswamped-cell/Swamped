import Image from "next/image";
import Link from "next/link";
import StatCards, { type DashboardStats } from "./StatCards";

export type { DashboardStats };

const actions = [
  { label: "Add Customer", icon: "action-customer", w: 20, href: "#" },
  { label: "Create Quote", icon: "action-quote", w: 18, href: "#" },
  { label: "Create Job", icon: "action-job", w: 16, href: "#" },
  { label: "Create Invoice", icon: "action-invoice", w: 12, href: "/invoices?new=1" },
];

export default function DashboardOverview({ stats }: { stats: DashboardStats }) {
  return (
    <div className="flex flex-col gap-6 px-6 py-8 sm:px-10 sm:py-12">
      <StatCards stats={stats} gridClassName="grid-cols-2 gap-4 md:grid-cols-4" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex h-[50px] items-center justify-center gap-2 rounded-full bg-[#e6f9f5] px-4 text-[15px] font-bold text-[#00c9a7] shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition-transform hover:scale-[1.03] active:scale-[0.98] sm:text-[16px]"
          >
            <Image src={`/onboarding/${action.icon}.svg`} alt="" width={action.w} height={16} />
            {action.label}
          </Link>
        ))}
      </div>

      <section className="min-h-[600px] rounded-3xl border border-border bg-white shadow-[0_10px_15px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between border-b border-border px-8 py-8">
          <h2 className="text-[24px] font-extrabold leading-7 text-[#0a1b33]">Recent Activity</h2>
        </div>
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-[#f9fafb]">
            <Image src="/onboarding/activity-empty.svg" alt="" width={34} height={30} />
          </div>
          <h3 className="mt-6 text-[18px] font-bold leading-7 text-[#1e293b]">No Recent Activity</h3>
          <p className="mt-2 max-w-[384px] text-[16px] leading-6 text-[#64748b]">
            Activity from customers, quotes, jobs, invoices, and payments will appear here.
          </p>
        </div>
      </section>
    </div>
  );
}
