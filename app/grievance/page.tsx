'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { PLATFORM_REPORTING_NOTICE } from '@/lib/site'

export default function GrievancePage() {
  const [submitting, setSubmitting] = useState(false)
  const [type, setType] = useState('general')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [relatedUrl, setRelatedUrl] = useState('')
  const [ticketId, setTicketId] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !email.trim() || !subject.trim() || !description.trim()) {
      toast.error('Please complete all required fields')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch('/api/grievances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          subject: subject.trim(),
          description: description.trim(),
          related_url: relatedUrl.trim() || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit grievance')
      }

      setTicketId(data.ticket_id || null)
      toast.success('Grievance submitted')
      setSubject('')
      setDescription('')
      setRelatedUrl('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit grievance')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="page-shell min-h-screen py-12">
      <section className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9a5627]">Formal grievance</p>
            <h1 className="mt-4 text-3xl font-semibold text-[#101a3a]">Tell us what needs platform review</h1>
            <p className="mt-4 text-sm leading-7 text-[#556486] sm:text-base">
              Use this form for fraud, abuse, privacy, intellectual property, or repeated non-fulfilment that
              requires a platform-level review.
            </p>

            <div className="mt-8 border-t border-[#dfe7fb] pt-6">
              <h2 className="text-lg font-semibold text-[#101a3a]">Before you submit</h2>
              <p className="mt-3 text-sm leading-7 text-[#556486]">{PLATFORM_REPORTING_NOTICE}</p>
            </div>

            <div className="mt-8 border-t border-[#dfe7fb] pt-6">
              <h2 className="text-lg font-semibold text-[#101a3a]">Prefer email instead?</h2>
              <p className="mt-3 text-sm leading-7 text-[#556486]">
                If you need the official platform email, use the contact page.
              </p>
              <Link href="/contact" className="mt-3 inline-flex text-sm font-semibold text-[#3658ce] hover:underline">
                Open contact page
              </Link>
            </div>
          </aside>

          <section className="border-t border-[#dfe7fb] pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9a5627]">Grievance form</p>
                <h2 className="mt-2 text-3xl font-semibold text-[#101a3a]">Share the facts clearly</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#556486]">
                  Valid complaints are acknowledged within 72 hours and are generally reviewed within 15 days,
                  subject to complexity and documentation.
                </p>
              </div>

              {ticketId && (
                <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Ticket created: <span className="font-mono">{ticketId}</span>
                </div>
              )}
            </div>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <select value={type} onChange={(event) => setType(event.target.value)} className="input-field">
                  <option value="general">General grievance</option>
                  <option value="abuse">Abuse</option>
                  <option value="fraud">Fraud</option>
                  <option value="ip">Intellectual property</option>
                  <option value="privacy">Privacy</option>
                </select>
                <input
                  className="input-field"
                  value={relatedUrl}
                  onChange={(event) => setRelatedUrl(event.target.value)}
                  placeholder="Store or page URL (optional)"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <input className="input-field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name *" />
                <input className="input-field" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email *" type="email" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <input className="input-field" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone (optional)" />
                <input className="input-field" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject *" />
              </div>

              <textarea
                className="input-field min-h-[160px]"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the issue, the seller or page involved, what action you already took, and what you want reviewed. *"
              />

              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? 'Submitting...' : 'Submit Grievance'}
              </button>
            </form>

            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <Link href="/report-store" className="text-[#3658ce] hover:underline">
                Report a seller
              </Link>
              <Link href="/contact" className="text-[#3658ce] hover:underline">
                Contact page
              </Link>
              <Link href="/" className="text-[#6a7798] hover:text-[#101a3a]">
                Back to home
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
