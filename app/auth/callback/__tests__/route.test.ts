import { SupabaseQueryMock } from '@/lib/__tests__/helpers/supabase-mock'

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

const { createServerClient } = jest.requireMock('@supabase/ssr') as {
  createServerClient: jest.Mock
}
const { cookies } = jest.requireMock('next/headers') as {
  cookies: jest.Mock
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    cookies.mockResolvedValue({
      getAll: jest.fn().mockReturnValue([]),
      set: jest.fn(),
    })
  })

  it('redirects to login error when code is missing', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    const response = await GET(new Request('https://linkmystore.in/auth/callback'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://linkmystore.in/login?error=auth_failed')
  })

  it('redirects to dashboard when auth exchange succeeds and creator exists', async () => {
    const db = new SupabaseQueryMock({
      creators: { selectSingle: [{ data: { id: 'creator_1' } }] },
    })

    createServerClient.mockReturnValue(
      Object.assign(db, {
        auth: {
          exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }),
          getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user_1' } } }),
        },
      })
    )

    const { GET } = await import('@/app/auth/callback/route')
    const response = await GET(new Request('https://linkmystore.in/auth/callback?code=abc'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://linkmystore.in/dashboard')
  })

  it('redirects to onboarding when creator record does not exist', async () => {
    const db = new SupabaseQueryMock({
      creators: { selectSingle: [{ data: null }] },
    })

    createServerClient.mockReturnValue(
      Object.assign(db, {
        auth: {
          exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }),
          getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user_2' } } }),
        },
      })
    )

    const { GET } = await import('@/app/auth/callback/route')
    const response = await GET(new Request('https://linkmystore.in/auth/callback?code=xyz'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://linkmystore.in/onboarding')
  })

  it('redirects to login error when code exchange fails', async () => {
    createServerClient.mockReturnValue({
      auth: {
        exchangeCodeForSession: jest.fn().mockResolvedValue({ error: { message: 'invalid code' } }),
        getUser: jest.fn(),
      },
      from: jest.fn(),
    })

    const { GET } = await import('@/app/auth/callback/route')
    const response = await GET(new Request('https://linkmystore.in/auth/callback?code=bad'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://linkmystore.in/login?error=auth_failed')
  })
})
