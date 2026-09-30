import Image from "next/image";
import Link from "next/link";

// These screens don't exist yet; the links go live as each one lands.
const actions = [
  { label: "Add Customer", icon: "action-customer", w: 20, href: "#" },
  { label: "Create Quote", icon: "action-quote", w: 18, href: "#" },
  { label: "Create Job", icon: "action-job", w: 16, href: "#" },
  { label: "Create Invoice", icon: "action-invoice", w: 12, href: "#" },
];

export default function QuickActions() {
  return (
    <section className="rounded-xl border border-[#e2e8f0] bg-white px-[14px] pb-[17px] pt-[9px] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <h2 className="text-[24px] font-bold leading-8 tracking-[0.047px] text-[#0f172a]">Quick Actions</h2>
      <div className="mt-[22px] grid grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:flex-wrap lg:gap-6">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex h-[50px] items-center justify-center gap-2 rounded-full bg-[#e6f9f5] text-[16px] font-bold leading-6 tracking-[0.047px] text-[#00c9a7] drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition-transform hover:scale-[1.03] active:scale-[0.98] lg:w-[220px]"
          >
            <Image src={`/onboarding/${action.icon}.svg`} alt="" width={action.w} height={16} />
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
