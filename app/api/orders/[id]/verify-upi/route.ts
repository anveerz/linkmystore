import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyOrderActionToken } from '@/lib/payments/order-action-tokens'
import { verifyUpiOrderBySeller } from '@/lib/payments/manual-upi-service'

const VALID_UPI_METHODS = ['upi_direct', 'upi_manual']

async function getOrderPreview(orderId: string) {
  const admin = createAdminClient()
  const { data: order } = await admin
    .from('orders')
    .select(
      'id, order_number, buyer_name, amount, payment_method, payment_status, upi_reference_number, payment_screenshot_url'
    )
    .eq('id', orderId)
    .single()

  if (!order) {
    return null
  }

  if (!VALID_UPI_METHODS.includes(order.payment_method || '')) {
    throw new Error('Order is not a UPI manual verification order')
  }

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    buyerName: order.buyer_name || 'Customer',
    amountInPaisa: order.amount || 0,
    paymentStatus: order.payment_status || 'pending',
    upiReference: order.upi_reference_number || null,
    paymentScreenshotUrl: order.payment_screenshot_url || null,
    alreadyVerified: order.payment_status === 'paid',
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const { searchParams } = new URL(request.url)
    const emailConfirmationToken =
      searchParams.get('token')?.trim() || searchParams.get('email_confirmation_token')?.trim() || ''

    if (!emailConfirmationToken) {
      return NextResponse.json({ error: 'Confirmation token is required' }, { status: 400 })
    }

    const payload = verifyOrderActionToken(emailConfirmationToken)
    if (payload.purpose !== 'seller_manual_upi_confirm' || payload.orderId !== orderId) {
      return NextResponse.json({ error: 'Invalid email confirmation token' }, { status: 403 })
    }

    const preview = await getOrderPreview(orderId)
    if (!preview) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(preview)
  } catch (error) {
    console.error('Get UPI verification preview error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load order preview' },
      { status: 400 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const body = await request.json().catch(() => ({}))
    const explicitReference =
      typeof body?.upi_reference_number === 'string'
        ? body.upi_reference_number.trim()
        : null
    const emailConfirmationToken =
      typeof body?.email_confirmation_token === 'string'
        ? body.email_confirmation_token.trim()
        : ''
    const automationCreatorId =
      typeof body?.creator_id === 'string' ? body.creator_id.trim() : ''

    const expectedAutomationToken = process.env.V3_AUTOMATION_TOKEN?.trim() || ''
    const providedAutomationToken = request.headers.get('x-lms-automation-token')?.trim() || ''
    const automationMode =
      !!expectedAutomationToken &&
      !!providedAutomationToken &&
      providedAutomationToken.length === expectedAutomationToken.length &&
      crypto.timingSafeEqual(
        Buffer.from(providedAutomationToken, 'utf8'),
        Buffer.from(expectedAutomationToken, 'utf8')
      )

    if (automationMode) {
      if (!automationCreatorId) {
        return NextResponse.json({ error: 'creator_id is required in automation mode' }, { status: 400 })
      }

      const result = await verifyUpiOrderBySeller({
        orderId,
        creatorId: automationCreatorId,
        upiReferenceNumber: explicitReference,
      })
      return NextResponse.json(result)
    }

    if (emailConfirmationToken) {
      const payload = verifyOrderActionToken(emailConfirmationToken)
      if (payload.purpose !== 'seller_manual_upi_confirm' || payload.orderId !== orderId) {
        return NextResponse.json({ error: 'Invalid email confirmation token' }, { status: 403 })
      }

      const result = await verifyUpiOrderBySeller({
        orderId,
        creatorId: payload.creatorId,
        upiReferenceNumber: explicitReference,
      })
      return NextResponse.json(result)
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: creator } = await admin
      .from('creators')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    const result = await verifyUpiOrderBySeller({
      orderId,
      creatorId: creator.id,
      upiReferenceNumber: explicitReference,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Verify UPI payment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify UPI payment' },
      { status: 400 }
    )
  }
}
