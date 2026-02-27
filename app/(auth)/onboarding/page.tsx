'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import toast from 'react-hot-toast'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Phone,
  User,
  Store,
  Package,
  FileDown,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)

  // Step 1 fields
  const [storeSlug, setStoreSlug] = useState('')
  const [fullName, setFullName] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [slugChecking, setSlugChecking] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

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
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      // Pre-fill full name from Google display name
      if (user.user_metadata?.full_name) {
        setFullName(user.user_metadata.full_name)
        // Auto-generate slug from name
        const slug = generateSlug(user.user_metadata.full_name)
        setStoreSlug(slug)
        checkSlugAvailability(slug)
      }
    }
    fetchUser()
  }, [checkSlugAvailability, router, supabase])

  const handleSlugChange = (slug: string) => {
    const transformed = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    setStoreSlug(transformed)
    setSlugAvailable(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      checkSlugAvailability(transformed)
    }, 500)
  }

  const handleMobileChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    setMobileNumber(digits)
  }

  const handleCreateStore = async (productType: 'digital' | 'physical') => {
    setLoading(true)

    try {
      if (!user) {
        router.push('/login')
        return
      }

      // Insert creator
      const { data: creator, error } = await supabase
        .from('creators')
        .insert({
          user_id: user.id,
          phone: mobileNumber,
          email: user.email || '',
          full_name: fullName,
          mobile_number: mobileNumber,
          store_slug: storeSlug,
          store_name: fullName, // Use full name as store name
          bio: null,
          instagram_handle: null,
          profile_image_url: null,
        })
        .select('id')
        .single()

      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }

      // Insert store settings
      await supabase.from('store_settings').insert({
        creator_id: creator.id,
        theme: 'default',
        accent_color: '#E8651A',
        social_links: {},
      })

      toast.success('Your store is live! 🎉')

      // Redirect to the appropriate product creation page
      router.push(`/dashboard/products/new?type=${productType}`)
      router.refresh()
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const canProceedStep1 =
    fullName.trim().length > 0 &&
    storeSlug.length >= 3 &&
    slugAvailable === true &&
    mobileNumber.length === 10

  return (
    <div className="w-full">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${step === 1
          ? 'bg-gradient-to-r from-[#E8651A] to-[#C75516] text-white shadow-lg shadow-[#E8651A]/20'
          : 'bg-[#F0ECF7] text-[#555567]'
          }`}>
          <Store className="w-4 h-4" />
          Your Details
        </div>
        <div className={`w-12 h-1 rounded-full transition-all ${step === 2 ? 'bg-gradient-to-r from-[#E8651A] to-[#3D2176]' : 'bg-[#E5E5EC]'
          }`} />
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${step === 2
          ? 'bg-gradient-to-r from-[#3D2176] to-[#2E1859] text-white shadow-lg shadow-[#3D2176]/20'
          : 'bg-[#F0ECF7] text-[#555567]'
          }`}>
          <Package className="w-4 h-4" />
          First Product
        </div>
      </div>

      {/* Step 1: Your Details */}
      {step === 1 && (
        <div className="card p-8 animate-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E8651A]/10 to-[#3D2176]/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-[#E8651A]" />
            </div>
            <h2 className="text-2xl font-bold text-[#1A1A2E]">Let&apos;s set up your store</h2>
            <p className="text-[#555567] text-sm mt-1">
              This takes less than a minute ⚡
            </p>
          </div>

          {/* Slug Name */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
              Your Store Link <span className="text-red-500">*</span>
            </label>
            <div className="bg-[#FFF8F3] rounded-xl p-4 border border-[#E8651A]/10">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#8E8E9F]">linkmystore.in/</span>
                <input
                  type="text"
                  value={storeSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="your-store"
                  className="flex-1 font-semibold text-[#1A1A2E] bg-white px-3 py-2 rounded-lg border border-[#E5E5EC] outline-none focus:border-[#E8651A] transition-colors text-sm"
                />
                {slugChecking && <Loader2 className="w-4 h-4 animate-spin text-[#8E8E9F]" />}
                {slugAvailable === true && !slugChecking && (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
                {slugAvailable === false && !slugChecking && (
                  <div className="flex items-center gap-1">
                    <XCircle className="w-5 h-5 text-red-500" />
                  </div>
                )}
              </div>
              {slugAvailable === false && !slugChecking && (
                <p className="text-xs text-red-500 mt-2">This slug is already taken. Try another one.</p>
              )}
            </div>
          </div>

          {/* Full Name */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E9F]" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="input-field pl-12"
              />
            </div>
          </div>

          {/* Mobile Number */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <span className="bg-[#FFF8F3] px-4 py-3 rounded-l-xl border border-r-0 border-[#E5E5EC] text-[#555567] text-sm font-medium flex items-center gap-1">
                🇮🇳 +91
              </span>
              <div className="relative flex-1">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E9F]" />
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => handleMobileChange(e.target.value)}
                  placeholder="9876543210"
                  className="input-field rounded-l-none pl-12"
                />
              </div>
            </div>
            {mobileNumber && mobileNumber.length < 10 && (
              <p className="text-xs text-[#8E8E9F] mt-1">Enter a 10-digit mobile number</p>
            )}
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!canProceedStep1}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: Choose Product Type */}
      {step === 2 && (
        <div className="animate-in">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A2E]">
              What would you like to sell?
            </h2>
            <p className="text-[#555567] text-sm mt-1">
              Create your first product to get started
            </p>
          </div>

          <div className="space-y-4">
            {/* Digital Product Block */}
            <button
              onClick={() => handleCreateStore('digital')}
              disabled={loading}
              className="w-full group cursor-pointer"
            >
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#3D2176] to-[#2E1859] p-6 sm:p-8 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-[#3D2176]/20 hover:-translate-y-1 active:scale-[0.98]">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#E8651A]/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />

                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileDown className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    Digital Product
                  </h3>
                  <p className="text-sm text-[#C4B5E0] mt-2 max-w-sm">
                    Sell courses, ebooks, templates, coaching sessions, calendars, memberships, and more — all delivered instantly
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {['📚 Courses', '📖 eBooks', '🎨 Templates', '🗓️ Bookings', '💡 Coaching'].map((tag) => (
                      <span key={tag} className="text-xs font-medium bg-white/10 text-white/80 px-3 py-1 rounded-full backdrop-blur-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-5 text-[#E8651A] font-medium">
                    <span className="text-sm">Get Started</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </button>

            {/* Physical Product Block */}
            <button
              onClick={() => handleCreateStore('physical')}
              disabled={loading}
              className="w-full group cursor-pointer"
            >
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#E8651A] to-[#C75516] p-6 sm:p-8 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-[#E8651A]/20 hover:-translate-y-1 active:scale-[0.98]">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#3D2176]/10 rounded-full blur-2xl" />

                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Package className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    Physical Product
                  </h3>
                  <p className="text-sm text-white/80 mt-2 max-w-sm">
                    Sell handmade goods, clothing, accessories, art, food items — anything you ship to customers
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {['👕 Clothing', '💎 Jewellery', '🎨 Art', '🧴 Beauty', '🍬 Food'].map((tag) => (
                      <span key={tag} className="text-xs font-medium bg-white/10 text-white/80 px-3 py-1 rounded-full backdrop-blur-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-5 text-white font-medium">
                    <span className="text-sm">Get Started</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Back button */}
          <button
            onClick={() => setStep(1)}
            className="mt-6 text-sm text-[#555567] hover:text-[#1A1A2E] cursor-pointer mx-auto block"
          >
            ← Back to details
          </button>

          {loading && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
                <Loader2 className="w-8 h-8 animate-spin text-[#E8651A] mx-auto" />
                <p className="text-sm font-medium mt-3 text-[#1A1A2E]">Creating your store...</p>
                <p className="text-xs text-[#8E8E9F] mt-1">This takes just a moment ✨</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
