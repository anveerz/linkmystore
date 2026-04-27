import {
  createBuyerDigitalDeliveryToken,
  createSellerManualUpiConfirmToken,
  verifyOrderActionToken,
} from '@/lib/payments/order-action-tokens'

describe('order action tokens', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ORDER_EMAIL_ACTION_SECRET: 'test-secret',
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('round-trips seller manual UPI confirmation tokens', () => {
    const token = createSellerManualUpiConfirmToken({
      orderId: 'order_1',
      creatorId: 'creator_1',
    })

    const payload = verifyOrderActionToken(token)

    expect(payload).toMatchObject({
      purpose: 'seller_manual_upi_confirm',
      orderId: 'order_1',
      creatorId: 'creator_1',
    })
  })

  it('round-trips buyer delivery tokens with normalized email', () => {
    const token = createBuyerDigitalDeliveryToken({
      orderId: 'order_2',
      buyerEmail: ' Buyer@Example.com ',
    })

    const payload = verifyOrderActionToken(token)

    expect(payload).toMatchObject({
      purpose: 'buyer_digital_delivery',
      orderId: 'order_2',
      buyerEmail: 'buyer@example.com',
    })
  })

  it('rejects expired tokens', () => {
    const token = createBuyerDigitalDeliveryToken({
      orderId: 'order_3',
      buyerEmail: 'buyer@example.com',
      expiresInSeconds: -10,
    })

    expect(() => verifyOrderActionToken(token)).toThrow('expired')
  })
})
