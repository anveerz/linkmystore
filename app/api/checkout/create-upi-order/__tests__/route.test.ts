jest.mock('@/lib/payments/checkout-session-service', () => ({
  createCheckoutSession: jest.fn(),
}))

const { createCheckoutSession } = jest.requireMock('@/lib/payments/checkout-session-service') as {
  createCheckoutSession: jest.Mock
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

  it('returns 409 when gateway mode is active', async () => {
    createCheckoutSession.mockResolvedValue({
      mode: 'pg',
      order_id: 'order_pg',
      order_number: 'LMS-20260301-001',
      amount: 19900,
      provider: 'razorpay',
      key_id: 'rzp_key',
      gateway_order_id: 'order_rzp_1',
      coupon: null,
    })

    const response = await post({
      product_id: 'p1',
      buyer_name: 'Buyer Name',
      buyer_phone: '9876543210',
    })
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.required_mode).toBe('pg')
  })

  it('returns compatibility UPI payload when fallback mode is selected', async () => {
    createCheckoutSession.mockResolvedValue({
      mode: 'upi',
      order_id: 'order_upi',
      order_number: 'LMS-20260301-002',
      amount: 9900,
      upi_link: 'upi://pay?pa=seller@upi',
      upi_lite_link: 'upi://pay?pa=seller@upi&cu=INR',
      qr_link: 'upi://pay?pa=seller@upi&pn=Seller&am=99.00&cu=INR',
      seller_upi_id: 'seller@upi',
      seller_name: 'Seller Store',
      transaction_ref: 'LMS-20260301-002',
      transaction_note: 'Order-LMS-20260301-002',
      merchant_code: '0000',
      coupon: null,
    })

    const response = await post({
      product_id: 'p1',
      buyer_name: 'Buyer Name',
      buyer_phone: '9876543210',
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.order_id).toBe('order_upi')
    expect(body.manual_confirmation_required).toBe(true)
    expect(body.seller_upi_id).toBe('seller@upi')
    expect(body.qr_link).toContain('pa=seller@upi')
  })

  it('maps service errors to 400', async () => {
    createCheckoutSession.mockRejectedValue(new Error('Buyer name and phone are required'))

    const response = await post({ product_id: 'p1' })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('required')
  })
})
