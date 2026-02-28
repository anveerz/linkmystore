import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRazorpay } from '@/lib/razorpay'

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
      .select('id, plan')
      .eq('user_id', user.id)
      .single()

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    if (creator.plan !== 'pro') {
      return NextResponse.json({ error: 'Not on Pro plan' }, { status: 400 })
    }

    const { data: subscription } = await admin
      .from('subscriptions')
      .select('*')
      .eq('creator_id', creator.id)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Cancel Razorpay subscription if it exists
    if (subscription.razorpay_subscription_id) {
      try {
        const razorpay = getRazorpay()
        await razorpay.subscriptions.cancel(subscription.razorpay_subscription_id, false) // cancel_at_cycle_end = false
      } catch (e) {
        console.error('Razorpay subscription cancel error (non-critical):', e)
      }
    }

    // Update subscription status — plan stays 'pro' until period ends
    await admin.from('subscriptions').update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('creator_id', creator.id)

    // If no period end or period has passed, downgrade immediately
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end)
      : new Date()

    if (periodEnd <= new Date()) {
      await admin.from('creators').update({ plan: 'free' }).eq('id', creator.id)
      await admin.from('store_settings').update({
        show_branding: true,
        seo_enabled: false,
      }).eq('creator_id', creator.id)
    }

    return NextResponse.json({
      success: true,
      message: periodEnd > new Date()
        ? `Pro features active until ${periodEnd.toLocaleDateString('en-IN')}`
        : 'Downgraded to Free plan',
    })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
  }
}
