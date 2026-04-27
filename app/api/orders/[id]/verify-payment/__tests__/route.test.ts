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

const { createClient } = jest.requireMock('@/lib/supabase/server') as {
  createClient: jest.Mock
}
const { createAdminClient } = jest.requireMock('@/lib/supabase/admin') as {
  createAdminClient: jest.Mock
}
const { verifyUpiOrderBySeller } = jest.requireMock('@/lib/payments/manual-upi-service') as {
  verifyUpiOrderBySeller: jest.Mock
}
const { verifyOrderActionToken } = jest.requireMock('@/lib/payments/order-action-tokens') as {
  verifyOrderActionToken: jest.Mock
}

describe('POST /api/orders/[id]/verify-payment (compatibility)', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  async function post(orderId: string, body: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
    const { POST } = await import('@/app/api/orders/[id]/verify-payment/route')
    return POST(
      new Request(`http://localhost/api/orders/${orderId}/verify-payment`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id: orderId }) }
    )
  }

  it('requires authenticated seller when not using automation token', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })
    createAdminClient.mockReturnValue(new SupabaseQueryMock())

    const response = await post('o1')
    expect(response.status).toBe(401)
  })

  it('supports automation mode with valid token and creator id', async () => {
    process.env.V3_AUTOMATION_TOKEN = 'secret_token'
    verifyUpiOrderBySeller.mockResolvedValue({ success: true, message: 'ok' })

    const response = await post(
      'o2',
      { creator_id: 'creator_1', upi_reference_number: '123456789012' },
      { 'x-lms-automation-token': 'secret_token' }
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(verifyUpiOrderBySeller).toHaveBeenCalledWith({
      orderId: 'o2',
      creatorId: 'creator_1',
      upiReferenceNumber: '123456789012',
    })
  })

  it('supports seller email confirmation tokens without requiring auth', async () => {
    verifyOrderActionToken.mockReturnValue({
      purpose: 'seller_manual_upi_confirm',
      orderId: 'o_email',
      creatorId: 'creator_email',
    })
    verifyUpiOrderBySeller.mockResolvedValue({ success: true, message: 'verified via email' })

    const response = await post('o_email', {
      email_confirmation_token: 'email-token',
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(verifyOrderActionToken).toHaveBeenCalledWith('email-token')
    expect(verifyUpiOrderBySeller).toHaveBeenCalledWith({
      orderId: 'o_email',
      creatorId: 'creator_email',
      upiReferenceNumber: null,
    })
    expect(createClient).not.toHaveBeenCalled()
  })

  it('rejects automation mode when creator id is missing', async () => {
    process.env.V3_AUTOMATION_TOKEN = 'secret_token'

    const response = await post(
      'o3',
      {},
      { 'x-lms-automation-token': 'secret_token' }
    )

    expect(response.status).toBe(400)
  })

  it('uses authenticated creator id for non-automation verification', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user_1' } } }) },
    })

    const db = new SupabaseQueryMock({
      creators: {
        selectSingle: [{ data: { id: 'creator_42' } }],
      },
    })
    createAdminClient.mockReturnValue(db)
    verifyUpiOrderBySeller.mockResolvedValue({ success: true, message: 'verified' })

    const response = await post('o4', { upi_reference_number: '999988887777' })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(verifyUpiOrderBySeller).toHaveBeenCalledWith({
      orderId: 'o4',
      creatorId: 'creator_42',
      upiReferenceNumber: '999988887777',
    })
  })
})
