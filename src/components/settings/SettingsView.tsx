import type { SettingsData } from "@/lib/settings/data";
import { InvoiceConfigCard, QuoteConfigCard } from "./ConfigCards";
import { OperatingHoursCard, TaxCard } from "./HoursTaxCards";
import { CommunicationCard, NotificationsCard, PayoutCard, RefundCard, StripeStatusCard } from "./OtherCards";
import { BusinessProfileCard, PersonalInfoCard } from "./ProfileCards";

export default function SettingsView({ data }: { data: SettingsData }) {
  return (
    <div className="flex flex-col gap-6 px-4 pb-16 pt-6 sm:gap-8 sm:px-7 sm:pt-10">
      <StripeStatusCard connected={data.stripe.connected} />
      <PersonalInfoCard data={data.personal} />
      <BusinessProfileCard data={data.business} />
      <OperatingHoursCard data={data.hours} />
      <TaxCard data={data.tax} />
      <QuoteConfigCard data={data.quote} templates={data.templates} />
      <InvoiceConfigCard data={data.invoice} templates={data.templates} />
      <RefundCard template={data.templates.refund} />
      <NotificationsCard prefs={data.notifications} />
      <CommunicationCard prefs={data.communications} />
      <PayoutCard data={data.stripe} />
    </div>
  );
}
