import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRazorpay } from '@/lib/razorpay'
import { isValidProPlanTerm, type ProPlanTermMonths } from '@/lib/constants'

function addMonths(baseDate: Date, months: ProPlanTermMonths) {
  const next = new Date(baseDate)
  next.setMonth(next.getMonth() + months)
  return next
}

function hasFutureDate(value: string | null | undefined) {
  if (!value) return false
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.getTime() > Date.now()
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || 'Verification failed')
  }
  return 'Verification failed'
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

    const body = await request.json()
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment verification details' }, { status: 400 })
    }

    const secret = process.env.RAZORPAY_KEY_SECRET
    if (!secret) {
      return NextResponse.json({ error: 'Razorpay secret is not configured yet.' }, { status: 500 })
    }

    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
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

    const { data: existingSubscription } = await admin
      .from('subscriptions')
      .select('*')
      .eq('creator_id', creator.id)
      .single()

    if (existingSubscription?.razorpay_payment_id === razorpay_payment_id) {
      return NextResponse.json({
        success: true,
        plan: 'pro',
        current_period_end: existingSubscription?.current_period_end || null,
      })
    }

    const razorpay = getRazorpay()
    const order = await razorpay.orders.fetch(razorpay_order_id)
    const notes = order.notes || {}

    if (notes.creator_id !== creator.id) {
      return NextResponse.json({ error: 'This payment does not belong to the current creator.' }, { status: 403 })
    }

    const rawMonths = Number(notes.term_months)
    if (!isValidProPlanTerm(rawMonths)) {
      return NextResponse.json({ error: 'Paid term information is missing from the order.' }, { status: 400 })
    }

    const amountPaid = Number(notes.amount_paid_paisa)
    if (!Number.isFinite(amountPaid) || amountPaid !== order.amount) {
      return NextResponse.json({ error: 'Paid amount could not be verified.' }, { status: 400 })
    }

    const now = new Date()
    const hasActiveProAccess = Boolean(
      existingSubscription?.current_period_end &&
        hasFutureDate(existingSubscription.current_period_end) &&
        (existingSubscription.status === 'active' || existingSubscription.status === 'cancelled')
    )

    const periodStart = hasActiveProAccess && existingSubscription?.current_period_end
      ? new Date(existingSubscription.current_period_end)
      : now
    const periodEnd = addMonths(periodStart, rawMonths)

    await admin
      .from('creators')
      .update({
        plan: 'pro',
        updated_at: now.toISOString(),
      })
      .eq('id', creator.id)

    await admin.from('subscriptions').upsert(
      {
        creator_id: creator.id,
        plan: 'pro',
        status: 'active',
        razorpay_subscription_id: null,
        razorpay_plan_id: null,
        razorpay_order_id,
        razorpay_payment_id,
        term_months: rawMonths,
        amount_paid_paisa: amountPaid,
        cancelled_at: null,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: 'creator_id' }
    )

    await admin
      .from('store_settings')
      .update({
        show_branding: false,
        seo_enabled: true,
      })
      .eq('creator_id', creator.id)

    return NextResponse.json({
      success: true,
      plan: 'pro',
      current_period_end: periodEnd.toISOString(),
    })
  } catch (error) {
    console.error('Verify Pro payment error:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
