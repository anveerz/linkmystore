import { SupabaseQueryMock } from '@/lib/__tests__/helpers/supabase-mock'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/razorpay', () => ({
  getRazorpay: jest.fn(),
}))

jest.mock('@/lib/plan-gate', () => ({
  getCreatorPlanSnapshot: jest.fn(),
}))

const { createClient } = jest.requireMock('@/lib/supabase/server') as {
  createClient: jest.Mock
}
const { createAdminClient } = jest.requireMock('@/lib/supabase/admin') as {
  createAdminClient: jest.Mock
}
const { getRazorpay } = jest.requireMock('@/lib/razorpay') as {
  getRazorpay: jest.Mock
}
const { getCreatorPlanSnapshot } = jest.requireMock('@/lib/plan-gate') as {
  getCreatorPlanSnapshot: jest.Mock
}

describe('POST /api/subscriptions/create', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, NEXT_PUBLIC_RAZORPAY_KEY_ID: 'rzp_public_key' }
    getCreatorPlanSnapshot.mockResolvedValue({
      effectivePlan: 'free',
      hasLegacyRecurringSubscription: false,
      subscription: null,
      currentPeriodEnd: null,
    })
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('returns 401 when user is not authenticated', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })
    createAdminClient.mockReturnValue(new SupabaseQueryMock())

    const { POST } = await import('@/app/api/subscriptions/create/route')
    const response = await POST(new Request('http://localhost/api/subscriptions/create', { method: 'POST' }))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toContain('Unauthorized')
  })

  it('rejects invalid terms', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    })
    createAdminClient.mockReturnValue(new SupabaseQueryMock())

    const { POST } = await import('@/app/api/subscriptions/create/route')
    const response = await POST(
      new Request('http://localhost/api/subscriptions/create', {
        method: 'POST',
        body: JSON.stringify({ months: 2 }),
      })
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('valid Pro term')
  })

  it('creates a 3 month prepaid order with the discounted amount', async () => {
    const createOrder = jest.fn().mockResolvedValue({ id: 'order_123' })
    const db = new SupabaseQueryMock({
      creators: {
        selectSingle: [{ data: { id: 'c2', store_name: 'Store 2', email: 's2@example.com', phone: '9876543210' } }],
      },
    })

    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u2', email: 'u2@example.com' } } }) },
    })
    createAdminClient.mockReturnValue(db)
    getRazorpay.mockReturnValue({
      orders: {
        create: createOrder,
      },
    })

    const { POST } = await import('@/app/api/subscriptions/create/route')
    const response = await POST(
      new Request('http://localhost/api/subscriptions/create', {
        method: 'POST',
        body: JSON.stringify({ months: 3 }),
      })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(
      expect.objectContaining({
        razorpay_order_id: 'order_123',
        key: 'rzp_public_key',
        amount: 80700,
        months: 3,
        prefill: expect.objectContaining({
          contact: '+919876543210',
        }),
      })
    )
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 80700,
        receipt: expect.any(String),
      })
    )
    expect(createOrder.mock.calls[0][0].receipt.length).toBeLessThanOrEqual(40)
  })

  it('blocks prepaid checkout when a legacy recurring subscription is still active', async () => {
    const db = new SupabaseQueryMock({
      creators: {
        selectSingle: [{ data: { id: 'c3', store_name: 'Store 3', email: 's3@example.com', phone: '9876543210' } }],
      },
      subscriptions: {
        selectSingle: [{
          data: {
            status: 'active',
            razorpay_subscription_id: 'sub_123',
            current_period_end: '2026-04-01T00:00:00.000Z',
          },
        }],
      },
    })

    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u3', email: 'u3@example.com' } } }) },
    })
    createAdminClient.mockReturnValue(db)
    getCreatorPlanSnapshot.mockResolvedValue({
      effectivePlan: 'pro',
      hasLegacyRecurringSubscription: true,
      subscription: { razorpay_subscription_id: 'sub_123', status: 'active' },
      currentPeriodEnd: '2026-04-01T00:00:00.000Z',
    })

    const { POST } = await import('@/app/api/subscriptions/create/route')
    const response = await POST(
      new Request('http://localhost/api/subscriptions/create', {
        method: 'POST',
        body: JSON.stringify({ months: 1 }),
      })
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('Cancel your existing recurring')
  })
})
