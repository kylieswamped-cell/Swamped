"use client";

import { ArrowRight, Info, Lightbulb, Percent, Receipt, FileText } from "lucide-react";
import { useState } from "react";
import { saveBusinessAbout, saveBusinessDefaults, saveBusinessDetails } from "@/lib/onboarding/actions";
import type { AmountType } from "@/lib/quotes/totals";
import { AmountInput, Field, FormError, PrimaryButton, SelectField, TextAreaField, TextField } from "./fields";
import StepModal from "./StepModal";
import { formValues, useStepSubmit } from "./useStepSubmit";

export type BusinessProfileDefaults = {
  legalBusinessName: string;
  contactName: string;
  businessEmail: string;
  businessPhone: string;
  websiteUrl: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  industry: string;
  yearsInBusiness: string;
  employeeRange: string;
  revenueRange: string;
  quoteExpirationDays: string;
  depositValue: string;
  depositType: AmountType;
  quoteTerms: string;
  invoiceDueDays: string;
  invoiceTerms: string;
  taxRate: string;
};

type StepProps = { defaults: BusinessProfileDefaults; onDone: () => void };

// Part 1 ---------------------------------------------------------------------------

export function BusinessDetailsStep({ defaults: d, onDone }: StepProps) {
  const { pending, error, fieldErrors: fe, run } = useStepSubmit();

  return (
    <StepModal
      label="Step 1 of 4 • Part 1 of 3"
      title="Complete Your Business Profile"
      description="Enter the business information that will appear on your quotes and invoices. This builds trust with your clients."
      width="max-w-[768px]"
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const values = formValues(e.currentTarget);
          run(() => saveBusinessDetails(values), onDone);
        }}
        className="flex flex-col gap-8"
      >
        <section>
          <h3 className="text-[16px] font-semibold text-[#0f172a]">Business Details</h3>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <TextField label="Legal Business Name" name="legalBusinessName" required defaultValue={d.legalBusinessName} placeholder="e.g. Acme Corporation Inc." error={fe.legalBusinessName} autoComplete="organization" />
            <div className="hidden sm:block" />
            <TextField label="Primary Contact Name" name="contactName" defaultValue={d.contactName} placeholder="Jane Doe" autoComplete="name" />
            <TextField label="Business Email Address" name="businessEmail" type="email" required defaultValue={d.businessEmail} placeholder="support@acme.com" error={fe.businessEmail} autoComplete="email" />
            <TextField label="Business Phone Number" name="businessPhone" type="tel" defaultValue={d.businessPhone} placeholder="+1 (555) 000-0000" autoComplete="tel" />
            <TextField label="Website URL" name="websiteUrl" type="url" defaultValue={d.websiteUrl} placeholder="https://www.acme.com" autoComplete="url" />
          </div>
        </section>

        <section className="border-t border-[#e2e8f0] pt-8">
          <h3 className="text-[16px] font-semibold text-[#0f172a]">Registered Address</h3>
          <p className="mt-1 text-[13px] text-[#64748b]">This address will be used for billing and tax purposes.</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <TextField label="Street Address" name="streetAddress" defaultValue={d.streetAddress} placeholder="123 Innovation Drive, Suite 100" autoComplete="street-address" />
            <TextField label="City" name="city" defaultValue={d.city} placeholder="San Francisco" autoComplete="address-level2" />
            <TextField label="State / Province" name="state" defaultValue={d.state} placeholder="CA" autoComplete="address-level1" />
            <TextField label="Zip Code" name="zipCode" defaultValue={d.zipCode} placeholder="10001" autoComplete="postal-code" />
          </div>
        </section>

        <FormError message={error} />
        <div className="flex justify-end">
          <PrimaryButton pending={pending}>
            Save &amp; Next Step <ArrowRight className="size-4" />
          </PrimaryButton>
        </div>
      </form>
    </StepModal>
  );
}

// Part 2 ---------------------------------------------------------------------------

const INDUSTRIES = [
  "General Contracting",
  "Plumbing",
  "Electrical",
  "HVAC",
  "Roofing",
  "Painting",
  "Landscaping",
  "Cleaning",
  "Handyman",
  "Remodeling",
  "Flooring",
  "Pest Control",
  "Other",
];
const EMPLOYEE_RANGES = ["Just me", "2–5", "6–10", "11–25", "26–50", "51–100", "100+"];
const REVENUE_RANGES = ["Under $100K", "$100K – $250K", "$250K – $500K", "$500K – $1M", "$1M – $5M", "$5M+"];

