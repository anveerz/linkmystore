jest.mock('@/lib/payments/manual-upi-service', () => ({
  submitUpiProof: jest.fn(),
}))

const { submitUpiProof } = jest.requireMock('@/lib/payments/manual-upi-service') as {
  submitUpiProof: jest.Mock
}

describe('POST /api/checkout/confirm-upi (compatibility)', () => {
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

  it('validates order id input', async () => {
    const response = await post({})
    expect(response.status).toBe(400)
  })

  it('forwards payload to submitUpiProof and returns success', async () => {
    submitUpiProof.mockResolvedValue({
      success: true,
      message: 'Payment proof submitted. Seller verification is pending.',
    })

    const response = await post({
      order_id: 'order_1',
      upi_reference_number: '1234 5678 9012',
      payment_screenshot_url: 'https://img.example/proof.png',
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(submitUpiProof).toHaveBeenCalledWith({
      orderId: 'order_1',
      upiReferenceNumber: '1234 5678 9012',
      paymentScreenshotUrl: 'https://img.example/proof.png',
    })
  })

  it('maps service errors to 400', async () => {
    submitUpiProof.mockRejectedValue(new Error('Order is not eligible for manual UPI proof flow'))

    const response = await post({
      order_id: 'order_2',
      upi_reference_number: '123456789012',
    })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('not eligible')
  })
})
