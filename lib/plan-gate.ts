import { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_FEATURES, type PlanType } from '@/lib/constants'

export async function getCreatorPlan(creatorId: string): Promise<PlanType> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('creators')
    .select('plan')
    .eq('id', creatorId)
    .single()

  return (data?.plan as PlanType) || 'free'
}

export async function canAddProduct(creatorId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const supabase = createAdminClient()

  const [{ data: creator }, { count }] = await Promise.all([
    supabase.from('creators').select('plan').eq('id', creatorId).single(),
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creatorId)
      .eq('is_active', true)
      .or('is_affiliate.is.null,is_affiliate.eq.false'),
  ])

  const plan = (creator?.plan as PlanType) || 'free'
  const features = PLAN_FEATURES[plan]
  const current = count ?? 0

  return {
    allowed: current < features.maxProducts,
    current,
    limit: features.maxProducts,
  }
}

export function canUseTheme(plan: PlanType, theme: string): boolean {
  return PLAN_FEATURES[plan].themes.includes(theme)
}

export function getPlanFeatures(plan: PlanType) {
  return PLAN_FEATURES[plan]
}

export function shouldShowBranding(plan: PlanType): boolean {
  return PLAN_FEATURES[plan].showBranding
}

export function getAffiliateCommissionSplit(plan: PlanType) {
  return PLAN_FEATURES[plan].affiliateCommissionSplit
}
