import { canAddProduct, canUseTheme, getAffiliateCommissionSplit, getCreatorPlan, shouldShowBranding } from '@/lib/plan-gate'
import { SupabaseQueryMock } from '@/lib/__tests__/helpers/supabase-mock'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

const { createAdminClient } = jest.requireMock('@/lib/supabase/admin') as {
  createAdminClient: jest.Mock
}

describe('phase 1 - plan gate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('blocks free creators after 5 active own products', async () => {
    const db = new SupabaseQueryMock({
      creators: { selectSingle: [{ data: { plan: 'free' } }] },
      products: { select: [{ data: null, count: 5 }] },
    })
    createAdminClient.mockReturnValue(db)

    const result = await canAddProduct('creator-1')

    expect(result).toEqual({ allowed: false, current: 5, limit: 5 })
  })

  it('allows pro creators with high product count', async () => {
    const db = new SupabaseQueryMock({
      creators: { selectSingle: [{ data: { plan: 'pro' } }] },
      products: { select: [{ data: null, count: 500 }] },
    })
    createAdminClient.mockReturnValue(db)

    const result = await canAddProduct('creator-2')

    expect(result.allowed).toBe(true)
    expect(result.current).toBe(500)
    expect(result.limit).toBe(Infinity)
  })

  it('defaults unknown creator plan to free', async () => {
    const db = new SupabaseQueryMock({
      creators: { selectSingle: [{ data: null }] },
    })
    createAdminClient.mockReturnValue(db)

    const plan = await getCreatorPlan('missing-creator')
    expect(plan).toBe('free')
  })

  it('enforces free vs pro feature toggles', () => {
    expect(canUseTheme('free', 'default')).toBe(true)
    expect(canUseTheme('free', 'dark')).toBe(false)
    expect(shouldShowBranding('free')).toBe(true)
    expect(shouldShowBranding('pro')).toBe(false)
    expect(getAffiliateCommissionSplit('free')).toBe(0.5)
    expect(getAffiliateCommissionSplit('pro')).toBe(1)
  })
})
