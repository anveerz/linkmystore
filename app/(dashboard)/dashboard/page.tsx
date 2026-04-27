'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Calendar,
  Check,
  Copy,
  MapPin,
  MessageCircle,
  PieChart,
  Plus,
  Repeat2,
  Share2,
  ShoppingBag,
  Star,
  Target,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Crown,
  Lock,
  Send,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/constants'
import { timeAgo } from '@/lib/utils'
import {
  buildDashboardAnalytics,
  type DashboardAnalytics,
  type RankedMetric,
  type RevenuePoint,
  type RevenueRange,
} from '@/lib/dashboard-analytics'
import type { AnalyticsEvent, Creator, Order, Product } from '@/types'

function useAnimatedNumber(value: number, duration = 900) {
  const [displayValue, setDisplayValue] = useState(0)
  const previousValue = useRef(0)

  useEffect(() => {
    const startValue = previousValue.current
    const delta = value - startValue
    const startTime = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(startValue + delta * eased)

      if (progress < 1) {
        frame = requestAnimationFrame(tick)
        return
      }

      previousValue.current = value
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return displayValue
}

function RevenueBars({ data, chartReady }: { data: RevenuePoint[]; chartReady: boolean }) {
  const maxValue = Math.max(...data.map((point) => point.value), 1)
  const labelStride = data.length <= 8 ? 1 : Math.ceil(data.length / 6)

  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-[#8E8E9F]">
        No revenue data yet
      </div>
    )
  }

  return (
    <div className="h-56 flex items-end gap-1.5">
      {data.map((point, index) => {
        const relativeHeight = point.value > 0 ? (point.value / maxValue) * 100 : 0
        const barHeight = point.value > 0 ? Math.max(10, relativeHeight) : 3
        const showLabel = index % labelStride === 0 || index === data.length - 1

        return (
          <div key={`${point.label}-${index}`} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-2">
            <div
              title={`${point.label}: ${formatPrice(point.value)} (${point.orders} orders)`}
              className="w-full rounded-t-md bg-gradient-to-t from-[#4f7cff] to-[#7a5dff] transition-all duration-500 ease-out"
              style={{
                height: chartReady ? `${barHeight}%` : '0%',
                transitionDelay: `${index * 25}ms`,
              }}
            />
            <span className="text-[10px] text-[#8E8E9F] leading-none">
              {showLabel ? point.label : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function DistributionList({
  items,
  emptyText,
  colorClass,
}: {
  items: RankedMetric[]
  emptyText: string
  colorClass: string
}) {
  if (items.length === 0) {
    return <p className="text-xs text-[#8E8E9F]">{emptyText}</p>
  }

  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-[#1A1A2E]">{item.label}</span>
            <span className="text-[#8E8E9F]">{item.count} orders</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${item.percentage}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

interface WhatsAppStatus {
  plan: 'free' | 'pro'
  isPro: boolean
  provider: string
  configured: boolean
  hasRecipient: boolean
  recipientHint: string | null
  canSend: boolean
  issue: 'pro_required' | 'provider_not_configured' | 'recipient_missing' | null
}

function getWhatsAppIssueText(issue: WhatsAppStatus['issue']) {
  if (issue === 'pro_required') return 'Upgrade to Pro to unlock WhatsApp order notifications.'
  if (issue === 'provider_not_configured') return 'Provider setup is incomplete. Add WhatsApp API credentials in environment.'
  if (issue === 'recipient_missing') return 'Add WhatsApp number in settings to receive alerts.'
  return ''
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [creator, setCreator] = useState<Creator | null>(null)
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [pendingPayout, setPendingPayout] = useState(0)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [selectedRange, setSelectedRange] = useState<RevenueRange>('daily')
  const [chartReady, setChartReady] = useState(false)
  const [whatsAppStatus, setWhatsAppStatus] = useState<WhatsAppStatus | null>(null)
  const [whatsAppStatusLoading, setWhatsAppStatusLoading] = useState(false)
  const [sendingWhatsAppTest, setSendingWhatsAppTest] = useState(false)

  useEffect(() => {
    setChartReady(false)
    const timeout = window.setTimeout(() => setChartReady(true), 80)
    return () => window.clearTimeout(timeout)
  }, [selectedRange, analytics])

  const fetchWhatsAppStatus = useCallback(async () => {
    setWhatsAppStatusLoading(true)
    try {
      const response = await fetch('/api/notifications/status', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to load WhatsApp status')
      }
      const data = (await response.json()) as WhatsAppStatus
      setWhatsAppStatus(data)
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error)
      setWhatsAppStatus(null)
    } finally {
      setWhatsAppStatusLoading(false)
    }
  }, [])

  const fetchDashboardData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: creatorData } = await supabase
        .from('creators')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!creatorData) return
      setCreator(creatorData)

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('creator_id', creatorData.id)
        .order('created_at', { ascending: false })

      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('creator_id', creatorData.id)

      let analyticsEvents: AnalyticsEvent[] = []
      if (creatorData.plan === 'pro') {
        const { data: eventsData, error: eventsError } = await supabase
          .from('analytics_events')
          .select('*')
          .eq('creator_id', creatorData.id)
          .order('created_at', { ascending: false })
          .limit(4000)

        if (!eventsError && eventsData) {
          analyticsEvents = eventsData as AnalyticsEvent[]
        }
      }

      const allOrders = (ordersData || []) as Order[]
      const allProducts = (productData || []) as Product[]

      const computed = buildDashboardAnalytics(allOrders, allProducts, analyticsEvents)
      setAnalytics(computed)
      setRecentOrders(computed.paidOrders.slice(0, 5))

      const { data: payouts } = await supabase
        .from('payouts')
        .select('amount, status')
        .eq('creator_id', creatorData.id)

      const pendingQueue = (payouts || [])
        .filter((payout: { status: string }) => payout.status === 'pending' || payout.status === 'processing')
        .reduce((sum: number, payout: { amount: number }) => sum + payout.amount, 0)
      setPendingPayout(pendingQueue)

      // Backfill purchase analytics for legacy paid orders (non-blocking).
      void fetch('/api/analytics/backfill', { method: 'POST' }).catch(() => {})
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void fetchDashboardData()
  }, [fetchDashboardData])

  useEffect(() => {
    if (creator?.plan === 'pro') {
      void fetchWhatsAppStatus()
      return
    }
    setWhatsAppStatus(null)
    setWhatsAppStatusLoading(false)
  }, [creator?.plan, fetchWhatsAppStatus])

  const handleCopyLink = () => {
    if (!creator) return
    const url = `linkmystore.in/${creator.store_slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Store link copied')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleProFeatureClick = (featureLabel: string) => {
    const proceed = window.confirm(`${featureLabel} is available on Pro plan only. Upgrade now?`)
    if (proceed) {
      router.push('/dashboard/plan')
    }
  }

  const handleWhatsAppTest = async () => {
    if (!isPro) {
      handleProFeatureClick('WhatsApp order notifications')
      return
    }

    setSendingWhatsAppTest(true)
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Test notification from LinkMyStore (${new Date().toLocaleString('en-IN')})`,
        }),
      })
      const body = await response.json().catch(() => ({} as { error?: string }))

      if (!response.ok) {
        throw new Error(body.error || 'Failed to send WhatsApp test notification')
      }

      toast.success('Test WhatsApp notification sent')
      void fetchWhatsAppStatus()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send WhatsApp test notification'
      toast.error(message)
    } finally {
      setSendingWhatsAppTest(false)
    }
  }

  const series = useMemo(() => analytics?.revenueSeries[selectedRange] || [], [analytics, selectedRange])
  const seriesRevenue = useMemo(() => series.reduce((sum, point) => sum + point.value, 0), [series])
  const seriesOrders = useMemo(() => series.reduce((sum, point) => sum + point.orders, 0), [series])
  const isPro = creator?.plan === 'pro'

  const animatedTotalSales = useAnimatedNumber(analytics?.totalSales || 0)
  const animatedTotalOrders = useAnimatedNumber(analytics?.totalOrders || 0)
  const animatedTotalEarnings = useAnimatedNumber(analytics?.totalEarnings || 0)
  const animatedPendingPayout = useAnimatedNumber(pendingPayout)
  const animatedConversionRate = useAnimatedNumber(Math.round((analytics?.conversionRate || 0) * 10)) / 10
  const animatedRepeatRate = useAnimatedNumber(Math.round((analytics?.repeatCustomerRate || 0) * 10)) / 10
  const animatedDeliveryRate = useAnimatedNumber(Math.round((analytics?.deliveryRate || 0) * 10)) / 10

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-72 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-56 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const storeUrl = creator ? `linkmystore.in/${creator.store_slug}` : ''
  const hasAnalytics = Boolean(analytics)
  const whatsAppIssueText = getWhatsAppIssueText(whatsAppStatus?.issue || null)
  const canSendWhatsAppTest = Boolean(whatsAppStatus?.canSend) && !whatsAppStatusLoading && !sendingWhatsAppTest

  return (
    <div className="space-y-6">
      <div className="animate-in">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">
          Welcome back, {creator?.full_name || creator?.store_name}
        </h1>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-2 rounded-lg border border-[#d7e3ff] bg-[#eef3ff] px-3 py-1.5">
            <span className="text-sm font-medium gradient-text">{storeUrl}</span>
            <button
              onClick={handleCopyLink}
              className="rounded p-1 transition-colors hover:bg-[#dfe9ff]"
              title="Copy link"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#4f7cff]" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in-delay-1">
        <div className="card-stat">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4f7cff]/12 to-[#7a5dff]/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#4f7cff]" />
            </div>
            {analytics && analytics.salesGrowth !== 0 && (
              <div
                className={`flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                  analytics.salesGrowth > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {analytics.salesGrowth > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(analytics.salesGrowth)}%
              </div>
            )}
          </div>
          <p className="text-2xl font-bold animate-count-up">{formatPrice(Math.round(animatedTotalSales))}</p>
          <p className="text-xs text-[#8E8E9F] mt-1">Total Sales</p>
        </div>

        <div className="card-stat">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3D2176]/10 to-[#3D2176]/5 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-[#3D2176]" />
            </div>
          </div>
          <p className="text-2xl font-bold animate-count-up">{Math.round(animatedTotalOrders)}</p>
          <p className="text-xs text-[#8E8E9F] mt-1">Paid Orders</p>
        </div>

        <div className="card-stat">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold animate-count-up">{formatPrice(Math.round(animatedTotalEarnings))}</p>
          <p className="text-xs text-[#8E8E9F] mt-1">Net Paid Sales</p>
          <p className="text-[10px] text-gray-300 mt-0.5">V3 own-product orders do not apply platform commission</p>
        </div>

        <div className="card-stat">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold animate-count-up">{formatPrice(Math.round(animatedPendingPayout))}</p>
          <p className="text-xs text-[#8E8E9F] mt-1">Affiliate/Legacy Payout Queue</p>
          {pendingPayout > 0 && !creator?.bank_account && (
            <Link
              href="/dashboard/payments"
              className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-[#4f7cff] hover:text-[#355fe3]"
            >
              Add payment details <ArrowRight className="w-2.5 h-2.5" />
            </Link>
          )}
        </div>
      </div>

      <div className="card animate-in-delay-2 p-5 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#8E8E9F] uppercase tracking-wider">Revenue Trend</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold text-[#1A1A2E]">{formatPrice(seriesRevenue)}</p>
              <p className="text-xs text-[#8E8E9F]">{seriesOrders} orders in selected window</p>
            </div>
          </div>
          <div className="flex items-center bg-gray-100 rounded-xl p-1 w-fit">
            {(['daily', 'weekly', 'monthly'] as RevenueRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedRange === range ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-[#8E8E9F]'
                }`}
              >
                {range === 'daily' ? 'Daily' : range === 'weekly' ? 'Weekly' : 'Monthly'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <RevenueBars data={series} chartReady={chartReady} />
        </div>
      </div>

      {isPro ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in-delay-3">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-[#8E8E9F]">Checkout Conversion</p>
                <p className="text-xl font-bold text-[#1A1A2E]">{animatedConversionRate.toFixed(1)}%</p>
              </div>
            </div>
            <p className="text-[11px] text-[#8E8E9F] mt-2">
              {(analytics?.purchaseEventCount || analytics?.totalOrders || 0)} purchases /{' '}
              {(analytics?.checkoutStartCount || analytics?.totalOrders || 0)} checkout starts
            </p>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <Repeat2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-[#8E8E9F]">Repeat Customer Rate</p>
                <p className="text-xl font-bold text-[#1A1A2E]">{animatedRepeatRate.toFixed(1)}%</p>
              </div>
            </div>
            <p className="text-[11px] text-[#8E8E9F] mt-2">Buyers with more than one paid order</p>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Truck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-[#8E8E9F]">Delivery Success</p>
                <p className="text-xl font-bold text-[#1A1A2E]">{animatedDeliveryRate.toFixed(1)}%</p>
              </div>
            </div>
            <p className="text-[11px] text-[#8E8E9F] mt-2">Delivered orders among paid orders</p>
          </div>
        </div>
      ) : (
        <div className="card animate-in-delay-3 border border-dashed border-[#bfd0ff] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#1A1A2E]">Advanced analytics is on Pro</p>
              <p className="text-xs text-[#8E8E9F] mt-1">
                Unlock conversion funnel, repeat buyer insights, and delivery performance metrics.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#edf2ff] px-2 py-1 text-[10px] text-[#4f7cff]">
              <Lock className="w-3 h-3" /> PRO
            </span>
          </div>
          <button
            onClick={() => handleProFeatureClick('Advanced analytics')}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[linear-gradient(125deg,#4f7cff_0%,#7a5dff_100%)] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_14px_24px_rgba(79,124,255,0.2)]"
          >
            Upgrade for Full Analytics <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in-delay-4">
        <div>
          <h2 className="text-sm font-semibold text-[#8E8E9F] uppercase tracking-wider mb-3">Top-Selling Products</h2>
          {!hasAnalytics || analytics?.topProducts.length === 0 ? (
            <div className="card py-12 text-center">
              <Star className="w-8 h-8 text-gray-200 mx-auto" />
              <p className="text-sm text-[#8E8E9F] mt-3">No sales data yet</p>
              <p className="text-xs text-gray-300 mt-1">Top products appear after paid orders</p>
            </div>
          ) : (
            <div className="card p-0 divide-y divide-gray-50">
              {analytics?.topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-3 p-3 hover:bg-gray-50/50 transition-colors">
                  <span className="text-xs font-bold text-[#8E8E9F] w-5 text-center">#{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.title}</p>
                    <p className="text-xs text-[#8E8E9F]">{product.orders} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold gradient-text">{formatPrice(product.revenue)}</p>
                    <p className="text-[10px] text-[#8E8E9F]">{product.share}% share</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {isPro ? (
          <div>
            <h2 className="text-sm font-semibold text-[#8E8E9F] uppercase tracking-wider mb-3">Traffic Sources</h2>
            <div className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-[#1A1A2E]">Checkout Attribution</p>
                  <p className="text-xs text-[#8E8E9F] mt-1">
                    {analytics?.trackedTrafficCount || 0} tracked of {analytics?.paidOrders.length || 0} paid orders
                  </p>
                  {analytics && analytics.storeViewCount > 0 && (
                    <p className="text-[11px] text-[#8E8E9F] mt-1">
                      {analytics.storeViewCount} store views | {analytics.productViewCount} product views | {analytics.checkoutStartCount} checkouts
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#edf2ff] flex items-center justify-center">
                  <PieChart className="w-5 h-5 text-[#4f7cff]" />
                </div>
              </div>

              <DistributionList
                items={analytics?.trafficSources || []}
                emptyText="Traffic attribution data will appear as new orders come in."
                colorClass="bg-gradient-to-r from-[#4f7cff] to-[#7a5dff]"
              />
            </div>
          </div>
        ) : (
          <div className="card border border-dashed border-[#bfd0ff] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#1A1A2E]">Traffic source insights on Pro</p>
                <p className="text-xs text-[#8E8E9F] mt-1">
                  See which platform drives checkout starts and paid orders so you can focus on channels that convert.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#edf2ff] px-2 py-1 text-[10px] text-[#4f7cff]">
                <Lock className="w-3 h-3" /> PRO
              </span>
            </div>
            <button
              onClick={() => handleProFeatureClick('Traffic analytics')}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[linear-gradient(125deg,#4f7cff_0%,#7a5dff_100%)] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_14px_24px_rgba(79,124,255,0.2)]"
            >
              Unlock Traffic Analytics <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {isPro ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[#8E8E9F] uppercase tracking-wider mb-3">Customer Demographics</h2>
            <div className="card p-5 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-semibold text-[#1A1A2E]">Top States</p>
                </div>
                <DistributionList
                  items={analytics?.customerStates || []}
                  emptyText="State data appears for physical orders with shipping addresses."
                  colorClass="bg-gradient-to-r from-blue-500 to-cyan-500"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-semibold text-[#1A1A2E]">Top Cities</p>
                </div>
                <DistributionList
                  items={analytics?.customerCities || []}
                  emptyText="City distribution will populate automatically."
                  colorClass="bg-gradient-to-r from-purple-500 to-fuchsia-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-[#8E8E9F] uppercase tracking-wider mb-3">Performance Highlights</h2>
            <div className="space-y-3">
              <div className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-lg font-bold">{formatPrice(analytics?.thisWeekSales || 0)}</p>
                  <p className="text-xs text-[#8E8E9F]">This Week</p>
                </div>
              </div>
              <div className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-lg font-bold">{formatPrice(analytics?.thisMonthSales || 0)}</p>
                  <p className="text-xs text-[#8E8E9F]">This Month</p>
                </div>
              </div>
              <div className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-lg font-bold">{formatPrice(analytics?.avgOrderValue || 0)}</p>
                  <p className="text-xs text-[#8E8E9F]">Avg. Order Value</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card border border-dashed border-[#bfd0ff] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#1A1A2E]">Demographics and performance insights on Pro</p>
              <p className="text-xs text-[#8E8E9F] mt-1">
                Track top customer locations and weekly/monthly performance to plan what to sell next.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#edf2ff] px-2 py-1 text-[10px] text-[#4f7cff]">
              <Lock className="w-3 h-3" /> PRO
            </span>
          </div>
          <button
            onClick={() => handleProFeatureClick('Customer and performance analytics')}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[linear-gradient(125deg,#4f7cff_0%,#7a5dff_100%)] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_14px_24px_rgba(79,124,255,0.2)]"
          >
            Unlock Advanced Insights <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[#8E8E9F] uppercase tracking-wider">Quick Actions</h2>
          <Link href="/dashboard/products/new" className="card-hover group flex min-h-[88px] items-center p-4">
            <div className="flex items-center gap-4 w-full">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4f7cff] to-[#7a5dff] text-white flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Add New Product</p>
                <p className="text-xs text-[#8E8E9F]">Physical or digital product</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 transition-all group-hover:translate-x-1 group-hover:text-[#4f7cff]" />
            </div>
          </Link>

          <button onClick={handleCopyLink} className="card-hover group flex min-h-[88px] w-full items-center p-4 text-left">
            <div className="flex items-center gap-4 w-full">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#3D2176] to-[#2E1859] text-white flex items-center justify-center flex-shrink-0">
                <Share2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Share Your Store</p>
                <p className="text-xs text-[#8E8E9F]">Copy link for Instagram bio</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#3D2176] group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          <Link href="/dashboard/payments" className="card-hover group flex min-h-[88px] items-center p-4">
            <div className="flex items-center gap-4 w-full">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4f7cff] to-[#355fe3] text-white flex items-center justify-center flex-shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Payment Settings</p>
                <p className="text-xs text-[#8E8E9F]">Gateway setup, Manual UPI mode, and webhook status</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 transition-all group-hover:translate-x-1 group-hover:text-[#4f7cff]" />
            </div>
          </Link>

          {isPro && (
            <div className="card p-4 border border-[#3D2176]/20">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#3D2176] to-[#2E1859] text-white flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">WhatsApp Order Alerts</p>
                  <p className="text-xs text-[#8E8E9F]">
                    {whatsAppStatusLoading
                      ? 'Checking configuration...'
                      : whatsAppStatus?.canSend
                        ? `Ready via ${whatsAppStatus.provider}`
                        : 'Action needed before sending'}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] text-[#8E8E9F]">
                <p>
                  Provider: <span className="font-medium text-[#1A1A2E]">{whatsAppStatus?.provider || 'Not set'}</span>
                </p>
                <p>
                  Recipient: <span className="font-medium text-[#1A1A2E]">{whatsAppStatus?.recipientHint || 'Not set'}</span>
                </p>
              </div>

              {whatsAppIssueText && (
                <p className="mt-3 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] text-amber-700">
                  {whatsAppIssueText}
                </p>
              )}

              <button
                onClick={handleWhatsAppTest}
                disabled={!canSendWhatsAppTest}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#3D2176] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2E1859] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" />
                {sendingWhatsAppTest ? 'Sending Test...' : 'Send Test WhatsApp'}
              </button>
            </div>
          )}

          {creator?.plan !== 'pro' && (
            <button
              onClick={() => handleProFeatureClick('Advanced analytics')}
              className="card-hover group flex min-h-[88px] w-full items-center border border-dashed border-[#bfd0ff] p-4 text-left"
            >
              <div className="flex items-center gap-4 w-full">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4f7cff]/18 to-[#7a5dff]/12 text-[#4f7cff] flex items-center justify-center flex-shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm flex items-center gap-1.5">
                    Advanced Analytics
                    <span className="inline-flex items-center gap-1 text-[10px] rounded-full bg-[#edf2ff] px-1.5 py-0.5 text-[#4f7cff]">
                      <Lock className="w-2.5 h-2.5" /> PRO
                    </span>
                  </p>
                  <p className="text-xs text-[#8E8E9F]">Unlock deep growth insights</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 transition-all group-hover:translate-x-1 group-hover:text-[#4f7cff]" />
              </div>
            </button>
          )}

          {creator?.plan !== 'pro' && (
            <button
              onClick={() => handleProFeatureClick('WhatsApp order notifications')}
              className="card-hover group flex min-h-[88px] w-full items-center border border-dashed border-[#d9dcfb] p-4 text-left"
            >
              <div className="flex items-center gap-4 w-full">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#3D2176]/20 to-[#3D2176]/10 text-[#3D2176] flex items-center justify-center flex-shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm flex items-center gap-1.5">
                    WhatsApp Order Alerts
                    <span className="inline-flex items-center gap-1 text-[10px] rounded-full bg-[#3D2176]/10 px-1.5 py-0.5 text-[#3D2176]">
                      <Lock className="w-2.5 h-2.5" /> PRO
                    </span>
                  </p>
                  <p className="text-xs text-[#8E8E9F]">Get instant WhatsApp notifications</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#3D2176] group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#8E8E9F] uppercase tracking-wider">Recent Orders</h2>
            <Link href="/dashboard/orders" className="flex items-center gap-1 text-xs font-medium text-[#4f7cff] hover:text-[#355fe3]">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="card py-12 text-center">
              <ShoppingBag className="w-8 h-8 text-gray-200 mx-auto" />
              <p className="text-sm text-[#8E8E9F] mt-3">No paid orders yet</p>
              <p className="text-xs text-gray-300 mt-1">Share your store link to start getting orders</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="card group flex items-center justify-between p-4 transition-all hover:border-[#c8d7ff]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-mono text-gray-300">{order.order_number}</p>
                      <span
                        className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          order.status === 'new'
                            ? 'bg-amber-100 text-amber-700'
                            : order.status === 'shipped'
                              ? 'bg-blue-100 text-blue-700'
                              : order.status === 'delivered'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm font-semibold mt-1">{order.buyer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold gradient-text">{formatPrice(order.amount)}</p>
                    <p className="text-[10px] text-gray-300 mt-0.5">{timeAgo(order.created_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
