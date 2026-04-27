import { SupabaseQueryMock } from '@/lib/__tests__/helpers/supabase-mock'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/affiliate', () => ({
  detectAffiliatePlatform: jest.fn(),
  fetchProductMetadata: jest.fn(),
  injectAffiliateTag: jest.fn(),
}))

const { createClient } = jest.requireMock('@/lib/supabase/server') as {
  createClient: jest.Mock
}
const { createAdminClient } = jest.requireMock('@/lib/supabase/admin') as {
  createAdminClient: jest.Mock
}
const { detectAffiliatePlatform, fetchProductMetadata, injectAffiliateTag } = jest.requireMock('@/lib/affiliate') as {
  detectAffiliatePlatform: jest.Mock
  fetchProductMetadata: jest.Mock
  injectAffiliateTag: jest.Mock
}

describe('POST /api/products/affiliate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  async function post(body: Record<string, unknown>) {
    const { POST } = await import('@/app/api/products/affiliate/route')
    return POST(
      new Request('http://localhost/api/products/affiliate', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    )
  }

  it('requires authenticated user and valid URL', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })
    createAdminClient.mockReturnValue(new SupabaseQueryMock())

    const unauth = await post({ url: 'https://amazon.in/dp/123' })
    expect(unauth.status).toBe(401)

    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    })
    detectAffiliatePlatform.mockReturnValue(null)

    const invalid = await post({ url: 'https://example.com/product' })
    expect(invalid.status).toBe(400)
  })

  it('creates affiliate product with tagged URL', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u2' } } }) },
    })
    detectAffiliatePlatform.mockReturnValue('amazon')
    fetchProductMetadata.mockResolvedValue({
      title: 'Sample Affiliate Product',
      description: 'Desc',
      image: 'https://img.example/p.png',
      priceInPaisa: 29900,
    })
    injectAffiliateTag.mockReturnValue('https://amazon.in/dp/123?tag=linkmystore-21')

    const db = new SupabaseQueryMock({
      creators: { selectSingle: [{ data: { id: 'creator_1', store_slug: 'my-store' } }] },
      products: {
        insertSingle: [
          {
            data: {
              id: 'prod_aff_1',
              title: 'Sample Affiliate Product',
              affiliate_platform: 'amazon',
              affiliate_tagged_url: 'https://amazon.in/dp/123?tag=linkmystore-21',
            },
          },
        ],
      },
    })
    createAdminClient.mockReturnValue(db)

    const response = await post({ url: 'https://amazon.in/dp/123' })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.product.affiliate_platform).toBe('amazon')
  })

  it('uses seller-reviewed fields when provided', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u3' } } }) },
    })
    detectAffiliatePlatform.mockReturnValue('amazon')
    fetchProductMetadata.mockResolvedValue(null)
    injectAffiliateTag.mockReturnValue('https://amazon.in/dp/456?tag=linkmystore-21')

    const db = new SupabaseQueryMock({
      creators: { selectSingle: [{ data: { id: 'creator_2', store_slug: 'seller' } }] },
      products: {
        insertSingle: [
          {
            data: {
              id: 'prod_aff_2',
              title: 'Reviewed Product',
              affiliate_platform: 'amazon',
              affiliate_tagged_url: 'https://amazon.in/dp/456?tag=linkmystore-21',
            },
          },
        ],
      },
    })
    createAdminClient.mockReturnValue(db)

    const response = await post({
      url: 'https://amazon.in/dp/456',
      title: 'Reviewed Product',
      description: 'Reviewed description',
      image_url: 'https://img.example/reviewed.png',
      price_in_paisa: 29900,
    })

    expect(response.status).toBe(200)

    const insertCall = db.calls.find((call) => call.table === 'products' && call.operation === 'insertSingle')
    expect(insertCall).toBeDefined()
    expect(insertCall?.payload).toMatchObject({
      title: 'Reviewed Product',
      description: 'Reviewed description',
      price: 29900,
      images: ['https://img.example/reviewed.png'],
      is_affiliate: true,
    })
  })
})
