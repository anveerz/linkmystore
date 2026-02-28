import crypto from 'crypto'
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

describe('POST /api/checkout/verify-payment (Razorpay gateway)', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, RAZORPAY_KEY_SECRET: 'gateway_secret' }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  async function post(body: Record<string, unknown>) {
    const { POST } = await import('@/app/api/checkout/verify-payment/route')
    return POST(
      new Request('http://localhost/api/checkout/verify-payment', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    )
  }

  it('rejects invalid Razorpay signature', async () => {
    createAdminClient.mockReturnValue(new SupabaseQueryMock())

    const response = await post({
      razorpay_order_id: 'order_1',
      razorpay_payment_id: 'pay_1',
      razorpay_signature: 'bad_signature',
      product_id: 'p1',
    })

    expect(response.status).toBe(400)
  })

  it('blocks affiliate products from internal payment flow', async () => {
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update('order_aff|pay_aff')
      .digest('hex')

    createAdminClient.mockReturnValue(
      new SupabaseQueryMock({
        products: {
          selectSingle: [
            {
              data: {
                id: 'p_aff',
                creator_id: 'c1',
                is_affiliate: true,
                type: 'physical',
              },
            },
          ],
        },
      })
    )

    const response = await post({
      razorpay_order_id: 'order_aff',
      razorpay_payment_id: 'pay_aff',
      razorpay_signature: signature,
      product_id: 'p_aff',
    })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('Affiliate products')
  })

  it('creates paid order record for valid non-affiliate payment', async () => {
    const orderId = 'order_ok'
    const paymentId = 'pay_ok'
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    const db = new SupabaseQueryMock({
      products: {
        selectSingle: [
          {
            data: {
              id: 'product_1',
              creator_id: 'creator_1',
              price: 49900,
              type: 'physical',
              variants: [],
              stock: null,
              is_affiliate: false,
            },
          },
        ],
      },
      orders: {
        select: [{ data: [] }],
        insertSingle: [{ data: { id: 'order_db_1', order_number: 'LMS-20260227-001' } }],
      },
      analytics_events: {
        insert: [{ data: null }],
      },
    })
    createAdminClient.mockReturnValue(db)

    const response = await post({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      product_id: 'product_1',
      buyer_name: 'Buyer',
      buyer_phone: '9876543210',
      buyer_email: 'buyer@example.com',
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.order_id).toBe('order_db_1')

    const insertedOrder = db.calls.find((call) => call.table === 'orders' && call.operation === 'insertSingle')
    expect(insertedOrder?.payload).toEqual(
      expect.objectContaining({
        payment_status: 'paid',
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
      })
    )
  })
})
