'use client'

import { Suspense, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Mail, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Circle } from 'lucide-react'

type Mode = 'login' | 'signup'
type AuthMethod = 'google' | 'email' | null
type PasswordStrength = 'weak' | 'fair' | 'strong' | null
type Step = 'form' | 'verify'

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

function resolveAuthRedirectBase() {
  const configuredOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL)
  const isDev = process.env.NODE_ENV !== 'production'

  if (typeof window === 'undefined') {
    if (isDev) return 'http://localhost:3000'
    if (configuredOrigin && !isLocalOrigin(configuredOrigin)) {
      return configuredOrigin
    }
    return configuredOrigin || 'https://linkmystore.in'
  }

  const runtimeOrigin = window.location.origin
  if (isDev) {
    return runtimeOrigin
  }

  if (isLocalOrigin(runtimeOrigin)) {
    return runtimeOrigin
  }

  if (configuredOrigin && !isLocalOrigin(configuredOrigin)) {
    return configuredOrigin
  }

  return runtimeOrigin
}

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return null
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
  }
  const passed = Object.values(checks).filter(Boolean).length
  if (passed <= 2) return 'weak'
  if (passed <= 3) return 'fair'
  return 'strong'
}

function getPasswordChecks(password: string) {
  return [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character (!@#$...)', met: /[^a-zA-Z0-9]/.test(password) },
  ]
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [checkingSession, setCheckingSession] = useState(true)
  const [mode, setMode] = useState<Mode>('login')
  const [authMethod, setAuthMethod] = useState<AuthMethod>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<Step>('form')
  const [forgotPassword, setForgotPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const passwordStrength = getPasswordStrength(password)
  const passwordChecks = getPasswordChecks(password)
  const passwordsMatch = password && confirmPassword && password === confirmPassword
  const authError = searchParams.get('error')
  const authErrorMessage = authError
    ? ({
        google_not_configured: 'Google sign-in is not configured. Please contact support.',
        google_auth_failed: 'Google sign-in failed. Please try again.',
        google_exchange_failed: 'Google verification failed. Please try again.',
        google_session_failed: 'Google session setup failed. Please try again.',
        google_user_missing: 'Could not load your user profile. Please try again.',
        auth_failed: 'Authentication failed. Please try again.',
      } satisfies Record<string, string>)[authError] || 'Authentication failed. Please try again.'
    : null
  const displayError = error || authErrorMessage

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  useEffect(() => {
    let isMounted = true

    const redirectSignedInUser = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const { data: creator } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', user.id)
          .single()

        router.replace(creator ? '/dashboard' : '/onboarding')
      } finally {
        if (isMounted) {
          setCheckingSession(false)
        }
      }
    }

    void redirectSignedInUser()

    return () => {
      isMounted = false
    }
  }, [router])

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true)
      setError(null)
      const nextPath = '/dashboard'
      const params = new URLSearchParams({ next: nextPath })
      window.location.assign(`/api/auth/google/start?${params.toString()}`)
    } catch {
      setGoogleLoading(false)
      toast.error('Failed to connect with Google. Please try again.')
    }
  }

  const handleEmailLogin = async () => {
    if (!email.trim()) {
      setError('Please enter your email')
      return
    }
    if (!password) {
      setError('Please enter your password')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    // Check if creator profile exists
    const { data: creator } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', data.user.id)
      .single()

    router.push(creator ? '/dashboard' : '/onboarding')
    router.refresh()
  }

  const handleEmailSignup = async () => {
    if (!email.trim()) {
      setError('Please enter your email')
      return
    }
    if (passwordStrength === 'weak') {
      setError('Please choose a stronger password')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const redirectBase = resolveAuthRedirectBase()
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${redirectBase}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Move to verification step
    setStep('verify')
    setLoading(false)
  }

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return

    const supabase = createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    })

    if (error) {
      toast.error('Failed to resend email. Please try again.')
      return
    }

    toast.success('Verification email resent!')
    setResendCooldown(60)
  }

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const redirectBase = resolveAuthRedirectBase()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${redirectBase}/auth/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setResetSent(true)
    toast.success('Password reset link sent! Check your email.')
    setLoading(false)
  }

  const resetState = () => {
    setAuthMethod(null)
    setStep('form')
    setForgotPassword(false)
    setResetSent(false)
    setError(null)
    setEmail('')
    setPassword('')
    setConfirmPassword('')
  }

  const switchToLogin = () => {
    setMode('login')
    resetState()
  }

  const switchToSignup = () => {
    setMode('signup')
    resetState()
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-[#d9e1f7] bg-white/80 px-5 py-4 text-sm font-medium text-[#425172] shadow-[0_20px_40px_rgba(79,124,255,0.08)]">
          <Loader2 className="h-4 w-4 animate-spin text-[#4f7cff]" />
          Checking your account...
        </div>
      </div>
    )
  }

  // Forgot Password Screen
  if (forgotPassword) {
    if (resetSent) {
      return (
        <div className="animate-in">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-[#FFF1E8] flex items-center justify-center mx-auto">
              <Mail className="w-10 h-10 text-[#E8651A]" />
            </div>
            <h1 className="text-2xl font-bold mt-6">Check your email</h1>
            <p className="text-sm text-[#555567] mt-2">
              We&apos;ve sent a password reset link to
            </p>
            <p className="text-sm font-semibold text-[#1A1A2E] mt-1">{email}</p>
          </div>

          <button
            onClick={switchToLogin}
            className="mt-8 w-full text-center text-sm text-[#555567] hover:text-[#1A1A2E] cursor-pointer"
          >
            &larr; Back to login
          </button>
        </div>
      )
    }

    return (
      <div className="animate-in">
        <button
          onClick={switchToLogin}
          className="text-sm text-[#555567] hover:text-[#1A1A2E] cursor-pointer mb-6"
        >
          &larr; Back to login
        </button>

        <h1 className="text-xl font-bold">Reset your password</h1>
        <p className="text-sm text-[#555567] mt-1">
          Enter your email and we&apos;ll send you a reset link
        </p>

        <div className="mt-6">
          <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E9F]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-field pl-12"
            />
          </div>
        </div>

        {displayError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-4">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {displayError}
            </p>
          </div>
        )}

        <button
          onClick={handleForgotPassword}
          disabled={loading}
          className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            'Send Reset Link'
          )}
        </button>
      </div>
    )
  }

  // Email Verification Screen
  if (mode === 'signup' && step === 'verify') {
    return (
      <div className="animate-in">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-[#FFF1E8] flex items-center justify-center mx-auto">
            <Mail className="w-10 h-10 text-[#E8651A]" />
          </div>
          <h1 className="text-2xl font-bold mt-6">Check your email</h1>
          <p className="text-sm text-[#555567] mt-2">
            We&apos;ve sent a verification link to
          </p>
          <p className="text-sm font-semibold text-[#1A1A2E] mt-1">{email}</p>
          <p className="text-sm text-[#555567] mt-4 max-w-sm mx-auto">
            Click the link in the email to verify your account and continue setting up your store.
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-[#8E8E9F]">Didn&apos;t receive the email?</p>
          <button
            onClick={handleResendVerification}
            disabled={resendCooldown > 0}
            className="text-sm text-[#E8651A] font-medium hover:underline cursor-pointer disabled:text-[#8E8E9F] disabled:no-underline"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification email'}
          </button>
        </div>

        <p className="text-xs text-[#8E8E9F] text-center mt-4">
          Check your spam folder if you don&apos;t see it
        </p>

        <button
          onClick={switchToLogin}
          className="mt-6 w-full text-center text-sm text-[#555567] hover:text-[#1A1A2E] cursor-pointer"
        >
          &larr; Back to login
        </button>
      </div>
    )
  }

  // Login with Email
  if (mode === 'login' && authMethod === 'email') {
    return (
      <div className="animate-in">
        <button
          onClick={resetState}
          className="text-sm text-[#555567] hover:text-[#1A1A2E] cursor-pointer mb-6"
        >
          &larr; Back
        </button>

        <h1 className="text-xl font-bold">Log in with email</h1>

        <div className="mt-6">
          <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E9F]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-field pl-12"
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-[#1A1A2E]">Password</label>
            <button
              onClick={() => setForgotPassword(true)}
              className="text-sm text-[#E8651A] hover:underline cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="input-field pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E9F] hover:text-[#555567]"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {displayError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-4">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {displayError}
            </p>
          </div>
        )}

        <button
          onClick={handleEmailLogin}
          disabled={loading}
          className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Logging in...
            </>
          ) : (
            'Log In'
          )}
        </button>
      </div>
    )
  }

  // Signup with Email
  if (mode === 'signup' && authMethod === 'email') {
    return (
      <div className="animate-in">
        <button
          onClick={resetState}
          className="text-sm text-[#555567] hover:text-[#1A1A2E] cursor-pointer mb-6"
        >
          &larr; Back
        </button>

        <h1 className="text-xl font-bold">Create your account</h1>

        <div className="mt-6">
          <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
            Email address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E9F]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-field pl-12"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              className="input-field pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E9F] hover:text-[#555567]"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {password && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1.5 rounded-full ${passwordStrength === 'weak' && i === 0
                      ? 'bg-red-500'
                      : passwordStrength === 'fair' && i <= 1
                        ? 'bg-yellow-500'
                        : passwordStrength === 'strong'
                          ? 'bg-green-500'
                          : 'bg-[#E5E5EC]'
                      }`}
                  />
                ))}
              </div>
              <p
                className={`text-xs mt-1 ${passwordStrength === 'weak'
                  ? 'text-red-500'
                  : passwordStrength === 'fair'
                    ? 'text-yellow-600'
                    : 'text-green-600'
                  }`}
              >
                {passwordStrength === 'weak' && 'Weak password'}
                {passwordStrength === 'fair' && 'Fair password'}
                {passwordStrength === 'strong' && 'Strong password \uD83D\uDCAA'}
              </p>
            </div>
          )}

          {/* Password Requirements Checklist */}
          {password && (
            <div className="mt-3 space-y-1.5">
              {passwordChecks.map((check, i) => (
                <div key={i} className="flex items-center gap-2">
                  {check.met ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-[#E5E5EC]" />
                  )}
                  <span className={`text-xs ${check.met ? 'text-[#555567]' : 'text-[#8E8E9F]'}`}>
                    {check.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            className="input-field"
          />
          {confirmPassword && (
            <p
              className={`text-xs mt-1 ${passwordsMatch ? 'text-green-500' : 'text-red-500'
                }`}
            >
              {passwordsMatch ? 'Passwords match \u2713' : "Passwords don't match"}
            </p>
          )}
        </div>

        {displayError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-4">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {displayError}
            </p>
          </div>
        )}

        <button
          onClick={handleEmailSignup}
          disabled={loading || passwordStrength === 'weak' || !passwordsMatch || !email.trim()}
          className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </div>
    )
  }

  // Initial Choice Screen
  return (
    <div className="animate-in">
      {/* Tab Toggle */}
      <div className="flex w-full rounded-xl bg-[#F0ECF7] p-1 mb-8">
        <button
          onClick={switchToLogin}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-center cursor-pointer transition-all ${mode === 'login'
            ? 'bg-white shadow-sm text-[#1A1A2E]'
            : 'text-[#555567]'
            }`}
        >
          Log In
        </button>
        <button
          onClick={switchToSignup}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-center cursor-pointer transition-all ${mode === 'signup'
            ? 'bg-white shadow-sm text-[#1A1A2E]'
            : 'text-[#555567]'
            }`}
        >
          Create Account
        </button>
      </div>

      {/* Heading */}
      <h1 className="text-2xl font-bold">
        {mode === 'login' ? 'Welcome back' : 'Create your store'}
      </h1>
      <p className="text-sm text-[#555567] mt-1">
        {mode === 'login' ? 'Sign in to manage your store' : 'Get started in just 2 minutes'}
      </p>

      {/* Google Button */}
      <button
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="btn-google mt-8"
      >
        {googleLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-[#555567]" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>Continue with Google</span>
          </>
        )}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-[#E5E5EC]"></div>
        <span className="text-sm text-[#6B6B82]">or</span>
        <div className="flex-1 h-px bg-[#E5E5EC]"></div>
      </div>

      {/* Email Button */}
      <button
        onClick={() => setAuthMethod('email')}
        className="btn-secondary w-full flex items-center justify-center gap-3"
      >
        <Mail className="w-5 h-5" />
        <span>Continue with Email</span>
      </button>

      {/* Terms */}
      <p className="mt-6 text-center text-xs text-[#6B6B82]">
        By continuing, you agree to our{' '}
        <Link href="/terms" className="underline hover:text-[#3D2176]">Terms of Service</Link>
        {' '}and{' '}
        <Link href="/privacy" className="underline hover:text-[#3D2176]">Privacy Policy</Link>
      </p>
    </div>
  )
}

function LoginPageFallback() {
  return (
    <div className="animate-in">
      <div className="flex min-h-[240px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-[#E5E5EC] bg-white/80 px-5 py-4 text-sm text-[#555567] shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading sign-in page...
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  )
}
