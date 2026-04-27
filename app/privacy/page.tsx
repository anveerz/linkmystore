import Link from 'next/link'
import LegalPageShell from '@/components/legal/LegalPageShell'
import LegalSection from '@/components/legal/LegalSection'
import {
  PLATFORM_REPORTING_NOTICE,
} from '@/lib/site'

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      description="This Privacy Policy explains how LinkMyStore collects, uses, stores, and discloses personal and business data when users access the platform, manage storefronts, place orders, submit manual UPI proof, or report policy issues."
      matchContactStyle
    >
      <LegalSection id="scope" title="1. Scope of This Policy">
        <p>
          This Privacy Policy applies to LinkMyStore seller dashboards, storefronts, checkout experiences, order
          workflows, reporting tools, communications, and related services operated by LinkMyStore Technologies.
        </p>
        <p>
          It explains what data we collect, how we use it, the circumstances in which we share it, and the choices
          available to users. By using LinkMyStore, you acknowledge the data practices described in this Policy.
        </p>
      </LegalSection>

      <LegalSection id="collection" title="2. Information We Collect">
        <p>We may collect the following categories of information:</p>
        <ul>
          <li>
            <strong>Seller account data:</strong> name, email, phone number, store name, store slug, business
            category, subscription status, and related onboarding details.
          </li>
          <li>
            <strong>Store configuration data:</strong> product listings, product media, pricing, descriptions,
            availability, custom policies, themes, settings, affiliate configuration, and seller payment details such
            as UPI IDs.
          </li>
          <li>
            <strong>Buyer and order data:</strong> buyer name, email, phone, delivery details, selected products,
            order references, fulfilment state, and communication metadata.
          </li>
          <li>
            <strong>Manual UPI proof data:</strong> UTR or UPI reference numbers, screenshots or uploaded proof,
            timestamps, and seller confirmation records where manual verification is used.
          </li>
          <li>
            <strong>Reporting and grievance data:</strong> complaint descriptions, supporting information, related
            store URLs, order references, contact details, and any abuse, fraud, privacy, or IP report information
            you choose to provide.
          </li>
          <li>
            <strong>Technical and security data:</strong> device data, browser data, IP address, logs, diagnostics,
            cookies or session identifiers, and security telemetry used to protect the platform.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="payments" title="3. Payment and Transaction Data Position">
        <p>
          The current checkout flow on LinkMyStore is manual UPI. Buyers transfer money directly to sellers using
          seller-provided payment details, and sellers verify proof independently.
        </p>
        <ul>
          <li>We do not store buyer card numbers, CVV data, UPI PINs, net-banking passwords, or similar payment secrets.</li>
          <li>We do not operate a buyer wallet, settlement account, or custodial balance for seller transactions.</li>
          <li>
            We may store order-state metadata and buyer-submitted payment proof to support seller confirmation,
            fraud review, and digital delivery workflows.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="use" title="4. How We Use Information">
        <ul>
          <li>To create and maintain seller accounts, storefronts, listings, and subscriptions.</li>
          <li>To process orders, send seller and buyer notifications, and support digital delivery workflows.</li>
          <li>To record buyer-submitted payment proof and update seller-facing order management states.</li>
          <li>To investigate fraud, abuse, privacy complaints, IP claims, and seller reports.</li>
          <li>To provide customer communications, troubleshoot issues, improve features, and measure platform performance.</li>
          <li>To satisfy applicable legal, regulatory, security, tax, audit, or law-enforcement requirements.</li>
        </ul>
      </LegalSection>

      <LegalSection id="sharing" title="5. Sharing and Disclosure">
        <p>We may share information with the following categories of recipients where reasonably necessary:</p>
        <ul>
          <li>Cloud hosting, database, email, analytics, storage, logging, and other infrastructure providers.</li>
          <li>Service providers that help operate seller notifications, report handling, or support workflows.</li>
          <li>Professional advisers, law-enforcement bodies, regulators, or courts where legally required.</li>
          <li>
            Sellers, where necessary to process orders, review buyer-submitted proof, or manage fulfilment on their
            storefronts.
          </li>
        </ul>
        <p>We do not sell personal data for third-party advertising purposes.</p>
      </LegalSection>

      <LegalSection id="retention" title="6. Retention and Security">
        <p>
          We retain data for as long as reasonably necessary to operate the platform, enforce our policies, resolve
          disputes, investigate abuse, satisfy legal obligations, and maintain security and audit records.
        </p>
        <p>
          We use administrative, technical, and organizational safeguards that are designed to protect personal and
          business data, including access controls, encrypted secret storage where applicable, logging, and
          environment-based protections. No online system can guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection id="seller-data-use" title="7. Seller Responsibility for Buyer Information">
        <p>
          Sellers receive buyer information through their storefronts and dashboards as independent businesses. Each
          seller is independently responsible for using buyer information lawfully and only for legitimate order
          fulfilment, support, and transaction-related purposes.
        </p>
        <p>
          Sellers must not misuse buyer data for spam, harassment, unlawful profiling, unauthorized marketing, or any
          purpose unrelated to their legitimate seller-buyer relationship.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="8. Rights, Choices, and Platform Contact">
        <p>
          Subject to applicable law, you may request access, correction, deletion, or clarification regarding
          personal data held by us. We may need to retain certain information for legal, security, fraud-prevention,
          or recordkeeping reasons.
        </p>
        <p>{PLATFORM_REPORTING_NOTICE}</p>
        <p>
          Privacy requests, legal notices, seller reports, and platform-level concerns may be raised through the{' '}
          <Link href="/contact">Contact page</Link>.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="9. Policy Changes">
        <p>
          We may update this Privacy Policy from time to time to reflect product changes, legal developments, or
          operational needs. Material changes may be posted on the platform or communicated by email. Continued use
          after the effective date of an updated Policy constitutes acceptance of the revised Policy.
        </p>
        <p>
          For related terms governing acceptable platform behavior, see the{' '}
          <Link href="/aup">Acceptable Use Policy</Link> and <Link href="/terms">Terms of Service</Link>.
        </p>
      </LegalSection>
    </LegalPageShell>
  )
}
