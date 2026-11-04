import { Download, Search } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PartnerShell from "@/components/partner-portal/PartnerShell";
import { Card, CopyButton, ReferralLinkBox } from "@/components/partner-portal/ui";
import { referralUrl, shareMessage } from "@/lib/partners/portal";
import { requirePartner } from "@/lib/partners/server";

export const metadata: Metadata = { title: "Referral Link — Swamped Partners" };

// Figma 926:1187.
export default async function ReferralLinkPage() {
  const { partner } = await requirePartner();
  const url = await referralUrl(partner);
  const message = shareMessage(url);

  return (
    <PartnerShell title="Referral Link" subtitle="Share your referral link and earn commissions when your referrals use Swamped." name={partner.fullName} status={partner.status}>
      <Card title="Your Referral Link" subtitle="Share this link so you receive credit when someone creates a Swamped account.">
        <ReferralLinkBox url={url} />
        <p className="mt-3 text-[12px] leading-4 text-[#94a3b8]">
          Your code is <span className="font-mono font-semibold text-[#475569]">{partner.referralCode}</span>. Adding <span className="font-mono">?ref={partner.referralCode}</span> to
          any Swamped page link works too. Sign-ups are credited for 60 days after someone opens your link.
        </p>
      </Card>

      <Card title="Share Swamped">
        <p className="rounded-xl border border-line bg-[#f8fafc] p-4 text-[14px] leading-6 text-[#475569]">{message}</p>
        <CopyButton text={message} label="Copy Message" className="mt-4" />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Logo Download">
          <div className="flex h-28 items-center justify-center gap-2 rounded-xl border border-line bg-[#f8fafc]">
            <Image src="/images/logo.png" alt="" width={44} height={44} className="mix-blend-multiply" />
            <span className="text-[24px] font-bold text-navy">Swamped</span>
          </div>
          <a
            href="/images/logo.png"
            download="swamped-logo.png"
            className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#ecfdf5] text-[14px] font-semibold text-[#059669] transition-colors hover:bg-[#d1fae5]"
          >
            <Download className="size-4" /> Download Logo
          </a>
        </Card>
        <Card title="Need More Content?" subtitle="Ready-to-use posts, email copy, and brand assets to help you share Swamped.">
          <Link
            href="/partner/resources"
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#eff6ff] text-[14px] font-semibold text-[#2563eb] transition-colors hover:bg-[#dbeafe]"
          >
            <Search className="size-4" /> View Marketing Resources
          </Link>
        </Card>
      </div>
    </PartnerShell>
  );
}
