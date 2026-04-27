'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { PLATFORM_REPORTING_NOTICE } from '@/lib/site'

export default function ReportStorePage() {
  const [submitting, setSubmitting] = useState(false)
  const [storeSlug, setStoreSlug] = useState('')
  const [category, setCategory] = useState('other')
  const [description, setDescription] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [orderReference, setOrderReference] = useState('')
  const [upiReference, setUpiReference] = useState('')
  const [reportId, setReportId] = useState<string | null>(null)

  useEffect(() => {
    const slugFromUrl = new URLSearchParams(window.location.search).get('store') || ''
    if (slugFromUrl) {
      setStoreSlug(slugFromUrl)
    }
  }, [])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!storeSlug.trim() || !description.trim()) {
      toast.error('Store slug and complaint details are required')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch('/api/store-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_slug: storeSlug.trim(),
          category,
          description: description.trim(),
          buyer_name: buyerName.trim() || null,
          buyer_email: buyerEmail.trim() || null,
          order_reference: orderReference.trim() || null,
          upi_reference: upiReference.trim() || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to submit report')

      setReportId(data.report_id || null)
      toast.success('Store report submitted')
      setDescription('')
      setOrderReference('')
      setUpiReference('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_-18%,rgba(79,124,255,0.2),transparent_46%),radial-gradient(circle_at_92%_2%,rgba(122,93,255,0.17),transparent_42%),linear-gradient(180deg,#f8faff_0%,#f2f6ff_52%,#edf3ff_100%)] py-8 sm:py-12">
      <section className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10">
          <aside>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f7cff]">Seller report</p>
            <h1 className="mt-3 text-2xl font-semibold text-[#111a38] sm:mt-4 sm:text-3xl">Report a store that needs review</h1>
            <p className="mt-3 text-sm leading-7 text-[#556486] sm:mt-4 sm:text-base">
              Use this form for fraud, abusive conduct, repeated non-delivery, or other policy violations that need
              platform review.
            </p>

            <div className="mt-6 border-t border-[#dfe7fb] pt-5 sm:mt-8 sm:pt-6">
              <h2 className="text-lg font-semibold text-[#111a38]">Important</h2>
              <p className="mt-3 text-sm leading-7 text-[#556486]">{PLATFORM_REPORTING_NOTICE}</p>
            </div>

            <div className="mt-6 border-t border-[#dfe7fb] pt-5 sm:mt-8 sm:pt-6">
              <h2 className="text-lg font-semibold text-[#111a38]">Need the official email?</h2>
              <p className="mt-3 text-sm leading-7 text-[#556486]">
                If you prefer email instead of this form, use the contact page.
              </p>
              <Link href="/contact" className="mt-3 inline-flex text-sm font-semibold text-[#4f7cff] hover:underline">
                Open contact page
              </Link>
            </div>
          </aside>

          <section className="border-t border-[#dfe7fb] pt-6 sm:pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4f7cff]">Store report form</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#111a38] sm:text-3xl">Share the details clearly</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#556486] sm:text-base">
                  Include the store slug, order reference, UPI reference, and what the seller did or failed to do.
                </p>
              </div>

              {reportId && (
                <div className="w-full border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 sm:w-auto">
                  Report ID: <span className="font-mono">{reportId}</span>
                </div>
              )}
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-4 sm:mt-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  className="input-field text-sm sm:text-base"
                  value={storeSlug}
                  onChange={(event) => setStoreSlug(event.target.value)}
                  placeholder="Store slug (for example, my-store) *"
                />
                <select className="input-field text-sm sm:text-base" value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="other">Other</option>
                  <option value="fraud">Fraud</option>
                  <option value="non_delivery">Non-delivery</option>
                  <option value="payment_issue">Payment issue</option>
                  <option value="counterfeit">Counterfeit item</option>
                  <option value="abuse">Abuse</option>
                </select>
              </div>

              <textarea
                className="input-field min-h-[150px] text-sm sm:min-h-[160px] sm:text-base"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe what happened, how you contacted the seller, and why you believe platform review is needed. *"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <input className="input-field text-sm sm:text-base" value={buyerName} onChange={(event) => setBuyerName(event.target.value)} placeholder="Your name (optional)" />
                <input className="input-field text-sm sm:text-base" value={buyerEmail} onChange={(event) => setBuyerEmail(event.target.value)} placeholder="Your email (optional)" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <input className="input-field text-sm sm:text-base" value={orderReference} onChange={(event) => setOrderReference(event.target.value)} placeholder="Order reference (optional)" />
                <input className="input-field text-sm sm:text-base" value={upiReference} onChange={(event) => setUpiReference(event.target.value)} placeholder="UPI reference or UTR (optional)" />
              </div>

              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? 'Submitting...' : 'Submit Store Report'}
              </button>
            </form>

            <div className="mt-6 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-3">
              <Link href="/grievance" className="text-[#4f7cff] hover:underline">
                Submit a grievance
              </Link>
              <Link href="/contact" className="text-[#4f7cff] hover:underline">
                Contact page
              </Link>
              <Link href="/" className="text-[#6a7798] hover:text-[#111a38]">
                Back to home
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
