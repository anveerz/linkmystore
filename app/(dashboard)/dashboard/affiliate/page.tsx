'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Loader2, MousePointerClick, Wallet, Percent } from 'lucide-react'
import { formatPrice } from '@/lib/constants'

interface AffiliateDashboardData {
  plan: 'free' | 'pro'
  commission_split: {
    creator_share_ratio: number
    platform_share_ratio: number
  }
  metrics: {
    total_clicks: number
    this_month_clicks: number
    total_gross_commission: number
    total_platform_share: number
    total_creator_share: number
  }
  platform_breakdown: Array<{ platform: string; clicks: number }>
  payouts: Array<{
    id: string
    affiliate_platform: string
    period_month: string
    gross_commission: number
    platform_share: number
    creator_share: number
    status: 'pending' | 'processing' | 'paid'
  }>
}

export default function AffiliateDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AffiliateDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/affiliate/earnings')
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load affiliate dashboard')
      }
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load affiliate dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-7 h-7 animate-spin text-[#E8651A]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="card p-6">
        <p className="text-sm text-red-600">{error || 'Unable to load affiliate data'}</p>
        <button onClick={() => void fetchData()} className="btn-secondary mt-3">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h1 className="text-xl font-bold text-[#1A1A2E]">Affiliate Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Plan: <span className="font-semibold uppercase">{data.plan}</span> - Creator share{' '}
          <span className="font-semibold">{Math.round(data.commission_split.creator_share_ratio * 100)}%</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Clicks" value={String(data.metrics.total_clicks)} icon={<MousePointerClick className="w-4 h-4" />} />
        <MetricCard title="This Month Clicks" value={String(data.metrics.this_month_clicks)} icon={<Percent className="w-4 h-4" />} />
        <MetricCard title="Your Share" value={formatPrice(data.metrics.total_creator_share)} icon={<Wallet className="w-4 h-4" />} />
        <MetricCard title="Gross Commission" value={formatPrice(data.metrics.total_gross_commission)} icon={<Wallet className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold text-[#1A1A2E] mb-3">Platform Click Breakdown</h2>
          {data.platform_breakdown.length === 0 ? (
            <p className="text-sm text-gray-500">No affiliate clicks recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {data.platform_breakdown.map((item) => (
                <div key={item.platform} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-gray-700">{item.platform}</span>
                  <span className="font-medium text-gray-900">{item.clicks}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-[#1A1A2E] mb-3">Payout Ledger</h2>
          {data.payouts.length === 0 ? (
            <p className="text-sm text-gray-500">No payout entries yet.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {data.payouts.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-800">{entry.period_month}</p>
                    <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {entry.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 capitalize">{entry.affiliate_platform}</p>
                  <div className="text-sm mt-2 space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Gross</span><span>{formatPrice(entry.gross_commission)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Platform</span><span>{formatPrice(entry.platform_share)}</span></div>
                    <div className="flex justify-between font-medium"><span>Your Share</span><span>{formatPrice(entry.creator_share)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        <span className="text-gray-400">{icon}</span>
      </div>
      <p className="text-xl font-bold text-[#1A1A2E] mt-2">{value}</p>
    </div>
  )
}
