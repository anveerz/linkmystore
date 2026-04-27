import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptSecret } from '@/lib/payments/crypto'
import { markOrderPaidAndFulfill } from '@/lib/payments/order-fulfillment'

function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  const generated = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
  return generated === signature
}

// Deprecated compatibility endpoint.
// Primary flow is webhook confirmation via /api/payments/razorpay/webhook.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const razorpayOrderId = typeof body?.razorpay_order_id === 'string' ? body.razorpay_order_id : ''
    const razorpayPaymentId = typeof body?.razorpay_payment_id === 'string' ? body.razorpay_payment_id : ''
    const razorpaySignature = typeof body?.razorpay_signature === 'string' ? body.razorpay_signature : ''

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const { data: order } = await admin
      .from('orders')
      .select('id, order_number, creator_id, gateway_order_id, shipping_address')
      .or(`gateway_order_id.eq.${razorpayOrderId},razorpay_order_id.eq.${razorpayOrderId}`)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found for gateway order ID' }, { status: 404 })
    }

    const { data: account } = await admin
      .from('payment_accounts')
      .select('pg_secret_encrypted')
      .eq('creator_id', order.creator_id)
      .single()

    const secret = account?.pg_secret_encrypted ? decryptSecret(account.pg_secret_encrypted) : null
    if (!secret) {
      return NextResponse.json({ error: 'Gateway secret is not configured for this store' }, { status: 400 })
    }

    if (!verifyCheckoutSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, secret)) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    const shippingMeta =
      order.shipping_address && typeof order.shipping_address === 'object'
        ? { ...(order.shipping_address as Record<string, unknown>) }
        : {}

    if (typeof body?.booking_date === 'string' && body.booking_date.trim()) {
      shippingMeta._booking_date = body.booking_date.trim()
    }
    if (typeof body?.booking_time === 'string' && body.booking_time.trim()) {
      shippingMeta._booking_time = body.booking_time.trim()
    }
    if (body?.duration_minutes !== undefined && body?.duration_minutes !== null) {
      shippingMeta._booking_duration_minutes = Number(body.duration_minutes)
    }

    const preUpdatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof body?.buyer_name === 'string' && body.buyer_name.trim()) {
      preUpdatePayload.buyer_name = body.buyer_name.trim()
    }
    if (typeof body?.buyer_phone === 'string' && body.buyer_phone.trim()) {
      preUpdatePayload.buyer_phone = body.buyer_phone.trim()
    }
    if (typeof body?.buyer_email === 'string') {
      preUpdatePayload.buyer_email = body.buyer_email.trim() || null
    }

    if (Object.keys(shippingMeta).length > 0) {
      preUpdatePayload.shipping_address = shippingMeta
    }

    await admin
      .from('orders')
      .update(preUpdatePayload)
      .eq('id', order.id)

    const result = await markOrderPaidAndFulfill({
      orderId: order.id,
      provider: 'razorpay',
      gatewayOrderId: razorpayOrderId,
      gatewayPaymentId: razorpayPaymentId,
      verifiedBy: 'system',
    })

    return NextResponse.json({
      success: true,
      order_id: result.order.id,
      order_number: result.order.order_number,
      already_paid: result.alreadyPaid,
      message: 'Payment verified. Webhook remains source-of-truth for lifecycle updates.',
    })
  } catch (error) {
    console.error('Verify payment compatibility route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment verification failed' },
      { status: 500 }
    )
  }
}
