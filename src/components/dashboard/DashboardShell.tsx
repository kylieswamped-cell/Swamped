import type { ReactNode } from "react";
import { getNotifications } from "@/lib/notifications/data";
import type { ChecklistStatus } from "@/lib/onboarding/steps";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import GettingStarted from "./GettingStarted";
import HeaderMenus from "./HeaderMenus";
import Sidebar from "./Sidebar";

/** Loads the signed-in user's email and notifications for the header menus. */
async function HeaderMenusLoader({ name }: { name: string }) {
  let email = "";
  let feed: Awaited<ReturnType<typeof getNotifications>> = { items: [], now: 0 };
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      email = data.user.email ?? "";
      const { data: profile } = await supabase
        .from("profiles")
        .select("notifications_seen_at")
        .eq("id", data.user.id)
        .maybeSingle();
      feed = await getNotifications(supabase, profile?.notifications_seen_at ?? null);
    }
  }
  return <HeaderMenus name={name || email} email={email} notifications={feed.items} now={feed.now} />;
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
          <header className="flex h-[83px] items-center justify-between border-b border-line bg-white pl-16 pr-6 sm:pr-10 lg:pl-10">
            <div className="min-w-0">
              <h1 className="text-[20px] font-bold leading-8 tracking-[0.047px] text-navy sm:text-[24px]">
                {title}
              </h1>
              {subtitle && (
                <p className="hidden truncate text-[14px] leading-5 text-[#64748b] sm:block">{subtitle}</p>
              )}
            </div>
            <HeaderMenusLoader name={name} />
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
