import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      razorpay_subscription_id,
    } = body

    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET!
    let generatedSignature: string

    if (razorpay_subscription_id) {
      // Subscription payment verification
      generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(razorpay_payment_id + '|' + razorpay_subscription_id)
        .digest('hex')
    } else {
      // One-time order verification
      generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex')
    }

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

    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    // Update creator plan
    await admin
      .from('creators')
      .update({ plan: 'pro' })
      .eq('id', creator.id)

    // Upsert subscription record
    await admin.from('subscriptions').upsert({
      creator_id: creator.id,
      plan: 'pro',
      status: 'active',
      razorpay_subscription_id: razorpay_subscription_id || null,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: now.toISOString(),
    }, { onConflict: 'creator_id' })

    // Update store settings for Pro features
    await admin
      .from('store_settings')
      .update({
        show_branding: false,
        seo_enabled: true,
      })
      .eq('creator_id', creator.id)

    return NextResponse.json({ success: true, plan: 'pro' })
  } catch (error) {
    console.error('Verify subscription error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
