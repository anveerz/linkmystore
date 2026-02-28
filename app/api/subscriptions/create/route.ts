import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRazorpay } from '@/lib/razorpay'
import { PRO_PLAN_PRICE } from '@/lib/constants'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: creator } = await admin
      .from('creators')
      .select('id, plan, store_name, email')
      .eq('user_id', user.id)
      .single()

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    if (creator.plan === 'pro') {
      return NextResponse.json({ error: 'Already on Pro plan' }, { status: 400 })
    }

    // Check for existing active subscription
    const { data: existingSub } = await admin
      .from('subscriptions')
      .select('id, status, razorpay_subscription_id')
      .eq('creator_id', creator.id)
      .single()

    if (existingSub?.status === 'active' && existingSub?.razorpay_subscription_id) {
      return NextResponse.json({ error: 'Active subscription already exists' }, { status: 400 })
    }

    const razorpay = getRazorpay()
    const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID
    if (!publicKey) {
      return NextResponse.json(
        { error: 'Payment gateway is not configured. Please contact support.' },
        { status: 500 }
      )
    }

    // Create a Razorpay subscription
    const planId = process.env.RAZORPAY_PRO_PLAN_ID
    const createOneTimeOrder = async () => {
      const order = await razorpay.orders.create({
        amount: PRO_PLAN_PRICE,
        currency: 'INR',
        receipt: `pro_${creator.id}_${Date.now()}`,
        notes: {
          creator_id: creator.id,
          plan: 'pro',
        },
      })

      return NextResponse.json({
        type: 'order',
        razorpay_order_id: order.id,
        amount: PRO_PLAN_PRICE,
        key: publicKey,
        prefill: {
          name: creator.store_name,
          email: creator.email || user.email,
        },
      })
    }

    if (!planId) {
      return createOneTimeOrder()
    }

    try {
      // Create Razorpay subscription if plan ID is configured
      const subscription = await razorpay.subscriptions.create({
        plan_id: planId,
        total_count: 12, // 12 months
        customer_notify: 1,
        notes: {
          creator_id: creator.id,
          plan: 'pro',
        },
      })

      // Upsert subscription record
      await admin.from('subscriptions').upsert({
        creator_id: creator.id,
        plan: 'pro',
        status: 'active',
        razorpay_subscription_id: subscription.id,
        razorpay_plan_id: planId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'creator_id' })

      return NextResponse.json({
        type: 'subscription',
        razorpay_subscription_id: subscription.id,
        key: publicKey,
        prefill: {
          name: creator.store_name,
          email: creator.email || user.email,
        },
      })
    } catch (subscriptionError) {
      // If subscription plan setup fails, fall back to one-time order so upgrade can still proceed.
      console.warn('Subscription create failed, falling back to one-time order:', subscriptionError)
      return createOneTimeOrder()
    }
  } catch (error) {
    console.error('Create subscription error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
