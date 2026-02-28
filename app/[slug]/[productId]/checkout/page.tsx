'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import EventTracker from '@/components/analytics/EventTracker'
import {
  ChevronLeft,
  Lock,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
  MapPin,
  ShieldCheck,
  ExternalLink,
  Upload,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Creator, Product, StoreSettings, Variant } from '@/types'

interface CheckoutAttribution {
  source: string
  medium: string
  campaign: string | null
  referrer: string | null
}

interface AppliedCoupon {
  id: string
  code: string
  discount_amount: number
  original_amount: number
  final_amount: number
}

function inferTrafficSource(referrerHost: string): string {
  const host = referrerHost.toLowerCase()
  if (!host) return 'direct'
  if (host.includes('instagram')) return 'instagram'
  if (host.includes('whatsapp')) return 'whatsapp'
  if (host.includes('facebook')) return 'facebook'
  if (host.includes('youtube') || host.includes('youtu.be')) return 'youtube'
  if (host.includes('google')) return 'google'
  if (host.includes('x.com') || host.includes('twitter') || host.includes('t.co')) return 'x'
  return host
}

function normalizeAttributionValue(value: string, max = 64): string {
  return value.trim().toLowerCase().slice(0, max)
}

export default function CheckoutPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  const [product, setProduct] = useState<Product | null>(null)
  const [creator, setCreator] = useState<Creator | null>(null)
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)

  // Buyer details
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerName, setBuyerName] = useState('')

  // Physical product address
  const [pincode, setPincode] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const [pincodeValid, setPincodeValid] = useState<boolean | null>(null)

  // Saved info
  const [savedAddress, setSavedAddress] = useState(false)
  const [showSavedCard, setShowSavedCard] = useState(true)

  // Checkout state
  const [step, setStep] = useState<'details' | 'confirm' | 'success'>('details')
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [upiLink, setUpiLink] = useState<string | null>(null)
  const [sellerUpiId, setSellerUpiId] = useState<string | null>(null)
  const [sellerName, setSellerName] = useState<string | null>(null)
  const [upiReferenceNumber, setUpiReferenceNumber] = useState('')
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState<string | null>(null)
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false)
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const [pendingVerificationFlow, setPendingVerificationFlow] = useState(false)
  // Coupon state
  const [couponCode, setCouponCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)

  const slug = params.slug as string
  const productId = params.productId as string
  const selectedVariantIndex = parseInt(searchParams.get('variant') || '0', 10)

  const attribution = useMemo<CheckoutAttribution>(() => {
    const sourceParam = searchParams.get('utm_source') || searchParams.get('source') || searchParams.get('ref') || ''
    const mediumParam = searchParams.get('utm_medium') || searchParams.get('medium') || ''
    const campaignParam = searchParams.get('utm_campaign') || searchParams.get('campaign') || ''

    let referrerHost = ''
    if (typeof window !== 'undefined' && document.referrer) {
      try {
        referrerHost = new URL(document.referrer).hostname.replace(/^www\./, '')
      } catch {
        referrerHost = ''
      }
    }

    const source = normalizeAttributionValue(
      sourceParam || inferTrafficSource(referrerHost) || 'direct'
    )

    const medium = normalizeAttributionValue(
      mediumParam || (sourceParam ? 'campaign' : referrerHost ? 'referral' : 'direct')
    )

    return {
      source,
      medium,
      campaign: campaignParam ? campaignParam.trim().slice(0, 96) : null,
      referrer: referrerHost || null,
    }
  }, [searchParams])

  const fetchData = useCallback(async () => {
    try {
      // Fetch creator
      const { data: creatorData } = await supabase
        .from('creators')
        .select('*')
        .eq('store_slug', slug)
        .eq('is_active', true)
        .single()

      if (!creatorData) {
        toast.error('Store not found')
        return
      }
      setCreator(creatorData)

      // Fetch product
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('creator_id', creatorData.id)
        .eq('is_active', true)
        .single()

      if (!productData) {
        toast.error('Product not found')
        return
      }
      setProduct(productData)

      // Fetch settings
      const { data: settingsData } = await supabase
        .from('store_settings')
        .select('*')
        .eq('creator_id', creatorData.id)
        .single()

      setSettings(settingsData)

      // Load saved buyer info from localStorage
      const saved = localStorage.getItem('lms_buyer_info')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setBuyerName(parsed.name || '')
          setBuyerPhone(parsed.phone || '')
          setBuyerEmail(parsed.email || '')
          if (parsed.address && productData?.type === 'physical') {
            setPincode(parsed.address.pincode || '')
            setCity(parsed.address.city || '')
            setState(parsed.address.state || '')
            setAddressLine1(parsed.address.line1 || '')
            setAddressLine2(parsed.address.line2 || '')
            if (parsed.address.pincode) {
              setSavedAddress(true)
            }
          }
        } catch {
          console.error('Failed to parse saved buyer info')
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load checkout')
    } finally {
      setLoading(false)
    }
  }, [productId, slug, supabase])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  useEffect(() => {
    setAppliedCoupon(null)
    setCouponError('')
  }, [selectedVariantIndex, productId])

  const getPrice = (): number => {
    if (!product) return 0
    if (product.variants && product.variants.length > 0 && product.variants[selectedVariantIndex]?.price) {
      return product.variants[selectedVariantIndex].price
    }
    return product.price
  }

  const formatPrice = (paisa: number) => {
    return '₹' + (paisa / 100).toLocaleString('en-IN')
  }

  const getSelectedVariant = (): Variant | null => {
    if (!product?.variants || product.variants.length === 0) return null
    return product.variants[selectedVariantIndex] || null
  }

  const saveBuyerInfo = () => {
    const info = {
      name: buyerName,
      phone: buyerPhone,
      email: buyerEmail,
      address: product?.type === 'physical' ? {
        pincode, city, state, line1: addressLine1, line2: addressLine2
      } : null
    }
    localStorage.setItem('lms_buyer_info', JSON.stringify(info))
  }

  const handlePincodeChange = async (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6)
    setPincode(cleaned)

    if (cleaned.length === 6) {
      setPincodeLoading(true)
      setPincodeValid(null)

      try {
        const response = await fetch(`/api/pincode/${cleaned}`)
        const data = await response.json()

        if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
          const postOffice = data[0].PostOffice[0]
          setCity(postOffice.District || '')
          setState(postOffice.State || '')
          setPincodeValid(true)
        } else {
          setPincodeValid(false)
          setCity('')
          setState('')
        }
      } catch {
        setPincodeValid(false)
      }

      setPincodeLoading(false)
    } else {
      setPincodeValid(null)
      setCity('')
      setState('')
    }
  }

  const useSavedAddress = () => {
    setShowSavedCard(false)
  }

  const applyCoupon = async () => {
    if (!creator || !product) return
    if (!couponCode.trim()) {
      setCouponError('Enter a coupon code')
      return
    }

    setCouponLoading(true)
    setCouponError('')

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_id: creator.id,
          product_id: product.id,
          amount: getPrice(),
          coupon_code: couponCode.trim(),
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.valid) {
        setAppliedCoupon(null)
        setCouponError(data.error || 'Invalid coupon')
        return
      }

      setAppliedCoupon({
        id: data.coupon.id,
        code: data.coupon.code,
        discount_amount: data.discount_amount,
        original_amount: data.original_amount,
        final_amount: data.final_amount,
      })
      setCouponCode(data.coupon.code)
      toast.success(`Coupon ${data.coupon.code} applied`)
    } catch (error) {
      console.error('Coupon apply error:', error)
      setAppliedCoupon(null)
      setCouponError('Could not apply coupon right now')
    } finally {
      setCouponLoading(false)
    }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponError('')
  }

  const handleUploadScreenshot = async (file: File) => {
    setUploadingScreenshot(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/payment-screenshot', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload screenshot')
      }

      setPaymentScreenshotUrl(data.url)
      toast.success('Screenshot uploaded')
    } catch (error) {
      console.error('Screenshot upload failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload screenshot')
    } finally {
      setUploadingScreenshot(false)
    }
  }

  const handleConfirmUpi = async () => {
    if (!orderId) return

    const normalizedRef = upiReferenceNumber.replace(/\s/g, '')
    if (!normalizedRef && !paymentScreenshotUrl) {
      toast.error('Add UPI reference number or upload a screenshot')
      return
    }

    setConfirmingPayment(true)
    try {
      const response = await fetch('/api/checkout/confirm-upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          upi_reference_number: normalizedRef || null,
          payment_screenshot_url: paymentScreenshotUrl,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit payment confirmation')
      }

      setPendingVerificationFlow(true)
      setStep('success')
      toast.success('Payment confirmation submitted')
    } catch (error) {
      console.error('UPI confirmation failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit payment confirmation')
    } finally {
      setConfirmingPayment(false)
    }
  }

  const handlePayment = async () => {
    if (!product || !creator) return

    if (!buyerName.trim()) {
      toast.error('Please enter your name')
      return
    }
    if (!buyerPhone.trim() || buyerPhone.replace(/\D/g, '').length !== 10) {
      toast.error('Please enter a valid 10-digit phone number')
      return
    }

    if (product.type === 'digital') {
      if (!buyerEmail.trim() || !buyerEmail.includes('@')) {
        toast.error('Please enter a valid email address')
        return
      }
    } else {
      if (!pincode || pincode.length !== 6) {
        toast.error('Please enter a valid pincode')
        return
      }
      if (!addressLine1.trim()) {
        toast.error('Please enter your address')
        return
      }
      if (!city.trim()) {
        toast.error('City is required')
        return
      }
      if (!state.trim()) {
        toast.error('State is required')
        return
      }
    }

    // Save buyer info to localStorage
    saveBuyerInfo()
    setPaying(true)

    try {
      const response = await fetch('/api/checkout/create-upi-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          creator_id: creator.id,
          variant_index: selectedVariantIndex,
          buyer_name: buyerName.trim(),
          buyer_phone: '+91' + buyerPhone.replace(/\D/g, ''),
          buyer_email: buyerEmail.trim() || null,
          shipping_address: product.type === 'physical'
            ? {
                line1: addressLine1.trim(),
                line2: addressLine2.trim() || null,
                city: city.trim(),
                state: state.trim(),
                pincode: pincode.trim(),
              }
            : null,
          coupon_code: appliedCoupon?.code || null,
          traffic_source: attribution.source,
          traffic_medium: attribution.medium,
          traffic_campaign: attribution.campaign,
          traffic_referrer: attribution.referrer,
          visitor_id: typeof window !== 'undefined' ? localStorage.getItem('lms_visitor_id') : null,
          session_id: typeof window !== 'undefined' ? sessionStorage.getItem('lms_session_id') : null,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create order')

      setOrderId(data.order_id)
      setOrderNumber(data.order_number)
      setUpiLink(data.upi_link)
      setSellerUpiId(data.seller_upi_id || null)
      setSellerName(data.seller_name || creator.store_name)
      setStep('confirm')

      if (data.upi_link && typeof window !== 'undefined') {
        // Open UPI intent immediately after order creation.
        window.location.href = data.upi_link
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPaying(false)
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
          <Link href={`/${slug}`} className="btn-primary mt-4 inline-block">
            Back to Store
          </Link>
        </div>
      </div>
    )
  }

  const accentColor = settings?.accent_color || '#E8651A'
  const price = getPrice()
  const payableAmount = appliedCoupon?.final_amount ?? price
  const couponDiscount = appliedCoupon?.discount_amount || 0
  const selectedVariant = getSelectedVariant()
  const checkoutTracker = (
    <EventTracker
      creatorId={creator.id}
      eventType="checkout_start"
      productId={product.id}
      metadata={{ slug: creator.store_slug }}
    />
  )

  // UPI confirmation step
  if (step === 'confirm') {
    return (
      <div className="max-w-lg mx-auto bg-white min-h-screen px-4 py-8">
        {checkoutTracker}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#E8651A]/10 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-[#E8651A]" />
          </div>
          <h1 className="text-xl font-bold mt-4">Complete UPI Payment</h1>
          <p className="text-sm text-gray-500 mt-2">
            Pay {formatPrice(payableAmount)} to {sellerName || creator.store_name} via UPI
          </p>
          {orderNumber && (
            <p className="text-xs font-mono text-gray-400 mt-2">Order #{orderNumber}</p>
          )}
        </div>

        <div className="card mt-6">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Seller UPI ID</p>
          <p className="text-sm font-medium text-gray-800 break-all">{sellerUpiId || 'Not available'}</p>
          {upiLink && (
            <button
              onClick={() => {
                window.location.href = upiLink
              }}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open UPI App Again
            </button>
          )}
        </div>

        <div className="card mt-4">
          <label className="block text-sm font-medium mb-2">UPI Reference Number (12 digits)</label>
          <input
            type="text"
            value={upiReferenceNumber}
            onChange={(e) => setUpiReferenceNumber(e.target.value.replace(/[^\d\s]/g, '').slice(0, 14))}
            placeholder="e.g., 412345678901"
            className="input-field"
          />
          <p className="text-xs text-gray-500 mt-1">Optional if you upload screenshot below.</p>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Payment Screenshot (optional)</label>
            <label className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-gray-400 cursor-pointer">
              {uploadingScreenshot ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Screenshot
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    void handleUploadScreenshot(file)
                  }
                }}
              />
            </label>
            {paymentScreenshotUrl && (
              <a
                href={paymentScreenshotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#E8651A] mt-2 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                View uploaded screenshot
              </a>
            )}
          </div>

          <button
            onClick={handleConfirmUpi}
            disabled={confirmingPayment}
            className="btn-primary w-full mt-5 flex items-center justify-center gap-2"
          >
            {confirmingPayment ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'I Have Paid - Confirm Payment'
            )}
          </button>
        </div>

        <Link href={`/${slug}`} className="btn-secondary w-full mt-4 text-center block">
          Back to Store
        </Link>
      </div>
    )
  }

  // Success Step
  if (step === 'success') {
    return (
      <div className="max-w-lg mx-auto bg-white min-h-screen px-4 py-12">
        {checkoutTracker}
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mt-6">Order Placed</h1>
          <p className="text-sm text-gray-500 mt-2">
            {pendingVerificationFlow
              ? 'Your payment details were submitted. The seller will verify and process your order shortly.'
              : 'Your order was received successfully.'}
          </p>
          {orderNumber && (
            <p className="text-sm font-mono text-gray-400 mt-2">Order #{orderNumber}</p>
          )}
        </div>

        <div className="card mt-8 max-w-sm mx-auto">
          <p className="text-sm text-gray-600">
            You can share your order number with the seller for faster confirmation.
          </p>
          {upiReferenceNumber && (
            <p className="text-xs text-gray-500 mt-2">
              UPI Ref: <span className="font-mono">{upiReferenceNumber.replace(/\s/g, '')}</span>
            </p>
          )}
        </div>

        <Link
          href={`/${slug}`}
          className="btn-secondary w-full max-w-sm mx-auto mt-6 block text-center"
        >
          Back to Store
        </Link>
      </div>
    )
  }

  // Details Step
  return (
    <div className="max-w-lg mx-auto bg-white min-h-screen pb-24">
      {checkoutTracker}
      {/* Top Nav */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="h-14 flex items-center px-4">
          <Link href={`/${slug}/${productId}`} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="flex-1 text-center font-semibold text-sm">Checkout</span>
          <Lock className="w-3.5 h-3.5 text-gray-400" />
        </div>
      </div>

      {/* Product Summary */}
      <div className="mx-4 mt-4 flex items-center gap-3 pb-4 border-b border-gray-100">
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={product.title}
            width={56}
            height={56}
            unoptimized
            className="w-14 h-14 rounded-xl object-cover bg-gray-100"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gray-100" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{product.title}</p>
          {selectedVariant && (
            <p className="text-xs text-gray-500">{selectedVariant.name}</p>
          )}
        </div>
        <p className="text-lg font-bold" style={{ color: accentColor }}>
          {formatPrice(payableAmount)}
        </p>
      </div>

      {/* Coupon Section */}
      <div className="mx-4 mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
        {appliedCoupon ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500">Coupon Applied</p>
              <p className="text-sm font-semibold text-green-700">
                {appliedCoupon.code} — saved {formatPrice(couponDiscount)}
              </p>
            </div>
            <button
              onClick={removeCoupon}
              className="text-xs font-medium text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
              Have a coupon?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                className="input-field py-2.5 text-sm"
              />
              <button
                onClick={applyCoupon}
                disabled={couponLoading}
                className="px-4 py-2.5 rounded-xl bg-[#1A1A2E] text-white text-sm font-semibold disabled:opacity-50"
              >
                {couponLoading ? 'Applying...' : 'Apply'}
              </button>
            </div>
            {couponError && (
              <p className="text-xs text-red-500 mt-1.5">{couponError}</p>
            )}
          </>
        )}
      </div>

      {/* DIGITAL PRODUCT CHECKOUT */}
      {product.type === 'digital' && (
        <div className="mx-4 mt-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto">
            <Zap className="w-8 h-8 text-purple-500" />
          </div>
          <h2 className="text-lg font-bold mt-4">Instant Digital Delivery</h2>
          <p className="text-sm text-gray-500 mt-1">
            Pay via UPI and submit payment confirmation
          </p>

          <div className="mt-6 space-y-3">
            <input
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Your name"
              className="input-field text-center"
            />
            <div className="flex">
              <span className="bg-gray-50 px-3 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500 text-sm">
                +91
              </span>
              <input
                type="tel"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                maxLength={10}
                className="input-field rounded-l-none text-center"
              />
            </div>
            <input
              type="email"
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
              placeholder="your@email.com"
              className="input-field text-center"
            />
            {buyerEmail && buyerEmail.includes('@') && (
              <p className="text-xs text-green-600 mt-2">Valid email</p>
            )}
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePayment}
            disabled={
              paying ||
              !buyerName.trim() ||
              buyerPhone.replace(/\D/g, '').length !== 10 ||
              !buyerEmail.trim() ||
              !buyerEmail.includes('@')
            }
            className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            style={{
              background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}CC 100%)`,
            }}
          >
            {paying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Pay via UPI {formatPrice(payableAmount)}
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3" /> Direct payment
            </span>
            <span>UPI intent link</span>
          </div>
        </div>
      )}

      {/* PHYSICAL PRODUCT CHECKOUT */}
      {product.type === 'physical' && (
        <>
          {/* Saved Address Card */}
          {savedAddress && showSavedCard && addressLine1 && (
            <div className="mx-4 mt-4 card border-2 border-green-200 bg-green-50/30">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-sm">Deliver to this address</span>
              </div>
              <p className="text-sm text-gray-700 mt-2">
                {addressLine1}
                {addressLine2 && `, ${addressLine2}`}
              </p>
              <p className="text-sm text-gray-700">
                {city}, {state} — {pincode}
              </p>
              <p className="text-xs text-gray-500 mt-1">{buyerName} • {buyerPhone}</p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={useSavedAddress}
                  className="btn-primary text-sm py-2 flex-1"
                >
                  Use This Address
                </button>
                <button
                  onClick={() => setShowSavedCard(false)}
                  className="text-sm text-gray-500 underline px-4"
                >
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* Contact Section */}
          {(!savedAddress || !showSavedCard) && (
            <>
              <div className="mx-4 mt-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Contact
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Full Name"
                    className="input-field"
                  />
                  <div className="flex">
                    <span className="bg-gray-50 px-3 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500 text-sm">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      maxLength={10}
                      className="input-field rounded-l-none"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Section */}
              <div className="mx-4 mt-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Shipping Address
                </p>

                {/* Pincode Row */}
                <div className="flex items-center gap-3">
                  <div className="relative w-40">
                    <input
                      type="tel"
                      value={pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      placeholder="Pincode"
                      maxLength={6}
                      className="input-field pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {pincodeLoading && (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      )}
                      {pincodeValid === true && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                      {pincodeValid === false && (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  {pincodeValid === true && city && state && (
                    <div className="text-sm font-medium text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                      {city}, {state}
                    </div>
                  )}
                </div>
                {pincodeValid === false && (
                  <p className="text-xs text-red-500 mt-1">Invalid pincode</p>
                )}

                {/* Address Lines */}
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="House/Flat No., Building, Street"
                  className="input-field mt-3"
                />
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Area, Landmark (optional)"
                  className="input-field mt-3"
                />

                {/* City + State */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="input-field bg-gray-50"
                  />
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    className="input-field bg-gray-50"
                  />
                </div>

                {/* Email (optional) */}
                <input
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="Email (optional — for order updates)"
                  className="input-field mt-3"
                />
              </div>

              {/* Price Summary */}
              <div className="mx-4 mt-6 bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(price)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-green-700 mt-1">
                    <span>Coupon ({appliedCoupon.code})</span>
                    <span>-{formatPrice(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>Delivery</span>
                  <span>Handled by seller</span>
                </div>
                <div className="h-px bg-gray-200 my-2" />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span>{formatPrice(payableAmount)}</span>
                </div>
              </div>
            </>
          )}

          {/* Pay Button */}
          <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-4 py-4 z-20">
            <button
              onClick={handlePayment}
              disabled={paying || (savedAddress && showSavedCard ? false : !buyerName || !buyerPhone || !pincode || !addressLine1 || !city || !state)}
              className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}CC 100%)`,
              }}
            >
              {paying ? (
                <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                Pay via UPI {formatPrice(payableAmount)}
              </>
            )}
          </button>
            <p className="text-center text-[11px] text-gray-400 mt-2">
              Direct UPI payment to seller
            </p>
          </div>
        </>
      )}
    </div>
  )
}




