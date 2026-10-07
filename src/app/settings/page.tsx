import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import SettingsView from "@/components/settings/SettingsView";
import { requireOnboardingUser } from "@/lib/onboarding/server";
import { loadSettings } from "@/lib/settings/data";

export const metadata: Metadata = {
  title: "Settings — Swamped",
};

export default async function SettingsPage() {
  const { supabase, user, profile } = await requireOnboardingUser("/settings");
  if (!profile.onboarding_completed_at) redirect("/onboarding");

  const data = await loadSettings(supabase, user, profile);

  return (
    <DashboardShell
      name={profile.contact_name || user.email || ""}
      title="Settings"
      subtitle="Manage business information, communication preferences, payment settings, and system defaults"
    >
      <SettingsView data={data} />
    </DashboardShell>
  );
}
