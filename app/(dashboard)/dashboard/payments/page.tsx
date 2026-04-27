'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { AlertCircle, CheckCircle2, Copy, ExternalLink, Loader2, ShieldCheck } from 'lucide-react'

interface PaymentStatusResponse {
  payment_account_id: string
  pg_status: string
  payment_mode: string
  provider: string
  upi_id: string | null
  upi_fallback_enabled: boolean
  upi_fallback_expires_at: string | null
  pg_active: boolean
}

export default function PaymentsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [creatorId, setCreatorId] = useState<string | null>(null)
  const [status, setStatus] = useState<PaymentStatusResponse | null>(null)
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null)
  const [initiating, setInitiating] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [showAdvancedWebhook, setShowAdvancedWebhook] = useState(false)

  const [keyId, setKeyId] = useState('')
  const [keySecret, setKeySecret] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')

  const webhookUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const runtimeOrigin = window.location.origin.replace(/\/$/, '')
    const configuredBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/$/, '')
    const isLocalhost = (value: string) => /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(value)

    const baseUrl =
      isLocalhost(runtimeOrigin) && configuredBaseUrl && !isLocalhost(configuredBaseUrl)
        ? configuredBaseUrl
        : runtimeOrigin

    return `${baseUrl}/api/payments/razorpay/webhook`
  }, [])

  const fetchStatus = useCallback(async () => {
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
      setCreatorId(creator.id)

      const response = await fetch(`/api/payment-accounts/status?creator_id=${creator.id}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch payment status')
      }

      setStatus(data as PaymentStatusResponse)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load payment settings')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  const initiateOnboarding = async () => {
    if (!creatorId) return
    try {
      setInitiating(true)
      const response = await fetch('/api/payment-accounts/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_id: creatorId,
          provider: 'razorpay',
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate onboarding')
      }
      setOnboardingUrl(data.onboarding_url || null)
      toast.success('Gateway onboarding initiated')
      await fetchStatus()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to initiate onboarding')
    } finally {
      setInitiating(false)
    }
  }

  const connectGateway = async () => {
    if (!status?.payment_account_id) return
    if (!keyId.trim() || !keySecret.trim()) {
      toast.error('Enter key ID and key secret')
      return
    }

    try {
      setConnecting(true)
      const response = await fetch('/api/payment-accounts/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_account_id: status.payment_account_id,
          key_id: keyId.trim(),
          key_secret: keySecret.trim(),
          webhook_secret: webhookSecret.trim() || undefined,
          pg_account_label: 'Razorpay',
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect gateway')
      }
      toast.success('Gateway connected successfully')
      setKeySecret('')
      setWebhookSecret('')
      await fetchStatus()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to connect gateway')
    } finally {
      setConnecting(false)
    }
  }

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[360px]">
        <Loader2 className="w-7 h-7 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>

      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-lg">Gateway Status</h2>
            <p className="text-sm text-gray-500 mt-1">
              PG-primary checkout is recommended for automatic payment confirmation.
            </p>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              status?.pg_active ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {status?.pg_active ? 'Active' : status?.pg_status || 'Not Started'}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Provider</p>
            <p className="text-sm font-semibold uppercase">{status?.provider || 'razorpay'}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Payment mode</p>
            <p className="text-sm font-semibold">{status?.payment_mode || 'pg_primary'}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={initiateOnboarding} disabled={initiating} className="btn-primary inline-flex items-center gap-2">
            {initiating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {initiating ? 'Starting...' : 'Start Gateway Onboarding'}
          </button>
          {onboardingUrl && (
            <a href={onboardingUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-2">
              Open Onboarding
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-lg">Connect Gateway Keys</h2>
        <p className="text-sm text-gray-500 mt-1">
          Enter only Key ID + Key Secret. LinkMyStore auto-creates/updates your webhook URL and keeps the signing secret stored securely.
        </p>

        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
          <p className="font-medium text-gray-700">Webhook URL used by LinkMyStore</p>
          <div className="mt-1 flex items-start justify-between gap-3">
            <p className="font-mono break-all">{webhookUrl || '/api/payments/razorpay/webhook'}</p>
            {webhookUrl && (
              <button
                type="button"
                onClick={() => { void copyToClipboard(webhookUrl, 'Webhook URL') }}
                className="inline-flex items-center gap-1 text-[#E8651A]"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <input
            type="text"
            value={keyId}
            onChange={(event) => setKeyId(event.target.value)}
            placeholder="Razorpay Key ID"
            className="input-field"
          />
          <input
            type="password"
            value={keySecret}
            onChange={(event) => setKeySecret(event.target.value)}
            placeholder="Razorpay Key Secret"
            className="input-field"
          />

          <button
            type="button"
            onClick={() => setShowAdvancedWebhook((current) => !current)}
            className="text-xs text-[#E8651A] font-medium"
          >
            {showAdvancedWebhook ? 'Hide advanced webhook secret' : 'Advanced: set custom webhook secret (optional)'}
          </button>

          {showAdvancedWebhook && (
            <input
              type="password"
              value={webhookSecret}
              onChange={(event) => setWebhookSecret(event.target.value)}
              placeholder="Custom Webhook Secret (optional)"
              className="input-field"
            />
          )}

          <button onClick={connectGateway} disabled={connecting} className="btn-primary w-full inline-flex items-center justify-center gap-2">
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {connecting ? 'Connecting...' : 'Connect Gateway'}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-lg">Manual UPI Mode</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manual UPI mode is used for sellers who have not activated gateway checkout.
        </p>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Enabled</span>
            <span className="font-medium">{status?.upi_fallback_enabled ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">UPI ID</span>
            <span className="font-medium">{status?.upi_id || 'Not configured'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Manual mode status</span>
            <span className="font-medium">
              {status?.upi_fallback_enabled ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            In manual UPI mode, buyer pays to seller UPI ID and seller confirms payment using UTR/screenshot.
          </p>
        </div>
      </div>
    </div>
  )
}
