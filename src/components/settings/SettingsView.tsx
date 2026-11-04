import type { LibraryItem } from "@/lib/lineLibrary";
import type { SettingsData } from "@/lib/settings/data";
import { InvoiceConfigCard, QuoteConfigCard } from "./ConfigCards";
import { LineItemLibraryCard } from "./LineItemLibraryCard";
import { PreviewProfileProvider } from "./TemplatePreview";
import { OperatingHoursCard, TaxCard } from "./HoursTaxCards";
import {
  CommunicationCard,
  NotificationsCard,
  PayoutCard,
  RefundCard,
  StripeStatusCard,
} from "./OtherCards";
import { BusinessProfileCard, PersonalInfoCard } from "./ProfileCards";

export default function SettingsView({
  data,
  library,
}: {
  data: SettingsData;
  library: { items?: LibraryItem[]; error?: string };
}) {
  const previewProfile = {
    businessName: data.business.businessName,
    contactName: data.business.contactName,
    email: data.business.email || data.personal.email,
  };
  return (
    <PreviewProfileProvider profile={previewProfile}>
      <div className="flex flex-col gap-6 px-4 pb-16 pt-6 sm:gap-8 sm:px-7 sm:pt-10">
        <StripeStatusCard connected={data.stripe.connected} />
        <PersonalInfoCard data={data.personal} />
        <BusinessProfileCard data={data.business} />
        <OperatingHoursCard data={data.hours} />
        <TaxCard data={data.tax} />
        <LineItemLibraryCard
          initial={library.items ?? []}
          loadError={library.error}
        />
        <QuoteConfigCard data={data.quote} templates={data.templates} />
        <InvoiceConfigCard data={data.invoice} templates={data.templates} />
        <RefundCard template={data.templates.refund} />
        <NotificationsCard prefs={data.notifications} />
        <CommunicationCard prefs={data.communications} />
        <PayoutCard data={data.stripe} />
      </div>
    </PreviewProfileProvider>
  );
}
