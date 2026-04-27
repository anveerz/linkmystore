import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRazorpay } from '@/lib/razorpay'
import {
  getProPlanTermPricing,
  isValidProPlanTerm,
  type ProPlanTermMonths,
} from '@/lib/constants'

function normalizeCheckoutContact(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) continue
    const digits = value.replace(/\D/g, '')

    if (digits.length === 10) {
      return `+91${digits}`
    }

    if (digits.length === 12 && digits.startsWith('91')) {
      return `+${digits}`
    }

    if (digits.length > 10 && value.trim().startsWith('+')) {
      return `+${digits}`
    }
  }

  return undefined
}

function buildRazorpayReceipt(creatorId: string, months: ProPlanTermMonths) {
  const creatorSegment = creatorId.replace(/-/g, '').slice(0, 8) || 'creator'
  const timestampSegment = Date.now().toString(36)
  return `pro${months}m_${creatorSegment}_${timestampSegment}`.slice(0, 40)
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || 'Failed to start Pro upgrade')
  }
  if (error && typeof error === 'object') {
    const nestedError = (error as { error?: { description?: unknown; message?: unknown } }).error
    if (nestedError?.description) return String(nestedError.description)
    if (nestedError?.message) return String(nestedError.message)
  }
  return 'Failed to start Pro upgrade'
}

function hasFutureDate(value: string | null | undefined) {
  if (!value) return false
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.getTime() > Date.now()
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let months: unknown = 1
    try {
      const body = await request.json()
      months = body?.months ?? 1
    } catch {
      months = 1
    }

    if (!isValidProPlanTerm(months)) {
      return NextResponse.json({ error: 'Choose a valid Pro term before continuing.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: creator } = await admin
      .from('creators')
      .select('id, store_name, email, phone, mobile_number, whatsapp_number')
      .eq('user_id', user.id)
      .single()

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    const { data: existingSub } = await admin
      .from('subscriptions')
      .select('status, razorpay_subscription_id, current_period_end')
      .eq('creator_id', creator.id)
      .single()

    const hasLegacyRecurringSubscription = Boolean(
      existingSub?.razorpay_subscription_id &&
        (existingSub.status === 'active' || existingSub.status === 'cancelled') &&
        hasFutureDate(existingSub.current_period_end)
    )

    if (hasLegacyRecurringSubscription) {
      return NextResponse.json(
        { error: 'Cancel your existing recurring Pro renewal before switching to prepaid terms.' },
        { status: 400 }
      )
    }

    const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID
    if (!publicKey) {
      return NextResponse.json(
        { error: 'Razorpay public key is not configured yet.' },
        { status: 500 }
      )
    }

    const pricing = getProPlanTermPricing(months as ProPlanTermMonths)
    const razorpay = getRazorpay()
    const contact = normalizeCheckoutContact(
      creator.whatsapp_number,
      creator.mobile_number,
      creator.phone
    )
    const order = await razorpay.orders.create({
      amount: pricing.amount,
      currency: 'INR',
      receipt: buildRazorpayReceipt(creator.id, pricing.months),
      notes: {
        creator_id: creator.id,
        plan: 'pro',
        term_months: String(pricing.months),
        amount_paid_paisa: String(pricing.amount),
      },
    })

    return NextResponse.json({
      key: publicKey,
      razorpay_order_id: order.id,
      amount: pricing.amount,
      currency: 'INR',
      months: pricing.months,
      prefill: {
        name: creator.store_name,
        email: creator.email || user.email,
        ...(contact ? { contact } : {}),
      },
    })
  } catch (error) {
    console.error('Create Pro order error:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
