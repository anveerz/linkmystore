'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck, XCircle } from 'lucide-react'

type ConfirmState = 'loading' | 'ready' | 'submitting' | 'success' | 'error'

interface OrderConfirmationPreview {
  orderId: string
  orderNumber: string
  buyerName: string
  amountInPaisa: number
  paymentStatus: string
  upiReference: string | null
  paymentScreenshotUrl: string | null
  alreadyVerified: boolean
}

function formatAmount(amountInPaisa: number) {
  return `\u20B9${(amountInPaisa / 100).toLocaleString('en-IN')}`
}

export default function ConfirmOrderFromEmailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params.id as string
  const token = searchParams.get('token') || ''

  const [state, setState] = useState<ConfirmState>('loading')
  const [message, setMessage] = useState('Loading order proof...')
  const [preview, setPreview] = useState<OrderConfirmationPreview | null>(null)

  const dashboardHref = useMemo(() => `/dashboard/orders/${orderId}`, [orderId])

  useEffect(() => {
    let cancelled = false

    async function loadPreview() {
      if (!token) {
        if (!cancelled) {
          setState('error')
          setMessage('This confirmation link is missing its token.')
        }
        return
      }

      try {
        const response = await fetch(
          `/api/orders/${orderId}/verify-upi?token=${encodeURIComponent(token)}`
        )
        const body = await response.json()

        if (!response.ok) {
          throw new Error(body.error || 'Could not load this order preview')
        }

        if (cancelled) return

        setPreview(body)

        if (body.alreadyVerified) {
          setState('success')
          setMessage('This order was already confirmed earlier.')
          return
        }

        setState('ready')
        setMessage('Review the submitted UTR or screenshot before confirming this order.')
      } catch (error) {
        if (!cancelled) {
          setState('error')
          setMessage(error instanceof Error ? error.message : 'Could not load this order preview')
        }
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
    }
  }, [orderId, token])

  const handleConfirmOrder = async () => {
    if (!token) return

    setState('submitting')
    setMessage('Confirming this order now...')

    try {
      const response = await fetch(`/api/orders/${orderId}/verify-upi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_confirmation_token: token,
        }),
      })

      const body = await response.json()
      if (!response.ok) {
        throw new Error(body.error || 'Could not confirm this order')
      }

      setState('success')
      setMessage(body.message || 'Order confirmed successfully.')
      setPreview((current) => (current ? { ...current, alreadyVerified: true, paymentStatus: 'paid' } : current))
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Could not confirm this order')
    }
  }

  return (
    <div className="min-h-screen bg-white px-4 py-16">
      <div className="mx-auto max-w-lg rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        {state === 'loading' || state === 'submitting' ? (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E8651A]/10">
            <Loader2 className="h-8 w-8 animate-spin text-[#E8651A]" />
          </div>
        ) : null}

        {state === 'ready' && (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E8651A]/10">
            <ShieldCheck className="h-8 w-8 text-[#E8651A]" />
          </div>
        )}

        {state === 'success' && (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        )}

        {state === 'error' && (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        )}

        <h1 className="mt-5 text-2xl font-bold text-[#111827]">
          {state === 'success'
            ? 'Order Confirmed'
            : state === 'error'
              ? 'Confirmation Failed'
              : state === 'ready'
                ? 'Review Payment Proof'
                : 'Preparing Confirmation'}
        </h1>
        <p className="mt-3 text-sm text-gray-500">{message}</p>

        {preview ? (
          <div className="mt-8 space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-5 text-left">
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="text-gray-500">Order</span>
              <span className="font-mono text-right text-gray-800">{preview.orderNumber}</span>
            </div>
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="text-gray-500">Buyer</span>
              <span className="text-right font-medium text-gray-800">{preview.buyerName}</span>
            </div>
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="text-gray-500">Amount</span>
              <span className="text-right font-medium text-gray-800">{formatAmount(preview.amountInPaisa)}</span>
            </div>
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="text-gray-500">Submitted UTR</span>
              <span className="font-mono text-right text-xs text-gray-800">
                {preview.upiReference || 'No UTR submitted'}
              </span>
            </div>

            {preview.paymentScreenshotUrl ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-3">
                <p className="text-sm font-medium text-gray-800">Payment screenshot</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.paymentScreenshotUrl}
                  alt="Buyer submitted payment proof"
                  className="mt-3 w-full rounded-xl border border-gray-100 object-contain"
                  loading="lazy"
                />
                <a
                  href={preview.paymentScreenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#E8651A] hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open screenshot in new tab
                </a>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3">
          {state === 'ready' && (
            <button type="button" onClick={handleConfirmOrder} className="btn-primary w-full text-center">
              Confirm This Order
            </button>
          )}
          <Link href={dashboardHref} className="btn-secondary w-full text-center">
            Open Dashboard Order
          </Link>
          <Link href="/" className="btn-secondary w-full text-center">
            Back to LinkMyStore
          </Link>
        </div>
      </div>
    </div>
  )
}
