import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCreatorPlanSnapshot } from '@/lib/plan-gate'

export async function GET() {
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

    const [planSnapshot, { count: productCount }] = await Promise.all([
      getCreatorPlanSnapshot(creator.id),
      admin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creator.id)
        .eq('is_active', true)
        .or('is_affiliate.is.null,is_affiliate.eq.false'),
    ])

    return NextResponse.json({
      plan: planSnapshot.effectivePlan,
      subscription: planSnapshot.subscription,
      productCount: productCount ?? 0,
      hasLegacyRecurringSubscription: planSnapshot.hasLegacyRecurringSubscription,
      currentPeriodEnd: planSnapshot.currentPeriodEnd,
    })
  } catch (error) {
    console.error('Get subscription status error:', error)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
