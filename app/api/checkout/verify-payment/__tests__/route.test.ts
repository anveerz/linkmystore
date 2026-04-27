import crypto from 'crypto'
import { SupabaseQueryMock } from '@/lib/__tests__/helpers/supabase-mock'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/payments/crypto', () => ({
  decryptSecret: jest.fn(),
}))

jest.mock('@/lib/payments/order-fulfillment', () => ({
  markOrderPaidAndFulfill: jest.fn(),
}))

const { createAdminClient } = jest.requireMock('@/lib/supabase/admin') as {
  createAdminClient: jest.Mock
}
const { decryptSecret } = jest.requireMock('@/lib/payments/crypto') as {
  decryptSecret: jest.Mock
}
const { markOrderPaidAndFulfill } = jest.requireMock('@/lib/payments/order-fulfillment') as {
  markOrderPaidAndFulfill: jest.Mock
}

describe('POST /api/checkout/verify-payment (compatibility)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    decryptSecret.mockReturnValue('gateway_secret')
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

  it('validates required gateway fields', async () => {
    createAdminClient.mockReturnValue(new SupabaseQueryMock())

    const response = await post({
      razorpay_order_id: 'order_1',
      razorpay_payment_id: 'pay_1',
    })

    expect(response.status).toBe(400)
  })

  it('returns 404 when no linked order exists', async () => {
    const db = new SupabaseQueryMock({
      orders: {
        selectSingle: [{ data: null }],
      },
    })
    createAdminClient.mockReturnValue(db)

    const response = await post({
      razorpay_order_id: 'order_missing',
      razorpay_payment_id: 'pay_missing',
      razorpay_signature: 'sig',
    })

    expect(response.status).toBe(404)
  })

  it('rejects invalid signatures', async () => {
    const db = new SupabaseQueryMock({
      orders: {
        selectSingle: [
          {
            data: {
              id: 'order_1',
              order_number: 'LMS-20260301-001',
              creator_id: 'creator_1',
              gateway_order_id: 'order_rzp_1',
              shipping_address: null,
            },
          },
        ],
      },
      payment_accounts: {
        selectSingle: [{ data: { pg_secret_encrypted: 'encrypted_secret' } }],
      },
    })
    createAdminClient.mockReturnValue(db)

    const response = await post({
      razorpay_order_id: 'order_rzp_1',
      razorpay_payment_id: 'pay_rzp_1',
      razorpay_signature: 'bad_signature',
    })

    expect(response.status).toBe(400)
  })

  it('delegates to fulfillment for valid compatibility verification', async () => {
    const orderId = 'order_db_1'
    const razorpayOrderId = 'order_rzp_1'
    const razorpayPaymentId = 'pay_rzp_1'
    const signature = crypto
      .createHmac('sha256', 'gateway_secret')
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

    const db = new SupabaseQueryMock({
      orders: {
        selectSingle: [
          {
            data: {
              id: orderId,
              order_number: 'LMS-20260301-005',
              creator_id: 'creator_1',
              gateway_order_id: razorpayOrderId,
              shipping_address: {},
            },
          },
        ],
        update: [{ data: null }],
      },
      payment_accounts: {
        selectSingle: [{ data: { pg_secret_encrypted: 'encrypted_secret' } }],
      },
    })
    createAdminClient.mockReturnValue(db)
    markOrderPaidAndFulfill.mockResolvedValue({
      alreadyPaid: false,
      order: {
        id: orderId,
        order_number: 'LMS-20260301-005',
      },
    })

    const response = await post({
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: signature,
      buyer_name: 'Buyer',
      buyer_phone: '+919876543210',
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.order_id).toBe(orderId)
    expect(markOrderPaidAndFulfill).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId,
        provider: 'razorpay',
        gatewayOrderId: razorpayOrderId,
        gatewayPaymentId: razorpayPaymentId,
      })
    )
  })
})
