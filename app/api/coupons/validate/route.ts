import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function asText(value: unknown, max = 120): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized.slice(0, max) : null
}

function asInt(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed) : null
}

function couponValidationError(message: string, status = 400) {
  return NextResponse.json({ valid: false, error: message }, { status })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const creatorId = asText(body.creator_id, 64)
    const productId = asText(body.product_id, 64)
    const couponCode = asText(body.coupon_code, 40)?.toUpperCase()
    const amount = asInt(body.amount)

    if (!creatorId || !productId || !couponCode || !amount || amount <= 0) {
      return couponValidationError('Invalid coupon request payload')
    }

    const supabase = createAdminClient()
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('code', couponCode)
      .eq('is_active', true)
      .single()

    if (error || !coupon) {
      return couponValidationError('Coupon code is invalid')
    }

    const now = new Date()
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      return couponValidationError('Coupon is not active yet')
    }
    if (coupon.ends_at && new Date(coupon.ends_at) < now) {
      return couponValidationError('Coupon has expired')
    }
    if (coupon.usage_limit !== null && coupon.usage_limit !== undefined && coupon.used_count >= coupon.usage_limit) {
      return couponValidationError('Coupon usage limit reached')
    }
    if (coupon.min_order_amount && amount < coupon.min_order_amount) {
      return couponValidationError(
        `Minimum order value is ₹${(coupon.min_order_amount / 100).toLocaleString('en-IN')}`
      )
    }
    if (coupon.applicable_product_ids?.length && !coupon.applicable_product_ids.includes(productId)) {
      return couponValidationError('Coupon is not applicable for this product')
    }

    let discountAmount = 0
    if (coupon.discount_type === 'percent') {
      discountAmount = Math.round((amount * coupon.discount_value) / 100)
      if (coupon.max_discount_amount) {
        discountAmount = Math.min(discountAmount, coupon.max_discount_amount)
      }
    } else {
      discountAmount = coupon.discount_value
    }

    // Keep non-zero payable amount for Razorpay checkout flow.
    const cappedDiscount = Math.min(discountAmount, Math.max(0, amount - 100))
    const finalAmount = Math.max(100, amount - cappedDiscount)

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
      },
      original_amount: amount,
      discount_amount: cappedDiscount,
      final_amount: finalAmount,
    })
  } catch (error) {
    console.error('Coupons validate error:', error)
    return couponValidationError('Could not validate coupon', 500)
  }
}
