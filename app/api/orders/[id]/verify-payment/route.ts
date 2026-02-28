import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params

    // Verify the seller is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Get the creator
    const { data: creator } = await admin
      .from('creators')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    // Get the order and verify ownership
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, creator_id, payment_method, payment_status, payment_verified, product_id, amount, upi_reference_number, payment_screenshot_url')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.creator_id !== creator.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (order.payment_method !== 'upi_direct') {
      return NextResponse.json({ error: 'This order does not use UPI payment' }, { status: 400 })
    }

    if (order.payment_verified) {
      return NextResponse.json({ error: 'Payment already verified' }, { status: 400 })
    }

    if (!order.upi_reference_number && !order.payment_screenshot_url) {
      return NextResponse.json(
        { error: 'Buyer has not submitted UPI reference number or screenshot yet' },
        { status: 400 }
      )
    }

    // Mark payment as verified
    const { error: updateError } = await admin
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_verified: true,
        payment_verified_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Verify payment error:', updateError)
      return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
    }

    // Decrement stock if applicable
    const { data: product } = await admin
      .from('products')
      .select('stock')
      .eq('id', order.product_id)
      .single()

    if (product && product.stock !== null && product.stock !== undefined && product.stock > 0) {
      await admin
        .from('products')
        .update({
          stock: Math.max(0, product.stock - 1),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.product_id)
    }

    // Track purchase analytics event
    await admin.from('analytics_events').insert({
      creator_id: creator.id,
      event_type: 'purchase',
      product_id: order.product_id,
      order_id: orderId,
      metadata: { payment_method: 'upi_direct', verified_by: 'seller' },
    }).then(({ error }) => {
      if (error) console.warn('Analytics insert skipped:', error.message)
    })

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
    })
  } catch (error) {
    console.error('Verify payment error:', error)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}
