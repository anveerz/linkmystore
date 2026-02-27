import { NextResponse } from 'next/server'
import { getRazorpay } from '@/lib/razorpay'
import { createAdminClient } from '@/lib/supabase/admin'

function asText(value: unknown, max = 120): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized.slice(0, max) : null
}

function computeDiscount(
  amount: number,
  coupon: {
    discount_type: 'percent' | 'fixed'
    discount_value: number
    max_discount_amount?: number | null
  }
) {
  let discountAmount = 0
  if (coupon.discount_type === 'percent') {
    discountAmount = Math.round((amount * coupon.discount_value) / 100)
    if (coupon.max_discount_amount) {
      discountAmount = Math.min(discountAmount, coupon.max_discount_amount)
    }
  } else {
    discountAmount = coupon.discount_value
  }

  // Keep minimum payable as ₹1 (100 paisa) for Razorpay.
  const safeDiscount = Math.min(discountAmount, Math.max(0, amount - 100))
  return safeDiscount
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { product_id, creator_id, variant_index, amount, coupon_code } = body

    const supabase = createAdminClient()
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('creator_id', creator_id)
      .eq('is_active', true)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    let baseAmount = product.price
    if (product.variants && product.variants[variant_index]?.price) {
      baseAmount = product.variants[variant_index].price
    }

    let expectedAmount = baseAmount
    let couponResponse: Record<string, unknown> | null = null
    const couponCode = asText(coupon_code, 40)?.toUpperCase()

    if (couponCode) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('creator_id', creator_id)
        .eq('code', couponCode)
        .eq('is_active', true)
        .single()

      if (!coupon) {
        return NextResponse.json({ error: 'Invalid coupon code' }, { status: 400 })
      }

      const now = new Date()
      if (coupon.starts_at && new Date(coupon.starts_at) > now) {
        return NextResponse.json({ error: 'Coupon is not active yet' }, { status: 400 })
      }
      if (coupon.ends_at && new Date(coupon.ends_at) < now) {
        return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 })
      }
      if (coupon.usage_limit !== null && coupon.usage_limit !== undefined && coupon.used_count >= coupon.usage_limit) {
        return NextResponse.json({ error: 'Coupon usage limit reached' }, { status: 400 })
      }
      if (coupon.min_order_amount && baseAmount < coupon.min_order_amount) {
        return NextResponse.json(
          { error: `Minimum order value is ₹${(coupon.min_order_amount / 100).toLocaleString('en-IN')}` },
          { status: 400 }
        )
      }
      if (coupon.applicable_product_ids?.length && !coupon.applicable_product_ids.includes(product_id)) {
        return NextResponse.json({ error: 'Coupon is not valid for this product' }, { status: 400 })
      }

      const discountAmount = computeDiscount(baseAmount, coupon)
      expectedAmount = Math.max(100, baseAmount - discountAmount)
      couponResponse = {
        id: coupon.id,
        code: coupon.code,
        discount_amount: discountAmount,
        original_amount: baseAmount,
        final_amount: expectedAmount,
      }
    }

    // Amount must match the server computed final amount.
    if (Math.abs(expectedAmount - Number(amount)) > 100) {
      return NextResponse.json({ error: 'Price mismatch' }, { status: 400 })
    }

    const razorpay = getRazorpay()
    const razorpayOrder = await razorpay.orders.create({
      amount: expectedAmount,
      currency: 'INR',
      receipt: `order_${Date.now()}`,
    })

    return NextResponse.json({
      razorpay_order_id: razorpayOrder.id,
      amount: expectedAmount,
      original_amount: baseAmount,
      coupon: couponResponse,
    })
  } catch (error) {
    console.error('Create order error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
