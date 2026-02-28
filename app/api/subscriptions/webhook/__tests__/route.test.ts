import crypto from 'crypto'
import { SupabaseQueryMock } from '@/lib/__tests__/helpers/supabase-mock'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

const { createAdminClient } = jest.requireMock('@/lib/supabase/admin') as {
  createAdminClient: jest.Mock
}

describe('POST /api/subscriptions/webhook', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, RAZORPAY_WEBHOOK_SECRET: 'webhook_secret' }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  async function postRaw(body: string, signature?: string) {
    const { POST } = await import('@/app/api/subscriptions/webhook/route')
    return POST(
      new Request('http://localhost/api/subscriptions/webhook', {
        method: 'POST',
        body,
        headers: signature ? { 'x-razorpay-signature': signature } : undefined,
      })
    )
  }

  it('requires webhook signature', async () => {
    createAdminClient.mockReturnValue(new SupabaseQueryMock())
    const response = await postRaw('{}')
    expect(response.status).toBe(400)
  })

  it('rejects invalid webhook signature', async () => {
    createAdminClient.mockReturnValue(new SupabaseQueryMock())
    const response = await postRaw('{"event":"subscription.expired"}', 'bad')
    expect(response.status).toBe(400)
  })

  it('handles subscription.expired by downgrading creator to free', async () => {
    const payload = JSON.stringify({
      event: 'subscription.expired',
      payload: {
        subscription: {
          entity: {
            id: 'sub_1',
            notes: { creator_id: 'creator_1' },
          },
        },
      },
    })

    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
      .update(payload)
      .digest('hex')

    const db = new SupabaseQueryMock({
      creators: { update: [{ data: null }] },
      subscriptions: { update: [{ data: null }] },
      store_settings: { update: [{ data: null }] },
    })
    createAdminClient.mockReturnValue(db)

    const response = await postRaw(payload, signature)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('ok')

    const creatorUpdate = db.calls.find(
      (call) =>
        call.table === 'creators' &&
        call.operation === 'update' &&
        typeof call.payload === 'object' &&
        (call.payload as { plan?: string }).plan === 'free'
    )
    expect(creatorUpdate).toBeDefined()
  })
})
