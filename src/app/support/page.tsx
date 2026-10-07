import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import SupportForm from "@/components/support/SupportForm";
import { requireOnboardingUser } from "@/lib/onboarding/server";

export const metadata: Metadata = {
  title: "Support — Swamped",
};

export default async function SupportPage() {
  const { user, profile } = await requireOnboardingUser("/support");
  if (!profile.onboarding_completed_at) redirect("/onboarding");

  return (
    <DashboardShell
      name={profile.contact_name || user.email || ""}
      title="Support"
      subtitle="Send our team a request and we'll reply by email."
    >
      <div className="px-4 pb-16 pt-6 sm:px-10 sm:pt-[72px]">
        <div className="rounded-[16px] border border-[#e2e8f0] bg-white p-5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] sm:p-8">
          <SupportForm email={user.email ?? ""} />
        </div>
      </div>
    </DashboardShell>
  );
}
