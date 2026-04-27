import { NextResponse } from 'next/server'
import { processRazorpayWebhook } from '@/lib/payments/payment-webhook-service'

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-razorpay-signature')
    const eventId = request.headers.get('x-razorpay-event-id')

    const result = await processRazorpayWebhook({
      rawBody,
      razorpaySignature: signature,
      headerEventId: eventId,
    })

    return NextResponse.json(result.body, { status: result.code })
  } catch (error) {
    console.error('Razorpay webhook processing error:', error)
    return NextResponse.json(
      { success: false, message: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

