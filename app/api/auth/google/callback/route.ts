import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const STATE_COOKIE = 'lms_google_oauth_state'
const NEXT_COOKIE = 'lms_google_oauth_next'

type GoogleTokenResponse = {
  access_token?: string
  expires_in?: number
  id_token?: string
  scope?: string
  token_type?: string
  error?: string
  error_description?: string
}

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

function sanitizeNextPath(rawPath: string | null): string | null {
  if (!rawPath) return null
  if (!rawPath.startsWith('/')) return null
  if (rawPath.startsWith('//')) return null
  return rawPath
}

function clearOAuthCookies(response: NextResponse, secure: boolean) {
  response.cookies.set(STATE_COOKIE, '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api/auth/google/callback',
    maxAge: 0,
  })
  response.cookies.set(NEXT_COOKIE, '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api/auth/google/callback',
    maxAge: 0,
  })
}

function buildErrorRedirect(origin: string, code: string) {
  const url = new URL('/login', origin)
  url.searchParams.set('error', code)
  return NextResponse.redirect(url)
}

async function exchangeGoogleCodeForIdToken(params: {
  code: string
  redirectUri: string
  clientId: string
  clientSecret: string
}): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  return (await response.json()) as GoogleTokenResponse
}

export async function GET(request: NextRequest) {
  const origin = resolveAppOrigin(request)
  const secureCookies = !isLocalOrigin(origin)
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()
  const configuredRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim()
  const redirectUri = configuredRedirectUri || `${origin}/api/auth/google/callback`

  if (!clientId || !clientSecret) {
    const response = buildErrorRedirect(origin, 'google_not_configured')
    clearOAuthCookies(response, secureCookies)
    return response
  }

  const errorParam = request.nextUrl.searchParams.get('error')
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const cookieStore = await cookies()
  const storedState = cookieStore.get(STATE_COOKIE)?.value || ''
  const nextPathFromCookie = sanitizeNextPath(cookieStore.get(NEXT_COOKIE)?.value || null)

  if (errorParam || !code || !state || !storedState || state !== storedState) {
    const response = buildErrorRedirect(origin, 'google_auth_failed')
    clearOAuthCookies(response, secureCookies)
    return response
  }
  let tokenPayload: GoogleTokenResponse
  try {
    tokenPayload = await exchangeGoogleCodeForIdToken({
      code,
      redirectUri,
      clientId,
      clientSecret,
    })
  } catch {
    const response = buildErrorRedirect(origin, 'google_exchange_failed')
    clearOAuthCookies(response, secureCookies)
    return response
  }

  if (!tokenPayload.id_token) {
    const response = buildErrorRedirect(origin, 'google_exchange_failed')
    clearOAuthCookies(response, secureCookies)
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error: signInError } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: tokenPayload.id_token,
  })

  if (signInError) {
    const response = buildErrorRedirect(origin, 'google_session_failed')
    clearOAuthCookies(response, secureCookies)
    return response
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const response = buildErrorRedirect(origin, 'google_user_missing')
    clearOAuthCookies(response, secureCookies)
    return response
  }

  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const destinationPath = creator ? (nextPathFromCookie || '/dashboard') : '/onboarding'
  const successResponse = NextResponse.redirect(new URL(destinationPath, origin))
  clearOAuthCookies(successResponse, secureCookies)
  return successResponse
}
