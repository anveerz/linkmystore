import Link from 'next/link'
import {
  Zap,
  ArrowRight,
  Smartphone,
  IndianRupee,
  MessageCircle,
  Package,
  ShoppingBag,
  CheckCircle2,
  BarChart3,
} from 'lucide-react'
import Navbar from '@/components/landing/Navbar'
import ScrollReveal from '@/components/landing/ScrollReveal'
import FAQ from '@/components/landing/FAQ'

const features = [
  {
    icon: Smartphone,
    title: 'Mobile-First Storefront',
    description: 'A beautiful, fast-loading store page designed for mobile. Your followers see products and buy in seconds.',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    icon: IndianRupee,
    title: 'UPI Payments',
    description: 'Razorpay-powered checkout with UPI as the default payment option. Also accepts cards and netbanking.',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp Alerts',
    description: 'Get instant WhatsApp notifications when someone buys. Never miss an order.',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    icon: Package,
    title: 'Physical + Digital',
    description: 'Sell physical products with shipping or digital products with instant download. Both supported.',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
  {
    icon: ShoppingBag,
    title: 'Order Management',
    description: 'Track orders, update shipping status, add tracking numbers. Your buyers get notified automatically.',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
  {
    icon: BarChart3,
    title: 'Weekly Payouts',
    description: 'Earnings are settled to your bank account every Monday. Only 5% platform fee.',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
  },
]

const pricingFeatures = [
  'Up to 10 products',
  'Unlimited orders',
  'UPI + card payments',
  'WhatsApp order alerts',
  'Order management',
  'Weekly bank payouts',
  'Custom store themes',
  'Physical + digital products',
]

const faqItems = [
  {
    question: 'Is LinkMyStore really free?',
    answer: "Yes! There are no monthly fees or setup charges. We only charge a small 5% commission when you make a sale. If you don't sell anything, you pay nothing.",
  },
  {
    question: 'How do I receive my money?',
    answer: 'All payments from buyers go through Razorpay. We process payouts to your bank account every Monday, after deducting the 5% platform fee.',
  },
  {
    question: 'What can I sell?',
    answer: 'Both physical products (jewellery, clothing, art, crafts) and digital products (PDFs, templates, presets, e-books). If you can put a price on it, you can sell it here.',
  },
  {
    question: 'Do my customers need to create an account?',
    answer: 'No! Buyers can purchase with guest checkout — just their name, phone number, and payment. No signup friction.',
  },
  {
    question: 'Can I use my own domain?',
    answer: 'Currently, your store lives at linkmystore.in/yourname. Custom domains are coming soon!',
  },
  {
    question: 'How is this different from selling on Instagram directly?',
    answer: "Instagram doesn't have a checkout system in India. With LinkMyStore, you get a proper product page, UPI payment, order tracking, and a professional storefront — all from your bio link.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFF8F3] via-white to-orange-50" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">

            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#FFF1E8] px-4 py-1.5 text-sm font-medium text-[#C75516]">
              <Zap className="h-4 w-4" />
              Set up your store in 5 minutes
            </div>

            {/* H1 */}
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Sell on Instagram.
              <br />
              <span className="bg-gradient-to-r from-[#E8651A] to-orange-400 bg-clip-text text-transparent">
                Get paid via UPI.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-lg text-gray-600 sm:text-xl">
              LinkMyStore gives you a beautiful storefront, UPI checkout, WhatsApp order alerts, and weekly payouts. Put one link in your Instagram bio and start selling.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-[#E8651A] px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-[#E8651A]/25 transition hover:bg-[#C75516] hover:shadow-xl"
              >
                Create Your Store <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="text-sm text-gray-500">No credit card required. Free to start.</p>
            </div>

            {/* URL pill */}
            <div className="mt-12 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm shadow-sm">
              <span className="text-gray-500">linkmystore.in/</span>
              <span className="font-semibold text-[#E8651A]">your-store</span>
            </div>

          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section className="border-t border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">Everything you need to sell online</h2>
            <p className="mt-3 text-gray-600">No technical knowledge needed. We handle the infrastructure so you can focus on selling.</p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 70}>
                <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
                  <div className={`inline-flex rounded-xl p-3 ${f.iconBg} ${f.iconColor}`}>
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-gray-900">{f.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{f.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">How it works</h2>
            <p className="mt-3 text-gray-600">Three simple steps to start selling</p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              { num: '1', title: 'Create Your Store', desc: 'Sign up, choose your store URL, and add your first product. Takes less than 5 minutes.' },
              { num: '2', title: 'Share Your Link', desc: 'Put linkmystore.in/your-store in your Instagram bio. Share it in stories and posts.' },
              { num: '3', title: 'Get Paid', desc: 'Customers browse, pay via UPI, and you get notified on WhatsApp. Money in your bank weekly.' },
            ].map((step, i) => (
              <ScrollReveal key={step.num} delay={i * 120}>
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E8651A] text-xl font-bold text-white shadow-lg shadow-[#E8651A]/25">
                    {step.num}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{step.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────── */}
      <section className="border-t border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-md text-center">
            <h2 className="text-3xl font-bold text-gray-900">Simple pricing</h2>
            <p className="mt-3 text-gray-600">No monthly fees. No setup costs. We only earn when you earn.</p>

            <ScrollReveal delay={100}>
              <div className="mt-8 rounded-2xl border-2 border-[#E8651A] bg-white p-8 shadow-lg">
                <p className="text-sm font-medium uppercase tracking-wide text-[#E8651A]">Free Forever</p>
                <p className="mt-4 text-5xl font-extrabold text-gray-900">
                  5%<span className="text-lg font-medium text-gray-500"> per sale</span>
                </p>
                <p className="mt-2 text-sm text-gray-500">+ Razorpay payment processing fee (~2%)</p>

                <ul className="mt-8 space-y-3 text-left">
                  {pricingFeatures.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
                      {feat}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className="mt-8 block w-full rounded-xl bg-[#E8651A] py-3 text-center text-sm font-bold text-white transition hover:bg-[#C75516]"
                >
                  Start Selling Today
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Common questions</h2>
            <p className="mt-3 text-gray-600">Everything you need to know before you start</p>
          </div>
          <ScrollReveal delay={100} className="mt-10">
            <FAQ items={faqItems} />
          </ScrollReveal>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-[#E8651A] to-orange-400 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <ScrollReveal>
            <h2 className="text-3xl font-bold text-white">
              Ready to turn your Instagram into a business?
            </h2>
            <p className="mt-3 text-lg text-orange-100">
              Join hundreds of Indian creators already selling with LinkMyStore.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-[#E8651A] shadow-lg transition hover:bg-gray-50"
            >
              Create Your Free Store <ArrowRight className="h-5 w-5" />
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <div className="flex items-center justify-center gap-2">
            <div className="h-6 w-6 rounded-md bg-[#E8651A]" />
            <span className="text-sm font-semibold text-gray-900">LinkMyStore</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">© 2026 LinkMyStore. Made in India 🇮🇳 for Indian creators.</p>
        </div>
      </footer>
    </div>
  )
}
