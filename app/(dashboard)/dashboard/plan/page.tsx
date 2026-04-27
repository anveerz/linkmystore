'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  ArrowRight,
  Check,
  Crown,
  Loader2,
  Shield,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import {
  PRO_PLAN_PRICE,
  PRO_PLAN_TERM_OPTIONS,
  formatPrice,
  type ProPlanTermMonths,
} from '@/lib/constants'
import type { Subscription } from '@/types'

interface PlanStatus {
  plan: 'free' | 'pro'
  subscription: Subscription | null
  productCount: number
  hasLegacyRecurringSubscription: boolean
  currentPeriodEnd: string | null
}

interface SubscriptionCreateResponse {
  error?: string
  key?: string
  razorpay_order_id?: string
  amount?: number
  currency?: string
  months?: ProPlanTermMonths
  prefill?: RazorpayOptions['prefill']
}

interface SubscriptionVerifyResponse {
  error?: string
  current_period_end?: string
}

interface SubscriptionCancelResponse {
  error?: string
  message?: string
}

const liveFeatures = [
  { label: 'Own products', free: 'Up to 5', pro: 'Unlimited' },
  { label: 'Affiliate products', free: 'Unlimited', pro: 'Unlimited' },
  { label: 'Store themes', free: 'Default theme', pro: 'All premium themes' },
  { label: 'Analytics', free: 'Basic dashboard', pro: 'Full analytics suite' },
  { label: 'Order alerts', free: 'Email', pro: 'Email + WhatsApp' },
  { label: 'Branding control', free: 'LinkMyStore branding shown', pro: 'Branding removed' },
  { label: 'SEO controls', free: 'Not included', pro: 'Included' },
  { label: 'Affiliate share', free: '50% to seller', pro: '100% to seller' },
]

const proHighlights = [
  'Unlimited own products for your catalog',
  'Premium themes and deeper analytics',
  'WhatsApp notifications for new orders',
  'Branding removal and SEO controls',
  '100% affiliate commission share',
]

function formatDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return null
  return date.toLocaleDateString('en-IN')
}

function getCheckoutLogoUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (appUrl?.startsWith('https://')) {
    return `${appUrl.replace(/\/$/, '')}/logo.png`
  }

  if (typeof window !== 'undefined' && window.location.origin.startsWith('https://')) {
    return `${window.location.origin}/logo.png`
  }

  return undefined
}

function isAndroidMobileWeb() {
  if (typeof navigator === 'undefined') return false
  const userAgent = navigator.userAgent || ''
  return /Android/i.test(userAgent) && /Mobile/i.test(userAgent)
}

function getCheckoutDisplayConfig() {
  if (isAndroidMobileWeb()) {
    return {
      display: {
        blocks: {
          upi_intent_apps: {
            name: 'Pay using UPI apps',
            instruments: [
              {
                method: 'app',
                providers: ['gpay', 'phonepe'],
              },
            ],
          },
          other_upi_options: {
            name: 'Other UPI options',
            instruments: [
              {
                method: 'upi',
              },
            ],
          },
        },
        sequence: ['block.upi_intent_apps', 'block.other_upi_options', 'card', 'wallet', 'netbanking'],
        preferences: {
          show_default_blocks: false,
        },
      },
    }
  }

  return {
    display: {
      sequence: ['upi', 'card', 'wallet', 'netbanking'],
      preferences: {
        show_default_blocks: false,
      },
    },
  }
}

