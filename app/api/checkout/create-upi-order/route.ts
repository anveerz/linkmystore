import { NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/payments/checkout-session-service'

// Deprecated compatibility endpoint for legacy UPI-only checkout clients.
// New clients should use /api/checkout/create-session.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = await createCheckoutSession({
      product_id: body.product_id,
      creator_id: body.creator_id,
      variant_index: body.variant_index,
      buyer_name: body.buyer_name,
      buyer_phone: body.buyer_phone,
      buyer_email: body.buyer_email,
      shipping_address: body.shipping_address,
      coupon_code: body.coupon_code,
      visitor_id: body.visitor_id,
      session_id: body.session_id,
      traffic_source: body.traffic_source,
      traffic_medium: body.traffic_medium,
      traffic_campaign: body.traffic_campaign,
      traffic_referrer: body.traffic_referrer,
      customization_data: body.customization_data,
      booking_date: body.booking_date,
      booking_time: body.booking_time,
      duration_minutes: body.duration_minutes,
    })

    if (result.mode !== 'upi') {
      return NextResponse.json(
        {
          error: 'Payment gateway is active for this store. Use unified checkout and gateway flow.',
          required_mode: 'pg',
        },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      order_id: result.order_id,
      order_number: result.order_number,
      upi_link: result.upi_link,
      upi_lite_link: result.upi_lite_link,
      qr_link: result.qr_link,
      amount: result.amount,
      amount_display: result.amount / 100,
      seller_upi_id: result.seller_upi_id,
      seller_name: result.seller_name,
      transaction_ref: result.transaction_ref,
      transaction_note: result.transaction_note,
      merchant_code: result.merchant_code,
      manual_confirmation_required: true,
    })
  } catch (error) {
    console.error('Create UPI order compatibility route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create UPI order' },
      { status: 400 }
    )
  }
}
