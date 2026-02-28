import { SupabaseQueryMock } from '@/lib/__tests__/helpers/supabase-mock'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

const { createAdminClient } = jest.requireMock('@/lib/supabase/admin') as {
  createAdminClient: jest.Mock
}

describe('POST /api/checkout/create-upi-order', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  async function post(body: Record<string, unknown>) {
    const { POST } = await import('@/app/api/checkout/create-upi-order/route')
    return POST(
      new Request('http://localhost/api/checkout/create-upi-order', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    )
  }

  it('validates required buyer name and phone', async () => {
    createAdminClient.mockReturnValue(new SupabaseQueryMock())

    const response = await post({ product_id: 'p1' })
    expect(response.status).toBe(400)
  })

  it('creates pending UPI order and returns deep link', async () => {
    const db = new SupabaseQueryMock({
      products: {
        selectSingle: [
          {
            data: {
              id: 'p1',
              creator_id: 'creator_1',
              price: 19900,
              type: 'physical',
              variants: [],
              is_active: true,
              is_affiliate: false,
            },
          },
        ],
      },
      creators: {
        selectSingle: [{ data: { store_name: 'Seller Store', bank_account: { upi_id: 'seller@upi' } } }],
      },
      orders: {
        select: [{ data: [] }],
        insertSingle: [{ data: { id: 'order_1', order_number: 'LMS-20260227-001' } }],
      },
      analytics_events: {
        insert: [{ data: null }],
      },
    })
    createAdminClient.mockReturnValue(db)

    const response = await post({
      product_id: 'p1',
      buyer_name: 'Buyer Name',
      buyer_phone: '9876543210',
      buyer_email: 'buyer@example.com',
      shipping_address: { line1: 'Street 1' },
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.order_id).toBe('order_1')
    expect(body.upi_link).toContain('upi://pay?')
    expect(body.seller_upi_id).toBe('seller@upi')

    const orderInsert = db.calls.find((call) => call.table === 'orders' && call.operation === 'insertSingle')
    expect(orderInsert?.payload).toEqual(
      expect.objectContaining({
        payment_method: 'upi_direct',
        payment_status: 'pending',
        payment_verified: false,
      })
    )
  })
})
