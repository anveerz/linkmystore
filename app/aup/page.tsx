import Link from 'next/link'
import LegalPageShell from '@/components/legal/LegalPageShell'
import LegalSection from '@/components/legal/LegalSection'
import {
  PLATFORM_REPORTING_NOTICE,
} from '@/lib/site'

export default function AcceptableUsePolicyPage() {
  return (
    <LegalPageShell
      title="Acceptable Use Policy"
      description="This policy defines prohibited use of LinkMyStore and the standards sellers and visitors must follow when using storefront tools, manual UPI workflows, affiliate links, communications, and reporting channels."
    >
      <LegalSection id="purpose" title="1. Purpose and Applicability">
        <p>
          This Acceptable Use Policy applies to all users of LinkMyStore, including sellers, buyers, visitors, and
          anyone who interacts with platform-hosted storefronts or reporting channels. It supplements the{' '}
          <Link href="/terms">Terms of Service</Link> and the <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection id="prohibited-listings" title="2. Prohibited Listings and Content">
        <ul>
          <li>Illegal, unsafe, fraudulent, deceptive, or misleading goods or services.</li>
          <li>Counterfeit, pirated, stolen, infringing, or unauthorized digital or physical products.</li>
          <li>Products or services requiring licenses, approvals, or permissions that the seller does not hold.</li>
          <li>Obscene, hateful, defamatory, violent, exploitative, or abusive content.</li>
          <li>Malware, phishing content, credential harvesting, unauthorized downloads, or harmful code.</li>
        </ul>
      </LegalSection>

      <LegalSection id="conduct" title="3. Prohibited Conduct">
        <ul>
          <li>Impersonation of any person, business, public authority, or rightsholder.</li>
          <li>Use of fake traffic, fake orders, fake reviews, scraping, spam, or platform manipulation.</li>
          <li>Unauthorized access attempts, privilege escalation, reverse engineering, or security circumvention.</li>
          <li>Use of the platform for unlawful payments, money laundering, sanctions evasion, or related misconduct.</li>
          <li>Harassment, intimidation, doxxing, or misuse of buyer or seller personal data.</li>
        </ul>
      </LegalSection>

      <LegalSection id="payments" title="4. Manual UPI Integrity Rules">
        <p>
          LinkMyStore currently supports seller-directed manual UPI checkout. This workflow requires truthful and
          accurate communication by both buyers and sellers.
        </p>
        <ul>
          <li>Buyers must not submit fabricated UTRs, fake screenshots, or false payment claims.</li>
          <li>Sellers must not mark unpaid orders as paid or misrepresent whether payment has been received.</li>
          <li>Sellers must independently verify payment proof using their own bank or UPI records before confirming an order.</li>
          <li>Repeated payment abuse, fake confirmations, or dishonest proof submission may result in immediate suspension.</li>
        </ul>
      </LegalSection>

      <LegalSection id="buyer-protection" title="5. Fulfilment, Support, and Buyer Treatment">
        <p>
          Sellers must fulfil orders in good faith, communicate realistic timelines, and treat buyers fairly.
          Sellers must not abandon orders after collecting payment, withhold promised digital materials, or refuse to
          respond where fulfilment is reasonably expected.
        </p>
        <p>{PLATFORM_REPORTING_NOTICE}</p>
      </LegalSection>

      <LegalSection id="affiliate" title="6. Affiliate and Third-Party Link Rules">
        <p>
          Sellers may not use affiliate listings or external URLs to misrepresent the actual seller, the availability
          of a product, or the destination platform. Redirects must correspond to genuine offers and lawful partner
          pages.
        </p>
      </LegalSection>

      <LegalSection id="privacy" title="7. Privacy, Data, and Brand Misuse">
        <ul>
          <li>Do not collect or reuse personal data from the platform for spam, resale, or unlawful profiling.</li>
          <li>Do not upload branding, photos, templates, or content that you do not have the right to use.</li>
          <li>Do not misuse LinkMyStore branding in a way that suggests the platform is the direct seller of your goods.</li>
        </ul>
      </LegalSection>

      <LegalSection id="enforcement" title="8. Enforcement and Reporting">
        <p>For suspected or confirmed violations, LinkMyStore may take one or more of the following actions:</p>
        <ul>
          <li>Issue warnings, require corrective action, or request additional documentation.</li>
          <li>Delist products, disable features, or hold storefront functionality.</li>
          <li>Suspend or terminate accounts, stores, or associated identifiers.</li>
          <li>Preserve records and cooperate with lawful requests from regulators or authorities where required.</li>
        </ul>
        <p>
          Abuse, fraud, or seller misconduct may be reported through the{' '}
          <Link href="/contact">Contact page</Link> or through the on-platform reporting flows.
        </p>
      </LegalSection>
    </LegalPageShell>
  )
}
