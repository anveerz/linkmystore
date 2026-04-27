import { SupabaseQueryMock } from '@/lib/__tests__/helpers/supabase-mock'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/email', () => ({
  sendBuyerDigitalDeliveryEmail: jest.fn(),
  sendCounsellingBookingEmail: jest.fn(),
}))

jest.mock('@/lib/notifications', () => ({
  sendOrderNotificationIfEligible: jest.fn(),
}))

jest.mock('@/lib/payments/digital-delivery', () => ({
  buildBuyerDigitalDeliveryAccessUrl: jest.fn(),
  isInstantDigitalDeliveryProduct: jest.fn(),
}))

const { createAdminClient } = jest.requireMock('@/lib/supabase/admin') as {
  createAdminClient: jest.Mock
}
const { sendBuyerDigitalDeliveryEmail } = jest.requireMock('@/lib/email') as {
  sendBuyerDigitalDeliveryEmail: jest.Mock
}
const { sendOrderNotificationIfEligible } = jest.requireMock('@/lib/notifications') as {
  sendOrderNotificationIfEligible: jest.Mock
}
const { buildBuyerDigitalDeliveryAccessUrl, isInstantDigitalDeliveryProduct } = jest.requireMock(
  '@/lib/payments/digital-delivery'
) as {
  buildBuyerDigitalDeliveryAccessUrl: jest.Mock
  isInstantDigitalDeliveryProduct: jest.Mock
}

describe('order fulfillment', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    sendBuyerDigitalDeliveryEmail.mockResolvedValue({ sent: true, id: 'email_1' })
    sendOrderNotificationIfEligible.mockResolvedValue(null)
    isInstantDigitalDeliveryProduct.mockReturnValue(true)
    buildBuyerDigitalDeliveryAccessUrl.mockReturnValue(
      'https://linkmystore.in/orders/download/order_1?token=download-token'
    )
  })

  it('marks digital download orders paid and sends buyer delivery email', async () => {
    const db = new SupabaseQueryMock({
      orders: {
        selectSingle: [
          {
            data: {
              id: 'order_1',
              order_number: 'LMS-20260313-010',
              creator_id: 'creator_1',
              product_id: 'product_1',
              payment_method: 'upi_manual',
              payment_status: 'awaiting_manual_proof',
              payment_verified: false,
              buyer_name: 'Buyer One',
              buyer_phone: '9999999999',
              buyer_email: 'buyer@example.com',
              amount: 49900,
              shipping_address: null,
              status: 'new',
              upi_reference_number: null,
              payment_screenshot_url: null,
              razorpay_order_id: null,
              razorpay_payment_id: null,
              gateway_order_id: null,
              gateway_payment_id: null,
              gateway_provider: null,
              digital_download_url: null,
            },
          },
          {
            data: {
              id: 'order_1',
              order_number: 'LMS-20260313-010',
              creator_id: 'creator_1',
              product_id: 'product_1',
              payment_method: 'upi_manual',
              payment_status: 'paid',
              payment_verified: true,
              buyer_name: 'Buyer One',
              buyer_phone: '9999999999',
              buyer_email: 'buyer@example.com',
              amount: 49900,
              shipping_address: null,
              status: 'new',
              upi_reference_number: '123456789012',
              payment_screenshot_url: null,
              razorpay_order_id: null,
              razorpay_payment_id: null,
              gateway_order_id: null,
              gateway_payment_id: null,
              gateway_provider: null,
              digital_download_url: 'https://linkmystore.in/orders/download/order_1?token=download-token',
            },
          },
        ],
        update: [
          {
            data: {
              id: 'order_1',
              order_number: 'LMS-20260313-010',
              creator_id: 'creator_1',
              product_id: 'product_1',
              payment_method: 'upi_manual',
              payment_status: 'paid',
              payment_verified: true,
              buyer_name: 'Buyer One',
              buyer_phone: '9999999999',
              buyer_email: 'buyer@example.com',
              amount: 49900,
              shipping_address: null,
              status: 'new',
              upi_reference_number: '123456789012',
              payment_screenshot_url: null,
              razorpay_order_id: null,
              razorpay_payment_id: null,
              gateway_order_id: null,
              gateway_payment_id: null,
              gateway_provider: null,
              digital_download_url: 'https://linkmystore.in/orders/download/order_1?token=download-token',
            },
          },
        ],
      },
      products: {
        selectSingle: [
          {
            data: {
              id: 'product_1',
              creator_id: 'creator_1',
              title: 'Starter Template Pack',
              type: 'digital',
              digital_subtype: 'download',
              digital_file_url: 'templates/starter-pack.pdf',
              digital_file_urls: null,
              template_files: null,
              membership_data: null,
              stock: null,
              coaching_data: null,
              calendar_data: null,
            },
          },
        ],
      },
      creators: {
        selectSingle: [{ data: { store_name: 'LinkMyStore' } }],
      },
    })
    createAdminClient.mockReturnValue(db)

    const { markOrderPaidAndFulfill } = await import('@/lib/payments/order-fulfillment')
    const result = await markOrderPaidAndFulfill({
      orderId: 'order_1',
      provider: 'none',
      upiReference: '123456789012',
      verifiedBy: 'seller',
    })

    expect(result.alreadyPaid).toBe(false)

    const updateCall = db.calls.find(
      (call) => call.table === 'orders' && call.operation === 'selectSingle' && !!call.payload
    )
    expect(updateCall?.payload).toMatchObject({
      payment_status: 'paid',
      payment_verified: true,
      upi_reference_number: '123456789012',
      digital_download_url: 'https://linkmystore.in/orders/download/order_1?token=download-token',
    })

    expect(sendBuyerDigitalDeliveryEmail).toHaveBeenCalledWith({
      to: 'buyer@example.com',
      buyerName: 'Buyer One',
      storeName: 'LinkMyStore',
      orderNumber: 'LMS-20260313-010',
      productTitle: 'Starter Template Pack',
      accessUrl: 'https://linkmystore.in/orders/download/order_1?token=download-token',
    })
  })

  it('returns early for orders that are already paid', async () => {
    const db = new SupabaseQueryMock({
      orders: {
        selectSingle: [
          {
            data: {
              id: 'order_2',
              order_number: 'LMS-20260313-011',
              creator_id: 'creator_1',
              product_id: 'product_2',
              payment_method: 'pg_razorpay',
              payment_status: 'paid',
              payment_verified: true,
              buyer_name: 'Buyer Two',
              buyer_phone: '9999999999',
              buyer_email: 'buyer2@example.com',
              amount: 99900,
              shipping_address: null,
              status: 'new',
              upi_reference_number: null,
              payment_screenshot_url: null,
              razorpay_order_id: 'order_rzp',
              razorpay_payment_id: 'pay_rzp',
              gateway_order_id: 'order_rzp',
              gateway_payment_id: 'pay_rzp',
              gateway_provider: 'razorpay',
              digital_download_url: null,
            },
          },
        ],
      },
    })
    createAdminClient.mockReturnValue(db)

    const { markOrderPaidAndFulfill } = await import('@/lib/payments/order-fulfillment')
    const result = await markOrderPaidAndFulfill({
      orderId: 'order_2',
      provider: 'razorpay',
    })

    expect(result.alreadyPaid).toBe(true)
    expect(sendBuyerDigitalDeliveryEmail).not.toHaveBeenCalled()
  })
})
