import { NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/payments/checkout-session-service'

// Deprecated compatibility endpoint for legacy Razorpay create-order flow.
// New clients should use /api/checkout/create-session.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = await createCheckoutSession({
      product_id: body.product_id,
      creator_id: body.creator_id,
      variant_index: body.variant_index,
      buyer_name: body.buyer_name || 'Guest Buyer',
      buyer_phone: body.buyer_phone || '+910000000000',
      buyer_email: body.buyer_email || null,
      shipping_address: body.shipping_address || null,
      coupon_code: body.coupon_code || null,
      visitor_id: body.visitor_id || null,
      session_id: body.session_id || null,
      traffic_source: body.traffic_source || null,
      traffic_medium: body.traffic_medium || null,
      traffic_campaign: body.traffic_campaign || null,
      traffic_referrer: body.traffic_referrer || null,
      customization_data: body.customization_data || null,
      booking_date: body.booking_date || null,
      booking_time: body.booking_time || null,
      duration_minutes: body.duration_minutes || null,
    })

    if (result.mode !== 'pg') {
      return NextResponse.json(
        {
          error: 'Payment gateway is not active yet for this store. Use manual UPI checkout mode.',
          required_mode: 'upi',
        },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      order_id: result.order_id,
      order_number: result.order_number,
      razorpay_order_id: result.gateway_order_id,
      amount: result.amount,
      key_id: result.key_id,
      provider: result.provider,
      coupon: result.coupon,
    })
  } catch (error) {
    console.error('Create order compatibility route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create gateway order' },
      { status: 400 }
    )
  }
}
