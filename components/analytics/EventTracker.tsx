'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import type { AnalyticsEventType } from '@/types'

interface EventTrackerProps {
  creatorId: string
  eventType: Exclude<AnalyticsEventType, 'purchase'>
  productId?: string
  metadata?: Record<string, unknown>
}

function inferSourceFromReferrer(host: string): string {
  const normalized = host.toLowerCase()
  if (!normalized) return 'direct'
  if (normalized.includes('instagram')) return 'instagram'
  if (normalized.includes('whatsapp')) return 'whatsapp'
  if (normalized.includes('facebook')) return 'facebook'
  if (normalized.includes('youtube') || normalized.includes('youtu.be')) return 'youtube'
  if (normalized.includes('google')) return 'google'
  if (normalized.includes('x.com') || normalized.includes('twitter') || normalized.includes('t.co')) return 'x'
  return normalized
}

function getOrCreateId(storage: Storage, key: string, prefix: string): string {
  const existing = storage.getItem(key)
  if (existing) return existing

  const random = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  storage.setItem(key, random)
  return random
}

export default function EventTracker({ creatorId, eventType, productId, metadata }: EventTrackerProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const metadataJson = JSON.stringify(metadata || {})

  useEffect(() => {
    if (!creatorId || !pathname) return
    if (typeof window === 'undefined') return

    try {
      const query = new URLSearchParams(window.location.search)
      const sourceParam = query.get('utm_source') || query.get('source') || query.get('ref') || ''
      const mediumParam = query.get('utm_medium') || query.get('medium') || ''
      const campaignParam = query.get('utm_campaign') || query.get('campaign') || ''

      let referrerHost = ''
      if (document.referrer) {
        try {
          referrerHost = new URL(document.referrer).hostname.replace(/^www\./, '')
        } catch {
          referrerHost = ''
        }
      }

      const source = (sourceParam || inferSourceFromReferrer(referrerHost) || 'direct').trim().toLowerCase().slice(0, 64)
      const medium = (mediumParam || (sourceParam ? 'campaign' : referrerHost ? 'referral' : 'direct'))
        .trim()
        .toLowerCase()
        .slice(0, 64)
      const campaign = campaignParam ? campaignParam.trim().slice(0, 96) : null
      const referrer = referrerHost || null

      const visitorId = getOrCreateId(localStorage, 'lms_visitor_id', 'v')
      const sessionId = getOrCreateId(sessionStorage, 'lms_session_id', 's')

      const dedupeKey = `lms_evt_${eventType}_${productId || 'none'}_${pathname}_${window.location.search}`
      const previousTimestamp = Number(sessionStorage.getItem(dedupeKey) || '0')
      const now = Date.now()
      if (now - previousTimestamp < 20000) {
        return
      }
      sessionStorage.setItem(dedupeKey, String(now))

      void fetch('/api/analytics/track', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_id: creatorId,
          event_type: eventType,
          product_id: productId || null,
          visitor_id: visitorId,
          session_id: sessionId,
          source,
          medium,
          campaign,
          referrer,
          metadata: {
            ...(metadataJson ? JSON.parse(metadataJson) : {}),
            path: pathname,
          },
        }),
      })
    } catch {
      // Tracking is best-effort and should never block UX.
    }
  }, [creatorId, eventType, metadataJson, pathname, productId, searchParams])

  return null
}
