import { SupabaseQueryMock } from '@/lib/__tests__/helpers/supabase-mock'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/payments/manual-upi-service', () => ({
  verifyUpiOrderBySeller: jest.fn(),
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

describe('GET /api/orders/[id]/verify-upi', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns email confirmation preview before seller confirms the order', async () => {
    verifyOrderActionToken.mockReturnValue({
      purpose: 'seller_manual_upi_confirm',
      orderId: 'order_123',
      creatorId: 'creator_123',
    })

    createAdminClient.mockReturnValue(
      new SupabaseQueryMock({
        orders: {
          selectSingle: [{
            data: {
              id: 'order_123',
              order_number: 'LMS-20260325-001',
              buyer_name: 'Buyer One',
              amount: 29900,
              payment_method: 'upi_manual',
              payment_status: 'awaiting_manual_proof',
              upi_reference_number: '123456789012',
              payment_screenshot_url: 'https://example.com/proof.png',
            },
          }],
        },
      })
    )

    const { GET } = await import('@/app/api/orders/[id]/verify-upi/route')
    const response = await GET(
      new Request('http://localhost/api/orders/order_123/verify-upi?token=email-token'),
      { params: Promise.resolve({ id: 'order_123' }) }
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(
      expect.objectContaining({
        orderNumber: 'LMS-20260325-001',
        buyerName: 'Buyer One',
        amountInPaisa: 29900,
        upiReference: '123456789012',
        paymentScreenshotUrl: 'https://example.com/proof.png',
        alreadyVerified: false,
      })
    )
  })
})
