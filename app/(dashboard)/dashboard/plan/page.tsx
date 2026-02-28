'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Crown,
  Check,
  X,
  Loader2,
  Sparkles,
  Shield,
  Zap,
  AlertCircle,
} from 'lucide-react'
import { PRO_PLAN_PRICE, formatPrice } from '@/lib/constants'
import type { Subscription } from '@/types'

interface PlanStatus {
  plan: 'free' | 'pro'
  subscription: Subscription | null
  productCount: number
}

export default function PlanPage() {
  const [status, setStatus] = useState<PlanStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/subscriptions/status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch {
      toast.error('Failed to load plan status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Load Razorpay script
  useEffect(() => {
    if (document.getElementById('razorpay-script')) return
    const script = document.createElement('script')
    script.id = 'razorpay-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.head.appendChild(script)
  }, [])

  const handleUpgrade = async () => {
    setUpgrading(true)
    try {
      const res = await fetch('/api/subscriptions/create', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to create subscription')
        return
      }

      const options: RazorpayOptions & Record<string, unknown> = {
        key: data.key,
        name: 'LinkMyStore',
        description: 'Pro Plan - Monthly',
        image: '/logo.png',
        handler: async (response: RazorpaySuccessResponse) => {
          const verifyRes = await fetch('/api/subscriptions/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          })

          if (verifyRes.ok) {
            toast.success('Welcome to Pro! Your plan has been upgraded.')
            fetchStatus()
          } else {
            toast.error('Payment verification failed. Please contact support.')
          }
        },
        theme: { color: '#E8651A' },
        modal: { ondismiss: () => setUpgrading(false) },
      }

      if (data.type === 'subscription') {
        options.subscription_id = data.razorpay_subscription_id
      } else {
        options.order_id = data.razorpay_order_id
        options.amount = data.amount
        options.currency = 'INR'
      }

      if (data.prefill) {
        options.prefill = data.prefill
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setUpgrading(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your Pro subscription? You will lose access to Pro features at the end of your billing period.')) {
      return
    }

    setCancelling(true)
    try {
      const res = await fetch('/api/subscriptions/cancel', { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        toast.success(data.message || 'Subscription cancelled')
        fetchStatus()
      } else {
        toast.error(data.error || 'Failed to cancel')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#E8651A]" />
      </div>
    )
  }

  const isPro = status?.plan === 'pro'
  const isCancelled = status?.subscription?.status === 'cancelled'

  const features = [
    { label: 'Products (own)', free: 'Up to 5', pro: 'Unlimited', icon: '📦' },
    { label: 'Affiliate products', free: 'Unlimited', pro: 'Unlimited', icon: '🔗' },
    { label: 'Storefront themes', free: '1 default', pro: 'All premium themes', icon: '🎨' },
    { label: '"Powered by LinkMyStore"', free: 'Shown', pro: 'Removed', icon: '🏷️' },
    { label: 'Analytics', free: 'Total views only', pro: 'Full analytics', icon: '📊' },
    { label: 'Product categories', free: '1 category', pro: 'Unlimited', icon: '📁' },
    { label: 'Order notifications', free: 'Email only', pro: 'Email + WhatsApp', icon: '🔔' },
    { label: 'SEO (meta tags)', free: 'No', pro: 'Yes', icon: '🔍' },
    { label: 'Payment confirmation', free: 'Manual (UPI Ref)', pro: 'Automatic (coming soon)', icon: '💳' },
    { label: 'Priority support', free: 'Community only', pro: 'WhatsApp support', icon: '💬' },
    { label: 'Affiliate commission', free: '50% to you, 50% to us', pro: '100% to you', icon: '💰' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Current Plan Status */}
      <div className="card mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              isPro ? 'bg-[#E8651A]/10' : 'bg-gray-100'
            }`}>
              {isPro ? <Crown className="w-6 h-6 text-[#E8651A]" /> : <Shield className="w-6 h-6 text-gray-400" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1A1A2E]">
                {isPro ? 'Pro Plan' : 'Free Plan'}
              </h2>
              <p className="text-sm text-[#555567]">
                {isPro
                  ? isCancelled
                    ? `Cancels on ${new Date(status.subscription!.current_period_end!).toLocaleDateString('en-IN')}`
                    : `Next billing: ${status?.subscription?.current_period_end
                        ? new Date(status.subscription.current_period_end).toLocaleDateString('en-IN')
                        : 'Active'
                      }`
                  : `${status?.productCount ?? 0}/5 products used`
                }
              </p>
            </div>
          </div>

          {isPro && !isCancelled && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-sm text-red-500 hover:text-red-600 font-medium"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
            </button>
          )}
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Free Plan Card */}
        <div className={`card border-2 ${!isPro ? 'border-[#E8651A]' : 'border-transparent'}`}>
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-[#1A1A2E]">Free</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold text-[#1A1A2E]">{formatPrice(0)}</span>
              <span className="text-[#555567] text-sm">/month</span>
            </div>
            <p className="text-sm text-[#555567] mt-2">Perfect to get started</p>
          </div>

          {!isPro && (
            <div className="bg-[#E8651A]/5 text-[#E8651A] text-center py-2 rounded-xl text-sm font-medium mb-4">
              Current Plan
            </div>
          )}
        </div>

        {/* Pro Plan Card */}
        <div className={`card border-2 relative overflow-hidden ${isPro ? 'border-[#E8651A]' : 'border-transparent'}`}>
          <div className="absolute top-0 right-0 bg-[#E8651A] text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
            RECOMMENDED
          </div>

          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-[#1A1A2E] flex items-center justify-center gap-2">
              <Crown className="w-5 h-5 text-[#E8651A]" />
              Pro
            </h3>
            <div className="mt-2">
              <span className="text-3xl font-bold text-[#1A1A2E]">{formatPrice(PRO_PLAN_PRICE)}</span>
              <span className="text-[#555567] text-sm">/month</span>
            </div>
            <p className="text-sm text-[#555567] mt-2">For serious sellers</p>
          </div>

          {isPro ? (
            <div className="bg-[#E8651A]/5 text-[#E8651A] text-center py-2 rounded-xl text-sm font-medium mb-4">
              Current Plan
            </div>
          ) : (
            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {upgrading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {upgrading ? 'Processing...' : 'Upgrade to Pro'}
            </button>
          )}
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="card">
        <h3 className="text-lg font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#E8651A]" />
          Feature Comparison
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E5EC]">
                <th className="text-left py-3 pr-4 text-sm font-medium text-[#555567]">Feature</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-[#555567]">Free</th>
                <th className="text-center py-3 pl-4 text-sm font-medium text-[#E8651A]">
                  <span className="flex items-center justify-center gap-1">
                    <Crown className="w-3.5 h-3.5" /> Pro
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, i) => (
                <tr key={i} className="border-b border-[#E5E5EC] last:border-b-0">
                  <td className="py-3 pr-4">
                    <span className="text-sm text-[#1A1A2E] flex items-center gap-2">
                      <span>{feature.icon}</span>
                      {feature.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {feature.free === 'No' ? (
                      <X className="w-4 h-4 text-gray-300 mx-auto" />
                    ) : (
                      <span className="text-sm text-[#555567]">{feature.free}</span>
                    )}
                  </td>
                  <td className="py-3 pl-4 text-center">
                    {feature.pro === 'Yes' ? (
                      <Check className="w-4 h-4 text-[#E8651A] mx-auto" />
                    ) : (
                      <span className="text-sm font-medium text-[#1A1A2E]">{feature.pro}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pro Benefits */}
      {!isPro && (
        <div className="card mt-8 bg-gradient-to-r from-[#2A1755] to-[#3D2176] text-white">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-[#E8651A] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-lg mb-2">Why upgrade to Pro?</h4>
              <ul className="space-y-1.5 text-sm text-white/80">
                <li>Unlimited products — no more limits on your catalog</li>
                <li>Remove branding — look professional with your own brand</li>
                <li>Full analytics — know exactly what&apos;s working</li>
                <li>Keep 100% of affiliate earnings instead of 50%</li>
                <li>WhatsApp notifications for every new order</li>
              </ul>
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="mt-4 bg-[#E8651A] hover:bg-[#D55A15] text-white font-medium py-2.5 px-6 rounded-xl transition-colors flex items-center gap-2"
              >
                {upgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                {upgrading ? 'Processing...' : `Upgrade for just ${formatPrice(PRO_PLAN_PRICE)}/mo`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
