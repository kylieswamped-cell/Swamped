import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import DashboardOverview from "@/components/onboarding/DashboardOverview";
import GettingStarted from "@/components/onboarding/GettingStarted";
import Sidebar from "@/components/onboarding/Sidebar";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Getting Started — Swamped",
};

function initials(name: string) {
  const parts = name.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default async function OnboardingPage() {
  if (!isSupabaseConfigured) redirect("/login");
  const supabase = await createClient();
  // Check here too, not just in the proxy: pages must verify auth themselves.
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/onboarding");
  // Unverified emails never get in, even with a session somehow in hand.
  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  const { email, user_metadata: meta } = data.user;
  const name = (meta.full_name as string | undefined) || email || "";

  return (
    <div className="flex min-h-screen flex-1 bg-surface">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          <header className="flex h-[83px] items-center justify-between border-b border-[#e2e8f0] bg-white pl-16 pr-6 sm:pr-10 lg:pl-10">
            <h1 className="text-[20px] font-bold leading-8 text-[#0f172a] sm:text-[24px]">
              Welcome Back
            </h1>
            <div className="flex items-center gap-6">
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
          <DashboardOverview />
        </div>

        <aside className="w-full shrink-0 xl:w-[340px]">
          <GettingStarted />
        </aside>
      </div>
    </div>
  );
}
