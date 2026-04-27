import Link from 'next/link'
import LegalPageShell from '@/components/legal/LegalPageShell'
import LegalSection from '@/components/legal/LegalSection'
import { PLATFORM_CONTACT_MAILTO } from '@/lib/site'

export default function PricingPage() {
  return (
    <LegalPageShell
      title="Pricing Details"
      description="This page describes the current LinkMyStore software plans, prepaid Pro subscription options, billing structure, and what is and is not included in platform pricing."
      matchContactStyle
    >
      <LegalSection id="plans" title="1. Current Plans">
        <p>LinkMyStore currently offers the following seller software plans:</p>
        <ul>
          <li>
            <strong>Free plan:</strong> INR 0 per month with limited products and core storefront features.
          </li>
          <li>
            <strong>Pro plan:</strong> prepaid access for sellers who need expanded limits, advanced branding,
            deeper analytics, and higher affiliate retention.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="pro-pricing" title="2. Prepaid Pro Subscription Terms">
        <p>Pro plan pricing is billed in advance for the selected term.</p>
        <ul>
          <li>
            <strong>1 month:</strong> ₹299
          </li>
          <li>
            <strong>3 months:</strong> ₹807
          </li>
          <li>
            <strong>6 months:</strong> ₹1525
          </li>
          <li>
            <strong>12 months:</strong> ₹2870
          </li>
        </ul>
        <p>
          The current Pro flow is prepaid only. There is no auto-renewal for new purchases at this time. Sellers may
          renew by making a fresh purchase before or after the current term expires.
        </p>
      </LegalSection>

      <LegalSection id="what-is-covered" title="3. What the Subscription Covers">
        <p>LinkMyStore pricing is for software access and related platform features only.</p>
        <ul>
          <li>Seller dashboard access and storefront software</li>
          <li>Product management, order records, and seller notifications</li>
          <li>Plan-based branding, analytics, and eligible platform features</li>
        </ul>
        <p>
          Subscription pricing does not include the value of products sold by sellers, shipping charges charged by
          sellers, refunds payable by sellers, or third-party costs outside the LinkMyStore software subscription.
        </p>
      </LegalSection>

      <LegalSection id="taxes" title="4. Taxes, Invoices, and Payment Processing">
        <p>
          Where applicable, taxes may be added at checkout. Payment confirmation, invoice or receipt details, and
          plan activation records are tied to the account used to purchase the plan.
        </p>
        <p>
          Sellers can contact{' '}
          <a href={PLATFORM_CONTACT_MAILTO} className="text-[#3658ce] hover:underline">
            LinkMyStore support
          </a>{' '}
          for billing questions, payment receipts, or plan activation issues.
        </p>
      </LegalSection>

      <LegalSection id="related-policies" title="5. Related Policies">
        <p>
          For subscription cancellation and refund position, see the{' '}
          <Link href="/cancellation-refunds">Cancellation &amp; Refunds Policy</Link>. For digital delivery timelines
          and platform delivery boundaries, see the <Link href="/shipping-policy">Shipping &amp; Delivery Policy</Link>.
        </p>
      </LegalSection>
    </LegalPageShell>
  )
}
