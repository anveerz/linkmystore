import Link from 'next/link'
import LegalPageShell from '@/components/legal/LegalPageShell'
import LegalSection from '@/components/legal/LegalSection'
import { PLATFORM_CONTACT_MAILTO } from '@/lib/site'

export default function CancellationRefundsPage() {
  return (
    <LegalPageShell
      title="Cancellation & Refunds Policy"
      description="This page explains how Free and Pro LinkMyStore software plans may be discontinued, and the circumstances in which subscription-related refunds may or may not be available."
      matchContactStyle
    >
      <LegalSection id="free-plan" title="1. Free Plan">
        <p>
          Sellers may stop using the Free plan at any time. No payment is collected for the Free plan, so no refund
          applies to Free-plan access.
        </p>
      </LegalSection>

      <LegalSection id="pro-plan" title="2. Pro Plan Cancellations">
        <p>
          The current Pro plan is prepaid for a fixed selected term. New Pro purchases do not auto-renew by default.
        </p>
        <ul>
          <li>Sellers may choose not to renew after the current paid term ends.</li>
          <li>Stopping platform use before the term ends does not automatically create a refund entitlement.</li>
          <li>Where a legacy recurring billing setup exists, the seller may separately cancel future recurring renewal.</li>
        </ul>
      </LegalSection>

      <LegalSection id="refund-eligibility" title="3. Refund Position">
        <p>
          Subscription fees already charged are generally non-refundable once Pro access has been activated for the
          purchased term, except where required by applicable law.
        </p>
        <p>Refund review may be considered in limited cases such as:</p>
        <ul>
          <li>duplicate billing for the same plan term,</li>
          <li>payment captured but Pro access not activated due to a platform-side technical error, or</li>
          <li>an erroneous charge verified by LinkMyStore after review.</li>
        </ul>
      </LegalSection>

      <LegalSection id="requests" title="4. How to Request Billing Help or a Refund Review">
        <p>
          Refund or billing-review requests should be sent through the <Link href="/contact">Contact page</Link> or
          by email to{' '}
          <a href={PLATFORM_CONTACT_MAILTO} className="text-[#3658ce] hover:underline">
            LinkMyStore support
          </a>{' '}
          from the account email used for purchase.
        </p>
        <p>Please include the following where available:</p>
        <ul>
          <li>account email,</li>
          <li>payment date,</li>
          <li>payment ID or order reference, and</li>
          <li>a brief description of the issue.</li>
        </ul>
      </LegalSection>

      <LegalSection id="seller-orders" title="5. Seller Storefront Orders">
        <p>
          This policy applies to LinkMyStore software subscription fees. Buyer purchases made from seller storefronts
          are governed by the seller&apos;s own fulfilment, cancellation, return, and refund terms.
        </p>
      </LegalSection>

      <LegalSection id="related" title="6. Related Pages">
        <p>
          See <Link href="/pricing">Pricing Details</Link> for current plan pricing and{' '}
          <Link href="/shipping-policy">Shipping &amp; Delivery Policy</Link> for software activation and delivery
          position.
        </p>
      </LegalSection>
    </LegalPageShell>
  )
}