export default function PlanPage() {
  const [status, setStatus] = useState<PlanStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showUpgradePicker, setShowUpgradePicker] = useState(false)
  const [selectedMonths, setSelectedMonths] = useState<ProPlanTermMonths>(1)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/subscriptions/status')
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load plan status')
      }

      setStatus(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load plan status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  useEffect(() => {
    if (document.getElementById('razorpay-script')) return
    const script = document.createElement('script')
    script.id = 'razorpay-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.head.appendChild(script)
  }, [])

  const handleUpgrade = async (months: ProPlanTermMonths) => {
    setUpgrading(true)
    try {
      const res = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months }),
      })
      const data = await res.json().catch(() => ({} as SubscriptionCreateResponse))

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start Pro upgrade')
      }

      if (typeof window === 'undefined' || !window.Razorpay || !data.key || !data.razorpay_order_id) {
        throw new Error('Secure payment window could not load. Refresh and try again.')
      }

      const selectedOption = PRO_PLAN_TERM_OPTIONS.find((option) => option.months === months)
      const checkoutLogoUrl = getCheckoutLogoUrl()

      const options: RazorpayOptions & Record<string, unknown> = {
        key: data.key,
        name: 'LinkMyStore',
        description: `LinkMyStore Pro - ${selectedOption?.label || `${months} month`}`,
        order_id: data.razorpay_order_id,
        amount: data.amount,
        currency: data.currency || 'INR',
        theme: { color: '#4f7cff' },
        modal: {
          ondismiss: () => setUpgrading(false),
        },
        config: getCheckoutDisplayConfig(),
        handler: async (response: RazorpaySuccessResponse) => {
          const verifyRes = await fetch('/api/subscriptions/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          })

          const verifyData = await verifyRes.json().catch(() => ({} as SubscriptionVerifyResponse))

          if (!verifyRes.ok) {
            toast.error(verifyData.error || 'Payment verification failed. Please contact support.')
            return
          }

          const activeUntil = formatDate(verifyData.current_period_end)
          toast.success(activeUntil ? `Pro active until ${activeUntil}.` : 'Welcome to Pro.')
          await fetchStatus()
        },
      }

      if (data.prefill) {
        options.prefill = data.prefill
      }

      if (checkoutLogoUrl) {
        options.image = checkoutLogoUrl
      }

      const checkout = new window.Razorpay(options)
      setShowUpgradePicker(false)
      checkout.open()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start Pro upgrade')
    } finally {
      setUpgrading(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Cancel your recurring Pro renewal? Your current Pro access will stay active until the paid period ends.')) {
      return
    }

    setCancelling(true)
    try {
      const res = await fetch('/api/subscriptions/cancel', { method: 'POST' })
      const data = await res.json().catch(() => ({} as SubscriptionCancelResponse))

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel recurring renewal')
      }

      toast.success(data.message || 'Recurring renewal cancelled')
      await fetchStatus()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel recurring renewal')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#4f7cff]" />
      </div>
    )
  }

  const isPro = status?.plan === 'pro'
  const activeUntil = formatDate(status?.currentPeriodEnd || status?.subscription?.current_period_end)
  const hasLegacyRecurringSubscription = status?.hasLegacyRecurringSubscription === true
  const headlineTerm = PRO_PLAN_TERM_OPTIONS.find((option) => option.months === selectedMonths) || PRO_PLAN_TERM_OPTIONS[0]

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-[28px] border border-[#d8e1f7] bg-[linear-gradient(180deg,#fdfefe_0%,#f4f7ff_100%)] p-6 shadow-[0_20px_54px_rgba(79,124,255,0.08)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                  isPro ? 'bg-[linear-gradient(135deg,#4f7cff_0%,#7a5dff_100%)] text-white' : 'bg-[#edf2ff] text-[#4f7cff]'
                }`}
              >
                {isPro ? <Crown className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f7cff]">Plan status</p>
                <h1 className="mt-2 text-3xl font-bold text-[#111a38]">{isPro ? 'Pro Plan' : 'Free Plan'}</h1>
                <p className="mt-2 text-sm leading-6 text-[#5f6c87]">
                  {isPro
                    ? activeUntil
                      ? `Active until ${activeUntil}. Renew anytime before expiry to extend your Pro access.`
                      : 'Pro access is active on your account.'
                    : `${status?.productCount ?? 0} of 5 own-product slots are currently in use.`}
                </p>
                {hasLegacyRecurringSubscription ? (
                  <p className="mt-2 text-xs text-[#5f6c87]">
                    This account still has a legacy recurring renewal. Cancel it before switching fully to prepaid renewals.
                  </p>
                ) : null}
              </div>
            </div>

            {hasLegacyRecurringSubscription ? (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Recurring Renewal'}
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[28px] border border-[#d8e1f7] bg-white p-6 shadow-[0_18px_42px_rgba(79,124,255,0.06)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf2ff] text-[#4f7cff]">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#111a38]">Free</h2>
                <p className="text-sm text-[#5f6c87]">Good for validating your first offer</p>
              </div>
            </div>

            <div className="mt-6 flex items-end gap-2">
              <span className="text-4xl font-bold text-[#111a38]">{formatPrice(0)}</span>
              <span className="pb-1 text-sm text-[#6c7b98]">/ month</span>
            </div>

            {!isPro ? (
              <div className="mt-5 inline-flex rounded-full bg-[#edf2ff] px-3 py-1 text-xs font-semibold text-[#4f7cff]">
                Current plan
              </div>
            ) : null}

            <div className="mt-6 space-y-3">
              {liveFeatures.map((feature) => (
                <div key={feature.label} className="flex items-start gap-3 text-sm text-[#33415e]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4f7cff]" />
                  <div>
                    <p className="font-semibold text-[#111a38]">{feature.label}</p>
                    <p className="text-[#5f6c87]">{feature.free}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[32px] border border-[#cfdcfb] bg-[linear-gradient(145deg,#edf2ff_0%,#e5edff_40%,#dce7ff_100%)] p-6 shadow-[0_24px_58px_rgba(79,124,255,0.18)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#4f7cff] shadow-sm">
                  Pro
                </div>
                <h2 className="mt-4 text-3xl font-bold text-[#111a38]">Serious seller control</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[#53627d]">
                  Start with Pro at ₹299 per month when you want more control over brand, analytics, notifications,
                  and affiliate retention.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/70 bg-white/80 px-5 py-4 shadow-[0_18px_36px_rgba(79,124,255,0.1)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4f7cff]">Starts with</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-4xl font-bold text-[#111a38]">{formatPrice(PRO_PLAN_PRICE)}</span>
                  <span className="pb-1 text-sm text-[#6c7b98]">/ month</span>
                </div>
                <p className="mt-2 text-xs text-[#5f6c87]">Longer prepaid terms are shown after you click upgrade.</p>
              </div>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {proHighlights.map((item) => (
                <div key={item} className="rounded-2xl border border-white/70 bg-white/72 px-4 py-3 text-sm text-[#33415e] shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[linear-gradient(135deg,#4f7cff_0%,#7a5dff_100%)] text-white">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <p className="leading-6">{item}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setShowUpgradePicker(true)}
                disabled={upgrading || hasLegacyRecurringSubscription}
                className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
              >
                {upgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {upgrading ? 'Processing...' : isPro ? 'Extend Pro' : 'Buy Pro'}
              </button>

              <p className="text-xs text-[#5f6c87]">
                Prepaid only. No autopay. Renew manually whenever you want more Pro time.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#d8e1f7] bg-white p-6 shadow-[0_18px_42px_rgba(79,124,255,0.06)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf2ff] text-[#4f7cff]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#111a38]">Live feature comparison</h2>
              <p className="text-sm text-[#5f6c87]">A simple view of what you can use right now.</p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-[#e3e9f8]">
            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(120px,0.6fr)_minmax(120px,0.6fr)] bg-[#f5f8ff] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#61739b]">
              <div>Feature</div>
              <div className="text-center">Free</div>
              <div className="text-center text-[#4f7cff]">Pro</div>
            </div>
            {liveFeatures.map((feature) => (
              <div
                key={feature.label}
                className="grid grid-cols-[minmax(0,1.4fr)_minmax(120px,0.6fr)_minmax(120px,0.6fr)] items-center border-t border-[#edf1fb] px-4 py-4 text-sm"
              >
                <div className="font-semibold text-[#111a38]">{feature.label}</div>
                <div className="text-center text-[#5f6c87]">{feature.free}</div>
                <div className="text-center font-semibold text-[#111a38]">{feature.pro}</div>
              </div>
            ))}
          </div>
        </div>

        {!isPro ? (
          <div className="rounded-[28px] border border-[#d6e0fb] bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_100%)] p-6 shadow-[0_18px_42px_rgba(79,124,255,0.08)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f7cff]">When to upgrade</p>
                <h3 className="mt-2 text-2xl font-bold text-[#111a38]">Move to Pro when the catalog and brand need room.</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f6c87]">
                  Pro is most useful once you are beyond the first five products and want cleaner branding, better analytics,
                  and WhatsApp notifications.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowUpgradePicker(true)}
                disabled={upgrading || hasLegacyRecurringSubscription}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(125deg,#4f7cff_0%,#7a5dff_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_32px_rgba(79,124,255,0.24)] transition hover:shadow-[0_22px_36px_rgba(79,124,255,0.28)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {upgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {upgrading ? 'Processing...' : `Buy Pro from ${formatPrice(PRO_PLAN_PRICE)}`}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {showUpgradePicker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/50 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-[#d8e1f7] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4f7cff]">
                  {isPro ? 'Extend Pro' : 'Buy Pro'}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[#111a38]">Choose your prepaid Pro term</h2>
                <p className="mt-2 text-sm text-[#5f6c87]">
                  Pay once now. Your Pro access will run for the selected term with no autopay.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowUpgradePicker(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dce5fb] text-[#5f6c87] transition hover:bg-[#f5f8ff] hover:text-[#111a38]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {PRO_PLAN_TERM_OPTIONS.map((option) => {
                const isSelected = option.months === selectedMonths
                return (
                  <button
                    key={option.months}
                    type="button"
                    onClick={() => setSelectedMonths(option.months)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      isSelected
                        ? 'border-[#4f7cff] bg-[#eef4ff] shadow-[0_14px_32px_rgba(79,124,255,0.14)]'
                        : 'border-[#e3e9f8] bg-[#fbfcff] hover:border-[#c8d7ff] hover:bg-[#f6f9ff]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#111a38]">{option.label}</p>
                        <p className="mt-2 text-2xl font-bold text-[#111a38]">{formatPrice(option.amount)}</p>
                        <p className="mt-1 text-xs text-[#5f6c87]">
                          Effective monthly price {formatPrice(Math.round(option.amount / option.months))}
                        </p>
                      </div>
                      {option.badge ? (
                        <span className="inline-flex rounded-full bg-[#4f7cff] px-2.5 py-1 text-[11px] font-semibold text-white">
                          {option.badge}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-[#edf2ff] px-2.5 py-1 text-[11px] font-semibold text-[#4f7cff]">
                          Starter
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-[#e3e9f8] bg-[#f8fbff] px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#111a38]">{headlineTerm.label}</p>
                  <p className="mt-1 text-sm text-[#5f6c87]">
                    You will pay {formatPrice(headlineTerm.amount)} now with no automatic renewal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleUpgrade(selectedMonths)}
                  disabled={upgrading}
                  className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {upgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  {upgrading ? 'Processing...' : `Continue for ${formatPrice(headlineTerm.amount)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
