import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

function asText(value: unknown, max = 120): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized.slice(0, max) : null
}

function asNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseProducts(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const ids = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
  return ids.length > 0 ? ids : null
}

async function getCreatorId() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, creatorId: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!creator) {
    return { supabase, creatorId: null, error: NextResponse.json({ error: 'Creator not found' }, { status: 404 }) }
  }

  return { supabase, creatorId: creator.id, error: null }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const context = await getCreatorId()
    if (context.error) return context.error
    if (!context.creatorId) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    const code = asText(body.code, 40)
    if (code) updates.code = code.toUpperCase()

    const discountType = asText(body.discount_type, 16)
    if (discountType === 'percent' || discountType === 'fixed') updates.discount_type = discountType

    const discountValue = asNumber(body.discount_value)
    if (discountValue && discountValue > 0) updates.discount_value = Math.round(discountValue)

    if ('max_discount_amount' in body) {
      const maxDiscountAmount = asNumber(body.max_discount_amount)
      updates.max_discount_amount = maxDiscountAmount && maxDiscountAmount > 0 ? Math.round(maxDiscountAmount) : null
    }

    if ('min_order_amount' in body) {
      const minOrderAmount = asNumber(body.min_order_amount)
      updates.min_order_amount = minOrderAmount && minOrderAmount > 0 ? Math.round(minOrderAmount) : null
    }

    if ('usage_limit' in body) {
      const usageLimit = asNumber(body.usage_limit)
      updates.usage_limit = usageLimit && usageLimit > 0 ? Math.round(usageLimit) : null
    }

    if ('starts_at' in body) updates.starts_at = asText(body.starts_at, 64) || null
    if ('ends_at' in body) updates.ends_at = asText(body.ends_at, 64) || null
    if ('is_active' in body) updates.is_active = body.is_active === false ? false : true
    if ('applicable_product_ids' in body) updates.applicable_product_ids = parseProducts(body.applicable_product_ids)

    const { data, error } = await context.supabase
      .from('coupons')
      .update(updates)
      .eq('id', id)
      .eq('creator_id', context.creatorId)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 })
    }

    return NextResponse.json({ coupon: data })
  } catch (error) {
    console.error('Coupons PATCH error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const context = await getCreatorId()
    if (context.error) return context.error
    if (!context.creatorId) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })

    const { error } = await context.supabase
      .from('coupons')
      .delete()
      .eq('id', id)
      .eq('creator_id', context.creatorId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Coupons DELETE error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
