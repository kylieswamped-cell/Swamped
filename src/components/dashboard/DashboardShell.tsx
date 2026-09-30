import Image from "next/image";
import type { ReactNode } from "react";
import type { ChecklistStatus } from "@/lib/onboarding/steps";
import GettingStarted from "./GettingStarted";
import Sidebar from "./Sidebar";

function initials(name: string) {
  const parts = name.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

type DashboardShellProps = {
  name: string;
  title?: string;
  subtitle?: string;
  /** Shows the Getting Started column (used during onboarding). */
  checklist?: ChecklistStatus;
  children: ReactNode;
  /** Rendered over the page content, e.g. the onboarding step modals. */
  overlay?: ReactNode;
};

export default function DashboardShell({
  name,
  title = "Welcome Back",
  subtitle,
  checklist,
  children,
  overlay,
}: DashboardShellProps) {
  return (
    <div className="flex min-h-screen flex-1 bg-surface">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          <header className="flex h-[83px] items-center justify-between border-b border-[#e2e8f0] bg-white pl-16 pr-6 sm:pr-10 lg:pl-10">
            <div className="min-w-0">
              <h1 className="text-[20px] font-bold leading-8 tracking-[0.047px] text-[#0f172a] sm:text-[24px]">
                {title}
              </h1>
              {subtitle && (
                <p className="hidden truncate text-[14px] leading-5 text-[#64748b] sm:block">{subtitle}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3.5">
              <button
                type="button"
                aria-label="Notifications"
                className="rounded-lg p-2 transition-colors hover:bg-surface"
              >
                <Image src="/onboarding/bell.svg" alt="" width={18} height={20} />
              </button>
              <span
                title={name}
                className="flex size-10 items-center justify-center rounded-full border-2 border-[#14263d] bg-[#0f172a] text-[14px] font-bold text-white"
              >
                {initials(name)}
              </span>
            </div>
          </header>
          {children}
        </div>

        {checklist && (
          <aside className="w-full shrink-0 xl:w-[340px]">
            <GettingStarted status={checklist} />
          </aside>
        )}
      </div>

      {overlay}
    </div>
  );
}
