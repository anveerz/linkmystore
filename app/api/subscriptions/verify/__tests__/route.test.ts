import crypto from 'crypto'
import { SupabaseQueryMock } from '@/lib/__tests__/helpers/supabase-mock'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

const { createClient } = jest.requireMock('@/lib/supabase/server') as {
  createClient: jest.Mock
}
const { createAdminClient } = jest.requireMock('@/lib/supabase/admin') as {
  createAdminClient: jest.Mock
}

describe('POST /api/subscriptions/verify', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, RAZORPAY_KEY_SECRET: 'test_secret' }
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

  it('upgrades creator to pro when signature is valid', async () => {
    const db = new SupabaseQueryMock({
      creators: {
        selectSingle: [{ data: { id: 'creator_1' } }],
        update: [{ data: null }],
      },
      subscriptions: {
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
    expect(body).toEqual({ success: true, plan: 'pro' })

    const creatorPlanUpdate = db.calls.find(
      (call) =>
        call.table === 'creators' &&
        call.operation === 'update' &&
        typeof call.payload === 'object' &&
        (call.payload as { plan?: string }).plan === 'pro'
    )
    expect(creatorPlanUpdate).toBeDefined()

    const storeSettingsUpdate = db.calls.find(
      (call) =>
        call.table === 'store_settings' &&
        call.operation === 'update' &&
        typeof call.payload === 'object' &&
        (call.payload as { seo_enabled?: boolean }).seo_enabled === true
    )
    expect(storeSettingsUpdate).toBeDefined()
  })
})
