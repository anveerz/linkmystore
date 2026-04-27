jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/affiliate', () => ({
  detectAffiliatePlatform: jest.fn(),
  fetchProductMetadata: jest.fn(),
}))

const { createClient } = jest.requireMock('@/lib/supabase/server') as {
  createClient: jest.Mock
}
const { detectAffiliatePlatform, fetchProductMetadata } = jest.requireMock('@/lib/affiliate') as {
  detectAffiliatePlatform: jest.Mock
  fetchProductMetadata: jest.Mock
}

describe('POST /api/products/affiliate/preview', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  async function post(body: Record<string, unknown>) {
    const { POST } = await import('@/app/api/products/affiliate/preview/route')
    return POST(
      new Request('http://localhost/api/products/affiliate/preview', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    )
  }

  it('requires authentication and supported platform URL', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })

    const unauth = await post({ url: 'https://amazon.in/dp/123' })
    expect(unauth.status).toBe(401)

    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    })
    detectAffiliatePlatform.mockReturnValue(null)

    const invalid = await post({ url: 'https://example.com/product' })
    expect(invalid.status).toBe(400)
  })

  it('returns preview payload with auto-fetched details', async () => {
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

    const response = await post({ url: 'https://amazon.in/dp/123' })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.preview.title).toBe('Sample Affiliate Product')
    expect(body.preview.price).toBe('299.00')
    expect(body.preview.platform).toBe('amazon')
    expect(body.preview.metadata_available).toBe(true)
  })

  it('returns a review draft even when metadata fetch is incomplete', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u3' } } }) },
    })
    detectAffiliatePlatform.mockReturnValue('flipkart')
    fetchProductMetadata.mockResolvedValue(null)

    const response = await post({ url: 'https://flipkart.com/p/123' })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.preview.platform).toBe('flipkart')
    expect(body.preview.title).toBe('Flipkart Product')
    expect(body.preview.metadata_available).toBe(false)
    expect(body.preview.warning).toContain('Review and complete the fields')
  })
})
