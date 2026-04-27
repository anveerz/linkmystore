import { SupabaseQueryMock } from '@/lib/__tests__/helpers/supabase-mock'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/payments/order-action-tokens', () => ({
  verifyOrderActionToken: jest.fn(),
}))

const { createAdminClient } = jest.requireMock('@/lib/supabase/admin') as {
  createAdminClient: jest.Mock
}
const { verifyOrderActionToken } = jest.requireMock('@/lib/payments/order-action-tokens') as {
  verifyOrderActionToken: jest.Mock
}

describe('POST /api/orders/[id]/claim-digital-delivery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  async function post(orderId: string, body: Record<string, unknown>) {
    const { POST } = await import('@/app/api/orders/[id]/claim-digital-delivery/route')
    return POST(
      new Request(`http://localhost/api/orders/${orderId}/claim-digital-delivery`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id: orderId }) }
    )
  }

  it('returns signed download links on first claim', async () => {
    verifyOrderActionToken.mockReturnValue({
      purpose: 'buyer_digital_delivery',
      orderId: 'order_1',
      buyerEmail: 'buyer@example.com',
    })

    const db = new SupabaseQueryMock({
      orders: {
        selectSingle: [
          {
            data: {
              id: 'order_1',
              buyer_email: 'buyer@example.com',
              payment_status: 'paid',
              digital_downloaded: false,
              product_id: 'product_1',
            },
          },
        ],
        update: [{ data: null }],
      },
      products: {
        selectSingle: [
          {
            data: {
              id: 'product_1',
              title: 'Workbook',
              type: 'digital',
              digital_file_url: 'products/workbook.pdf',
              digital_file_urls: null,
              template_files: null,
              membership_data: null,
            },
          },
        ],
      },
    })
    db.setSignedUrlFactory((_bucket, path) => ({
      data: { signedUrl: `https://signed.example/${path}` },
      error: null,
    }))
    createAdminClient.mockReturnValue(db)

    const response = await post('order_1', { token: 'download-token' })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.files).toEqual([
      {
        name: 'workbook.pdf',
        url: 'https://signed.example/products/workbook.pdf',
      },
    ])

    const updateCall = db.calls.find((call) => call.table === 'orders' && call.operation === 'update')
    expect(updateCall?.payload).toMatchObject({
      digital_downloaded: true,
    })
  })

  it('blocks links that were already used', async () => {
    verifyOrderActionToken.mockReturnValue({
      purpose: 'buyer_digital_delivery',
      orderId: 'order_2',
      buyerEmail: 'buyer@example.com',
    })

    const db = new SupabaseQueryMock({
      orders: {
        selectSingle: [
          {
            data: {
              id: 'order_2',
              buyer_email: 'buyer@example.com',
              payment_status: 'paid',
              digital_downloaded: true,
              product_id: 'product_2',
            },
          },
        ],
      },
    })
    createAdminClient.mockReturnValue(db)

    const response = await post('order_2', { token: 'used-token' })
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toContain('already been used')
  })
})
