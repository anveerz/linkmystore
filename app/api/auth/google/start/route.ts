import { NextRequest, NextResponse } from 'next/server'

const STATE_COOKIE = 'lms_google_oauth_state'
const NEXT_COOKIE = 'lms_google_oauth_next'
const STATE_MAX_AGE_SECONDS = 60 * 10

function normalizeOrigin(rawUrl: string | null | undefined): string | null {
  const value = (rawUrl || '').trim()
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function isLocalOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.toLowerCase()
    return host === 'localhost' || host === '127.0.0.1'
  } catch {
    return false
  }
}

function resolveAppOrigin(request: NextRequest): string {
  const configuredOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL)
  const requestOrigin = request.nextUrl.origin
  const isDev = process.env.NODE_ENV !== 'production'

  if (isDev) {
    return requestOrigin
  }

  if (isLocalOrigin(requestOrigin)) {
    if (configuredOrigin && !isLocalOrigin(configuredOrigin)) {
      return configuredOrigin
    }
    return requestOrigin
  }

  if (configuredOrigin && !isLocalOrigin(configuredOrigin)) {
    return configuredOrigin
  }

  return requestOrigin
}

function sanitizeNextPath(rawPath: string | null): string {
  if (!rawPath) return '/dashboard'
  if (!rawPath.startsWith('/')) return '/dashboard'
  if (rawPath.startsWith('//')) return '/dashboard'
  return rawPath
}

function buildGoogleAuthUrl(params: {
  clientId: string
  redirectUri: string
  state: string
}) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', params.state)
  url.searchParams.set('prompt', 'select_account')
  url.searchParams.set('include_granted_scopes', 'true')
  return url.toString()
}

export async function GET(request: NextRequest) {
  const origin = resolveAppOrigin(request)
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()

  // Do not fall back to Supabase-hosted implicit OAuth. It causes fragment-token
  // redirects and domain mismatch UX ("continue to ...supabase.co").
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/login?error=google_not_configured`)
  }

  const configuredRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim()
  const redirectUri = configuredRedirectUri || `${origin}/api/auth/google/callback`
  const state = crypto.randomUUID()
  const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get('next'))

  const redirectResponse = NextResponse.redirect(
    buildGoogleAuthUrl({
      clientId,
      redirectUri,
      state,
    })
  )

  const secure = !isLocalOrigin(origin)

  redirectResponse.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api/auth/google/callback',
    maxAge: STATE_MAX_AGE_SECONDS,
  })

  redirectResponse.cookies.set(NEXT_COOKIE, nextPath, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api/auth/google/callback',
    maxAge: STATE_MAX_AGE_SECONDS,
  })

  return redirectResponse
}
