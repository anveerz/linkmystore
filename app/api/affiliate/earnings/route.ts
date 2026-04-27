import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_FEATURES, type PlanType } from '@/lib/constants'
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
      .select('id, plan')
      .eq('user_id', user.id)
      .single()

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    const planSnapshot = await getCreatorPlanSnapshot(creator.id)
    const plan = (planSnapshot.effectivePlan as PlanType) || 'free'
    const commissionSplit = PLAN_FEATURES[plan].affiliateCommissionSplit

    const [{ data: clicks }, { data: earnings }] = await Promise.all([
      admin
        .from('affiliate_clicks')
        .select('affiliate_platform, clicked_at')
        .eq('creator_id', creator.id)
        .order('clicked_at', { ascending: false })
        .limit(5000),
      admin
        .from('affiliate_earnings')
        .select('*')
        .eq('creator_id', creator.id)
        .order('period_month', { ascending: false })
        .limit(24),
    ])

    const clickRows = clicks || []
    const earningRows = earnings || []

    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const platformMap = new Map<string, number>()
    for (const row of clickRows) {
      const key = row.affiliate_platform || 'unknown'
      platformMap.set(key, (platformMap.get(key) || 0) + 1)
    }

    const platformBreakdown = Array.from(platformMap.entries())
      .map(([platform, clicksCount]) => ({ platform, clicks: clicksCount }))
      .sort((a, b) => b.clicks - a.clicks)

    const totals = earningRows.reduce(
      (acc, row) => {
        acc.gross += row.gross_commission || 0
        acc.platform += row.platform_share || 0
        acc.creator += row.creator_share || 0
        return acc
      },
      { gross: 0, platform: 0, creator: 0 }
    )

    return NextResponse.json({
      plan,
      commission_split: {
        creator_share_ratio: commissionSplit,
        platform_share_ratio: 1 - commissionSplit,
      },
      metrics: {
        total_clicks: clickRows.length,
        this_month_clicks: clickRows.filter((row) => String(row.clicked_at || '').startsWith(thisMonth)).length,
        total_gross_commission: totals.gross,
        total_platform_share: totals.platform,
        total_creator_share: totals.creator,
      },
      platform_breakdown: platformBreakdown,
      payouts: earningRows,
    })
  } catch (error) {
    console.error('Affiliate earnings fetch error:', error)
    return NextResponse.json({ error: 'Failed to load affiliate earnings' }, { status: 500 })
  }
}
