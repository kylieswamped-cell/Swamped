import type { Metadata } from "next";
import PartnerShell from "@/components/partner-portal/PartnerShell";
import ResourceLibrary from "@/components/partner-portal/ResourceLibrary";
import { referralUrl } from "@/lib/partners/portal";
import { requirePartner } from "@/lib/partners/server";

export const metadata: Metadata = { title: "Marketing Resources — Swamped Partners" };

// Figma 926:1606. Videos and graphics join the library as they're produced.
export default async function MarketingResourcesPage() {
  const { partner } = await requirePartner();
  const url = await referralUrl(partner);
  return (
    <PartnerShell title="Marketing Resources" subtitle="Access ready-to-use marketing materials to help you promote Swamped." name={partner.fullName} status={partner.status}>
      <ResourceLibrary url={url} />
    </PartnerShell>
  );
}
