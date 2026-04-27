'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, BadgeCheck, Loader2, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

interface TrustStats {
  tier: 'unverified' | 'identity_verified' | 'business_verified'
  openReports: number
  investigatingReports: number
  resolvedReports: number
}

export default function TrustPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<TrustStats>({
    tier: 'unverified',
    openReports: 0,
    investigatingReports: 0,
    resolvedReports: 0,
  })

  const fetchTrustData = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!creator) return

      const [{ data: verification }, { data: reports }] = await Promise.all([
        supabase
          .from('seller_verifications')
          .select('tier')
          .eq('creator_id', creator.id)
          .maybeSingle(),
        supabase
          .from('store_reports')
          .select('status')
          .eq('creator_id', creator.id),
      ])

      const reportRows = reports || []
      const openReports = reportRows.filter((row) => row.status === 'open').length
      const investigatingReports = reportRows.filter((row) => row.status === 'investigating').length
      const resolvedReports = reportRows.filter((row) => row.status === 'resolved').length

      setStats({
        tier: (verification?.tier as TrustStats['tier']) || 'unverified',
        openReports,
        investigatingReports,
        resolvedReports,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load trust data')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void fetchTrustData()
  }, [fetchTrustData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trust & Safety</h1>

      <div className="card">
        <div className="flex items-center gap-3">
          <BadgeCheck className="h-5 w-5 text-emerald-600" />
          <h2 className="font-semibold text-lg">Verification Tier</h2>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Current tier:
          <span className="ml-2 font-semibold text-gray-800">
            {stats.tier === 'business_verified'
              ? 'Verified Business'
              : stats.tier === 'identity_verified'
                ? 'Verified Identity'
                : 'Unverified'}
          </span>
        </p>
        <ul className="mt-4 space-y-2 text-sm text-gray-600">
          <li>Unverified: phone/email only</li>
          <li>Verified Identity: PAN and identity checks</li>
          <li>Verified Business: identity + business proof (GST or equivalent)</li>
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs text-gray-500">Open reports</p>
          <p className="text-2xl font-bold">{stats.openReports}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Investigating</p>
          <p className="text-2xl font-bold">{stats.investigatingReports}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Resolved</p>
          <p className="text-2xl font-bold">{stats.resolvedReports}</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h2 className="font-semibold text-lg">Risk Enforcement</h2>
            <p className="text-sm text-gray-500 mt-1">
              Repeated complaints, payment-denial patterns, or missing verification can trigger KYC deadlines and temporary suspension.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/grievance" className="btn-secondary inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            File Grievance
          </Link>
          <Link href="/contact" className="btn-secondary">
            Contact Trust Team
          </Link>
        </div>
      </div>
    </div>
  )
}

