import { NextResponse } from 'next/server'
import { getPaymentAccountByCreatorId } from '@/lib/payments/payment-account-service'
import { isPgActive } from '@/lib/payments/payment-policy-guards'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const creatorId = typeof body?.creator_id === 'string' ? body.creator_id.trim() : ''

    if (!creatorId) {
      return NextResponse.json({ error: 'creator_id is required' }, { status: 400 })
    }

    const account = await getPaymentAccountByCreatorId(creatorId)
    const pgActive = isPgActive(account)

    if (pgActive) {
      return NextResponse.json({
        success: true,
        mode: 'pg',
        message: 'Seller has active gateway checkout',
      })
    }

    if (account.upi_id && account.upi_fallback_enabled) {
      return NextResponse.json({
        success: true,
        mode: 'upi',
        message: 'Seller uses manual UPI mode',
      })
    }

    return NextResponse.json(
      {
        success: false,
        mode: null,
        error: 'Seller has no active payment method configured',
      },
      { status: 409 }
    )
  } catch (error) {
    console.error('Checkout mode resolve error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve checkout mode' },
      { status: 500 }
    )
  }
}
