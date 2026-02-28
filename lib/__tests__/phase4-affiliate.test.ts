import { detectAffiliatePlatform, fetchProductMetadata, injectAffiliateTag } from '@/lib/affiliate'

describe('phase 4 - affiliate logic', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('detects affiliate platforms from URLs', () => {
    expect(detectAffiliatePlatform('https://www.amazon.in/dp/B0001')).toBe('amazon')
    expect(detectAffiliatePlatform('https://fkrt.it/abcd')).toBe('flipkart')
    expect(detectAffiliatePlatform('https://example.com/product')).toBeNull()
    expect(detectAffiliatePlatform('not-a-url')).toBeNull()
  })

  it('injects platform tag params and sanitized sub tag', () => {
    const url = injectAffiliateTag(
      'https://www.amazon.in/dp/B0001?ref=abc',
      'amazon',
      'seller 123/@tag'
    )

    expect(url).toContain('tag=linkmystore-21')
    expect(url).toContain('ascsubtag=seller123tag')
    expect(url).toContain('ref=abc')
  })

  it('fetches and parses metadata from HTML', async () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Test Product" />
          <meta property="og:description" content="A sample description" />
          <meta property="og:image" content="https://img.example/p.png" />
          <meta property="product:price:amount" content="499.00" />
        </head>
      </html>
    `

    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(html, { status: 200, headers: { 'Content-Type': 'text/html' } })
    )

    const metadata = await fetchProductMetadata('https://www.amazon.in/dp/B0001')

    expect(fetchMock).toHaveBeenCalled()
    expect(metadata).toEqual({
      title: 'Test Product',
      description: 'A sample description',
      image: 'https://img.example/p.png',
      priceInPaisa: 49900,
    })
  })

  it('returns null when affiliate metadata fetch fails', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'))
    await expect(fetchProductMetadata('https://www.amazon.in/dp/B0001')).resolves.toBeNull()
  })
})
