import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import DashboardShell from "@/components/dashboard/DashboardShell";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { getDashboardStats } from "@/lib/dashboard/stats";
import { requireOnboardingUser } from "@/lib/onboarding/server";
import { checklistStatus } from "@/lib/onboarding/steps";

export const metadata: Metadata = {
  title: "Getting Started — Swamped",
};

// Shown in the quote form when the user hasn't set their own default terms.
const SAMPLE_TERMS = `1. ACCEPTANCE OF WORK: By accepting this quote, the Customer agrees to the terms and scope defined herein.
2. PAYMENT TERMS: Full payment is due within 15 days of project completion. Deposits are non-refundable.
3. MODIFICATIONS: Any changes to the scope of work must be agreed upon in writing and may result in additional charges.
4. WARRANTY: All labor is guaranteed for 12 months from the date of completion. Material warranties vary by manufacturer.`;

const longDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default async function OnboardingPage() {
  const { supabase, user, profile: p } = await requireOnboardingUser("/onboarding");
  // Finished users belong in the app, not back in onboarding.
  if (p.onboarding_completed_at) redirect("/dashboard");

  const [{ data: customers }, { count: quoteCount }, stats] = await Promise.all([
    supabase.from("customers").select("id, name, email").order("created_at", { ascending: false }),
    supabase.from("quotes").select("id", { count: "exact", head: true }),
    getDashboardStats(supabase),
  ]);

  const today = new Date();
  const expires = new Date(today);
  expires.setDate(expires.getDate() + p.quote_expiration_days);
  const str = (v: string | number | null) => (v === null ? "" : String(v));

  return (
    <DashboardShell
      name={p.contact_name || user.email || ""}
      checklist={checklistStatus(p.onboarding_step, Boolean(p.stripe_connected_at))}
      overlay={
        <OnboardingFlow
          initialStep={p.onboarding_step}
          customers={customers ?? []}
          business={{
            legalBusinessName: str(p.legal_business_name),
            contactName: str(p.contact_name),
            businessEmail: str(p.business_email),
            businessPhone: str(p.business_phone),
            websiteUrl: str(p.website_url),
            streetAddress: str(p.street_address),
            city: str(p.city),
            state: str(p.state),
            zipCode: str(p.zip_code),
            industry: str(p.industry),
            yearsInBusiness: str(p.years_in_business),
            employeeRange: str(p.employee_range),
            revenueRange: str(p.revenue_range),
            quoteExpirationDays: str(p.quote_expiration_days),
            depositValue: str(p.deposit_value),
            depositType: p.deposit_type,
            quoteTerms: str(p.quote_terms),
            invoiceDueDays: str(p.invoice_due_days),
            invoiceTerms: str(p.invoice_terms),
            taxRate: str(p.tax_rate),
          }}
          quote={{
            quoteNumber: `Q-${1001 + (quoteCount ?? 0)}`,
            quoteDate: longDate(today),
            expiresOn: longDate(expires),
            terms: p.quote_terms || SAMPLE_TERMS,
            taxRate: str(p.tax_rate),
            depositValue: str(p.deposit_value),
            depositType: p.deposit_type,
          }}
        />
      }
    >
      <DashboardOverview stats={stats} />
    </DashboardShell>
  );
}
