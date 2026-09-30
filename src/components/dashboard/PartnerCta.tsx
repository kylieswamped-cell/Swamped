import Link from "next/link";

export default function PartnerCta() {
  return (
    <section className="relative flex flex-col gap-6 rounded-xl border border-[#e2e8f0] bg-white px-6 py-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] sm:min-h-[225px] sm:px-[39px] sm:pb-[31px] sm:pt-6 md:block">
      <h2 className="text-[24px] font-bold leading-8 tracking-[-0.6px] text-[#0a192f]">
        Share Swamped. Earn commissions.
      </h2>
      <p className="max-w-[302px] text-[15px] leading-[22px] text-[#6b7280] md:mt-[23px]">
        Refer other contractors to Swamped and earn commissions when they begin using the platform.
      </p>
      <p className="flex items-center gap-2 text-[12px] font-medium uppercase leading-[18px] tracking-[0.6px] text-[#9ca3af] md:mt-[23px]">
        <span className="size-2 rounded-full bg-[#00c185]" />
        Partner Rewards
      </p>
      <Link
        href="/partner"
        className="flex h-[52px] w-full items-center justify-center rounded-xl bg-[#00c185] text-[16px] font-bold leading-6 tracking-[0.016px] text-white transition-colors hover:bg-[#00a873] md:absolute md:bottom-[31px] md:right-6 md:w-[302px]"
      >
        Join the Partner Program
      </Link>
    </section>
  );
}
