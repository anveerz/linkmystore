import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  CircleDot,
  IndianRupee,
  Package,
  ShoppingBag,
  Store,
  Workflow,
} from 'lucide-react'
import Navbar from '@/components/landing/Navbar'
import ScrollReveal from '@/components/landing/ScrollReveal'
import FAQ from '@/components/landing/FAQ'
import { createClient } from '@/lib/supabase/server'

const featureCards = [
  {
    icon: Store,
    title: 'Storefronts that feel yours',
    description:
      'Launch a branded seller page with your products, links, pricing, and policies in one place.',
    accent: 'bg-[#edf2ff] text-[#12224b]',
  },
  {
    icon: IndianRupee,
    title: 'Direct manual UPI checkout',
    description:
      'Buyers pay your UPI ID directly and submit proof, so you stay in control without waiting for a gateway setup.',
    accent: 'bg-[#fff1e4] text-[#d1701d]',
  },
  {
    icon: BellRing,
    title: 'Seller-first order notifications',
    description:
      'Get order alerts by email and dashboard so you can verify payment and fulfil fast.',
    accent: 'bg-[#fff1e4] text-[#d1701d]',
  },
  {
    icon: Package,
    title: 'Works for physical and digital goods',
    description:
      'Sell products, templates, downloads, bookings, and affiliate picks from the same seller workspace.',
    accent: 'bg-[#f3f6fc] text-[#12224b]',
  },
  {
    icon: Workflow,
    title: 'Seller-controlled fulfilment',
    description:
      'You decide when an order is confirmed, when a file is delivered, and how buyer support is handled.',
    accent: 'bg-[#edf2ff] text-[#12224b]',
  },
  {
    icon: ShoppingBag,
    title: 'Built for independent sellers',
    description:
      'LinkMyStore is storefront software, not a marketplace. Your customer relationship stays with you.',
    accent: 'bg-[#fff7ea] text-[#d1701d]',
  },
]

const paymentFlow = [
  {
    step: '01',
    title: 'Buyer places the order',
    description: "The checkout collects buyer details and shows the seller's manual UPI payment instructions.",
  },
  {
    step: '02',
    title: 'Buyer pays seller directly',
    description: 'The buyer completes the UPI transfer outside the platform and submits the UTR or payment proof.',
  },
  {
    step: '03',
    title: 'Seller verifies and confirms',
    description: 'The seller receives an email and dashboard alert, checks the payment, and confirms the order.',
  },
  {
    step: '04',
    title: 'Delivery happens after confirmation',
    description: 'For instant downloads, the buyer gets the access email after seller confirmation. Other fulfilment stays with the seller.',
  },
]

const freePlanFeatures = [
  'Up to 5 own products',
  'Manual UPI checkout',
  'Email order notifications',
  'Basic analytics',
  '50% affiliate commission share',
]

const proPlanFeatures = [
  'Unlimited own products',
  'Premium themes and deeper analytics',
  'WhatsApp notifications',
  'Remove LinkMyStore branding',
  '100% affiliate commission share',
]

