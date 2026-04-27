import { getInternalAdminEmailAllowlist, isInternalAdminEmail } from '@/lib/internal-admin'

describe('internal admin email allowlist', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('collects emails from both internal admin env vars', () => {
    process.env.INTERNAL_ADMIN_EMAIL = 'owner@example.com'
    process.env.INTERNAL_ADMIN_EMAILS = 'ops@example.com, owner@example.com,team@example.com'

    expect(getInternalAdminEmailAllowlist()).toEqual([
      'ops@example.com',
      'owner@example.com',
      'team@example.com',
    ])
  })

  it('matches emails case-insensitively', () => {
    process.env.INTERNAL_ADMIN_EMAILS = 'owner@example.com'

    expect(isInternalAdminEmail('OWNER@example.com')).toBe(true)
    expect(isInternalAdminEmail('other@example.com')).toBe(false)
  })
})
