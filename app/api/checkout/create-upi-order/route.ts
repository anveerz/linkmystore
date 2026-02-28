import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateUPILink } from '@/lib/upi'

function asText(value: unknown, max = 120): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized.slice(0, max) : null
}

function isDuplicateOrderNumberError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String((error as { code?: unknown }).code || '') : ''
  const message = 'message' in error ? String((error as { message?: unknown }).message || '').toLowerCase() : ''
  return code === '23505' || message.includes('duplicate key')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      product_id,
      creator_id,
      variant_index,
      buyer_name,
      buyer_phone,
      buyer_email,
      shipping_address,
      coupon_code,
      traffic_source,
      traffic_medium,
      traffic_campaign,
      traffic_referrer,
      visitor_id,
      session_id,
    } = body

    if (!buyer_name || !buyer_phone) {
      return NextResponse.json({ error: 'Buyer name and phone are required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Get product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('is_active', true)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.is_affiliate) {
      return NextResponse.json(
        { error: 'Affiliate products redirect to partner platforms and cannot be checked out here' },
        { status: 400 }
      )
    }

    const resolvedCreatorId = product.creator_id
    if (creator_id && creator_id !== resolvedCreatorId) {
      return NextResponse.json({ error: 'Creator mismatch' }, { status: 400 })
    }

    // 2. Get creator's UPI ID
    const { data: creator } = await supabase
      .from('creators')
      .select('store_name, bank_account')
      .eq('id', resolvedCreatorId)
      .single()

    if (!creator) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    const sellerUpiId = creator.bank_account?.upi_id
    if (!sellerUpiId) {
      return NextResponse.json({ error: 'Seller has not configured UPI payments' }, { status: 400 })
    }

    // 3. Calculate amount
    let baseAmount = product.price
    let selectedVariant = null
    if (product.variants && product.variants[variant_index]?.price) {
      baseAmount = product.variants[variant_index].price
      selectedVariant = product.variants[variant_index]
    } else if (product.variants && product.variants[variant_index]) {
      selectedVariant = product.variants[variant_index]
    }

    // Handle coupon discount
    let discountAmount = 0
    let appliedCoupon: { id: string; code: string } | null = null
    const normalizedCouponCode = asText(coupon_code, 40)?.toUpperCase()

    if (normalizedCouponCode) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('creator_id', resolvedCreatorId)
        .eq('code', normalizedCouponCode)
        .eq('is_active', true)
        .single()

      if (coupon) {
        const now = new Date()
        const valid = (
          (!coupon.starts_at || new Date(coupon.starts_at) <= now) &&
          (!coupon.ends_at || new Date(coupon.ends_at) >= now) &&
          (coupon.usage_limit === null || coupon.usage_limit === undefined || coupon.used_count < coupon.usage_limit) &&
          (!coupon.min_order_amount || baseAmount >= coupon.min_order_amount) &&
          (!coupon.applicable_product_ids?.length || coupon.applicable_product_ids.includes(product_id))
        )

        if (valid) {
          if (coupon.discount_type === 'percent') {
            discountAmount = Math.round((baseAmount * coupon.discount_value) / 100)
            if (coupon.max_discount_amount) {
              discountAmount = Math.min(discountAmount, coupon.max_discount_amount)
            }
          } else {
            discountAmount = coupon.discount_value
          }
          discountAmount = Math.min(discountAmount, baseAmount)
          appliedCoupon = { id: coupon.id, code: coupon.code }
        }
      }
    }

    const finalAmount = Math.max(0, baseAmount - discountAmount)
    const amountInRupees = finalAmount / 100

    // 4. Generate order number
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')

    const attributionMeta = {
      _source: asText(traffic_source, 64),
      _medium: asText(traffic_medium, 64),
      _campaign: asText(traffic_campaign, 96),
      _referrer: asText(traffic_referrer, 128),
    }

    const hasAttribution = Object.values(attributionMeta).some(Boolean)
    const shippingPayload =
      shipping_address && typeof shipping_address === 'object'
        ? { ...shipping_address, ...attributionMeta }
        : hasAttribution
          ? attributionMeta
          : null

    // 5. Create order with pending payment status
    let order: { id: string; order_number: string } | null = null
    let orderError: unknown = null

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: latestOrderRows } = await supabase
        .from('orders')
        .select('order_number')
        .like('order_number', `LMS-${today}-%`)
        .order('order_number', { ascending: false })
        .limit(1)

      const latestOrderNumber = latestOrderRows?.[0]?.order_number
      const latestSequenceMatch =
        typeof latestOrderNumber === 'string' ? latestOrderNumber.match(/-(\d+)$/) : null
      const nextSequence = latestSequenceMatch ? Number(latestSequenceMatch[1]) + 1 : 1
      const orderNumber = `LMS-${today}-${String(nextSequence).padStart(3, '0')}`

      const { data: insertedOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          creator_id: resolvedCreatorId,
          product_id,
          variant: selectedVariant,
          quantity: 1,
          buyer_name,
          buyer_phone,
          buyer_email: buyer_email || null,
          shipping_address: {
            ...(shippingPayload || {}),
            _coupon_code: normalizedCouponCode || null,
            _discount_amount: discountAmount || 0,
            _original_amount: baseAmount,
          },
          amount: finalAmount,
          platform_fee: 0, // No platform fee for direct UPI
          payment_method: 'upi_direct',
          payment_status: 'pending',
          payment_verified: false,
          status: 'new',
        })
        .select('id, order_number')
        .single()

      if (!insertError && insertedOrder) {
        order = insertedOrder
        orderError = null
        break
      }

      orderError = insertError
      if (!isDuplicateOrderNumberError(insertError)) break
    }

    if (!order) {
      console.error('Order creation error:', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // 6. Track coupon redemption
    if (appliedCoupon) {
      await supabase.from('coupon_redemptions').insert({
        coupon_id: appliedCoupon.id,
        creator_id: resolvedCreatorId,
        order_id: order.id,
        product_id,
        code: appliedCoupon.code,
        discount_amount: discountAmount,
      })

      const { data: couponRow } = await supabase
        .from('coupons')
        .select('used_count')
        .eq('id', appliedCoupon.id)
        .single()

      if (couponRow) {
        await supabase.from('coupons').update({
          used_count: (couponRow.used_count || 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq('id', appliedCoupon.id)
      }
    }

    // 7. Track analytics
    await supabase.from('analytics_events').insert({
      creator_id: resolvedCreatorId,
      event_type: 'checkout_start',
      product_id,
      order_id: order.id,
      visitor_id: asText(visitor_id, 96),
      session_id: asText(session_id, 96),
      source: attributionMeta._source || 'direct',
      medium: attributionMeta._medium || 'direct',
      campaign: attributionMeta._campaign,
      referrer: attributionMeta._referrer,
      metadata: { payment_method: 'upi_direct' },
    }).then(({ error }) => {
      if (error) console.warn('Analytics insert skipped:', error.message)
    })

    // 8. Generate UPI deep link
    const upiLink = generateUPILink({
      payeeVPA: sellerUpiId,
      payeeName: creator.store_name,
      amount: amountInRupees,
      transactionNote: `Order-${order.order_number}`,
    })

    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      upi_link: upiLink,
      amount: finalAmount,
      amount_display: amountInRupees,
      seller_upi_id: sellerUpiId,
      seller_name: creator.store_name,
    })
  } catch (error) {
    console.error('Create UPI order error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
