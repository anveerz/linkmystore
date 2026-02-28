import { SupabaseQueryMock } from '@/lib/__tests__/helpers/supabase-mock'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

const { createAdminClient } = jest.requireMock('@/lib/supabase/admin') as {
  createAdminClient: jest.Mock
}

describe('POST /api/affiliate/track-click', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  async function post(body: Record<string, unknown>) {
    const { POST } = await import('@/app/api/affiliate/track-click/route')
    return POST(
      new Request('http://localhost/api/affiliate/track-click', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    )
  }

  it('validates product_id', async () => {
    createAdminClient.mockReturnValue(new SupabaseQueryMock())
    const response = await post({})
    expect(response.status).toBe(400)
  })

  it('returns 400 for non-affiliate products', async () => {
    createAdminClient.mockReturnValue(
      new SupabaseQueryMock({
        products: {
          selectSingle: [{ data: { id: 'p1', is_active: true, is_affiliate: false, affiliate_tagged_url: null } }],
        },
      })
    )

    const response = await post({ product_id: 'p1' })
    expect(response.status).toBe(400)
  })

  it('tracks click and returns tagged redirect url', async () => {
    const db = new SupabaseQueryMock({
      products: {
        selectSingle: [
          {
            data: {
              id: 'p2',
              creator_id: 'c1',
              is_active: true,
              is_affiliate: true,
              affiliate_platform: 'amazon',
              affiliate_tagged_url: 'https://amazon.in/dp/xyz?tag=linkmystore-21',
            },
          },
        ],
      },
      affiliate_clicks: {
        insert: [{ data: null }],
      },
    })
    createAdminClient.mockReturnValue(db)

    const response = await post({ product_id: 'p2', visitor_id: 'v1', session_id: 's1' })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.redirect_url).toContain('tag=linkmystore-21')
    expect(body.platform).toBe('amazon')
  })
})
