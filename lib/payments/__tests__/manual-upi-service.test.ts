import { SupabaseQueryMock } from '@/lib/__tests__/helpers/supabase-mock'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/email', () => ({
  sendSellerManualUpiVerificationEmail: jest.fn(),
}))

jest.mock('@/lib/notifications', () => ({
  sendOrderNotificationIfEligible: jest.fn(),
}))

jest.mock('@/lib/payments/order-action-tokens', () => ({
  createSellerManualUpiConfirmToken: jest.fn(),
  getAppBaseUrl: jest.fn(),
}))

jest.mock('@/lib/payments/order-fulfillment', () => ({
  markOrderPaidAndFulfill: jest.fn(),
}))

const { createAdminClient } = jest.requireMock('@/lib/supabase/admin') as {
  createAdminClient: jest.Mock
}
const { sendSellerManualUpiVerificationEmail } = jest.requireMock('@/lib/email') as {
  sendSellerManualUpiVerificationEmail: jest.Mock
}
const { sendOrderNotificationIfEligible } = jest.requireMock('@/lib/notifications') as {
  sendOrderNotificationIfEligible: jest.Mock
}
const { createSellerManualUpiConfirmToken, getAppBaseUrl } = jest.requireMock(
  '@/lib/payments/order-action-tokens'
) as {
  createSellerManualUpiConfirmToken: jest.Mock
  getAppBaseUrl: jest.Mock
}
const { markOrderPaidAndFulfill } = jest.requireMock('@/lib/payments/order-fulfillment') as {
  markOrderPaidAndFulfill: jest.Mock
}

describe('manual UPI service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    sendOrderNotificationIfEligible.mockResolvedValue(null)
    sendSellerManualUpiVerificationEmail.mockResolvedValue({ sent: true, id: 'email_1' })
    createSellerManualUpiConfirmToken.mockReturnValue('confirm-token')
    getAppBaseUrl.mockReturnValue('https://linkmystore.in')
  })

  it('submits proof and emails the seller confirmation link', async () => {
    const db = new SupabaseQueryMock({
      orders: {
        selectSingle: [
          {
            data: {
              id: 'order_1',
              payment_method: 'upi_manual',
              payment_status: 'pending',
              creator_id: 'creator_1',
              order_number: 'LMS-20260313-001',
              buyer_name: 'Buyer One',
              amount: 19900,
            },
          },
        ],
        update: [{ data: null }],
      },
      creators: {
        selectSingle: [
          {
            data: {
              id: 'creator_1',
              user_id: 'user_1',
              email: 'seller@example.com',
              store_name: 'LinkMyStore',
            },
          },
        ],
      },
    })
    ;(db as unknown as { auth: { admin: { getUserById: jest.Mock } } }).auth = {
      admin: { getUserById: jest.fn() },
    }
    createAdminClient.mockReturnValue(db)

    const { submitUpiProof } = await import('@/lib/payments/manual-upi-service')
    const result = await submitUpiProof({
      orderId: 'order_1',
      upiReferenceNumber: '1234 5678 9012',
      paymentScreenshotUrl: 'https://example.com/proof.png',
    })

    expect(result).toEqual({
      success: true,
      message: 'Payment proof submitted. Seller verification is pending.',
    })

    const updateCall = db.calls.find((call) => call.table === 'orders' && call.operation === 'update')
    expect(updateCall?.payload).toMatchObject({
      payment_status: 'awaiting_manual_proof',
      upi_reference_number: '123456789012',
      payment_screenshot_url: 'https://example.com/proof.png',
    })

    expect(sendSellerManualUpiVerificationEmail).toHaveBeenCalledWith({
      to: 'seller@example.com',
      storeName: 'LinkMyStore',
      orderNumber: 'LMS-20260313-001',
      buyerName: 'Buyer One',
      amountInPaisa: 19900,
      upiReference: '123456789012',
      paymentScreenshotUrl: 'https://example.com/proof.png',
      confirmOrderUrl: 'https://linkmystore.in/orders/confirm/order_1?token=confirm-token',
      dashboardOrderUrl: 'https://linkmystore.in/dashboard/orders/order_1',
    })
  })

  it('returns alreadyPaid when seller re-verifies an already paid order', async () => {
    const db = new SupabaseQueryMock({
      orders: {
        selectSingle: [
          {
            data: {
              id: 'order_2',
              creator_id: 'creator_2',
              payment_method: 'upi_manual',
              payment_status: 'paid',
              upi_reference_number: '123456789012',
              payment_screenshot_url: null,
            },
          },
        ],
      },
    })
    createAdminClient.mockReturnValue(db)

    const { verifyUpiOrderBySeller } = await import('@/lib/payments/manual-upi-service')
    const result = await verifyUpiOrderBySeller({
      orderId: 'order_2',
      creatorId: 'creator_2',
    })

    expect(result).toEqual({
      success: true,
      alreadyPaid: true,
      message: 'Payment already verified',
    })
    expect(markOrderPaidAndFulfill).not.toHaveBeenCalled()
  })
})
