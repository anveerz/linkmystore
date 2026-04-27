import crypto from 'crypto'
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

describe('POST /api/subscriptions/verify', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      RAZORPAY_KEY_SECRET: 'test_secret',
      RAZORPAY_KEY_ID: 'rzp_test_123',
    }
    getCreatorPlanSnapshot.mockResolvedValue({
      effectivePlan: 'free',
      hasActiveProAccess: false,
      currentPeriodEnd: null,
      subscription: null,
    })
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('returns 401 for unauthenticated requests', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })
    createAdminClient.mockReturnValue(new SupabaseQueryMock())

    const { POST } = await import('@/app/api/subscriptions/verify/route')
    const response = await POST(
      new Request('http://localhost/api/subscriptions/verify', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    )

    expect(response.status).toBe(401)
  })

  it('rejects invalid Razorpay signature', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    })
    createAdminClient.mockReturnValue(new SupabaseQueryMock())

    const { POST } = await import('@/app/api/subscriptions/verify/route')
    const response = await POST(
      new Request('http://localhost/api/subscriptions/verify', {
        method: 'POST',
        body: JSON.stringify({
          razorpay_order_id: 'order_1',
          razorpay_payment_id: 'pay_1',
          razorpay_signature: 'bad_signature',
        }),
      })
    )

    const body = await response.json()
    expect(response.status).toBe(400)
    expect(body.error).toContain('Invalid payment signature')
  })

  it('upgrades creator to pro for the purchased term', async () => {
    const db = new SupabaseQueryMock({
      creators: {
        selectSingle: [{ data: { id: 'creator_1' } }],
        update: [{ data: null }],
      },
      subscriptions: {
        selectSingle: [{
          data: {
            current_period_end: '2026-05-10T00:00:00.000Z',
            status: 'active',
          },
        }],
        upsert: [{ data: null }],
      },
      store_settings: {
        update: [{ data: null }],
      },
    })

    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user_1' } } }) },
    })
    createAdminClient.mockReturnValue(db)
    getRazorpay.mockReturnValue({
      orders: {
        fetch: jest.fn().mockResolvedValue({
          id: 'order_123',
          amount: 80700,
          notes: {
            creator_id: 'creator_1',
            term_months: '3',
            amount_paid_paisa: '80700',
          },
        }),
      },
    })

    const orderId = 'order_123'
    const paymentId = 'pay_123'
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    const { POST } = await import('@/app/api/subscriptions/verify/route')
    const response = await POST(
      new Request('http://localhost/api/subscriptions/verify', {
        method: 'POST',
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        }),
      })
    )

    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual(
      expect.objectContaining({
        success: true,
        plan: 'pro',
        current_period_end: expect.any(String),
      })
    )

    const subscriptionUpsert = db.calls.find(
      (call) => call.table === 'subscriptions' && call.operation === 'upsert'
    )
    expect(subscriptionUpsert).toBeDefined()
    expect(subscriptionUpsert?.payload).toEqual(
      expect.objectContaining({
        term_months: 3,
        amount_paid_paisa: 80700,
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
      })
    )
  })

  it('extends from the current expiry on early renewal', async () => {
    const db = new SupabaseQueryMock({
      creators: {
        selectSingle: [{ data: { id: 'creator_1' } }],
        update: [{ data: null }],
      },
      subscriptions: {
        selectSingle: [{
          data: {
            current_period_end: '2026-05-10T00:00:00.000Z',
            status: 'active',
          },
        }],
        upsert: [{ data: null }],
      },
      store_settings: {
        update: [{ data: null }],
      },
    })

    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user_1' } } }) },
    })
    createAdminClient.mockReturnValue(db)
    getRazorpay.mockReturnValue({
      orders: {
        fetch: jest.fn().mockResolvedValue({
          id: 'order_renew',
          amount: 29900,
          notes: {
            creator_id: 'creator_1',
            term_months: '1',
            amount_paid_paisa: '29900',
          },
        }),
      },
    })

    const orderId = 'order_renew'
    const paymentId = 'pay_renew'
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    const { POST } = await import('@/app/api/subscriptions/verify/route')
    const response = await POST(
      new Request('http://localhost/api/subscriptions/verify', {
        method: 'POST',
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        }),
      })
    )

    expect(response.status).toBe(200)

    const subscriptionUpsert = db.calls.find(
      (call) => call.table === 'subscriptions' && call.operation === 'upsert'
    )
    const payload = subscriptionUpsert?.payload as { current_period_start?: string; current_period_end?: string }

    expect(payload.current_period_start).toBe('2026-05-10T00:00:00.000Z')
    expect(payload.current_period_end).toBe('2026-06-10T00:00:00.000Z')
  })
})
