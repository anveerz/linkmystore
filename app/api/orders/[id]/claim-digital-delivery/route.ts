import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createClaimedDigitalDeliveryLinks,
  isInstantDigitalDeliveryProduct,
} from '@/lib/payments/digital-delivery'
import { verifyOrderActionToken } from '@/lib/payments/order-action-tokens'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const body = await request.json().catch(() => ({}))
    const token = typeof body?.token === 'string' ? body.token.trim() : ''

    if (!token) {
      return NextResponse.json({ error: 'Download token is required' }, { status: 400 })
    }

    const payload = verifyOrderActionToken(token)
    if (payload.purpose !== 'buyer_digital_delivery' || payload.orderId !== orderId) {
      return NextResponse.json({ error: 'Invalid download token' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { data: order } = await admin
      .from('orders')
      .select('id, buyer_email, payment_status, digital_downloaded, product_id')
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const normalizedBuyerEmail = (order.buyer_email || '').trim().toLowerCase()
    if (!normalizedBuyerEmail || normalizedBuyerEmail !== payload.buyerEmail) {
      return NextResponse.json({ error: 'Download token does not match this order' }, { status: 403 })
    }

    if (order.payment_status !== 'paid') {
      return NextResponse.json({ error: 'This order is not confirmed yet' }, { status: 409 })
    }

    if (order.digital_downloaded) {
      return NextResponse.json({ error: 'This download link has already been used' }, { status: 409 })
    }

    const { data: product } = await admin
      .from('products')
      .select('id, title, type, digital_file_url, digital_file_urls, template_files, membership_data')
      .eq('id', order.product_id)
      .single()

    if (!product || !isInstantDigitalDeliveryProduct(product)) {
      return NextResponse.json({ error: 'No instant download files are available for this order' }, { status: 400 })
    }

    const files = await createClaimedDigitalDeliveryLinks(product)
    if (files.length === 0) {
      return NextResponse.json({ error: 'Could not prepare download files' }, { status: 500 })
    }

    const { error: updateError } = await admin
      .from('orders')
      .update({
        digital_downloaded: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updateError) {
      throw new Error(updateError.message || 'Failed to lock download access')
    }

    return NextResponse.json({
      success: true,
      product_title: product.title,
      files,
    })
  } catch (error) {
    console.error('Claim digital delivery error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to claim digital delivery' },
      { status: 400 }
    )
  }
}
