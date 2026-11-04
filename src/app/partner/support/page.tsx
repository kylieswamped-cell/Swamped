import type { Metadata } from "next";
import PartnerShell from "@/components/partner-portal/PartnerShell";
import PartnerSupport from "@/components/partner-portal/PartnerSupport";
import { requirePartner } from "@/lib/partners/server";

export const metadata: Metadata = { title: "Partner Help Center — Swamped" };

export default async function PartnerSupportPage() {
  const { partner } = await requirePartner();
  return (
    <PartnerShell title="Partner Help Center" subtitle="Find answers to common questions or contact the Swamped team if you need additional help." name={partner.fullName} status={partner.status}>
      <PartnerSupport />
    </PartnerShell>
  );
}
