import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLATFORM_FEE_PERCENT } from '@/lib/constants'
import { sendOrderNotificationIfEligible } from '@/lib/notifications'

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
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
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
      // Booking fields (for coaching/calendar)
      booking_date,
      booking_time,
    } = body

    const asText = (value: unknown, max = 96) => {
      if (typeof value !== 'string') return null
      const normalized = value.trim()
      return normalized ? normalized.slice(0, max) : null
    }

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

    // 1. VERIFY RAZORPAY SIGNATURE (critical security step)
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex')

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    // 2. GET PRODUCT DETAILS
    const supabase = createAdminClient()
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .single()

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.is_affiliate) {
      return NextResponse.json(
        { error: 'Affiliate products are purchased on partner platforms' },
        { status: 400 }
      )
    }

    const resolvedCreatorId = product.creator_id
    if (creator_id && creator_id !== resolvedCreatorId) {
      return NextResponse.json({ error: 'Creator mismatch' }, { status: 400 })
    }

    // 3. CALCULATE AMOUNTS
    let baseAmount = product.price
    let selectedVariant = null
    if (product.variants && product.variants[variant_index]?.price) {
      baseAmount = product.variants[variant_index].price
      selectedVariant = product.variants[variant_index]
    } else if (product.variants && product.variants[variant_index]) {
      selectedVariant = product.variants[variant_index]
    }

    const computeDiscount = (
      amountInPaisa: number,
      coupon: {
        discount_type: 'percent' | 'fixed'
        discount_value: number
        max_discount_amount?: number | null
      }
    ) => {
      let calculatedDiscount = 0
      if (coupon.discount_type === 'percent') {
        calculatedDiscount = Math.round((amountInPaisa * coupon.discount_value) / 100)
        if (coupon.max_discount_amount) {
          calculatedDiscount = Math.min(calculatedDiscount, coupon.max_discount_amount)
        }
      } else {
        calculatedDiscount = coupon.discount_value
      }

      return Math.min(calculatedDiscount, Math.max(0, amountInPaisa - 100))
    }

    let appliedCoupon: { id: string; code: string } | null = null
    let discountAmount = 0
    const normalizedCouponCode = asText(coupon_code, 40)?.toUpperCase()

    if (normalizedCouponCode) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('creator_id', resolvedCreatorId)
        .eq('code', normalizedCouponCode)
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

      discountAmount = computeDiscount(baseAmount, coupon)
      appliedCoupon = { id: coupon.id, code: coupon.code }
    }

    const amount = Math.max(100, baseAmount - discountAmount)
    const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT / 100)

    // 4. GENERATE ORDER NUMBER DATE PREFIX
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')

    // 5. HANDLE DIGITAL PRODUCT DOWNLOAD URL
    let digitalDownloadUrl = null
    if (product.type === 'digital' && product.digital_file_url) {
      const { data: signedUrl } = await supabase.storage
        .from('digital-files')
        .createSignedUrl(product.digital_file_url, 60 * 60 * 24 * 7)
      digitalDownloadUrl = signedUrl?.signedUrl || null
    }

    // Handle multiple digital file URLs (for downloads/template libraries)
    const digitalDownloadUrls: string[] = []
    if (product.type === 'digital' && product.digital_file_urls?.length > 0) {
      for (const filePath of product.digital_file_urls) {
        const { data: signedUrl } = await supabase.storage
          .from('digital-files')
          .createSignedUrl(filePath, 60 * 60 * 24 * 7)
        if (signedUrl?.signedUrl) digitalDownloadUrls.push(signedUrl.signedUrl)
      }
    }

    // 6. CREATE ORDER IN DATABASE
    const orderPayload = {
      creator_id: resolvedCreatorId,
      product_id,
      variant: selectedVariant,
      quantity: 1,
      buyer_name,
      buyer_phone,
      buyer_email,
      shipping_address: {
        ...(shippingPayload || {}),
        _coupon_code: normalizedCouponCode || null,
        _discount_amount: discountAmount || 0,
        _original_amount: baseAmount,
      },
      amount,
      platform_fee: platformFee,
      razorpay_order_id,
      razorpay_payment_id,
      payment_status: 'paid',
      status: 'new',
      digital_download_url: digitalDownloadUrl,
    }

    let order: { id: string; order_number: string } | null = null
    let orderError: unknown = null

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: latestOrderRows, error: latestOrderError } = await supabase
        .from('orders')
        .select('order_number')
        .like('order_number', `LMS-${today}-%`)
        .order('order_number', { ascending: false })
        .limit(1)

      if (latestOrderError) {
        orderError = latestOrderError
        break
      }

      const latestOrderNumber = latestOrderRows?.[0]?.order_number
      const latestSequenceMatch =
        typeof latestOrderNumber === 'string' ? latestOrderNumber.match(/-(\d+)$/) : null
      const nextSequence = latestSequenceMatch ? Number(latestSequenceMatch[1]) + 1 : 1
      const orderNumber = `LMS-${today}-${String(nextSequence).padStart(3, '0')}`

      const { data: insertedOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          ...orderPayload,
        })
        .select('id, order_number')
        .single()

      if (!insertError && insertedOrder) {
        order = insertedOrder
        orderError = null
        break
      }

      orderError = insertError
      if (!isDuplicateOrderNumberError(insertError)) {
        break
      }
    }

    if (!order) {
      console.error('Order creation error:', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

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
        await supabase
          .from('coupons')
          .update({
            used_count: (couponRow.used_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', appliedCoupon.id)
      }
    }

    // 7. DECREMENT STOCK (if product has finite stock)
    if (product.stock !== null && product.stock !== undefined && product.stock > 0) {
      await supabase
        .from('products')
        .update({
          stock: Math.max(0, product.stock - 1),
          updated_at: new Date().toISOString(),
        })
        .eq('id', product_id)
    }

    // 8. PURCHASE ANALYTICS EVENT (best-effort)
    await supabase
      .from('analytics_events')
      .insert({
        creator_id: resolvedCreatorId,
        event_type: 'purchase',
        product_id,
        order_id: order.id,
        visitor_id: asText(visitor_id, 96),
        session_id: asText(session_id, 96),
        source: attributionMeta._source || 'direct',
        medium: attributionMeta._medium || 'direct',
        campaign: attributionMeta._campaign,
        referrer: attributionMeta._referrer,
        metadata: {
          order_number: order.order_number,
          backfilled: false,
        },
      })
      .then(({ error }) => {
        if (error) {
          console.warn('Purchase analytics insert skipped:', error.message)
        }
      })

    // 9. POST-PURCHASE ACTIONS based on digital subtype
    const digitalSubtype = product.digital_subtype

    // 9a. COURSE ENROLLMENT — enroll buyer after purchase
    let enrollmentId: string | null = null
    if (product.type === 'digital' && digitalSubtype === 'course' && buyer_email) {
      try {
        const { data: existing } = await supabase
          .from('course_enrollments')
          .select('id')
          .eq('product_id', product_id)
          .eq('buyer_email', buyer_email)
          .single()

        if (!existing) {
          const { data: enrollment } = await supabase
            .from('course_enrollments')
            .insert({
              product_id,
              order_id: order.id,
              buyer_email,
              buyer_phone: buyer_phone || '',
              lessons_completed: [],
            })
            .select('id')
            .single()
          enrollmentId = enrollment?.id || null
        } else {
          enrollmentId = existing.id
        }
      } catch (e) {
        console.error('Course enrollment failed (non-critical):', e)
      }
    }

    // 9b. BOOKING CREATION — create booking after paid coaching/calendar purchase
    let bookingId: string | null = null
    if (
      product.type === 'digital' &&
      (digitalSubtype === 'coaching' || digitalSubtype === 'calendar') &&
      booking_date && booking_time
    ) {
      try {
        const config = product.coaching_data || product.calendar_data
        const duration = config?.duration_minutes || 30
        const meetingLink = config?.meeting_link || null

        const { data: booking } = await supabase
          .from('bookings')
          .insert({
            product_id,
            creator_id: resolvedCreatorId,
            order_id: order.id,
            buyer_name: buyer_name || 'Customer',
            buyer_email: buyer_email || null,
            buyer_phone: buyer_phone || '',
            booking_date,
            booking_time,
            duration_minutes: duration,
            status: 'confirmed',
            meeting_link: meetingLink,
          })
          .select('id')
          .single()
        bookingId = booking?.id || null
      } catch (e) {
        console.error('Booking creation failed (non-critical):', e)
      }
    }

    console.log(`NEW ORDER: ${order.order_number} for creator ${resolvedCreatorId} — ₹${amount / 100}`)

    void sendOrderNotificationIfEligible({
      creatorId: resolvedCreatorId,
      orderNumber: order.order_number,
      buyerName: buyer_name || 'Customer',
      amountInPaisa: amount,
      upiReference: null,
    }).catch((error) => {
      console.error('Razorpay order notification error:', error)
    })

    // 10. RETURN SUCCESS with all relevant data
    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      digital_download_url: digitalDownloadUrl,
      digital_download_urls: digitalDownloadUrls.length > 0 ? digitalDownloadUrls : null,
      enrollment_id: enrollmentId,
      booking_id: bookingId,
      digital_subtype: digitalSubtype || null,
    })
  } catch (error: unknown) {
    console.error('Verify payment error:', error)
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 })
  }
}
