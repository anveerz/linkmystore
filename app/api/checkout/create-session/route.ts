import { NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/payments/checkout-session-service'
import { paymentPolicyCopy } from '@/lib/copy/payment-policy'
import { V3_PAYMENT_FLAGS } from '@/lib/payments/constants'

export async function POST(request: Request) {
  if (!V3_PAYMENT_FLAGS.checkoutUnified) {
    return NextResponse.json(
      { error: 'Unified checkout is currently disabled by feature flag.' },
      { status: 503 }
    )
  }

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

    if (result.mode === 'pg') {
      return NextResponse.json({
        success: true,
        mode: 'pg',
        order_id: result.order_id,
        order_number: result.order_number,
        amount: result.amount,
        provider: result.provider,
        key_id: result.key_id,
        gateway_order_id: result.gateway_order_id,
        coupon: result.coupon,
        message: paymentPolicyCopy.pgConfirmation,
        provider_fee_disclosure: paymentPolicyCopy.gatewayFeeDisclosure,
      })
    }

    return NextResponse.json({
      success: true,
      mode: 'upi',
      order_id: result.order_id,
      order_number: result.order_number,
      amount: result.amount,
      upi_link: result.upi_link,
      upi_lite_link: result.upi_lite_link,
      qr_link: result.qr_link,
      seller_upi_id: result.seller_upi_id,
      seller_name: result.seller_name,
      transaction_ref: result.transaction_ref,
      transaction_note: result.transaction_note,
      merchant_code: result.merchant_code,
      coupon: result.coupon,
      manual_confirmation_required: true,
      message: paymentPolicyCopy.upiManualConfirmation,
      direct_payment_warning: paymentPolicyCopy.directPaymentWarning,
    })
  } catch (error) {
    console.error('Create checkout session error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 400 }
    )
  }
}
