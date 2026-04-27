'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Loader2, Download, CheckCircle2, Gift } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ClaimPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const slug = params.slug as string
  const productId = params.productId as string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [product, setProduct] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [creator, setCreator] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<'form' | 'success'>('form')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [downloadUrls, setDownloadUrls] = useState<string[]>([])

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, productId])

  const fetchData = async () => {
    try {
      const { data: creatorData } = await supabase
        .from('creators')
        .select('*')
        .eq('store_slug', slug)
        .eq('is_active', true)
        .single()

      if (!creatorData) return
      setCreator(creatorData)

      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('creator_id', creatorData.id)
        .eq('is_active', true)
        .single()

      if (!productData) return

      const isLeadMagnet =
        productData.is_lead_magnet === true || productData.digital_subtype === 'lead_magnet'
      if (!isLeadMagnet) {
        toast.error('This product is not a free lead magnet.')
        router.replace(`/${slug}/${productId}`)
        return
      }

      setProduct(productData)

      const { data: settingsData } = await supabase
        .from('store_settings')
        .select('*')
        .eq('creator_id', creatorData.id)
        .single()
      setSettings(settingsData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async () => {
    if (!name.trim()) { toast.error('Please enter your name'); return }
    if (!email.trim() || !email.includes('@')) { toast.error('Please enter a valid email'); return }
    if (!product || !creator) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/lead-captures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          creator_id: creator.id,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone ? '+91' + phone.replace(/\D/g, '') : null,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to claim')

      setDownloadUrls(data.download_urls || [])
      setStep('success')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto bg-white min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!product || !creator) {
    return (
      <div className="max-w-lg mx-auto bg-white min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500">Product not found</p>
          <Link href={`/${slug}`} className="btn-primary mt-4 inline-block">Back to Store</Link>
        </div>
      </div>
    )
  }

  const accentColor = settings?.accent_color || '#E8651A'
  const shouldShowBranding = creator?.plan !== 'pro' || settings?.show_branding !== false

  // ── Success Step ──────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="max-w-lg mx-auto bg-white min-h-screen px-4 py-12">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 mx-auto flex items-center justify-center animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mt-6">You&apos;re in! 🎉</h1>
          <p className="text-gray-500 text-sm mt-2">
            Your free download is ready, {name.split(' ')[0]}!
          </p>
        </div>

        {downloadUrls.length > 0 ? (
          <div className="mt-8 max-w-sm mx-auto space-y-3">
            {downloadUrls.map((url, idx) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-bold text-lg text-white transition-all hover:shadow-lg hover:-translate-y-0.5"
                style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #3D2176 100%)` }}
              >
                <Download className="w-5 h-5" />
                {downloadUrls.length > 1 ? `Download File ${idx + 1}` : 'Download Now'}
              </a>
            ))}
            <p className="text-sm text-gray-400 text-center mt-2">
              Link valid for 7 days • Also sent to {email}
            </p>
          </div>
        ) : (
          <div className="mt-8 max-w-sm mx-auto text-center">
            <div className="bg-blue-50 rounded-2xl p-5">
              <p className="text-sm text-gray-600">
                📧 Check your email <strong>{email}</strong> for the download link!
              </p>
            </div>
          </div>
        )}

        <div className="max-w-sm mx-auto mt-6">
          <Link
            href={`/${slug}`}
            className="btn-secondary w-full block text-center"
          >
            Back to Store
          </Link>
        </div>

        {shouldShowBranding && (
          <p className="text-center text-xs text-gray-300 mt-8">
            Powered by{' '}
            <a href="https://linkmystore.in" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400">
              LinkMyStore
            </a>
          </p>
        )}
      </div>
    )
  }

  // ── Claim Form ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto bg-white min-h-screen pb-32">
      {/* Nav */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="h-14 flex items-center px-4">
          <Link href={`/${slug}/${productId}`} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="flex-1 text-center font-semibold text-sm">Get for Free</span>
          <Gift className="w-4 h-4 text-pink-500" />
        </div>
      </div>

      {/* Product Summary Card */}
      <div className="mx-4 mt-6">
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-100 rounded-2xl p-4 flex items-center gap-4">
          {product.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.images[0]} alt={product.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-2xl flex-shrink-0">
              🧲
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 line-clamp-2">{product.title}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-lg font-bold text-green-600">FREE</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">No payment needed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mx-4 mt-6">
        <h2 className="text-lg font-bold text-[#0F172A] mb-1">Almost there!</h2>
        <p className="text-sm text-gray-500 mb-6">Enter your details to get instant access</p>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
              Your Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="input-field"
              autoComplete="name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
              Email Address <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="input-field"
              autoComplete="email"
            />
            {email && !email.includes('@') && (
              <p className="text-xs text-red-500 mt-1">Please enter a valid email</p>
            )}
            {email && email.includes('@') && (
              <p className="text-xs text-green-600 mt-1">✓ Valid email</p>
            )}
          </div>

          {/* Phone (optional) */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
              Phone <span className="text-gray-300 font-normal normal-case">(optional)</span>
            </label>
            <div className="flex">
              <span className="bg-gray-50 px-3 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500 text-sm flex-shrink-0">
                +91
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                maxLength={10}
                className="input-field rounded-l-none"
              />
            </div>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="mt-6 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-green-500">✓</span> Instant access after claiming
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-green-500">✓</span> No credit card required
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-green-500">✓</span> Your info is kept private
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleClaim}
            disabled={submitting || !name.trim() || !email.trim() || !email.includes('@')}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Getting your download...
              </>
            ) : (
              '🧲 Get Instant Access — Free'
            )}
          </button>
          <p className="text-center text-[11px] text-gray-400 mt-2">
            🎁 Free — No payment or credit card required
          </p>
        </div>
      </div>
    </div>
  )
}
