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

describe('POST /api/orders/[id]/verify-payment', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  async function post(orderId: string) {
    const { POST } = await import('@/app/api/orders/[id]/verify-payment/route')
    return POST(
      new Request(`http://localhost/api/orders/${orderId}/verify-payment`, { method: 'POST' }),
      { params: Promise.resolve({ id: orderId }) }
    )
  }

  it('requires authenticated seller', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })
    createAdminClient.mockReturnValue(new SupabaseQueryMock())

    const response = await post('o1')
    expect(response.status).toBe(401)
  })

  it('enforces seller ownership and payment proof requirement', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    })

    const wrongOwnerDb = new SupabaseQueryMock({
      creators: { selectSingle: [{ data: { id: 'creator_a' } }] },
      orders: {
        selectSingle: [
          {
            data: {
              id: 'o2',
              creator_id: 'creator_b',
              payment_method: 'upi_direct',
              payment_status: 'pending',
              payment_verified: false,
            },
          },
        ],
      },
    })
    createAdminClient.mockReturnValue(wrongOwnerDb)

    const wrongOwner = await post('o2')
    expect(wrongOwner.status).toBe(403)

    const noProofDb = new SupabaseQueryMock({
      creators: { selectSingle: [{ data: { id: 'creator_a' } }] },
      orders: {
        selectSingle: [
          {
            data: {
              id: 'o3',
              creator_id: 'creator_a',
              payment_method: 'upi_direct',
              payment_status: 'pending',
              payment_verified: false,
              product_id: 'p1',
              amount: 1000,
              upi_reference_number: null,
              payment_screenshot_url: null,
            },
          },
        ],
      },
    })
    createAdminClient.mockReturnValue(noProofDb)

    const noProof = await post('o3')
    expect(noProof.status).toBe(400)
  })

  it('marks payment paid, updates stock, and logs analytics on success', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    })

    const db = new SupabaseQueryMock({
      creators: { selectSingle: [{ data: { id: 'creator_1' } }] },
      orders: {
        selectSingle: [
          {
            data: {
              id: 'o4',
              creator_id: 'creator_1',
              payment_method: 'upi_direct',
              payment_status: 'pending',
              payment_verified: false,
              product_id: 'product_1',
              amount: 19900,
              upi_reference_number: '123456789012',
              payment_screenshot_url: null,
            },
          },
        ],
        update: [{ data: null }],
      },
      products: {
        selectSingle: [{ data: { stock: 4 } }],
        update: [{ data: null }],
      },
      analytics_events: {
        insert: [{ data: null }],
      },
    })
    createAdminClient.mockReturnValue(db)

    const response = await post('o4')
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)

    const orderUpdate = db.calls.find((call) => call.table === 'orders' && call.operation === 'update')
    expect(orderUpdate?.payload).toEqual(
      expect.objectContaining({
        payment_status: 'paid',
        payment_verified: true,
      })
    )

    const productUpdate = db.calls.find(
      (call) =>
        call.table === 'products' &&
        call.operation === 'update' &&
        typeof call.payload === 'object' &&
        (call.payload as { stock?: number }).stock === 3
    )
    expect(productUpdate).toBeDefined()

    const analyticsInsert = db.calls.find((call) => call.table === 'analytics_events' && call.operation === 'insert')
    expect(analyticsInsert).toBeDefined()
  })

  it('prevents duplicate verification of same UPI order', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    })
    createAdminClient.mockReturnValue(
      new SupabaseQueryMock({
        creators: { selectSingle: [{ data: { id: 'creator_1' } }] },
        orders: {
          selectSingle: [
            {
              data: {
                id: 'o5',
                creator_id: 'creator_1',
                payment_method: 'upi_direct',
                payment_status: 'paid',
                payment_verified: true,
                upi_reference_number: '123456789012',
                payment_screenshot_url: null,
              },
            },
          ],
        },
      })
    )

    const response = await post('o5')
    expect(response.status).toBe(400)
  })
})
