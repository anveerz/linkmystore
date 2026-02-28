import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateUPIReferenceNumber } from '@/lib/upi'
import { sendOrderNotificationIfEligible } from '@/lib/notifications'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { order_id, upi_reference_number, payment_screenshot_url } = body

    if (!order_id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    if (!upi_reference_number && !payment_screenshot_url) {
      return NextResponse.json(
        { error: 'Please provide either a UPI reference number or payment screenshot' },
        { status: 400 }
      )
    }

    if (upi_reference_number && !validateUPIReferenceNumber(upi_reference_number)) {
      return NextResponse.json(
        { error: 'Invalid UPI reference number. It should be 12 digits.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, payment_method, payment_status, creator_id, product_id, order_number, buyer_name, amount')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.payment_method !== 'upi_direct') {
      return NextResponse.json({ error: 'This order does not use UPI payment' }, { status: 400 })
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json({ error: 'Payment already confirmed' }, { status: 400 })
    }

    // Update order with payment confirmation details
    const updateData: Record<string, unknown> = {
      payment_status: 'pending', // Still pending until seller verifies
    }

    if (upi_reference_number) {
      updateData.upi_reference_number = upi_reference_number.replace(/\s/g, '')
    }

    if (payment_screenshot_url) {
      updateData.payment_screenshot_url = payment_screenshot_url
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order_id)

    if (updateError) {
      console.error('Update order error:', updateError)
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    void sendOrderNotificationIfEligible({
      creatorId: order.creator_id,
      orderNumber: order.order_number,
      buyerName: order.buyer_name || 'Customer',
      amountInPaisa: order.amount || 0,
      upiReference: upi_reference_number ? upi_reference_number.replace(/\s/g, '') : null,
    }).catch((error) => {
      console.error('UPI confirmation notification error:', error)
    })

    return NextResponse.json({
      success: true,
      message: 'Payment details submitted. Seller will verify and confirm your order.',
    })
  } catch (error) {
    console.error('Confirm UPI error:', error)
    return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 })
  }
}
