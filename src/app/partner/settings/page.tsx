import type { Metadata } from "next";
import PartnerSettingsForm from "@/components/partner-portal/PartnerSettingsForm";
import PartnerShell from "@/components/partner-portal/PartnerShell";
import { requirePartner } from "@/lib/partners/server";

export const metadata: Metadata = { title: "Partner Settings — Swamped" };

export default async function PartnerSettingsPage() {
  const { user, partner } = await requirePartner();
  return (
    <PartnerShell title="Settings" subtitle="Manage your partner profile, notifications, and login." name={partner.fullName} status={partner.status}>
      <PartnerSettingsForm partner={partner} loginEmail={user.email ?? ""} />
    </PartnerShell>
  );
}
