import Link from 'next/link'
import LegalPageShell from '@/components/legal/LegalPageShell'
import LegalSection from '@/components/legal/LegalSection'

export default function ShippingPolicyPage() {
  return (
    <LegalPageShell
      title="Shipping & Delivery Policy"
      description="This page explains how LinkMyStore delivers its own SaaS subscription access, and clarifies that seller-listed products are fulfilled by the seller, not by LinkMyStore."
      matchContactStyle
    >
      <LegalSection id="software-delivery" title="1. Delivery of LinkMyStore Software Access">
        <p>
          LinkMyStore is a software service. There is no physical shipment for Free or Pro plan purchases made on
          LinkMyStore.
        </p>
        <p>
          After successful payment for a Pro plan, the purchased software term is generally activated on the seller
          account shortly after payment verification. Activation details are reflected in the seller dashboard.
        </p>
      </LegalSection>

      <LegalSection id="timelines" title="2. Activation Timelines">
        <ul>
          <li>Free-plan access is available when account registration and onboarding are completed.</li>
          <li>Paid Pro access is delivered digitally to the seller account after successful payment capture.</li>
          <li>
            If activation does not reflect within a reasonable period after successful payment, the seller should
            contact LinkMyStore through the <Link href="/contact">Contact page</Link>.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="seller-orders" title="3. Seller Products, Shipping, and Fulfilment">
        <p>
          Sellers using LinkMyStore may list physical products, digital products, services, bookings, or affiliate
          offers. Those items are offered by the seller, not by LinkMyStore.
        </p>
        <ul>
          <li>Physical product shipping timelines, delivery charges, and return logistics are set by the seller.</li>
          <li>Digital product fulfilment, access terms, and availability are set by the seller.</li>
          <li>Buyer support for order status, delivery, returns, or access should be directed to the seller first.</li>
        </ul>
      </LegalSection>

      <LegalSection id="delivery-boundary" title="4. Platform Boundary">
        <p>
          LinkMyStore provides storefront software, order records, and related workflows. LinkMyStore does not
          package, dispatch, warehouse, ship, courier, or physically deliver seller goods.
        </p>
      </LegalSection>

      <LegalSection id="related" title="5. Related Policies">
        <p>
          For plan billing and pricing, see <Link href="/pricing">Pricing Details</Link>. For cancellation and refund
          terms relating to LinkMyStore subscriptions, see the{' '}
          <Link href="/cancellation-refunds">Cancellation &amp; Refunds Policy</Link>.
        </p>
      </LegalSection>
    </LegalPageShell>
  )
}
