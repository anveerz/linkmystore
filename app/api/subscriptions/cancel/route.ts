import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRazorpay } from '@/lib/razorpay'
import { getCreatorPlanSnapshot } from '@/lib/plan-gate'

export async function POST() {
  try {
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

    const planSnapshot = await getCreatorPlanSnapshot(creator.id)
    const subscription = planSnapshot.subscription

    if (!subscription?.razorpay_subscription_id) {
      return NextResponse.json({ error: 'No recurring renewal found on this account.' }, { status: 400 })
    }

    try {
      const razorpay = getRazorpay()
      await razorpay.subscriptions.cancel(subscription.razorpay_subscription_id, false)
    } catch (error) {
      console.error('Razorpay subscription cancel error (non-critical):', error)
    }

    const now = new Date()
    await admin
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('creator_id', creator.id)

    const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : now

    return NextResponse.json({
      success: true,
      message:
        periodEnd > now
          ? `Recurring renewal cancelled. Pro stays active until ${periodEnd.toLocaleDateString('en-IN')}.`
          : 'Recurring renewal cancelled.',
    })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json({ error: 'Failed to cancel recurring renewal' }, { status: 500 })
  }
}
