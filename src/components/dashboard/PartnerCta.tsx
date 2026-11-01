import { ArrowRight, Users } from "lucide-react";
import Link from "next/link";
import type { PartnerStatus } from "@/lib/partners/options";

const STATUS_COPY: Record<PartnerStatus, { badge: string; badgeClass: string; cta: string }> = {
  pending: { badge: "Application Pending", badgeClass: "bg-brand-light text-brand", cta: "View Application" },
  approved: { badge: "Active Partner", badgeClass: "bg-[#ecfdf5] text-[#059669]", cta: "Open Partner Program" },
  declined: { badge: "Not Approved", badgeClass: "bg-[#f1f5f9] text-[#64748b]", cta: "View Details" },
};

// Layout from the "Partner Program Dashboard Widget" in Figma (893:1621).
export default function PartnerCta({ status = null }: { status?: PartnerStatus | null }) {
  const copy = status ? STATUS_COPY[status] : null;

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] sm:flex-row sm:items-center sm:gap-6 sm:px-8">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-white">
        <Users className="size-6" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[18px] font-bold leading-7 text-navy">Partner Program</h2>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.4px] ${copy?.badgeClass ?? "bg-brand-light text-brand"}`}>
            {copy?.badge ?? "New"}
          </span>
        </div>
        <p className="mt-1 text-[15px] leading-[22px] text-[#64748b]">
          Share Swamped and earn commissions. Get rewarded for every contractor you refer to the platform.
        </p>
      </div>

      <Link
        href="/partner-program"
        className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-6 text-[15px] font-bold text-white transition-colors hover:bg-brand-dark"
      >
        {copy?.cta ?? "Join Program"}
        <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}
