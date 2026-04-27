import { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_FEATURES, type PlanType } from '@/lib/constants'
import type { Subscription } from '@/types'

type SubscriptionStatus = Subscription['status']

const ACCESS_STATUSES: SubscriptionStatus[] = ['active', 'cancelled']

export interface PlanSnapshot {
  creatorId: string
  storedPlan: PlanType
  effectivePlan: PlanType
  subscription: Subscription | null
  currentPeriodEnd: string | null
  hasActiveProAccess: boolean
  hasLegacyRecurringSubscription: boolean
}

function hasFutureDate(value: string | undefined | null) {
  if (!value) return false
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.getTime() > Date.now()
}

function shouldTreatAsActivePro(subscription: Subscription | null) {
  if (!subscription?.current_period_end) {
    return false
  }

  return ACCESS_STATUSES.includes(subscription.status) && hasFutureDate(subscription.current_period_end)
}

async function applyPlanSync(
  creatorId: string,
  nextPlan: PlanType,
  subscription: Subscription | null
) {
  const admin = createAdminClient()
  const now = new Date().toISOString()

  await admin
    .from('creators')
    .update({
      plan: nextPlan,
      updated_at: now,
    })
    .eq('id', creatorId)

  await admin
    .from('store_settings')
    .update({
      show_branding: nextPlan === 'pro' ? false : true,
      seo_enabled: nextPlan === 'pro',
    })
    .eq('creator_id', creatorId)

  if (nextPlan === 'free' && subscription && subscription.current_period_end && !hasFutureDate(subscription.current_period_end)) {
    await admin
      .from('subscriptions')
      .update({
        status: 'expired',
        updated_at: now,
      })
      .eq('creator_id', creatorId)
  }
}

export async function getCreatorPlanSnapshot(creatorId: string): Promise<PlanSnapshot> {
  const admin = createAdminClient()

  const [{ data: creator }, { data: subscription }] = await Promise.all([
    admin.from('creators').select('plan').eq('id', creatorId).single(),
    admin.from('subscriptions').select('*').eq('creator_id', creatorId).single(),
  ])

  const storedPlan = (creator?.plan as PlanType) || 'free'
  const typedSubscription = (subscription as Subscription | null) || null
  const hasActiveProAccess = shouldTreatAsActivePro(typedSubscription)
  const hasLegacyRecurringSubscription = Boolean(
    typedSubscription?.razorpay_subscription_id &&
      ACCESS_STATUSES.includes(typedSubscription.status) &&
      hasFutureDate(typedSubscription.current_period_end)
  )

  let effectivePlan = storedPlan

  if (hasActiveProAccess) {
    effectivePlan = 'pro'
  } else if (
    storedPlan === 'pro' &&
    typedSubscription?.current_period_end &&
    !hasFutureDate(typedSubscription.current_period_end)
  ) {
    effectivePlan = 'free'
  }

  if (effectivePlan !== storedPlan) {
    await applyPlanSync(creatorId, effectivePlan, typedSubscription)
  }

  return {
    creatorId,
    storedPlan,
    effectivePlan,
    subscription: typedSubscription,
    currentPeriodEnd: typedSubscription?.current_period_end || null,
    hasActiveProAccess,
    hasLegacyRecurringSubscription,
  }
}

export async function getCreatorPlan(creatorId: string): Promise<PlanType> {
  const snapshot = await getCreatorPlanSnapshot(creatorId)
  return snapshot.effectivePlan
}

export async function canAddProduct(creatorId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const admin = createAdminClient()
  const [{ effectivePlan }, { count }] = await Promise.all([
    getCreatorPlanSnapshot(creatorId),
    admin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creatorId)
      .eq('is_active', true)
      .or('is_affiliate.is.null,is_affiliate.eq.false'),
  ])

  const features = PLAN_FEATURES[effectivePlan]
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
