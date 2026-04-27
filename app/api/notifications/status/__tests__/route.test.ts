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

describe('GET /api/notifications/status', () => {
  const previousEnv = { ...process.env }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...previousEnv }
    delete process.env.WHATSAPP_API_URL
    delete process.env.WHATSAPP_API_KEY
    delete process.env.WHATSAPP_PROVIDER
  })

  afterAll(() => {
    process.env = previousEnv
  })

  async function getStatus() {
    const { GET } = await import('@/app/api/notifications/status/route')
    return GET()
  }

  it('returns 401 for unauthenticated users', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })
    createAdminClient.mockReturnValue(new SupabaseQueryMock())

    const response = await getStatus()
    expect(response.status).toBe(401)
  })

  it('returns pro_required issue for free plan users', async () => {
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

    const response = await getStatus()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.issue).toBe('pro_required')
    expect(body.canSend).toBe(false)
  })

  it('returns provider_not_configured for pro users when env is missing', async () => {
    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u2' } } }) },
    })
    createAdminClient.mockReturnValue(
      new SupabaseQueryMock({
        creators: {
          selectSingle: [{ data: { id: 'c2', plan: 'pro', phone: '9876543210', whatsapp_number: null } }],
        },
      })
    )

    const response = await getStatus()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.issue).toBe('provider_not_configured')
    expect(body.canSend).toBe(false)
  })

  it('returns canSend true when pro plan, config, and recipient are available', async () => {
    process.env.WHATSAPP_API_URL = 'https://provider.example/send'
    process.env.WHATSAPP_API_KEY = 'test-key'
    process.env.WHATSAPP_PROVIDER = 'interakt'

    createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u3' } } }) },
    })
    createAdminClient.mockReturnValue(
      new SupabaseQueryMock({
        creators: {
          selectSingle: [{ data: { id: 'c3', plan: 'pro', phone: null, whatsapp_number: '919876543210' } }],
        },
      })
    )

    const response = await getStatus()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.issue).toBeNull()
    expect(body.canSend).toBe(true)
    expect(body.provider).toBe('interakt')
    expect(body.recipientHint).toMatch(/3210$/)
  })
})
