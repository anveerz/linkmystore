import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AnalyticsEventType } from '@/types'

const ALLOWED_EVENTS: AnalyticsEventType[] = ['store_view', 'product_view', 'checkout_start', 'purchase']

function asText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized.slice(0, max) : null
}

function asMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const creatorId = asText(body.creator_id, 64)
    const eventType = asText(body.event_type, 32) as AnalyticsEventType | null

    if (!creatorId || !eventType || !ALLOWED_EVENTS.includes(eventType)) {
      return NextResponse.json({ error: 'Invalid analytics payload' }, { status: 400 })
    }

    const productId = asText(body.product_id, 64)
    const orderId = asText(body.order_id, 64)
    const visitorId = asText(body.visitor_id, 96)
    const sessionId = asText(body.session_id, 96)
    const source = asText(body.source, 64)
    const medium = asText(body.medium, 64)
    const campaign = asText(body.campaign, 96)
    const referrer = asText(body.referrer, 160)
    const createdAt = asText(body.created_at, 64)

    const supabase = createAdminClient()
    const { error } = await supabase.from('analytics_events').insert({
      creator_id: creatorId,
      event_type: eventType,
      product_id: productId,
      order_id: orderId,
      visitor_id: visitorId,
      session_id: sessionId,
      source,
      medium,
      campaign,
      referrer,
      metadata: asMetadata(body.metadata),
      created_at: createdAt || undefined,
    })

    if (error) {
      // Do not fail the client flow if analytics infra is not ready in DB yet.
      console.warn('Analytics track insert skipped:', error.message)
      return NextResponse.json({ success: false, skipped: true }, { status: 202 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.warn('Analytics track failed:', error)
    return NextResponse.json({ success: false }, { status: 202 })
  }
}
