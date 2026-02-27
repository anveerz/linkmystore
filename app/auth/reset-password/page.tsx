'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Circle } from 'lucide-react'

type PasswordStrength = 'weak' | 'fair' | 'strong' | null

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

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const passwordStrength = getPasswordStrength(password)
  const passwordChecks = getPasswordChecks(password)
  const passwordsMatch = password && confirmPassword && password === confirmPassword

  const handleResetPassword = async () => {
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
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    toast.success('Password updated successfully!')

    // Redirect to dashboard after 2 seconds
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 2000)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-[420px] animate-in text-center">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mt-6">Password Updated!</h1>
          <p className="text-sm text-gray-500 mt-2">
            Redirecting you to your dashboard...
          </p>
          <button
            onClick={() => {
              router.push('/dashboard')
              router.refresh()
            }}
            className="mt-6 text-sm text-[#E8651A] font-medium hover:underline"
          >
            Go to Dashboard →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white">
      <div className="w-full max-w-[420px] animate-in">
        {/* Mobile logo */}
        <div className="lg:hidden text-center mb-8">
          <span className="text-2xl font-bold gradient-text">🛍️ LinkMyStore</span>
        </div>

        <h1 className="text-xl font-bold">Set new password</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create a strong password for your account
        </p>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            New Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a new password"
              className="input-field pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                            : 'bg-gray-200'
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
                {passwordStrength === 'strong' && 'Strong password 💪'}
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
                    <Circle className="w-3.5 h-3.5 text-gray-300" />
                  )}
                  <span className={`text-xs ${check.met ? 'text-gray-600' : 'text-gray-400'}`}>
                    {check.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
              {passwordsMatch ? 'Passwords match ✓' : "Passwords don't match"}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-4">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          </div>
        )}

        <button
          onClick={handleResetPassword}
          disabled={loading || passwordStrength === 'weak' || !passwordsMatch}
          className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Password'
          )}
        </button>
      </div>
    </div>
  )
}
