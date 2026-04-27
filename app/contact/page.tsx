import Link from 'next/link'
import {
  PLATFORM_CONTACT_EMAIL,
  PLATFORM_CONTACT_MAILTO,
  PLATFORM_SUPPORT_NOTICE,
} from '@/lib/site'

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_-18%,rgba(79,124,255,0.2),transparent_46%),radial-gradient(circle_at_92%_2%,rgba(122,93,255,0.17),transparent_42%),linear-gradient(180deg,#f8faff_0%,#f2f6ff_52%,#edf3ff_100%)] py-8 sm:py-12">
      <section className="mx-auto max-w-4xl px-4 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f7cff]">Contact LinkMyStore</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.015em] text-[#111a38] sm:mt-4 sm:text-5xl">
          Platform support, billing help, and formal contact details.
        </h1>
        <p className="mt-3 max-w-3xl text-[0.95rem] leading-7 text-[#4b5a7f] sm:mt-4 sm:text-lg">
          LinkMyStore is software for independent sellers. Sellers may contact us for plan billing, platform
          support, subscription access, or legal notices. Buyers should contact the seller directly for delivery,
          refunds, download access, booking details, product questions, or any other normal fulfilment issue.
        </p>

        <div className="mt-8 grid gap-8 md:mt-10 md:grid-cols-2 md:gap-10">
          <section>
            <h2 className="text-xl font-semibold text-[#111a38] sm:text-2xl">Contact the seller first for</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[#4b5a7f] sm:mt-5 sm:text-base">
              <li>Delivery timelines, shipping updates, and order status</li>
              <li>Refunds, returns, replacements, or customisation requests</li>
              <li>Digital download access, booking details, or product clarifications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111a38] sm:text-2xl">Contact LinkMyStore for</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[#4b5a7f] sm:mt-5 sm:text-base">
              <li>Plan billing, subscription access, payment receipts, or Pro upgrade issues</li>
              <li>Account access, security concerns, or platform-level technical support</li>
              <li>You need to report fraud, abuse, or seller misconduct</li>
              <li>You have privacy, IP, or legal notice concerns</li>
              <li>You have already tried the seller and now need platform review</li>
            </ul>
          </section>
        </div>

        <section className="mt-8 border-t border-[#dfe7fb] pt-6 sm:mt-10 sm:pt-8">
          <h2 className="text-xl font-semibold text-[#111a38] sm:text-2xl">Official platform email</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#556486] sm:mt-4 sm:text-base">{PLATFORM_SUPPORT_NOTICE}</p>
          <a
            href={PLATFORM_CONTACT_MAILTO}
            className="mt-4 inline-flex break-all text-base font-semibold text-[#4f7cff] hover:underline sm:mt-5 sm:text-lg"
          >
            {PLATFORM_CONTACT_EMAIL}
          </a>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#556486]">
            Routine order fulfilment remains the seller&apos;s responsibility. Platform review requests should include
            store details, order references where available, and a short description of the issue.
          </p>
        </section>

        <nav className="mt-8 flex flex-col gap-2 border-t border-[#dfe7fb] pt-5 text-sm sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-4 sm:pt-6">
          <Link href="/pricing" className="text-[#4f7cff] hover:underline">
            Pricing
          </Link>
          <Link href="/shipping-policy" className="text-[#4f7cff] hover:underline">
            Shipping policy
          </Link>
          <Link href="/cancellation-refunds" className="text-[#4f7cff] hover:underline">
            Cancellation &amp; refunds
          </Link>
          <Link href="/report-store" className="text-[#4f7cff] hover:underline">
            Report a seller
          </Link>
          <Link href="/grievance" className="text-[#4f7cff] hover:underline">
            Submit a grievance
          </Link>
          <Link href="/terms" className="text-[#4f7cff] hover:underline">
            Read Terms of Service
          </Link>
          <Link href="/" className="text-[#6a7798] hover:text-[#111a38]">
            Back to home
          </Link>
        </nav>
      </section>
    </main>
  )
}
