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

export async function GET() {
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

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('creator_id', creator.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 })
    }

    return NextResponse.json({ coupons: data || [] })
  } catch (error) {
    console.error('Coupons GET error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
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

    const code = asText(body.code, 40)?.toUpperCase()
    const discountType = asText(body.discount_type, 16)
    const discountValue = asNumber(body.discount_value)
    const maxDiscountAmount = asNumber(body.max_discount_amount)
    const minOrderAmount = asNumber(body.min_order_amount)
    const usageLimit = asNumber(body.usage_limit)
    const startsAt = asText(body.starts_at, 64)
    const endsAt = asText(body.ends_at, 64)
    const applicableProductIds = parseProducts(body.applicable_product_ids)
    const isActive = body.is_active === false ? false : true

    if (!code || code.length < 3) {
      return NextResponse.json({ error: 'Coupon code must be at least 3 characters' }, { status: 400 })
    }

    if (discountType !== 'percent' && discountType !== 'fixed') {
      return NextResponse.json({ error: 'Invalid discount type' }, { status: 400 })
    }

    if (!discountValue || discountValue <= 0) {
      return NextResponse.json({ error: 'Invalid discount value' }, { status: 400 })
    }

    if (discountType === 'percent' && discountValue > 100) {
      return NextResponse.json({ error: 'Percent discount cannot be more than 100' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('coupons')
      .insert({
        creator_id: creator.id,
        code,
        discount_type: discountType,
        discount_value: Math.round(discountValue),
        max_discount_amount: maxDiscountAmount && maxDiscountAmount > 0 ? Math.round(maxDiscountAmount) : null,
        min_order_amount: minOrderAmount && minOrderAmount > 0 ? Math.round(minOrderAmount) : null,
        usage_limit: usageLimit && usageLimit > 0 ? Math.round(usageLimit) : null,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
        applicable_product_ids: applicableProductIds,
        is_active: isActive,
      })
      .select('*')
      .single()

    if (error) {
      const duplicateCode = error.message.toLowerCase().includes('duplicate')
      return NextResponse.json(
        { error: duplicateCode ? 'Coupon code already exists' : 'Failed to create coupon' },
        { status: duplicateCode ? 409 : 500 }
      )
    }

    return NextResponse.json({ coupon: data })
  } catch (error) {
    console.error('Coupons POST error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
