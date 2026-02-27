import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function readMetaText(meta: Record<string, unknown> | null, keys: string[], max: number) {
  if (!meta) return null
  for (const key of keys) {
    const value = meta[key]
    if (typeof value === 'string') {
      const normalized = value.trim()
      if (normalized) return normalized.slice(0, max)
    }
  }
  return null
}

export async function POST() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: creator } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    const admin = createAdminClient()

    const { data: orders, error: ordersError } = await admin
      .from('orders')
      .select('id, product_id, created_at, shipping_address')
      .eq('creator_id', creator.id)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })
      .limit(1500)

    if (ordersError) {
      return NextResponse.json({ error: 'Could not load orders' }, { status: 500 })
    }

    const { data: existing, error: existingError } = await admin
      .from('analytics_events')
      .select('order_id')
      .eq('creator_id', creator.id)
      .eq('event_type', 'purchase')
      .not('order_id', 'is', null)
      .limit(2000)

    if (existingError) {
      // If table is not ready, keep this non-blocking.
      return NextResponse.json({ success: false, skipped: true }, { status: 202 })
    }

    const existingOrderIds = new Set((existing || []).map((entry) => entry.order_id).filter(Boolean))
    const pendingOrders = (orders || []).filter((order) => !existingOrderIds.has(order.id))

    if (pendingOrders.length === 0) {
      return NextResponse.json({ success: true, backfilled: 0 })
    }

    const payload = pendingOrders.map((order) => {
      const meta =
        order.shipping_address && typeof order.shipping_address === 'object'
          ? (order.shipping_address as Record<string, unknown>)
          : null

      return {
        creator_id: creator.id,
        event_type: 'purchase',
        product_id: order.product_id,
        order_id: order.id,
        source: readMetaText(meta, ['_source', 'source', '_utm_source'], 64) || 'direct',
        medium: readMetaText(meta, ['_medium', 'medium', '_utm_medium'], 64) || 'direct',
        campaign: readMetaText(meta, ['_campaign', 'campaign', '_utm_campaign'], 96),
        referrer: readMetaText(meta, ['_referrer', 'referrer'], 160),
        metadata: {
          backfilled: true,
        },
        created_at: order.created_at,
      }
    })

    const { error: insertError } = await admin.from('analytics_events').insert(payload)
    if (insertError) {
      return NextResponse.json({ success: false, skipped: true }, { status: 202 })
    }

    return NextResponse.json({ success: true, backfilled: payload.length })
  } catch (error) {
    console.warn('Analytics backfill failed:', error)
    return NextResponse.json({ success: false }, { status: 202 })
  }
}
