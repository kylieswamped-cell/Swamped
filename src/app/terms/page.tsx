import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — Swamped",
  description: "The terms that govern your use of Swamped.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="November 1, 2026"
      intro={
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of Swamped, including our website,
          web application, and related services (the &quot;Service&quot;), provided by Swamped Inc. (&quot;Swamped,&quot;
          &quot;we,&quot; &quot;us&quot;). By creating an account or using the Service, you agree to these Terms. If you
          are using the Service on behalf of a business, you agree to them on that business&apos;s behalf.
        </p>
      }
      sections={[
        {
          heading: "The Service",
          body: (
            <p>
              Swamped helps contractors and service businesses manage customers, jobs, quotes, invoices, and payments.
              We may add, change, or remove features over time. We&apos;ll try to give reasonable notice of changes that
              materially reduce what the Service does.
            </p>
          ),
        },
        {
          heading: "Your Account",
          body: (
            <ul>
              <li>You must be at least 18 years old and able to enter into a binding contract.</li>
              <li>You&apos;re responsible for the accuracy of the information you provide and for keeping it current.</li>
              <li>
                You&apos;re responsible for keeping your login credentials secure and for all activity under your account.
                Tell us promptly if you believe your account has been compromised.
              </li>
            </ul>
          ),
        },
        {
          heading: "Payments and Fees",
          body: (
            <>
              <p>
                Online payments are processed by Stripe. To accept payments you must connect a Stripe account and agree
                to Stripe&apos;s own terms, including the{" "}
                <a href="https://stripe.com/connect-account/legal" className="font-semibold text-brand hover:text-brand-dark" target="_blank" rel="noreferrer">
                  Stripe Connected Account Agreement
                </a>
                . Swamped is not a bank or money transmitter, and funds are held and paid out by Stripe.
              </p>
              <p>
                Swamped does not charge a monthly software fee. Payments collected through the Service are subject to
                standard processing fees, which are shown to you before you accept payments. We&apos;ll give notice before
                changing any fees.
              </p>
            </>
          ),
        },
        {
          heading: "Your Customers and Your Content",
          body: (
            <>
              <p>
                You own the information you put into the Service, including customer details, quotes, invoices, files,
                and messages (&quot;Your Content&quot;). You give us permission to host, process, and send Your Content
                only as needed to run the Service for you, for example, emailing a quote to your customer.
              </p>
              <p>
                You&apos;re responsible for Your Content and for your relationship with your customers, including the
                work you perform, your pricing, refunds, and any disputes. You confirm you have the right to share your
                customers&apos; information with us and to contact them through the Service.
              </p>
            </>
          ),
        },
        {
          heading: "Acceptable Use",
          body: (
            <>
              <p>You agree not to:</p>
              <ul>
                <li>use the Service for anything illegal, fraudulent, or deceptive;</li>
                <li>send spam or messages your customers haven&apos;t agreed to receive;</li>
                <li>upload malware or try to access accounts or systems you aren&apos;t authorized to access;</li>
                <li>interfere with or overload the Service, or copy or resell it without our permission.</li>
              </ul>
            </>
          ),
        },
        {
          heading: "Partner Program",
          body: (
            <p>
              Participation in the Swamped Partner Program is subject to the program terms provided when you join, in
              addition to these Terms.
            </p>
          ),
        },
        {
          heading: "Privacy",
          body: (
            <p>
              Our{" "}
              <Link href="/privacy" className="font-semibold text-brand hover:text-brand-dark">
                Privacy Policy
              </Link>{" "}
              explains how we collect and use personal information.
            </p>
          ),
        },
        {
          heading: "Suspension and Termination",
          body: (
            <p>
              You may stop using the Service and close your account at any time. We may suspend or terminate access if
              you breach these Terms, if required by law, or to protect the Service or other users. Where reasonable,
              we&apos;ll give notice first and a chance to export Your Content.
            </p>
          ),
        },
        {
          heading: "Disclaimers",
          body: (
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available.&quot; To the fullest extent permitted by
              law, we disclaim all warranties, express or implied, including merchantability, fitness for a particular
              purpose, and non-infringement. We don&apos;t guarantee the Service will be uninterrupted or error-free.
            </p>
          ),
        },
        {
          heading: "Limitation of Liability",
          body: (
            <p>
              To the fullest extent permitted by law, Swamped will not be liable for any indirect, incidental, special,
              consequential, or punitive damages, or for lost profits, revenue, or data. Our total liability for any
              claim relating to the Service is limited to the greater of the amount you paid us in the 12 months before
              the claim or $100.
            </p>
          ),
        },
        {
          heading: "Changes to These Terms",
          body: (
            <p>
              We may update these Terms from time to time. If we make material changes, we&apos;ll notify you by email or
              in the app before they take effect. Continuing to use the Service after that means you accept the updated
              Terms.
            </p>
          ),
        },
      ]}
    />
  );
}
