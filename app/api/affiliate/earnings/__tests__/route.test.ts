import { SupabaseQueryMock } from '@/lib/__tests__/helpers/supabase-mock'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

const { createClient } = jest.requireMock('@/lib/supabase/server') as {
  createClient: jest.Mock
}
const { createAdminClient } = jest.requireMock('@/lib/supabase/admin') as {
  createAdminClient: jest.Mock
}

describe('GET /api/affiliate/earnings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  async function get() {
    const { GET } = await import('@/app/api/affiliate/earnings/route')
    return GET()
  }

  it('requires authenticated creator', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })
    createAdminClient.mockReturnValue(new SupabaseQueryMock())

    const response = await get()
    expect(response.status).toBe(401)
  })

  it('returns metrics and commission split based on creator plan', async () => {
    const nowMonthPrefix = new Date().toISOString().slice(0, 7)

    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    })
    createAdminClient.mockReturnValue(
      new SupabaseQueryMock({
        creators: { selectSingle: [{ data: { id: 'creator_1', plan: 'free' } }] },
        affiliate_clicks: {
          select: [
            {
              data: [
                { affiliate_platform: 'amazon', clicked_at: `${nowMonthPrefix}-15T10:00:00Z` },
                { affiliate_platform: 'flipkart', clicked_at: `${nowMonthPrefix}-16T10:00:00Z` },
              ],
            },
          ],
        },
        affiliate_earnings: {
          select: [
            {
              data: [
                {
                  id: 'e1',
                  period_month: nowMonthPrefix,
                  gross_commission: 1000,
                  platform_share: 500,
                  creator_share: 500,
                },
              ],
            },
          ],
        },
      })
    )

    const response = await get()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.plan).toBe('free')
    expect(body.commission_split.creator_share_ratio).toBe(0.5)
    expect(body.metrics.total_clicks).toBe(2)
    expect(body.metrics.total_gross_commission).toBe(1000)
  })
})