const faqItems = [
  {
    question: 'Is LinkMyStore a marketplace?',
    answer:
      'No. LinkMyStore is seller-facing storefront software. Sellers manage their own listings, receive payments directly, and stay responsible for fulfilment.',
  },
  {
    question: 'How does payment work right now?',
    answer:
      'The live flow is manual UPI. Buyers pay the seller directly, submit the UTR or proof, and the seller confirms the order after checking payment.',
  },
  {
    question: 'Who handles delivery, refunds, or customer support?',
    answer:
      'The seller does. Buyers should contact the seller first for order fulfilment, refunds, returns, or delivery questions.',
  },
  {
    question: 'How are digital products delivered?',
    answer:
      'For instant-download products, the seller confirms the order first, then the buyer receives the download email. The delivery link can be limited or single-use.',
  },
  {
    question: 'When should a buyer contact LinkMyStore?',
    answer:
      'Only for fraud, abuse, privacy issues, IP complaints, or repeated non-fulfilment after trying the seller first. Use the platform contact or reporting pages when escalation is needed.',
  },
  {
    question: 'Can I start free and upgrade later?',
    answer:
      'Yes. Start on the free plan, validate your products, and move to Pro when you want more control, better analytics, and higher affiliate retention.',
  },
]

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: creator } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', user.id)
      .single()

    redirect(creator ? '/dashboard' : '/onboarding')
  }

  return (
    <div className="page-shell min-h-screen">
      <Navbar />

      <section className="relative overflow-hidden border-b border-[#dce5fb] bg-[radial-gradient(circle_at_12%_-18%,rgba(79,124,255,0.2),transparent_46%),radial-gradient(circle_at_92%_2%,rgba(122,93,255,0.17),transparent_42%),linear-gradient(180deg,#f8faff_0%,#f2f6ff_52%,#edf3ff_100%)]">
        <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.8),_transparent_70%)]" />
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-18">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
            <div>
              <div className="flex items-center gap-4">
                <Image src="/logo.png" alt="LinkMyStore" width={64} height={64} className="h-14 w-14 object-contain sm:h-16 sm:w-16" />
                <span className="text-[2rem] font-bold leading-none tracking-tight text-[#111a38] sm:text-[2.35rem]">
                  LinkMyStore
                </span>
              </div>

              <h1 className="mt-8 text-5xl font-bold leading-[0.96] tracking-[-0.02em] text-[#111a38] sm:text-6xl lg:text-[4.35rem]">
                Build your store page.
                <br />
                Take direct UPI orders.
                <br />
                Fulfil on your terms.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#55627d] sm:text-xl">
                LinkMyStore helps independent sellers publish a polished storefront, collect orders, receive manual
                UPI payments directly to their own account, and confirm fulfilment without marketplace dependency.
              </p>

              <div className="mt-8 flex">
                <Link
                  href="/login"
                  className="btn-primary inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base"
                >
                  Start free <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>

            <ScrollReveal className="relative">
              <div className="relative overflow-hidden rounded-[34px] border border-[#dce5fb] bg-[linear-gradient(180deg,#ffffff_0%,#f6f9ff_46%,#eef3ff_100%)] p-6 shadow-[0_28px_72px_rgba(64,89,173,0.14)] sm:p-8">
                <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top,_rgba(122,93,255,0.14),_transparent_58%)]" />
                <div className="relative">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#4f7cff]">
                      Current checkout model
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-[#111a38]">
                      Manual UPI, confirmed by the seller
                    </h2>
                  </div>

                  <div className="mt-6">
                    {paymentFlow.map((item) => (
                      <div key={item.step} className="flex gap-4 border-t border-[#e4eaf4] pt-4 first:border-t-0 first:pt-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(125deg,#4f7cff_0%,#7a5dff_100%)] text-sm font-bold text-white shadow-[0_12px_28px_rgba(79,124,255,0.28)]">
                          {item.step}
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-[#111a38]">{item.title}</h3>
                          <p className="mt-1 text-sm leading-6 text-[#5a6884]">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 border-t border-[#e4eaf4] pt-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#111a38]">
                      <CircleDot className="h-4 w-4 text-[#4f7cff]" />
                      Platform role
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#5a6884]">
                      LinkMyStore provides the storefront, order tracking, and delivery workflow. The seller remains
                      responsible for payment verification, fulfilment, and buyer support.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#4f7cff]">What you get</p>
            <h2 className="mt-3 text-4xl font-bold tracking-[-0.015em] text-[#111a38] sm:text-5xl">
              A clearer operating model for independent sellers
            </h2>
            <p className="mt-4 text-base leading-7 text-[#56647f] sm:text-lg">
              Better storefronts, simpler order handling, and a payment flow that reflects how sellers are actually
              operating today.
            </p>
          </div>

          <div className="mt-14 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature, index) => (
              <ScrollReveal key={feature.title} delay={index * 80}>
                <div className="border-b border-[#dfe7fb] pb-8">
                  <div className="flex items-start gap-4">
                    <div className={`inline-flex rounded-2xl p-3 ${feature.accent}`}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-[#111a38]">{feature.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-[#58688b]">{feature.description}</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#dce5fb] bg-[linear-gradient(180deg,#f9fbff_0%,#f2f6ff_100%)] py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#4f7cff]">Platform boundary</p>
              <h2 className="mt-3 text-4xl font-bold tracking-[-0.015em] text-[#111a38] sm:text-5xl">
                Your store, your buyer, your fulfilment.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#56647f] sm:text-lg">
                LinkMyStore is built to make the boundaries clear. Sellers own the customer relationship and
                operational responsibility. The platform provides software rails, notification workflows, and a place
                for reporting when something goes wrong.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              {[
                {
                  title: 'Seller owns',
                  body: 'Listings, pricing, manual UPI setup, verification, delivery, returns, and fulfilment.',
                },
                {
                  title: 'Buyer uses',
                  body: 'A simple storefront and checkout flow, then pays the seller directly and shares proof.',
                },
                {
                  title: 'Platform handles',
                  body: 'Software, order records, seller alerts, digital-delivery triggers, and reporting channels.',
                },
              ].map((item) => (
                <div key={item.title} className="border-t border-[#dfe7fb] pt-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4f7cff]">{item.title}</p>
                  <p className="mt-3 text-sm leading-7 text-[#556486]">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#4f7cff]">Pricing</p>
            <h2 className="mt-3 text-4xl font-bold tracking-[-0.015em] text-[#111a38] sm:text-5xl">
              Start free. Upgrade when the business needs it.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#56647f] sm:text-lg">
              The free plan is enough to validate your offer. Pro adds more control, more analytics, and cleaner branding.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
            <ScrollReveal delay={80}>
              <div className="h-full rounded-[26px] border border-[#dce5fb] bg-[linear-gradient(180deg,#ffffff_0%,#f6f9ff_100%)] px-6 py-8 shadow-[0_18px_48px_rgba(64,89,173,0.09)] md:py-10">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#51607d]">Free</p>
                <p className="mt-4 text-5xl font-semibold text-[#12224b]">
                  {'\u20B9'}0
                  <span className="text-base font-medium text-[#69789a]"> / month</span>
                </p>
                <p className="mt-3 text-sm leading-6 text-[#58688b]">
                  Best for first-time sellers who need a strong starting point without setup friction.
                </p>
                <ul className="mt-7 space-y-3">
                  {freePlanFeatures.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-[#33415e]">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#12224b]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="btn-primary mt-8 block w-full py-3 text-center text-sm font-semibold">
                  Start free
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={140}>
              <div className="relative h-full overflow-hidden rounded-[30px] border border-[#cddafc] bg-[linear-gradient(145deg,#edf2ff_0%,#e3ecff_45%,#d8e3ff_100%)] px-6 py-8 shadow-[0_28px_68px_rgba(79,124,255,0.22)] md:px-8 md:py-10">
                <div className="absolute right-6 top-6 rounded-full bg-[linear-gradient(125deg,#4f7cff_0%,#7a5dff_100%)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                  Most popular
                </div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f7cff]">Pro</p>
                <p className="mt-4 text-5xl font-bold text-[#111a38]">
                  {'\u20B9'}299
                  <span className="text-base font-medium text-[#69789a]"> / month</span>
                </p>
                <p className="mt-3 text-sm leading-6 text-[#58688b]">
                  For sellers who want better brand control, stronger reporting, and higher affiliate retention.
                </p>
                <ul className="mt-7 space-y-3">
                  {proPlanFeatures.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-[#33415e]">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4f7cff]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/dashboard/plan" className="btn-primary mt-8 inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-sm font-semibold">
                  Upgrade to Pro
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-[#e4eaf4] bg-[linear-gradient(180deg,#fffdfa_0%,#f5f8ff_100%)] py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#4f7cff]">FAQ</p>
            <h2 className="mt-3 text-4xl font-bold tracking-[-0.015em] text-[#111a38] sm:text-5xl">
              Questions sellers and buyers usually ask
            </h2>
            <p className="mt-4 text-base leading-7 text-[#56647f] sm:text-lg">
              These answers reflect the platform as it works today, especially the current manual UPI flow.
            </p>
          </div>
          <ScrollReveal delay={80} className="mt-10">
            <FAQ items={faqItems} />
          </ScrollReveal>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <ScrollReveal>
            <div className="overflow-hidden rounded-[34px] border border-[#dbe5fb] bg-[radial-gradient(circle_at_14%_0%,rgba(79,124,255,0.14),transparent_36%),linear-gradient(135deg,#f9fbff_0%,#f0f5ff_58%,#eaf1ff_100%)] px-7 py-10 shadow-[0_26px_64px_rgba(79,124,255,0.16)] sm:px-10 sm:py-12">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#4f7cff]">
                    Ready to launch your seller page?
                  </p>
                  <h2 className="mt-3 text-3xl font-bold tracking-[-0.015em] text-[#111a38] sm:text-4xl">
                    Start with your own products, direct UPI, and a cleaner way to take orders.
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-[#56647f]">
                    Use LinkMyStore for storefront software. Keep the customer relationship with the seller. Use the
                    platform reporting channel only when a seller needs to be escalated.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <Link
                    href="/login"
                    className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold"
                  >
                    Start free <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/report-store"
                    className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold"
                  >
                    Report a seller
                  </Link>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <footer className="nav-glass border-t border-[rgba(151,168,220,0.26)] [border-bottom:0] py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="LinkMyStore" width={48} height={48} className="h-11 w-11 object-contain" />
              <div>
                <p className="text-xl font-bold tracking-tight text-[#111a38]">LinkMyStore</p>
                <p className="text-sm text-[#61739b]">Storefront software for independent sellers</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Link href="/pricing" className="text-[#556486] transition hover:text-[#4f7cff]">
                Pricing
              </Link>
              <Link href="/shipping-policy" className="text-[#556486] transition hover:text-[#4f7cff]">
                Shipping
              </Link>
              <Link href="/cancellation-refunds" className="text-[#556486] transition hover:text-[#4f7cff]">
                Cancellation &amp; Refunds
              </Link>
              <Link href="/terms" className="text-[#556486] transition hover:text-[#4f7cff]">
                Terms
              </Link>
              <Link href="/privacy" className="text-[#556486] transition hover:text-[#4f7cff]">
                Privacy
              </Link>
              <Link href="/aup" className="text-[#556486] transition hover:text-[#4f7cff]">
                AUP
              </Link>
              <Link href="/contact" className="text-[#556486] transition hover:text-[#4f7cff]">
                Contact
              </Link>
              <Link href="/grievance" className="text-[#556486] transition hover:text-[#4f7cff]">
                Grievance
              </Link>
              <Link href="/report-store" className="text-[#556486] transition hover:text-[#4f7cff]">
                Report seller
              </Link>
            </div>
          </div>

          <div className="mt-6 border-t border-[#dfe7fb] pt-6 text-center text-sm text-[#61739b]">
            <p>&copy; 2026 LinkMyStore. Built in India for independent sellers.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
