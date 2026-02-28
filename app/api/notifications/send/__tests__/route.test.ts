import { SupabaseQueryMock } from '@/lib/__tests__/helpers/supabase-mock'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/whatsapp', () => ({
  sendWhatsAppMessage: jest.fn(),
}))

const { createClient } = jest.requireMock('@/lib/supabase/server') as {
  createClient: jest.Mock
}
const { createAdminClient } = jest.requireMock('@/lib/supabase/admin') as {
  createAdminClient: jest.Mock
}
const { sendWhatsAppMessage } = jest.requireMock('@/lib/whatsapp') as {
  sendWhatsAppMessage: jest.Mock
}

describe('POST /api/notifications/send', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  async function post(body: Record<string, unknown>) {
    const { POST } = await import('@/app/api/notifications/send/route')
    return POST(
      new Request('http://localhost/api/notifications/send', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    )
  }

  it('requires auth and blocks free plan creators from pro notifications', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })
    createAdminClient.mockReturnValue(new SupabaseQueryMock())

    const unauth = await post({ message: 'test' })
    expect(unauth.status).toBe(401)

    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    })
    createAdminClient.mockReturnValue(
      new SupabaseQueryMock({
        creators: {
          selectSingle: [{ data: { id: 'c1', plan: 'free', phone: '9876543210', whatsapp_number: null } }],
        },
      })
    )

    const free = await post({ message: 'test' })
    expect(free.status).toBe(403)
  })

  it('returns 400 when no WhatsApp number is configured', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u2' } } }) },
    })
    createAdminClient.mockReturnValue(
      new SupabaseQueryMock({
        creators: {
          selectSingle: [{ data: { id: 'c2', plan: 'pro', phone: null, whatsapp_number: null } }],
        },
      })
    )

    const response = await post({ message: 'new order' })
    expect(response.status).toBe(400)
  })

  it('sends WhatsApp for pro creators', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u3' } } }) },
    })
    createAdminClient.mockReturnValue(
      new SupabaseQueryMock({
        creators: {
          selectSingle: [{ data: { id: 'c3', plan: 'pro', phone: '9876543210', whatsapp_number: '919876543210' } }],
        },
      })
    )
    sendWhatsAppMessage.mockResolvedValue({ success: true, provider: 'generic' })

    const response = await post({ message: 'A new order arrived' })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(sendWhatsAppMessage).toHaveBeenCalledWith({
      to: '919876543210',
      message: 'A new order arrived',
    })
  })
})
