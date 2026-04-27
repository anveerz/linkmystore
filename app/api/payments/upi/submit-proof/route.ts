import { NextResponse } from 'next/server'
import { submitUpiProof } from '@/lib/payments/manual-upi-service'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const orderId = typeof body?.order_id === 'string' ? body.order_id : ''
    const upiReference = typeof body?.utr === 'string'
      ? body.utr
      : typeof body?.upi_reference_number === 'string'
        ? body.upi_reference_number
        : ''
    const screenshotUrl = typeof body?.payment_screenshot_url === 'string' ? body.payment_screenshot_url : ''

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    const result = await submitUpiProof({
      orderId,
      upiReferenceNumber: upiReference || null,
      paymentScreenshotUrl: screenshotUrl || null,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Submit UPI proof error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit UPI proof' },
      { status: 400 }
    )
  }
}
