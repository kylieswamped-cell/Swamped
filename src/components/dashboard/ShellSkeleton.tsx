import Image from "next/image";
import Sidebar from "./Sidebar";

const bar = "animate-pulse rounded-lg bg-[#e2e8f0]";

/**
 * Shown the moment a sidebar link is clicked, while the page loads on the
 * server. Mirrors DashboardShell so the sidebar and header don't jump.
 */
export default function ShellSkeleton({ title, cards = 4 }: { title: string; cards?: number }) {
  return (
    <div className="flex min-h-screen flex-1 bg-surface">
      <Sidebar />
      <div className="min-w-0 flex-1" aria-busy="true" aria-label={`Loading ${title}`}>
        <header className="flex h-[83px] items-center justify-between border-b border-[#e2e8f0] bg-white pl-16 pr-6 sm:pr-10 lg:pl-10">
          <h1 className="text-[20px] font-bold leading-8 tracking-[0.047px] text-[#0f172a] sm:text-[24px]">{title}</h1>
          <div className="flex shrink-0 items-center gap-3.5">
            <span className="p-2">
              <Image src="/onboarding/bell.svg" alt="" width={18} height={20} />
            </span>
            <span className="size-10 animate-pulse rounded-full bg-[#e2e8f0]" />
          </div>
        </header>
        <div className="px-4 pb-12 pt-6 sm:px-10 sm:pt-[22px]">
          <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${cards === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3"} xl:gap-6`}>
            {Array.from({ length: cards }, (_, i) => (
              <div key={i} className="h-[113px] rounded-xl border border-[#e2e8f0] bg-white p-6">
                <div className={`${bar} h-4 w-3/5`} />
                <div className={`${bar} mt-4 h-7 w-1/4`} />
              </div>
            ))}
          </div>
          <div className="mt-8 h-[60px] rounded-xl border border-[#e2e8f0] bg-white" />
          <div className="mt-5 overflow-hidden rounded-xl border border-[#e2e8f0] bg-white">
            <div className="h-[52px] border-b border-[#e2e8f0] bg-[#f8fafc]" />
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex h-[72px] items-center gap-6 border-b border-[#e2e8f0] px-6 last:border-b-0">
                <div className={`${bar} h-4 w-16`} />
                <div className={`${bar} h-4 w-32`} />
                <div className={`${bar} h-4 flex-1`} />
                <div className={`${bar} h-5 w-20 rounded-full`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
