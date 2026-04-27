import Link from 'next/link'
import LegalPageShell from '@/components/legal/LegalPageShell'
import LegalSection from '@/components/legal/LegalSection'
import {
  PLATFORM_REPORTING_NOTICE,
  PLATFORM_SITE_URL,
} from '@/lib/site'

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      description="These Terms govern access to LinkMyStore as a seller-facing storefront SaaS. They clarify the software role of the platform, the current manual UPI payment flow, and the fact that sellers, not LinkMyStore, remain responsible for fulfilment and customer obligations."
      matchContactStyle
    >
      <LegalSection id="scope" title="1. Scope and Acceptance">
        <p>
          These Terms of Service (&quot;Terms&quot;) form a binding agreement between you and LinkMyStore
          Technologies (&quot;LinkMyStore&quot;, &quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or
          &quot;our&quot;) concerning access to and use of the LinkMyStore website, subdomains, seller
          dashboards, storefront tools, order management features, notifications, and related services
          available at <a href={PLATFORM_SITE_URL}>{PLATFORM_SITE_URL}</a>.
        </p>
        <p>
          By accessing or using the platform, you confirm that you have read, understood, and agreed to these
          Terms and the <Link href="/privacy">Privacy Policy</Link>. If you do not agree, you must not use the
          platform.
        </p>
      </LegalSection>

      <LegalSection id="platform-role" title="2. SaaS Classification and Platform Role">
        <p>
          LinkMyStore is offered as a software-as-a-service product that helps sellers create and manage
          independent storefronts, collect order details, communicate with buyers, and administer seller-owned
          workflows. The platform is intended to function as storefront infrastructure and business software.
        </p>
        <p>
          LinkMyStore does not become the seller of listed goods or services, does not own seller inventory, and
          does not act as merchant of record, reseller, payment aggregator, payment gateway, escrow provider, or
          custodian of buyer funds for seller transactions. Nothing in these Terms creates an agency,
          partnership, franchise, employment, or joint venture relationship between LinkMyStore and any seller.
        </p>
        <p>
          Sellers remain solely responsible for their storefronts, listings, pricing, offers, delivery,
          fulfilment, customer support, refunds, returns, legal compliance, and all transaction outcomes with
          buyers.
        </p>
      </LegalSection>

      <LegalSection id="accounts" title="3. Eligibility, Accounts, and Access">
        <ul>
          <li>You must be legally capable of entering into a binding agreement and of using the platform lawfully.</li>
          <li>You must provide accurate, current, and complete account information and keep it updated.</li>
          <li>You are responsible for safeguarding account credentials and for all activity under your account.</li>
          <li>
            We may suspend access, request additional verification, or refuse service where we detect inaccurate
            details, suspected misuse, fraud, or regulatory risk.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="plans" title="4. Plans, Billing, and Subscription Terms">
        <p>
          LinkMyStore may offer free and paid plans with different feature limits, branding controls, analytics,
          notifications, and commission entitlements. Current pricing, plan inclusions, and limits are displayed
          in-product or on the <Link href="/pricing">Pricing Details page</Link> and may change from time to time.
        </p>
        <ul>
          <li>Paid subscriptions are billed in advance for the applicable billing cycle.</li>
          <li>New Pro purchases are currently prepaid for fixed durations and do not auto-renew by default.</li>
          <li>Taxes, if applicable, may be charged on subscription invoices.</li>
          <li>
            Cancellation and refund position for platform subscription fees is described on the{' '}
            <Link href="/cancellation-refunds">Cancellation &amp; Refunds Policy</Link>.
          </li>
          <li>We may change plan pricing or features prospectively by updating the platform or giving reasonable notice.</li>
        </ul>
      </LegalSection>

      <LegalSection id="seller-responsibilities" title="5. Seller Storefronts, Listings, and Responsibilities">
        <ul>
          <li>
            Sellers may list physical products, digital products, services, bookings, and affiliate listings
            permitted by the platform.
          </li>
          <li>
            Sellers must ensure that product information, pricing, stock or availability claims, delivery terms,
            refund terms, and marketing statements are accurate, lawful, and not misleading.
          </li>
          <li>
            Sellers are solely responsible for product quality, legality, fulfilment, customer communication,
            post-sale obligations, invoicing, and all sector-specific licenses or approvals required for their
            goods or services.
          </li>
          <li>
            Sellers must not list unlawful, infringing, counterfeit, unsafe, fraudulent, deceptive, or otherwise
            prohibited products or content.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="payments" title="6. Current Payment Flow and Manual UPI Terms">
        <p>
          At the time of this version of the Terms, LinkMyStore supports a seller-directed manual UPI checkout
          flow. Buyers are shown the seller&apos;s payment instructions and pay the seller directly using the
          seller&apos;s own UPI ID or related payment details.
        </p>
        <ul>
          <li>LinkMyStore does not collect, receive, hold, pool, settle, or disburse buyer funds on behalf of sellers.</li>
          <li>
            Buyers may be asked to submit a UTR, UPI reference number, screenshot, or similar proof after payment.
          </li>
          <li>
            Sellers are solely responsible for validating payment proof against their own UPI app, bank statement,
            or internal records before confirming an order.
          </li>
          <li>
            Platform workflows may notify sellers by email and dashboard, and may update order status or trigger
            seller-configured delivery only after seller confirmation.
          </li>
        </ul>
        <p>
          LinkMyStore is not responsible for bank or UPI outages, payment delays, failed or reversed transfers,
          incorrect UPI IDs, fraudulent proof submissions, or any dispute concerning whether a seller was paid.
        </p>
      </LegalSection>

      <LegalSection id="buyers" title="7. Buyer Relationship, Fulfilment, and Seller Support">
        <p>
          Buyers purchase from sellers, not from LinkMyStore. The sales contract, fulfilment obligation, delivery
          commitment, refund policy, return policy, warranty position, and after-sales relationship are between the
          buyer and the seller alone, except where law requires otherwise.
        </p>
        <p>{PLATFORM_REPORTING_NOTICE}</p>
        <p>
          LinkMyStore may review reports and take platform-level action where appropriate, but we do not guarantee
          mediation, recovery, replacement, or resolution of any individual buyer-seller dispute.
        </p>
      </LegalSection>

      <LegalSection id="digital-affiliate" title="8. Digital Delivery, Access Links, and Affiliate Listings">
        <p>
          For digital products, sellers may configure instant-download or access workflows through the platform.
          Where manual UPI verification is required, digital delivery may be triggered only after the seller
          confirms payment. Access links may be time-limited, usage-limited, revocable, or single-use.
        </p>
        <p>
          Sellers remain responsible for the accuracy, safety, and licensing status of any digital files,
          templates, sessions, or access materials they provide.
        </p>
        <p>
          Affiliate listings redirect users to third-party platforms and are governed by those external
          platforms&apos; terms, pricing, stock, fulfilment, and return policies. LinkMyStore is not the seller of
          affiliate products and does not control third-party checkout or fulfilment.
        </p>
      </LegalSection>

      <LegalSection id="compliance" title="9. Taxes, Legal Compliance, and Data Use">
        <ul>
          <li>
            Sellers are solely responsible for assessing and complying with applicable tax, invoicing, consumer
            protection, advertising, import/export, payments, and sector-specific legal requirements.
          </li>
          <li>
            LinkMyStore does not provide legal, tax, accounting, payments, or regulatory advice. Sellers should
            obtain independent professional advice where needed.
          </li>
          <li>
            We process account, order, operational, and reporting data as described in the{' '}
            <Link href="/privacy">Privacy Policy</Link>.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="ip" title="10. Intellectual Property and Seller Content">
        <p>
          The platform software, interface design, brand assets, code, and related materials belong to LinkMyStore
          or its licensors and are protected by applicable intellectual property laws. We grant you a limited,
          revocable, non-exclusive right to use the platform in accordance with these Terms.
        </p>
        <p>
          Sellers retain rights in the content they upload but grant LinkMyStore a limited license to host,
          process, display, transmit, and adapt that content solely as necessary to operate, secure, improve, and
          market the platform and the relevant storefront.
        </p>
      </LegalSection>

      <LegalSection id="enforcement" title="11. Enforcement, Suspension, and Termination">
        <p>
          We may monitor platform use for abuse, fraud, trust, security, and compliance purposes. We may warn,
          restrict, suspend, delist, or terminate accounts, listings, or features where we reasonably believe that
          a user has violated these Terms, the Acceptable Use Policy, or applicable law.
        </p>
        <p>
          Users may stop using the platform at any time. Certain provisions survive termination by their nature,
          including provisions concerning payments, compliance, data, intellectual property, disclaimers, liability,
          indemnity, and dispute resolution.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="12. Disclaimers, Indemnity, and Limitation of Liability">
        <p>
          The platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We do not warrant
          uninterrupted availability, error-free performance, merchantability, fitness for a particular purpose, or
          non-infringement.
        </p>
        <p>
          To the maximum extent permitted by law, LinkMyStore will not be liable for indirect, incidental,
          special, consequential, or punitive loss, including lost profits, lost data, goodwill, transaction
          disputes, non-delivery, payment failures, or third-party service outages.
        </p>
        <p>
          You agree to indemnify and hold harmless LinkMyStore, its proprietor, employees, contractors, and
          affiliates against claims, losses, liabilities, and expenses arising from your listings, products,
          content, storefront activities, legal non-compliance, or misuse of the platform.
        </p>
        <p>
          Our total aggregate liability for claims relating to these Terms or the platform will not exceed the
          greater of the subscription fees paid by the claimant to LinkMyStore in the 3 months preceding the claim
          or INR 1,000, except to the extent a non-excludable legal obligation applies.
        </p>
      </LegalSection>

      <LegalSection id="general" title="13. Governing Law, Contact, and Changes">
        <p>
          These Terms are governed by the laws of India. Any dispute arising from or relating to these Terms will
          be subject to the jurisdiction of the courts at Bengaluru, Karnataka, unless another non-waivable legal
          forum applies. We may require disputes that are legally arbitrable to be resolved by a sole arbitrator in
          Bengaluru under the Arbitration and Conciliation Act, 1996.
        </p>
        <p>
          We may amend these Terms from time to time. Material updates may be posted on the platform or
          communicated by email. Continued use after the effective date of revised Terms constitutes acceptance of
          the revised Terms.
        </p>
        <p>
          Official platform contact for legal notices, abuse reports, privacy concerns, intellectual property
          notices, and seller-report escalations is available through the{' '}
          <Link href="/contact">Contact page</Link>.
        </p>
      </LegalSection>
    </LegalPageShell>
  )
}
