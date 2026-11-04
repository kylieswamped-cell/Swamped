import { BadgeCheck, Clock, DollarSign, FolderOpen, Link2, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import PartnerEnrollForm from "@/components/partner/PartnerEnrollForm";
import { requireOnboardingUser } from "@/lib/onboarding/server";
import { PARTNER_TYPES, type PartnerStatus } from "@/lib/partners/options";

export const metadata: Metadata = {
  title: "Partner Program — Swamped",
};

// "How It Works" from the Partner Program landing page in Figma (893:1620).
const steps = [
  { icon: Link2, title: "Share Your Link", body: "Get a unique, trackable referral link to share with your network, clients, or audience." },
  { icon: DollarSign, title: "Earn Commissions", body: "Earn partner payouts for every contractor who signs up and starts using Swamped." },
  { icon: FolderOpen, title: "Partner Resources", body: "Get marketing materials and tracking tools to help you share Swamped." },
];

const STATUS: Record<PartnerStatus, { icon: typeof Clock; box: string; title: string; body: string }> = {
  pending: {
    icon: Clock,
    box: "bg-brand-light text-brand",
    title: "Application received",
    body: "Thanks for applying! Our team is reviewing your application, usually within a few business days. You can explore your partner portal in the meantime.",
  },
  approved: {
    icon: BadgeCheck,
    box: "bg-[#ecfdf5] text-[#059669]",
    title: "You're an approved partner",
    body: "Welcome to the Swamped Partner Program! Your referral link, resources, and earnings are in your partner portal.",
  },
  declined: {
    icon: XCircle,
    box: "bg-[#fef2f2] text-[#dc2626]",
    title: "Application not approved",
    body: "We weren't able to approve your application this time. If you have questions, please reach out to our support team.",
  },
};

export default async function PartnerProgramPage() {
  const { supabase, user, profile } = await requireOnboardingUser("/partner-program");
  if (!profile.onboarding_completed_at) redirect("/onboarding");

  const { data: application } = await supabase
    .from("partner_applications")
    .select("status, partner_type, created_at")
    .eq("owner_id", user.id)
    .maybeSingle<{ status: PartnerStatus; partner_type: string; created_at: string }>();

  const status = application ? STATUS[application.status] : null;

  return (
    <DashboardShell
      name={profile.contact_name || user.email || ""}
      title="Partner Program"
      subtitle="Share Swamped with other contractors and earn commissions."
    >
      <div className="flex flex-col gap-6 px-4 pb-10 pt-6 sm:pl-8 sm:pr-[39px] sm:pt-[29px]">
        <section className="overflow-hidden rounded-2xl bg-navy px-6 py-8 text-white sm:px-10 sm:py-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.6px] text-brand-accent">
            <span className="size-1.5 rounded-full bg-brand-accent" />
            Official Partner Program
          </span>
          <h2 className="mt-4 max-w-[640px] text-[28px] font-extrabold leading-tight sm:text-[34px]">
            Share Swamped. Earn commissions.
          </h2>
          <p className="mt-3 max-w-[640px] text-[16px] leading-[1.6] text-[#cbd5e1]">
            Refer other contractors and home service professionals to Swamped and earn ongoing payouts when they
            start using the platform.
          </p>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_460px]">
          <section className="rounded-2xl border border-line bg-white p-6 sm:p-8">
            <h2 className="text-[20px] font-bold text-navy">How It Works</h2>
            <ol className="mt-6 flex flex-col gap-6">
              {steps.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="flex gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block text-[16px] font-bold text-navy">
                      {i + 1}. {title}
                    </span>
                    <span className="mt-1 block text-[14px] leading-[1.6] text-muted">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-8 border-t border-line pt-6 text-[14px] text-muted">
              Want the full details?{" "}
              <Link href="/partner" target="_blank" className="font-semibold text-brand hover:text-brand-dark">
                Read about the Partner Program
              </Link>
              .
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-white p-6 sm:p-8">
            {application && status ? (
              <div className="flex flex-col items-center py-6 text-center">
                <span className={`flex size-16 items-center justify-center rounded-full ${status.box}`}>
                  <status.icon className="size-8" />
                </span>
                <h2 className="mt-5 text-[22px] font-bold text-navy">{status.title}</h2>
                <p className="mt-3 max-w-[360px] text-[15px] leading-[1.6] text-muted">{status.body}</p>
                <dl className="mt-6 w-full rounded-xl bg-[#f8fafc] px-5 py-4 text-left text-[14px]">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Applied</dt>
                    <dd className="font-semibold text-navy">
                      {new Date(application.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                    </dd>
                  </div>
                  <div className="mt-2 flex justify-between gap-4">
                    <dt className="text-muted">Partner type</dt>
                    <dd className="text-right font-semibold text-navy">
                      {PARTNER_TYPES.find((t) => t.value === application.partner_type)?.label ?? "Other"}
                    </dd>
                  </div>
                </dl>
                {application.status !== "declined" && (
                  <Link
                    href="/partner/dashboard"
                    className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-[#10b981] text-[15px] font-semibold text-white transition-colors hover:bg-[#059669]"
                  >
                    Open Partner Portal
                  </Link>
                )}
                {application.status === "declined" && (
                  <Link href="/support" className="mt-6 text-[14px] font-semibold text-brand hover:text-brand-dark">
                    Contact support
                  </Link>
                )}
              </div>
            ) : (
              <>
                <h2 className="text-[20px] font-bold text-navy">Apply to the Partner Program</h2>
                <p className="mt-1 mb-6 text-[14px] text-muted">
                  We&apos;ve filled in your account details. Review them and tell us a bit about how you&apos;ll share
                  Swamped.
                </p>
                <PartnerEnrollForm
                  defaults={{
                    fullName: profile.contact_name ?? "",
                    email: profile.business_email || user.email || "",
                    businessName: profile.legal_business_name ?? "",
                  }}
                />
              </>
            )}
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
