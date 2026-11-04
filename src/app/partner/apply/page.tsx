import { DollarSign, FolderOpen, Link2 } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import PartnerEnrollForm from "@/components/partner/PartnerEnrollForm";
import PartnerApplyForm from "@/components/partner-portal/PartnerApplyForm";
import { PROGRAM } from "@/lib/partners/program";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Apply to the Partner Program — Swamped",
  description: "Apply to the Swamped Partner Program and earn commissions for referring contractors.",
};

const points = [
  { icon: Link2, title: "Share your link", body: "Get a unique, trackable referral link for your network, clients, or audience." },
  { icon: DollarSign, title: "Earn commissions", body: `${PROGRAM.commissionRate}% of qualifying revenue from each referral for ${PROGRAM.commissionMonths} months.` },
  { icon: FolderOpen, title: "Use our resources", body: "Ready-to-share posts, email copy, and brand assets in your partner portal." },
];

/**
 * Partner application. Signed out: creates a partner login along with the
 * application. Signed in (e.g. a contractor): applies with that account.
 */
export default async function PartnerApplyPage() {
  let signedIn: { fullName: string; email: string; businessName: string } | null = null;
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user?.email_confirmed_at) {
      const [{ data: application }, { data: profile }] = await Promise.all([
        supabase.from("partner_applications").select("id").eq("owner_id", data.user.id).maybeSingle(),
        supabase.from("profiles").select("contact_name, legal_business_name, business_email").eq("id", data.user.id).maybeSingle(),
      ]);
      if (application || data.user.user_metadata?.partner_application) redirect("/partner/dashboard");
      signedIn = {
        fullName: profile?.contact_name ?? "",
        email: profile?.business_email || data.user.email || "",
        businessName: profile?.legal_business_name ?? "",
      };
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-[1080px]">
        <Link href="/partner" className="inline-flex items-center gap-1">
          <Image src="/images/logo.png" alt="" width={36} height={36} className="mix-blend-multiply" />
          <span className="text-[19px] font-bold text-navy">Swamped</span>
          <span className="ml-1.5 rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.5px] text-[#059669]">Partners</span>
        </Link>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_520px]">
          <section className="rounded-2xl bg-navy px-6 py-8 text-white sm:px-10 sm:py-10">
            <h1 className="text-[28px] font-extrabold leading-tight sm:text-[36px]">Become a Swamped Partner</h1>
            <p className="mt-3 text-[16px] leading-[1.6] text-[#cbd5e1]">Refer contractors and home service pros to Swamped and earn commissions when they use the platform.</p>
            <ul className="mt-8 flex flex-col gap-6">
              {points.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#34d399]">
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block text-[16px] font-bold">{title}</span>
                    <span className="mt-1 block text-[14px] leading-[1.6] text-[#cbd5e1]">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-8 border-t border-white/10 pt-6 text-[14px] text-[#cbd5e1]">
              Applications are reviewed within a few business days. You can explore your partner portal while you wait.
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-white p-6 sm:p-8">
            <h2 className="text-[22px] font-bold text-navy">Apply to the Partner Program</h2>
            <p className="mb-6 mt-1 text-[14px] text-[#64748b]">
              {signedIn ? "We've filled in your account details. Review them and tell us how you'll share Swamped." : "It's free. You'll create your partner login as part of applying."}
            </p>
            {signedIn ? <PartnerEnrollForm defaults={signedIn} redirectTo="/partner/dashboard" /> : <PartnerApplyForm />}
          </section>
        </div>
      </div>
    </div>
  );
}
