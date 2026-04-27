'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { validateUPIId } from '@/lib/upi'
import { verifyUpiId } from '@/lib/upi-verifier'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import toast from 'react-hot-toast'
import { ArrowLeft, ArrowRight, Instagram, Loader2, UploadCloud } from 'lucide-react'

type Step = 1 | 2 | 3 | 4 | 5 | 6
type FirstProductIntent = 'add_now' | 'later' | null

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildDefaultPolicy(phone: string, email?: string | null) {
  const contact = email?.trim() || phone
  return `For returns and refunds, contact me at ${contact}. Returns accepted within 7 days.`
}

function IndiaFlagIcon() {
  return (
    <svg viewBox="0 0 24 16" className="h-3.5 w-5 rounded-sm shadow-sm" aria-hidden="true">
      <rect width="24" height="16" fill="#fff" />
      <rect width="24" height="5.33" y="0" fill="#FF9933" />
      <rect width="24" height="5.33" y="10.67" fill="#138808" />
      <circle cx="12" cy="8" r="1.7" fill="none" stroke="#000080" strokeWidth="0.6" />
    </svg>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const slugDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [requiresFullName, setRequiresFullName] = useState(false)

  // Step 1
  const [fullName, setFullName] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [storeName, setStoreName] = useState('')
  const [storeSlug, setStoreSlug] = useState('')
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [slugChecking, setSlugChecking] = useState(false)

  // Step 2
  const [instagramHandle, setInstagramHandle] = useState('')

  // Step 3
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // Step 4
  const [upiId, setUpiId] = useState('')
  const [upiSkipped, setUpiSkipped] = useState(false)

  // Step 5
  const [firstProductIntent, setFirstProductIntent] = useState<FirstProductIntent>(null)

  // Step 6
  const [returnPolicy, setReturnPolicy] = useState('')

  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (slug.length < 3) {
      setSlugAvailable(false)
      return
    }

    setSlugChecking(true)
    try {
      const { data, error } = await supabase
        .from('creators')
        .select('id')
        .eq('store_slug', slug)
        .single()

      if (data) {
        setSlugAvailable(false)
      } else if (error && error.code === 'PGRST116') {
        setSlugAvailable(true)
      } else {
        setSlugAvailable(true)
      }
    } catch {
      setSlugAvailable(true)
    } finally {
      setSlugChecking(false)
    }
  }, [supabase])

  useEffect(() => {
    const initialize = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        router.replace('/login')
        return
      }

      const { data: existingCreator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', authUser.id)
        .single()

      if (existingCreator?.id) {
        router.replace('/dashboard')
        return
      }

      setUser(authUser)

      const provider = (authUser.app_metadata?.provider as string | undefined) || 'email'
      const needsFullName = provider === 'email'
      setRequiresFullName(needsFullName)

      const prefillName = (authUser.user_metadata?.full_name as string | undefined)?.trim() || ''
      if (prefillName) {
        setFullName(prefillName)
        setStoreName(prefillName)
      }

      setReturnPolicy(buildDefaultPolicy('', authUser.email || null))
      setLoading(false)
    }

    void initialize()
  }, [router, supabase])

  useEffect(() => {
    const defaultPolicy = buildDefaultPolicy(mobileNumber, user?.email || null)
    if (!returnPolicy.trim() || returnPolicy.includes('Returns accepted within 7 days.')) {
      setReturnPolicy(defaultPolicy)
    }
  }, [mobileNumber, returnPolicy, user?.email])

  useEffect(() => {
    return () => {
      if (slugDebounceRef.current) {
        clearTimeout(slugDebounceRef.current)
      }
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview)
      }
    }
  }, [logoPreview])

  const handleSlugChange = (value: string) => {
    const slug = slugify(value)
    setStoreSlug(slug)
    setSlugAvailable(null)

    if (slugDebounceRef.current) {
      clearTimeout(slugDebounceRef.current)
    }

    slugDebounceRef.current = setTimeout(() => {
      void checkSlugAvailability(slug)
    }, 350)
  }

  const handleMobileChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    setMobileNumber(digits)
  }

  const handleLogoSelect = (file: File | null) => {
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview)
    }
    setLogoFile(file)
    setLogoPreview(file ? URL.createObjectURL(file) : null)
  }

  const uploadFile = async (bucket: string, path: string, file: File) => {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

    if (error) {
      throw new Error(error.message)
    }

    return data.path
  }

  const canContinueStep1 =
    storeSlug.length >= 3 &&
    slugAvailable === true &&
    mobileNumber.length === 10 &&
    storeName.trim().length > 0 &&
    (!requiresFullName || fullName.trim().length > 0)

  const canContinueStep4 = upiSkipped || !upiId.trim() || validateUPIId(upiId.trim())
  const canContinueStep5 = firstProductIntent !== null

  const progress = (step / 6) * 100
  const displayName = (requiresFullName ? fullName : storeName).trim()
  const step1Heading = displayName
    ? `Hey ${displayName}! Start making money with LinkMyStore now!`
    : 'Start making money with LinkMyStore now!'

  const goLive = async () => {
    if (!user) return

    if (!canContinueStep1) {
      toast.error('Please complete username, store name, and mobile number')
      setStep(1)
      return
    }

    const normalizedUpi = upiId.trim().toLowerCase()
    if (normalizedUpi) {
      const verification = await verifyUpiId(normalizedUpi)
      if (!verification.valid) {
        toast.error(verification.message || 'Please enter a valid UPI ID')
        setStep(4)
        return
      }
    }

    setSaving(true)

    try {
      let profileImageUrl: string | null = null
      if (logoFile) {
        const ext = logoFile.name.split('.').pop() || 'jpg'
        const logoPath = `profiles/${user.id}/${Date.now()}.${ext}`
        const uploadedPath = await uploadFile('product-images', logoPath, logoFile)
        const { data } = supabase.storage.from('product-images').getPublicUrl(uploadedPath)
        profileImageUrl = data.publicUrl
      }

      const resolvedFullName = fullName.trim() || (user.user_metadata?.full_name as string | undefined) || null
      const resolvedStoreName = storeName.trim()

      const creatorPayload: Record<string, unknown> = {
        user_id: user.id,
        phone: mobileNumber,
        mobile_number: mobileNumber,
        whatsapp_number: mobileNumber,
        email: user.email || null,
        full_name: resolvedFullName,
        store_slug: storeSlug,
        store_name: resolvedStoreName,
        bio: null,
        profile_image_url: profileImageUrl,
        instagram_handle: instagramHandle.trim() || null,
        return_policy: returnPolicy.trim() || buildDefaultPolicy(mobileNumber, user.email || null),
        bank_account: normalizedUpi ? { upi_id: normalizedUpi } : {},
      }

      const { data: creator, error: creatorError } = await supabase
        .from('creators')
        .insert(creatorPayload)
        .select('id')
        .single()

      if (creatorError || !creator) {
        throw new Error(creatorError?.message || 'Failed to create creator')
      }

      const { error: settingsError } = await supabase.from('store_settings').insert({
        creator_id: creator.id,
        theme: 'default',
        accent_color: '#E8651A',
        social_links: {
          instagram: instagramHandle.trim() ? `https://instagram.com/${instagramHandle.replace(/^@/, '')}` : null,
        },
      })

      if (settingsError) {
        throw new Error(settingsError.message)
      }

      toast.success('Your store is live')
      const redirectTarget =
        firstProductIntent === 'later'
          ? '/dashboard/products/new?from=onboarding=1&intent=later'
          : '/dashboard/products/new?from=onboarding=1'

      router.push(redirectTarget)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete onboarding')
    } finally {
      setSaving(false)
    }
  }

  const renderStep = () => {
    if (step === 1) {
      return (
        <motion.div
          key="step-1"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22 }}
          className="card p-6 space-y-4"
        >
          <h2 className="text-xl font-semibold text-[#1A1A2E]">{step1Heading}</h2>

          <div>
            <p className="mb-1 block text-sm font-medium">Choose Username</p>
            <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
              <span className="mr-2 text-xs text-gray-500">linkmystore.in/</span>
              <input
                value={storeSlug}
                onChange={(event) => handleSlugChange(event.target.value)}
                className="w-full bg-transparent text-sm outline-none"
                placeholder="username"
              />
              {slugChecking && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            </div>
            {storeSlug.length > 0 && storeSlug.length < 3 && (
              <p className="mt-1 text-xs text-red-500">Username must be at least 3 characters.</p>
            )}
            {slugAvailable === false && storeSlug.length >= 3 && (
              <p className="mt-1 text-xs text-red-500">This username is already taken.</p>
            )}
            {slugAvailable === true && (
              <p className="mt-1 text-xs text-green-600">Username is available.</p>
            )}
          </div>

          {requiresFullName && (
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="input-field"
              placeholder="Full name"
            />
          )}

          <div>
            <input
              value={storeName}
              onChange={(event) => setStoreName(event.target.value)}
              className="input-field"
              placeholder="Store name"
            />
            <p className="mt-1 text-xs text-gray-500">You can edit your store name later in dashboard.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Mobile Number</label>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                <IndiaFlagIcon />
                +91
              </span>
              <input
                value={mobileNumber}
                onChange={(event) => handleMobileChange(event.target.value)}
                className="input-field"
                placeholder="9876543210"
              />
            </div>
          </div>
        </motion.div>
      )
    }

    if (step === 2) {
      return (
        <motion.div
          key="step-2"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22 }}
          className="card p-6 space-y-4"
        >
          <h2 className="text-xl font-semibold text-[#1A1A2E]">Instagram</h2>
          <div>
            <div className="flex items-center">
              <span className="flex items-center gap-1 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 px-3 py-3 text-gray-500">
                <Instagram className="h-4 w-4" />@
              </span>
              <input
                value={instagramHandle}
                onChange={(event) => setInstagramHandle(event.target.value.replace(/^@/, ''))}
                className="input-field rounded-l-none"
                placeholder="instagram-handle"
              />
            </div>
          </div>
        </motion.div>
      )
    }

    if (step === 3) {
      return (
        <motion.div
          key="step-3"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22 }}
          className="card p-6 space-y-4"
        >
          <h2 className="text-xl font-semibold text-[#1A1A2E]">Choose your Logo / Profile</h2>

          <label className="block cursor-pointer rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center hover:border-[#E8651A]/50">
            <UploadCloud className="mx-auto h-6 w-6 text-gray-500" />
            <p className="mt-2 text-sm font-medium text-gray-700">Upload logo</p>
            <p className="mt-0.5 text-xs text-gray-500">PNG, JPG, or WebP</p>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => handleLogoSelect(event.target.files?.[0] || null)}
              className="hidden"
            />
          </label>

          {logoPreview && (
            <div className="mt-2">
              <Image
                src={logoPreview}
                alt="Logo preview"
                width={96}
                height={96}
                unoptimized
                className="h-24 w-24 rounded-xl border border-gray-200 object-cover"
              />
            </div>
          )}
        </motion.div>
      )
    }

    if (step === 4) {
      return (
        <motion.div
          key="step-4"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22 }}
          className="card p-6 space-y-4"
        >
          <h2 className="text-xl font-semibold text-[#1A1A2E]">Add UPI Details</h2>
          <p className="text-sm text-gray-500">Buyers pay you directly on this UPI ID. You can skip and add later.</p>

          <div>
            <input
              value={upiId}
              onChange={(event) => {
                setUpiId(event.target.value.trim())
                if (event.target.value.trim()) {
                  setUpiSkipped(false)
                }
              }}
              className="input-field"
              placeholder="yourname@upi"
            />
            {upiId.trim().length > 0 && !validateUPIId(upiId.trim()) && (
              <p className="mt-1 text-xs text-red-500">Enter a valid UPI ID format.</p>
            )}
          </div>
        </motion.div>
      )
    }

    if (step === 5) {
      return (
        <motion.div
          key="step-5"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22 }}
          className="card p-6 space-y-4"
        >
          <h2 className="text-xl font-semibold text-[#1A1A2E]">What next?</h2>
          <p className="text-sm text-gray-500">You can add your first product now or do it later.</p>

          <button
            type="button"
            onClick={() => setFirstProductIntent('add_now')}
            className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
              firstProductIntent === 'add_now'
                ? 'border-[#E8651A] bg-[#F0ECF7]'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            Add your first product
          </button>

          <button
            type="button"
            onClick={() => setFirstProductIntent('later')}
            className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
              firstProductIntent === 'later'
                ? 'border-[#E8651A] bg-[#F0ECF7]'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            I will do it later
          </button>
        </motion.div>
      )
    }

    return (
      <motion.div
        key="step-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22 }}
        className="card p-6 space-y-4"
      >
        <h2 className="text-xl font-semibold text-[#1A1A2E]">Policies + Go Live</h2>
        <p className="text-sm text-gray-500">Customize your return/refund policy before publishing.</p>

        <div>
          <label className="mb-1 block text-sm font-medium">Return / Refund Policy</label>
          <textarea
            value={returnPolicy}
            onChange={(event) => setReturnPolicy(event.target.value)}
            rows={5}
            className="input-field resize-none"
          />
        </div>

        <div className="rounded-xl border border-[#E8651A]/20 bg-[#F0ECF7] p-4">
          <p className="text-xs text-gray-500">Your store link</p>
          <p className="mt-1 text-sm font-semibold text-[#1A1A2E]">linkmystore.in/{storeSlug}</p>
        </div>
      </motion.div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#E8651A]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <Image
          src="/logo-v2.png"
          alt="LinkMyStore"
          width={82}
          height={82}
          className="h-20 w-auto"
          style={{ width: 'auto' }}
        />
      </div>

      <div>
        <p className="text-sm text-gray-500">Step {step} of 6</p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full transition-all"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
            }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>

      <div className="space-y-3">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev))}
            disabled={saving}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}

        {step === 1 && (
          <button
            onClick={() => canContinueStep1 && setStep(2)}
            disabled={!canContinueStep1 || saving}
            className="btn-primary inline-flex w-full items-center justify-center gap-2 disabled:opacity-50"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {step === 2 && (
          <>
            <button
              onClick={() => setStep(3)}
              disabled={saving}
              className="btn-primary inline-flex w-full items-center justify-center gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setInstagramHandle('')
                setStep(3)
              }}
              className="block text-left text-sm text-gray-500 underline-offset-2 hover:underline"
            >
              Skip
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <button
              onClick={() => setStep(4)}
              disabled={saving}
              className="btn-primary inline-flex w-full items-center justify-center gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                handleLogoSelect(null)
                setStep(4)
              }}
              className="block text-left text-sm text-gray-500 underline-offset-2 hover:underline"
            >
              Skip
            </button>
          </>
        )}

        {step === 4 && (
          <>
            <button
              onClick={() => {
                if (!canContinueStep4) return
                setStep(5)
              }}
              disabled={!canContinueStep4 || saving}
              className="btn-primary inline-flex w-full items-center justify-center gap-2 disabled:opacity-50"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setUpiId('')
                setUpiSkipped(true)
                setStep(5)
              }}
              className="block text-left text-sm text-gray-500 underline-offset-2 hover:underline"
            >
              Skip
            </button>
          </>
        )}

        {step === 5 && (
          <button
            onClick={() => canContinueStep5 && setStep(6)}
            disabled={!canContinueStep5 || saving}
            className="btn-primary inline-flex w-full items-center justify-center gap-2 disabled:opacity-50"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {step === 6 && (
          <button
            onClick={goLive}
            disabled={saving}
            className="btn-primary inline-flex w-full items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? 'Going Live...' : 'Go Live'}
          </button>
        )}

        <p className="text-center text-xs text-gray-500">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="text-[#E8651A] hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-[#E8651A] hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
