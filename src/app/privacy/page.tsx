import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Swamped",
  description: "How Swamped collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="November 1, 2026"
      intro={
        <p>
          This Privacy Policy explains how Swamped Inc. (&quot;Swamped,&quot; &quot;we,&quot; &quot;us&quot;) collects,
          uses, and shares information when you use our website and application (the &quot;Service&quot;).
        </p>
      }
      sections={[
        {
          heading: "Information We Collect",
          body: (
            <>
              <p>
                <strong className="text-navy">Account and business information</strong>: your name, email address,
                phone number, password, business name, address, logo, and settings.
              </p>
              <p>
                <strong className="text-navy">Customer information you add</strong>: details about your customers,
                such as names, contact information, and addresses, along with the jobs, quotes, invoices, payments,
                files, and notes you create.
              </p>
              <p>
                <strong className="text-navy">Payment information</strong>: payments are processed by Stripe. We
                receive payment status and limited details (such as amount and date) but we don&apos;t store full card
                or bank account numbers.
              </p>
              <p>
                <strong className="text-navy">Usage and device information</strong>: basic technical data such as IP
                address, browser type, and pages visited, collected through cookies and similar technologies needed to
                keep you signed in and run the Service.
              </p>
            </>
          ),
        },
        {
          heading: "How We Use Information",
          body: (
            <ul>
              <li>to provide the Service, such as sending quotes and invoices to your customers and processing payments;</li>
              <li>to secure your account, prevent fraud, and keep the Service running reliably;</li>
              <li>to respond to support requests and send important account and service notices;</li>
              <li>to understand how the Service is used so we can improve it;</li>
              <li>to comply with legal obligations.</li>
            </ul>
          ),
        },
        {
          heading: "How We Share Information",
          body: (
            <>
              <p>We don&apos;t sell your personal information. We share it only:</p>
              <ul>
                <li>
                  with service providers that help us run the Service, such as hosting, database, email delivery, and
                  payment processing (Stripe), under obligations to protect it;
                </li>
                <li>with your customers, when you send them quotes, invoices, or receipts through the Service;</li>
                <li>when required by law, or to protect the rights, safety, and security of Swamped, our users, or others;</li>
                <li>in connection with a merger, acquisition, or sale of assets, with notice to you.</li>
              </ul>
            </>
          ),
        },
        {
          heading: "Your Customers' Information",
          body: (
            <p>
              When you add your customers&apos; information to Swamped, you control that information and we process it
              on your behalf to provide the Service. If one of your customers contacts us about their information,
              we&apos;ll refer them to you.
            </p>
          ),
        },
        {
          heading: "Data Retention",
          body: (
            <p>
              We keep information for as long as your account is active and as needed to provide the Service. After you
              close your account, we delete or anonymize your information within a reasonable period, except where we
              need to keep it for legal, tax, or accounting reasons.
            </p>
          ),
        },
        {
          heading: "Security",
          body: (
            <p>
              We use industry-standard safeguards, including encryption in transit and access controls, to protect your
              information. No system is perfectly secure, so we can&apos;t guarantee absolute security.
            </p>
          ),
        },
        {
          heading: "Your Choices and Rights",
          body: (
            <p>
              You can review and update your account information in Settings at any time. Depending on where you live,
              you may have the right to access, correct, delete, or export your personal information, or to object to
              certain uses. To make a request, contact us and we&apos;ll respond within the time required by law.
            </p>
          ),
        },
        {
          heading: "Children",
          body: <p>The Service is intended for businesses and isn&apos;t directed to children under 18.</p>,
        },
        {
          heading: "Changes to This Policy",
          body: (
            <p>
              We may update this Privacy Policy from time to time. If we make material changes, we&apos;ll notify you by
              email or in the app. The &quot;Last updated&quot; date above shows when it was last revised.
            </p>
          ),
        },
      ]}
    />
  );
}
