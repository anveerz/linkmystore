'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { STORE_CATEGORIES } from '@/lib/constants'
import { validateUPIId } from '@/lib/upi'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import toast from 'react-hot-toast'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'

type Step = 1 | 2 | 3 | 4 | 5
type FirstProductMode = 'own' | 'affiliate' | 'skip'

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

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const slugDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)

  // Step 1: store setup
  const [fullName, setFullName] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [storeName, setStoreName] = useState('')
  const [storeSlug, setStoreSlug] = useState('')
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [slugChecking, setSlugChecking] = useState(false)

  // Step 2: category, bio
  const [category, setCategory] = useState<(typeof STORE_CATEGORIES)[number]>('Fashion')
  const [bio, setBio] = useState('')
  const [instagramHandle, setInstagramHandle] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // Step 3: UPI
  const [upiId, setUpiId] = useState('')
  const [upiSkipped, setUpiSkipped] = useState(false)

  // Step 4: first product
  const [firstProductMode, setFirstProductMode] = useState<FirstProductMode>('skip')
  const [firstProductTitle, setFirstProductTitle] = useState('')
  const [firstProductPrice, setFirstProductPrice] = useState('')
  const [firstProductDescription, setFirstProductDescription] = useState('')
  const [firstProductImage, setFirstProductImage] = useState<File | null>(null)
  const [firstProductImagePreview, setFirstProductImagePreview] = useState<string | null>(null)

  // Step 5: policies
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
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }

      const { data: existingCreator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', authUser.id)
        .single()

      if (existingCreator) {
        router.push('/dashboard')
        return
      }

      setUser(authUser)

      const prefillName = (authUser.user_metadata?.full_name as string | undefined)?.trim() || ''
      if (prefillName) {
        setFullName(prefillName)
        setStoreName(prefillName)
        const slug = slugify(prefillName)
        setStoreSlug(slug)
        void checkSlugAvailability(slug)
      }

      setReturnPolicy(buildDefaultPolicy('', authUser.email || null))
      setLoading(false)
    }

    void initialize()
  }, [checkSlugAvailability, router, supabase])

  useEffect(() => {
    const defaultPolicy = buildDefaultPolicy(mobileNumber, user?.email || null)
    if (!returnPolicy.trim() || returnPolicy.includes('Returns accepted within 7 days.')) {
      setReturnPolicy(defaultPolicy)
    }
  }, [mobileNumber, returnPolicy, user?.email])

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview)
      if (firstProductImagePreview) URL.revokeObjectURL(firstProductImagePreview)
    }
  }, [firstProductImagePreview, logoPreview])

  const handleStoreNameChange = (value: string) => {
    setStoreName(value)
    if (!storeSlug || slugify(storeName) === storeSlug) {
      const nextSlug = slugify(value)
      setStoreSlug(nextSlug)
      setSlugAvailable(null)
      if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current)
      slugDebounceRef.current = setTimeout(() => {
        void checkSlugAvailability(nextSlug)
      }, 350)
    }
  }

  const handleSlugChange = (value: string) => {
    const slug = slugify(value)
    setStoreSlug(slug)
    setSlugAvailable(null)

    if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current)
    slugDebounceRef.current = setTimeout(() => {
      void checkSlugAvailability(slug)
    }, 350)
  }

  const handleMobileChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    setMobileNumber(digits)
  }

  const handleLogoSelect = (file: File | null) => {
    if (logoPreview) URL.revokeObjectURL(logoPreview)
    setLogoFile(file)
    setLogoPreview(file ? URL.createObjectURL(file) : null)
  }

  const handleFirstProductImageSelect = (file: File | null) => {
    if (firstProductImagePreview) URL.revokeObjectURL(firstProductImagePreview)
    setFirstProductImage(file)
    setFirstProductImagePreview(file ? URL.createObjectURL(file) : null)
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

  const goLive = async () => {
    if (!user) return

    if (!fullName.trim() || !storeName.trim() || storeSlug.length < 3 || mobileNumber.length !== 10 || slugAvailable !== true) {
      toast.error('Please complete store setup details')
      setStep(1)
      return
    }

    if (upiId.trim() && !validateUPIId(upiId.trim())) {
      toast.error('Please enter a valid UPI ID')
      setStep(3)
      return
    }

    if (firstProductMode === 'own') {
      const parsedPrice = Number(firstProductPrice)
      if (!firstProductTitle.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
        toast.error('Enter a valid first product name and price, or skip this step')
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

      const creatorPayload: Record<string, unknown> = {
        user_id: user.id,
        phone: mobileNumber,
        mobile_number: mobileNumber,
        whatsapp_number: mobileNumber,
        email: user.email || null,
        full_name: fullName.trim(),
        store_slug: storeSlug,
        store_name: storeName.trim(),
        category,
        bio: bio.trim() || null,
        profile_image_url: profileImageUrl,
        instagram_handle: instagramHandle.trim() || null,
        return_policy: returnPolicy.trim() || buildDefaultPolicy(mobileNumber, user.email || null),
        bank_account: upiId.trim() ? { upi_id: upiId.trim() } : {},
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

      if (firstProductMode === 'own') {
        let firstImageUrl: string[] = []
        if (firstProductImage) {
          const ext = firstProductImage.name.split('.').pop() || 'jpg'
          const imagePath = `products/${creator.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
          const uploadedPath = await uploadFile('product-images', imagePath, firstProductImage)
          const { data } = supabase.storage.from('product-images').getPublicUrl(uploadedPath)
          firstImageUrl = [data.publicUrl]
        }

        const { error: productError } = await supabase.from('products').insert({
          creator_id: creator.id,
          title: firstProductTitle.trim(),
          description: firstProductDescription.trim() || null,
          price: Math.round(Number(firstProductPrice) * 100),
          type: 'physical',
          images: firstImageUrl,
          variants: [],
          category,
          is_active: true,
        })

        if (productError) {
          throw new Error(productError.message)
        }
      }

      toast.success('Your store is live')
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete onboarding')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-[#E8651A]" />
      </div>
    )
  }

  const canContinueStep1 =
    fullName.trim().length > 0 &&
    storeName.trim().length > 0 &&
    storeSlug.length >= 3 &&
    slugAvailable === true &&
    mobileNumber.length === 10

  const canContinueStep2 = category.length > 0

  const canContinueStep3 = upiSkipped || !upiId.trim() || validateUPIId(upiId.trim())

  const progress = (step / 5) * 100

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">Step {step} of 5</p>
        <div className="w-full h-2 rounded-full bg-gray-100 mt-2 overflow-hidden">
          <div className="h-full bg-[#E8651A] transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {step === 1 && (
        <div className="card p-6 space-y-4">
          <h2 className="text-xl font-semibold text-[#1A1A2E]">Create Your Store</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-field"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mobile Number</label>
            <div className="flex">
              <span className="bg-gray-50 px-3 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500 text-sm">+91</span>
              <input
                value={mobileNumber}
                onChange={(e) => handleMobileChange(e.target.value)}
                className="input-field rounded-l-none"
                placeholder="9876543210"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Store Name</label>
            <input
              value={storeName}
              onChange={(e) => handleStoreNameChange(e.target.value)}
              className="input-field"
              placeholder="My Store"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Store URL</label>
            <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
              <span className="text-xs text-gray-500 mr-2">linkmystore.in/</span>
              <input
                value={storeSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="w-full bg-transparent text-sm outline-none"
                placeholder="your-store"
              />
              {slugChecking && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
            </div>
            {slugAvailable === false && (
              <p className="text-xs text-red-500 mt-1">This slug is already taken.</p>
            )}
            {slugAvailable === true && (
              <p className="text-xs text-green-600 mt-1">Slug is available.</p>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card p-6 space-y-4">
          <h2 className="text-xl font-semibold text-[#1A1A2E]">Category And Bio</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as (typeof STORE_CATEGORIES)[number])}
              className="input-field"
            >
              {STORE_CATEGORIES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Short Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="input-field resize-none"
              rows={4}
              maxLength={200}
              placeholder="Tell buyers what you sell"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Instagram Handle (optional)</label>
            <input
              value={instagramHandle}
              onChange={(e) => setInstagramHandle(e.target.value.replace(/^@/, ''))}
              className="input-field"
              placeholder="yourhandle"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Logo / Profile Photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleLogoSelect(e.target.files?.[0] || null)}
              className="input-field"
            />
            {logoPreview && (
              <ImagePreview src={logoPreview} alt="Logo preview" />
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card p-6 space-y-4">
          <h2 className="text-xl font-semibold text-[#1A1A2E]">Add Payment Details</h2>
          <p className="text-sm text-gray-500">Buyers will pay you directly on this UPI ID.</p>

          <div>
            <label className="block text-sm font-medium mb-1">UPI ID</label>
            <input
              value={upiId}
              onChange={(e) => {
                setUpiId(e.target.value.trim())
                if (e.target.value.trim()) setUpiSkipped(false)
              }}
              className="input-field"
              placeholder="yourname@upi"
            />
            {upiId && !validateUPIId(upiId) && (
              <p className="text-xs text-red-500 mt-1">Enter a valid UPI ID format.</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setUpiId('')
              setUpiSkipped(true)
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            I will add this later
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="card p-6 space-y-4">
          <h2 className="text-xl font-semibold text-[#1A1A2E]">Add First Product</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFirstProductMode('own')}
              className={`rounded-xl border px-3 py-2 text-sm ${firstProductMode === 'own' ? 'border-[#E8651A] bg-[#FFF8F3]' : 'border-gray-200'}`}
            >
              Own Product
            </button>
            <button
              type="button"
              onClick={() => setFirstProductMode('affiliate')}
              className={`rounded-xl border px-3 py-2 text-sm ${firstProductMode === 'affiliate' ? 'border-[#E8651A] bg-[#FFF8F3]' : 'border-gray-200'}`}
            >
              Affiliate
            </button>
            <button
              type="button"
              onClick={() => setFirstProductMode('skip')}
              className={`rounded-xl border px-3 py-2 text-sm ${firstProductMode === 'skip' ? 'border-[#E8651A] bg-[#FFF8F3]' : 'border-gray-200'}`}
            >
              Skip
            </button>
          </div>

          {firstProductMode === 'affiliate' && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
              Affiliate product setup continues in dashboard after go-live.
            </div>
          )}

          {firstProductMode === 'own' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Product Name</label>
                <input
                  value={firstProductTitle}
                  onChange={(e) => setFirstProductTitle(e.target.value)}
                  className="input-field"
                  placeholder="Example: Handmade Earrings"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Price (INR)</label>
                <input
                  type="number"
                  min="1"
                  value={firstProductPrice}
                  onChange={(e) => setFirstProductPrice(e.target.value)}
                  className="input-field"
                  placeholder="499"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea
                  value={firstProductDescription}
                  onChange={(e) => setFirstProductDescription(e.target.value)}
                  className="input-field resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Product Photo (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFirstProductImageSelect(e.target.files?.[0] || null)}
                  className="input-field"
                />
                {firstProductImagePreview && (
                  <ImagePreview src={firstProductImagePreview} alt="Product preview" />
                )}
              </div>
            </>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="card p-6 space-y-4">
          <h2 className="text-xl font-semibold text-[#1A1A2E]">Policies And Go Live</h2>
          <p className="text-sm text-gray-500">Customize your return and refund policy.</p>

          <div>
            <label className="block text-sm font-medium mb-1">Return / Refund Policy</label>
            <textarea
              value={returnPolicy}
              onChange={(e) => setReturnPolicy(e.target.value)}
              rows={5}
              className="input-field resize-none"
            />
          </div>

          <div className="rounded-xl bg-[#FFF8F3] border border-[#E8651A]/20 p-4">
            <p className="text-xs text-gray-500">Your store link</p>
            <p className="text-sm font-semibold text-[#1A1A2E] mt-1">linkmystore.in/{storeSlug}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev))}
          disabled={step === 1 || saving}
          className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {step < 5 ? (
          <button
            onClick={() => {
              if (step === 1 && !canContinueStep1) return
              if (step === 2 && !canContinueStep2) return
              if (step === 3 && !canContinueStep3) return
              setStep((prev) => (prev < 5 ? ((prev + 1) as Step) : prev))
            }}
            disabled={
              saving ||
              (step === 1 && !canContinueStep1) ||
              (step === 2 && !canContinueStep2) ||
              (step === 3 && !canContinueStep3)
            }
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={goLive}
            disabled={saving}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Going Live...' : 'Go Live'}
          </button>
        )}
      </div>
    </div>
  )
}

function ImagePreview({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="mt-2">
      <Image
        src={src}
        alt={alt}
        width={80}
        height={80}
        unoptimized
        className="w-20 h-20 rounded-xl object-cover border border-gray-200"
      />
    </div>
  )
}
