import { SupabaseQueryMock } from '@/lib/__tests__/helpers/supabase-mock'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/notifications', () => ({
  sendOrderNotificationIfEligible: jest.fn().mockResolvedValue(null),
}))

const { createAdminClient } = jest.requireMock('@/lib/supabase/admin') as {
  createAdminClient: jest.Mock
}
const { sendOrderNotificationIfEligible } = jest.requireMock('@/lib/notifications') as {
  sendOrderNotificationIfEligible: jest.Mock
}

describe('POST /api/checkout/confirm-upi', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  async function post(body: Record<string, unknown>) {
    const { POST } = await import('@/app/api/checkout/confirm-upi/route')
    return POST(
      new Request('http://localhost/api/checkout/confirm-upi', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    )
  }

  it('validates required fields', async () => {
    createAdminClient.mockReturnValue(new SupabaseQueryMock())

    const missingOrder = await post({})
    expect(missingOrder.status).toBe(400)

    const missingProof = await post({ order_id: 'o1' })
    expect(missingProof.status).toBe(400)

    const invalidRef = await post({ order_id: 'o1', upi_reference_number: '123' })
    expect(invalidRef.status).toBe(400)
  })

  it('returns 404 when order does not exist', async () => {
    const db = new SupabaseQueryMock({
      orders: { selectSingle: [{ data: null, error: { message: 'not found' } }] },
    })
    createAdminClient.mockReturnValue(db)

    const response = await post({ order_id: 'missing', upi_reference_number: '123456789012' })
    expect(response.status).toBe(404)
  })

  it('keeps order pending until seller verifies payment', async () => {
    const db = new SupabaseQueryMock({
      orders: {
        selectSingle: [
          {
            data: {
              id: 'o2',
              payment_method: 'upi_direct',
              payment_status: 'pending',
              creator_id: 'c1',
              product_id: 'p1',
              order_number: 'LMS-20260227-001',
              buyer_name: 'Buyer',
              amount: 19900,
            },
          },
        ],
        update: [{ data: null }],
      },
    })
    createAdminClient.mockReturnValue(db)

    const response = await post({
      order_id: 'o2',
      upi_reference_number: '1234 5678 9012',
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)

    const updateCall = db.calls.find((call) => call.table === 'orders' && call.operation === 'update')
    expect(updateCall).toBeDefined()
    expect(updateCall?.payload).toEqual(
      expect.objectContaining({
        payment_status: 'pending',
        upi_reference_number: '123456789012',
      })
    )
    expect(sendOrderNotificationIfEligible).toHaveBeenCalled()
  })

  it('supports confirmation form re-submission while payment is still pending', async () => {
    const db = new SupabaseQueryMock({
      orders: {
        selectSingle: [
          {
            data: {
              id: 'o3',
              payment_method: 'upi_direct',
              payment_status: 'pending',
              creator_id: 'c1',
              product_id: 'p1',
              order_number: 'LMS-20260227-002',
              buyer_name: 'Buyer',
              amount: 9900,
            },
          },
          {
            data: {
              id: 'o3',
              payment_method: 'upi_direct',
              payment_status: 'pending',
              creator_id: 'c1',
              product_id: 'p1',
              order_number: 'LMS-20260227-002',
              buyer_name: 'Buyer',
              amount: 9900,
            },
          },
        ],
        update: [{ data: null }, { data: null }],
      },
    })
    createAdminClient.mockReturnValue(db)

    const first = await post({
      order_id: 'o3',
      payment_screenshot_url: 'https://img.example/payment.png',
    })
    const second = await post({
      order_id: 'o3',
      upi_reference_number: '9999 8888 7777',
    })

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
  })

  it('rejects non-UPI orders and already-paid orders', async () => {
    const nonUpiDb = new SupabaseQueryMock({
      orders: {
        selectSingle: [{ data: { id: 'o4', payment_method: 'razorpay', payment_status: 'paid' } }],
      },
    })
    createAdminClient.mockReturnValue(nonUpiDb)

    const nonUpi = await post({ order_id: 'o4', upi_reference_number: '123456789012' })
    expect(nonUpi.status).toBe(400)

    const paidDb = new SupabaseQueryMock({
      orders: {
        selectSingle: [{ data: { id: 'o5', payment_method: 'upi_direct', payment_status: 'paid' } }],
      },
    })
    createAdminClient.mockReturnValue(paidDb)

    const paid = await post({ order_id: 'o5', upi_reference_number: '123456789012' })
    expect(paid.status).toBe(400)
  })
})
