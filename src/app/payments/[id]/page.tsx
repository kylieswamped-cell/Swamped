import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import PaymentDetailView from "@/components/payments/PaymentDetailView";
import { requireOnboardingUser } from "@/lib/onboarding/server";
import { getPayment, parsePaymentSlug } from "@/lib/payments/data";

export const metadata: Metadata = {
  title: "Payment — Swamped",
};

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await requireOnboardingUser(`/payments/${id}`);
  if (!profile.onboarding_completed_at) redirect("/onboarding");
  if (!parsePaymentSlug(id)) notFound();

  const payment = await getPayment(supabase, id);
  if (!payment) notFound();

  return (
    <DashboardShell name={profile.contact_name || user.email || ""} title="Payments">
      <PaymentDetailView payment={payment} />
    </DashboardShell>
  );
}