export function BusinessAboutStep({ defaults: d, onDone }: StepProps) {
  const { pending, error, fieldErrors: fe, run } = useStepSubmit();

  return (
    <StepModal
      label="Step 1 of 4 • Part 2 of 3"
      title="Tell Us About Your Business"
      width="max-w-[898px]"
      description={
        <p className="mt-4 flex gap-3 rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-4 text-[14px] leading-[22px] text-[#475569]">
          <Info className="mt-0.5 size-4 shrink-0 text-[#64748b]" />
          This information is private and helps us improve reporting and build better features over time. We use this data to tailor your dashboard experience based on your specific industry standards.
        </p>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const values = formValues(e.currentTarget);
          run(() => saveBusinessAbout(values), onDone);
        }}
        className="flex flex-col gap-6"
      >
        <div className="grid gap-x-12 gap-y-6 sm:grid-cols-2">
          <SelectField label="Industry" name="industry" placeholder="Select your industry" options={INDUSTRIES} defaultValue={d.industry} hint="Choose the category that best describes your core operations." />
          <TextField label="Years in Business" name="yearsInBusiness" type="number" min={0} inputMode="numeric" defaultValue={d.yearsInBusiness} placeholder="e.g. 5" error={fe.yearsInBusiness} />
          <SelectField label="Number of Employees" name="employeeRange" placeholder="Select range" options={EMPLOYEE_RANGES} defaultValue={d.employeeRange} />
          <SelectField label="Estimated Annual Revenue" name="revenueRange" placeholder="Select range" options={REVENUE_RANGES} defaultValue={d.revenueRange} />
        </div>
        <FormError message={error} />
        <div className="flex justify-end pt-2">
          <PrimaryButton pending={pending}>
            Save &amp; Next Step <ArrowRight className="size-4" />
          </PrimaryButton>
        </div>
      </form>
    </StepModal>
  );
}

// Part 3 ---------------------------------------------------------------------------

function SettingsCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#e2e8f0]">
      <h3 className="flex items-center gap-2 border-b border-[#e2e8f0] bg-[#f8fafc] px-5 py-4 text-[13px] font-bold uppercase tracking-[0.6px] text-[#334155]">
        <span className="text-[#059669]">{icon}</span>
        {title}
      </h3>
      <div className="flex flex-col gap-5 p-5">{children}</div>
    </section>
  );
}

export function BusinessDefaultsStep({ defaults: d, onDone }: StepProps) {
  const { pending, error, fieldErrors: fe, run } = useStepSubmit();
  const [deposit, setDeposit] = useState(d.depositValue);
  const [depositType, setDepositType] = useState<AmountType>(d.depositType);

  return (
    <StepModal
      label="Step 1 of 4 • Part 3 of 3"
      title="Configure Your Default Quote & Invoice Settings"
      width="max-w-[768px]"
      description="These settings will automatically apply to new Quotes and Invoices. If you don't have this information ready yet, you can skip this step and configure everything later from the Settings menu."
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const values = { ...formValues(e.currentTarget), depositValue: deposit, depositType };
          run(() => saveBusinessDefaults(values), onDone);
        }}
        className="flex flex-col gap-6"
      >
        <SettingsCard icon={<FileText className="size-4" />} title="Quote Defaults">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Default Quote Expiration" name="quoteExpirationDays" type="number" min={1} defaultValue={d.quoteExpirationDays} suffix="Days" hint="How many days after sending a Quote should it expire?" error={fe.quoteExpirationDays} />
            <Field label="Default Deposit Requirements" name="depositValue" error={fe.depositValue} hint="Set a default deposit requirement using either a percentage or fixed dollar amount.">
              <AmountInput name="depositValue" value={deposit} type={depositType} onValue={setDeposit} onType={setDepositType} />
            </Field>
          </div>
          <TextAreaField label="Default Quote Terms & Conditions" name="quoteTerms" defaultValue={d.quoteTerms} placeholder="e.g. This quote is subject to site inspection. All prices include labor and materials..." hint="These terms will appear by default on every new Quote." />
        </SettingsCard>

        <SettingsCard icon={<Receipt className="size-4" />} title="Invoice Defaults">
          <div className="sm:w-1/2">
            <TextField label="Default Invoice Due Date" name="invoiceDueDays" type="number" min={1} defaultValue={d.invoiceDueDays} suffix="Days" hint="How many days after sending an Invoice should payment be due?" error={fe.invoiceDueDays} />
          </div>
          <TextAreaField label="Default Invoice Terms & Conditions" name="invoiceTerms" defaultValue={d.invoiceTerms} placeholder="e.g. Please make checks payable to Your Business Name. Payment can also be made online via credit card..." hint="These terms will appear by default on every new Invoice." />
        </SettingsCard>

        <SettingsCard icon={<Percent className="size-4" />} title="Tax Settings">
          <div className="sm:w-1/2">
            <TextField label="Default Tax Rate" name="taxRate" type="number" min={0} max={100} step="0.01" defaultValue={d.taxRate} icon={<Percent className="size-4" />} hint="Set the default tax rate that should be applied when taxes are used on Quotes and Invoices." error={fe.taxRate} />
          </div>
        </SettingsCard>

        <FormError message={error} />
        <div className="flex flex-col-reverse items-stretch gap-4 border-t border-[#e2e8f0] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 rounded-full bg-[#f8fafc] px-4 py-2 text-[12px] text-[#64748b]">
            <Lightbulb className="size-3.5 text-[#f59e0b]" />
            These settings can always be updated later from the Settings menu.
          </p>
          <div className="flex items-center justify-end gap-6">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => saveBusinessDefaults(null), onDone)}
              className="text-[14px] font-semibold text-[#334155] transition-colors hover:text-[#0f172a] disabled:opacity-60"
            >
              Skip for Now
            </button>
            <PrimaryButton pending={pending}>
              Save &amp; Continue <ArrowRight className="size-4" />
            </PrimaryButton>
          </div>
        </div>
      </form>
    </StepModal>
  );
}
