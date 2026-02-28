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

const { createClient } = jest.requireMock('@/lib/supabase/server') as {
  createClient: jest.Mock
}
const { createAdminClient } = jest.requireMock('@/lib/supabase/admin') as {
  createAdminClient: jest.Mock
}
const { getRazorpay } = jest.requireMock('@/lib/razorpay') as {
  getRazorpay: jest.Mock
}

describe('POST /api/subscriptions/create', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, NEXT_PUBLIC_RAZORPAY_KEY_ID: 'rzp_public_key' }
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
    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toContain('Unauthorized')
  })

  it('blocks creators already on pro plan', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'x@example.com' } } }) },
    })
    createAdminClient.mockReturnValue(
      new SupabaseQueryMock({
        creators: {
          selectSingle: [{ data: { id: 'c1', plan: 'pro', store_name: 'Store', email: 'x@example.com' } }],
        },
      })
    )

    const { POST } = await import('@/app/api/subscriptions/create/route')
    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('Already on Pro plan')
  })

  it('creates one-time Razorpay order fallback when plan id is absent', async () => {
    delete process.env.RAZORPAY_PRO_PLAN_ID

    const db = new SupabaseQueryMock({
      creators: {
        selectSingle: [{ data: { id: 'c2', plan: 'free', store_name: 'Store 2', email: 's2@example.com' } }],
      },
      subscriptions: {
        selectSingle: [{ data: null }],
      },
    })

    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u2', email: 'u2@example.com' } } }) },
    })
    createAdminClient.mockReturnValue(db)
    getRazorpay.mockReturnValue({
      orders: {
        create: jest.fn().mockResolvedValue({ id: 'order_123' }),
      },
      subscriptions: { create: jest.fn() },
    })

    const { POST } = await import('@/app/api/subscriptions/create/route')
    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(
      expect.objectContaining({
        type: 'order',
        razorpay_order_id: 'order_123',
        key: 'rzp_public_key',
      })
    )
  })

  it('creates subscription and upserts record when pro plan id exists', async () => {
    process.env.RAZORPAY_PRO_PLAN_ID = 'plan_live_123'

    const db = new SupabaseQueryMock({
      creators: {
        selectSingle: [{ data: { id: 'c3', plan: 'free', store_name: 'Store 3', email: 's3@example.com' } }],
      },
      subscriptions: {
        selectSingle: [{ data: null }],
        upsert: [{ data: null }],
      },
    })

    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u3', email: 'u3@example.com' } } }) },
    })
    createAdminClient.mockReturnValue(db)
    getRazorpay.mockReturnValue({
      orders: { create: jest.fn() },
      subscriptions: {
        create: jest.fn().mockResolvedValue({ id: 'sub_123' }),
      },
    })

    const { POST } = await import('@/app/api/subscriptions/create/route')
    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(
      expect.objectContaining({
        type: 'subscription',
        razorpay_subscription_id: 'sub_123',
        key: 'rzp_public_key',
      })
    )

    const upsertCall = db.calls.find((call) => call.table === 'subscriptions' && call.operation === 'upsert')
    expect(upsertCall).toBeDefined()
  })

  it('falls back to one-time order when subscription plan creation fails', async () => {
    process.env.RAZORPAY_PRO_PLAN_ID = 'plan_invalid_or_deleted'

    const db = new SupabaseQueryMock({
      creators: {
        selectSingle: [{ data: { id: 'c4', plan: 'free', store_name: 'Store 4', email: 's4@example.com' } }],
      },
      subscriptions: {
        selectSingle: [{ data: null }],
      },
    })

    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u4', email: 'u4@example.com' } } }) },
    })
    createAdminClient.mockReturnValue(db)
    getRazorpay.mockReturnValue({
      orders: {
        create: jest.fn().mockResolvedValue({ id: 'order_fallback_123' }),
      },
      subscriptions: {
        create: jest.fn().mockRejectedValue(new Error('Plan not found')),
      },
    })

    const { POST } = await import('@/app/api/subscriptions/create/route')
    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(
      expect.objectContaining({
        type: 'order',
        razorpay_order_id: 'order_fallback_123',
      })
    )
  })
})
