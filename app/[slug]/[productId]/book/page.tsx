'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Calendar,
  Clock,
  Lock,
  Video,
  Phone,
  Copy,
  Download,
  ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'

const DAY_NAMES_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const PLATFORM_ICONS: Record<string, string> = {
  google_meet: '📹',
  zoom: '💻',
  whatsapp_call: '📱',
  phone: '📞',
}
const PLATFORM_LABELS: Record<string, string> = {
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  whatsapp_call: 'WhatsApp Call',
  phone: 'Phone Call',
}

interface DurationOption {
  duration_minutes: number
  price: number
  label?: string
}

function formatTime12(time24: string) {
  const [h, m] = time24.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function BookPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [paying, setPaying] = useState(false)

  // Calendar state
  const today = new Date()
  const [calendarYear, setCalendarYear] = useState(today.getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Slots
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  // Buyer details
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')

  // Step
  const [step, setStep] = useState<'duration' | 'date' | 'time' | 'details' | 'upi_confirm' | 'success'>('duration')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [sessionMode, setSessionMode] = useState<'pg' | 'upi' | null>(null)
  const [pendingVerificationFlow, setPendingVerificationFlow] = useState(false)
  const [submittedUtr, setSubmittedUtr] = useState<string | null>(null)
  const [sellerUpiId, setSellerUpiId] = useState<string | null>(null)
  const [sellerName, setSellerName] = useState<string | null>(null)
  const [upiQrLink, setUpiQrLink] = useState<string | null>(null)
  const [upiTransactionRef, setUpiTransactionRef] = useState<string | null>(null)
  const [upiTransactionNote, setUpiTransactionNote] = useState<string | null>(null)
  const [upiReferenceNumber, setUpiReferenceNumber] = useState('')
  const [confirmingUpi, setConfirmingUpi] = useState(false)
  const [durationOptions, setDurationOptions] = useState<DurationOption[]>([])
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState<number | null>(null)
  const [selectedDurationPrice, setSelectedDurationPrice] = useState<number | null>(null)

  const variantIndex = parseInt(searchParams.get('variant') || '0', 10)

  const deriveDurationOptions = (productData: Record<string, unknown>): DurationOption[] => {
    const subtype = productData.digital_subtype as string | undefined
    if (subtype === 'coaching') {
      const coachingData = (productData.coaching_data || {}) as {
        duration_options?: Array<{ duration_minutes: number; price: number; label?: string }>
        duration_minutes?: number
      }

      const durationOptionsFromProduct = Array.isArray(coachingData.duration_options)
        ? coachingData.duration_options
            .filter((option) => option?.duration_minutes && option?.price >= 0)
            .map((option) => ({
              duration_minutes: Number(option.duration_minutes),
              price: Number(option.price),
              label: option.label,
            }))
        : []

      if (durationOptionsFromProduct.length > 0) {
        return durationOptionsFromProduct
      }

      return [
        {
          duration_minutes: Number(coachingData.duration_minutes || 30),
          price: Number(productData.price || 0),
          label: 'Session',
        },
      ]
    }

    const calendarData = (productData.calendar_data || {}) as { duration_minutes?: number }
    return [
      {
        duration_minutes: Number(calendarData.duration_minutes || 30),
        price: Number(productData.price || 0),
        label: 'Slot',
      },
    ]
  }

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, productId])

  const fetchData = async () => {
    try {
      const { data: creatorData } = await supabase
        .from('creators').select('*').eq('store_slug', slug).eq('is_active', true).single()
      if (!creatorData) return
      setCreator(creatorData)

      const { data: productData } = await supabase
        .from('products').select('*').eq('id', productId).eq('creator_id', creatorData.id).eq('is_active', true).single()
      if (!productData) return

      const digitalSubtype = productData.digital_subtype as string | null | undefined
      if (digitalSubtype !== 'coaching' && digitalSubtype !== 'calendar') {
        toast.error('This product uses regular checkout, not session booking.')
        router.replace(`/${slug}/${productId}`)
        return
      }

      setProduct(productData)

      const options = deriveDurationOptions(productData as Record<string, unknown>)
      setDurationOptions(options)
      setSelectedDurationMinutes(options[0]?.duration_minutes || null)
      setSelectedDurationPrice(options[0]?.price ?? null)
      setStep('duration')
      loadRazorpayScript()

      const { data: settingsData } = await supabase
        .from('store_settings').select('*').eq('creator_id', creatorData.id).single()
      setSettings(settingsData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadRazorpayScript = () => {
    if (document.querySelector('script[src*="razorpay"]')) return
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
  }

  const getConfig = useCallback(() => {
    if (!product) return null
    return product.coaching_data || product.calendar_data || null
  }, [product])

  const getAvailableDays = useCallback((): number[] => {
    const config = getConfig()
    if (!config?.availability) return []
    return [...new Set((config.availability as { day_of_week: number }[]).map(s => s.day_of_week))]
  }, [getConfig])

  const getAdvanceDays = useCallback((): number => {
    const config = getConfig()
    return config?.advance_booking_days || 30
  }, [getConfig])

  const isDateAvailable = useCallback((date: Date): boolean => {
    const availDays = getAvailableDays()
    if (!availDays.includes(date.getDay())) return false
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    if (date < todayStart) return false
    const maxDate = new Date(todayStart)
    maxDate.setDate(maxDate.getDate() + getAdvanceDays())
    if (date > maxDate) return false
    return true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAvailableDays, getAdvanceDays])

  const fetchSlots = async (dateStr: string) => {
    setSlotsLoading(true)
    setSlots([])
    setSelectedTime(null)
    try {
      const durationQuery = selectedDurationMinutes ? `&duration_minutes=${selectedDurationMinutes}` : ''
      const res = await fetch(`/api/bookings/available-slots?product_id=${productId}&date=${dateStr}${durationQuery}`)
      const data = await res.json()
      setSlots(data.slots || [])
    } catch {
      toast.error('Could not load time slots')
    } finally {
      setSlotsLoading(false)
    }
  }

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr)
    fetchSlots(dateStr)
    setStep('time')
  }

  const handleDurationSelect = (option: DurationOption) => {
    setSelectedDurationMinutes(option.duration_minutes)
    setSelectedDurationPrice(option.price)
    setSelectedDate(null)
    setSelectedTime(null)
    setSlots([])
    setStep('date')
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setStep('details')
  }

  const getPrice = () => {
    if (!product) return 0
    if (selectedDurationPrice !== null) return selectedDurationPrice
    if (product.variants?.length > 0 && product.variants[variantIndex]?.price) {
      return product.variants[variantIndex].price
    }
    return product.price
  }

  const formatPrice = (paisa: number) => '₹' + (paisa / 100).toLocaleString('en-IN')

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`)
    }
  }

  const handleConfirmUpi = async () => {
    if (!orderId) return

    const normalizedUtr = upiReferenceNumber.replace(/\s/g, '')
    if (!normalizedUtr) {
      toast.error('Please enter your 12-digit UTR after payment')
      return
    }

    setConfirmingUpi(true)
    try {
      const proofResponse = await fetch('/api/payments/upi/submit-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          utr: normalizedUtr,
        }),
      })

      const proofData = await proofResponse.json()
      if (!proofResponse.ok) {
        throw new Error(proofData.error || 'Failed to submit UPI proof')
      }

      setSubmittedUtr(normalizedUtr)
      setPendingVerificationFlow(true)
      setStep('success')
      toast.success('UPI payment proof submitted')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit UPI proof')
    } finally {
      setConfirmingUpi(false)
    }
  }

  const handlePayment = async () => {
    if (!product || !creator || !selectedDate || !selectedTime) return
    if (!buyerName.trim()) { toast.error('Please enter your name'); return }
    if (!buyerEmail.trim() || !buyerEmail.includes('@')) { toast.error('Please enter a valid email'); return }
    if (!buyerPhone || buyerPhone.replace(/\D/g, '').length !== 10) {
      toast.error('Please enter a valid 10-digit phone number'); return
    }

    setPaying(true)
    try {
      const orderRes = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          creator_id: creator.id,
          variant_index: variantIndex,
          buyer_name: buyerName.trim(),
          buyer_email: buyerEmail.trim(),
          buyer_phone: '+91' + buyerPhone.replace(/\D/g, ''),
          shipping_address: {
            _booking_date: selectedDate,
            _booking_time: selectedTime,
            _booking_duration_minutes: selectedDurationMinutes || undefined,
          },
          booking_date: selectedDate,
          booking_time: selectedTime,
          duration_minutes: selectedDurationMinutes || undefined,
        }),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order')

      const accentColor = settings?.accent_color || '#E8651A'
      setOrderId(orderData.order_id || null)
      setOrderNumber(orderData.order_number)
      setSessionMode(orderData.mode === 'pg' ? 'pg' : 'upi')

      if (orderData.mode !== 'pg') {
        setSellerUpiId(orderData.seller_upi_id || null)
        setSellerName(orderData.seller_name || creator.store_name)
        setUpiQrLink(orderData.qr_link || null)
        setUpiTransactionRef(orderData.transaction_ref || orderData.order_number || null)
        setUpiTransactionNote(orderData.transaction_note || null)
        setUpiReferenceNumber('')
        setPendingVerificationFlow(false)
        setStep('upi_confirm')
        toast('Pay manually using the UPI ID and amount shown below, then submit UTR.')
        setPaying(false)
        return
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: 'INR',
        name: creator.store_name,
        description: `${product.title} — ${selectedDate} at ${formatTime12(selectedTime)}`,
        order_id: orderData.gateway_order_id,
        prefill: {
          name: buyerName,
          contact: '+91' + buyerPhone.replace(/\D/g, ''),
          email: buyerEmail,
        },
        config: {
          display: {
            blocks: {
              upi: { name: 'Pay via UPI', instruments: [{ method: 'upi' }] },
              other: { name: 'Other Methods', instruments: [{ method: 'card' }, { method: 'netbanking' }] },
            },
            sequence: ['block.upi', 'block.other'],
            preferences: { show_default_blocks: false },
          },
        },
        theme: { color: accentColor },
          handler: () => {
            setPendingVerificationFlow(false)
            setStep('success')
            toast.success('Payment successful. Confirmation is automatic.')
            setPaying(false)
          },
        modal: { ondismiss: () => setPaying(false), confirm_close: true },
      }

      if (!window.Razorpay) {
        throw new Error('Payment gateway script not loaded')
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.')
        setPaying(false)
      })
      rzp.open()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setPaying(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
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
  const price = getPrice()
  const config = getConfig()
  const upiQrUrl = upiQrLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(upiQrLink)}`
    : null

  if (step === 'upi_confirm') {
    return (
      <div className="max-w-lg mx-auto bg-white min-h-screen px-4 py-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#E8651A]/10 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-[#E8651A]" />
          </div>
          <h1 className="text-xl font-bold mt-4">Complete UPI Payment</h1>
          <p className="text-sm text-gray-500 mt-2">
            Pay {formatPrice(price)} to {sellerName || creator.store_name} and submit UTR for booking confirmation.
          </p>
          {orderNumber && (
            <p className="text-xs font-mono text-gray-400 mt-2">Order #{orderNumber}</p>
          )}
        </div>

        <div className="card mt-6">
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            If UPI app shows security decline, pay manually using UPI ID and amount below, then enter UTR.
          </p>

          {upiQrUrl && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-3">Scan QR to Pay</p>
              <div className="mx-auto h-52 w-52 rounded-xl border border-gray-100 bg-white p-2 sm:h-60 sm:w-60">
                <a href={upiQrUrl} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={upiQrUrl}
                    alt="UPI payment QR code"
                    className="h-full w-full rounded-lg object-contain"
                    loading="lazy"
                  />
                </a>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={upiQrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open full size
                </a>
                <a
                  href={upiQrUrl}
                  download={`linkmystore-booking-qr-${orderNumber || 'payment'}.png`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Save QR image
                </a>
              </div>
              <p className="mt-2 text-center text-[11px] text-gray-500">
                Open the QR full size or save it before switching to your UPI app.
              </p>
            </div>
          )}

          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-gray-200 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Seller UPI ID</p>
              <div className="flex items-start justify-between gap-2 mt-1">
                <p className="text-sm font-medium text-gray-800 break-all">{sellerUpiId || 'Not available'}</p>
                {sellerUpiId && (
                  <button
                    type="button"
                    onClick={() => { void copyToClipboard(sellerUpiId, 'UPI ID') }}
                    className="text-xs text-[#E8651A] inline-flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Amount</p>
              <div className="flex items-center justify-between gap-2 mt-1">
                <p className="text-sm font-medium text-gray-800">{formatPrice(price)}</p>
                <button
                  type="button"
                  onClick={() => { void copyToClipboard((price / 100).toFixed(2), 'Amount') }}
                  className="text-xs text-[#E8651A] inline-flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Order Reference</p>
              <div className="flex items-center justify-between gap-2 mt-1">
                <p className="text-sm font-mono text-gray-700">{upiTransactionRef || orderNumber || '-'}</p>
                {(upiTransactionRef || orderNumber) && (
                  <button
                    type="button"
                    onClick={() => { void copyToClipboard(upiTransactionRef || orderNumber || '', 'Order reference') }}
                    className="text-xs text-[#E8651A] inline-flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                )}
              </div>
              {upiTransactionNote && (
                <p className="text-xs text-gray-500 mt-1">Note: {upiTransactionNote}</p>
              )}
            </div>
          </div>
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

          <button
            onClick={() => { void handleConfirmUpi() }}
            disabled={confirmingUpi}
            className="btn-primary w-full mt-5 flex items-center justify-center gap-2"
          >
            {confirmingUpi ? (
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

  // ── Success ────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="max-w-lg mx-auto bg-white min-h-screen px-4 py-12">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 mx-auto flex items-center justify-center animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mt-6">
            {sessionMode === 'pg' ? 'Booking Confirmed!' : 'Booking Request Submitted'}
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            {sessionMode === 'pg'
              ? `Your session is locked in, ${buyerName.split(' ')[0]}!`
              : pendingVerificationFlow
                ? 'Your UPI proof has been submitted. Seller will verify and confirm your booking shortly.'
                : 'Complete UPI proof submission with the seller using your order number for faster confirmation.'}
          </p>
          <p className="text-sm font-mono text-gray-400 mt-1">Order #{orderNumber}</p>
        </div>

        {/* Booking Summary Card */}
        <div className="card max-w-sm mx-auto mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #3D2176 100%)` }}
            >
              {product.digital_subtype === 'coaching' ? '💬' : '📅'}
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800">{product.title}</p>
              <p className="text-xs text-gray-500">{selectedDurationMinutes || config?.duration_minutes || 30} min session</p>
            </div>
          </div>

          <div className="space-y-2.5 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-700 font-medium">
                {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 font-medium">
                {selectedTime ? formatTime12(selectedTime) : ''} ({selectedDurationMinutes || config?.duration_minutes || 30} minutes)
                </span>
            </div>
            {config?.meeting_platform && (
              <div className="flex items-center gap-2">
                {config.meeting_platform === 'phone' ? (
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <Video className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
                <span className="text-sm text-gray-700">
                  {PLATFORM_ICONS[config.meeting_platform]} {PLATFORM_LABELS[config.meeting_platform] || config.meeting_platform}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl bg-blue-50 px-3 py-2.5">
            <p className="text-xs text-blue-700">
              Meeting link details will be shared on <strong>{buyerEmail}</strong> after booking confirmation.
            </p>
            {submittedUtr && (
              <p className="text-[11px] text-blue-700 mt-1">
                UTR submitted: <span className="font-mono">{submittedUtr}</span>
              </p>
            )}
            {sessionMode !== 'pg' && !pendingVerificationFlow && (
              <p className="text-[11px] text-blue-700 mt-1">
                Share this order number with the seller after UPI payment.
              </p>
            )}
          </div>
        </div>

        <div className="max-w-sm mx-auto mt-6">
          <Link href={`/${slug}`} className="btn-secondary w-full block text-center">
            Back to Store
          </Link>
        </div>
      </div>
    )
  }

  // ── Calendar Builder ────────────────────────────────────────────────────────
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay()
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
  const availableDays = getAvailableDays()

  const prevMonth = () => {
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1) }
    else setCalendarMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1) }
    else setCalendarMonth(m => m + 1)
  }

  return (
    <div className="max-w-lg mx-auto bg-white min-h-screen pb-24">
      {/* Nav */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="h-14 flex items-center px-4">
          <button
            onClick={() => {
              if (step === 'date') setStep('duration')
              else if (step === 'time') setStep('date')
              else if (step === 'details') setStep('time')
              else window.history.back()
            }}
            className="p-2 -ml-2"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="flex-1 text-center font-semibold text-sm">
            {step === 'duration'
              ? 'Choose Duration'
              : step === 'date'
                ? 'Pick a Date'
                : step === 'time'
                  ? 'Choose a Time'
                  : 'Your Details'}
          </span>
          <Lock className="w-3.5 h-3.5 text-gray-400" />
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full transition-all duration-300"
            style={{
              width:
                step === 'duration'
                  ? '20%'
                  : step === 'date'
                    ? '40%'
                    : step === 'time'
                      ? '60%'
                      : step === 'details'
                        ? '80%'
                        : '100%',
              background: `linear-gradient(90deg, ${accentColor}, #3D2176)`,
            }}
          />
        </div>
      </div>

      {/* Product Mini Header */}
      <div className="mx-4 mt-4 flex items-center gap-3 pb-4 border-b border-gray-100">
        {product.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.images[0]} alt={product.title} className="w-12 h-12 rounded-xl object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl">
            {product.digital_subtype === 'coaching' ? '💬' : '📅'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{product.title}</p>
          {config && (
            <p className="text-xs text-gray-500">
              {selectedDurationMinutes || config.duration_minutes} min • {PLATFORM_ICONS[config.meeting_platform] || '📹'} {PLATFORM_LABELS[config.meeting_platform] || config.meeting_platform}
            </p>
          )}
        </div>
        <p className="text-base font-bold flex-shrink-0" style={{ color: accentColor }}>
          {formatPrice(price)}
        </p>
      </div>

      {/* ── STEP: Date Picker ── */}
      {/* Duration Step */}
      {step === 'duration' && (
        <div className="mx-4 mt-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Select session duration</h2>
          <div className="space-y-2">
            {durationOptions.map((option) => {
              const isSelected = selectedDurationMinutes === option.duration_minutes
              return (
                <button
                  key={`${option.duration_minutes}-${option.price}`}
                  type="button"
                  onClick={() => handleDurationSelect(option)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                    isSelected ? 'border-[#E8651A] bg-[#F0ECF7]' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{option.label || `${option.duration_minutes} min`}</p>
                      <p className="text-xs text-gray-500">{option.duration_minutes} minutes</p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: accentColor }}>{formatPrice(option.price)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
      {step === 'date' && (
        <div className="mx-4 mt-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-100">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="font-bold text-gray-800">
              {MONTH_NAMES[calendarMonth]} {calendarYear}
            </span>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES_SHORT.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Date grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const date = new Date(calendarYear, calendarMonth, day)
              const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const available = isDateAvailable(date)
              const isToday = date.toDateString() === today.toDateString()
              const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
              const isSelected = selectedDate === dateStr

              return (
                <button
                  key={day}
                  onClick={() => available && handleDateSelect(dateStr)}
                  disabled={!available}
                  className={`
                    aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all
                    ${isSelected ? 'text-white shadow-md scale-105' : ''}
                    ${!isSelected && available ? 'hover:bg-gray-100 text-gray-800' : ''}
                    ${!available && !isPast ? 'text-gray-300 cursor-not-allowed' : ''}
                    ${isPast ? 'text-gray-200 cursor-not-allowed' : ''}
                    ${isToday && !isSelected ? 'ring-1 ring-offset-1' : ''}
                  `}
                  style={isSelected ? { background: `linear-gradient(135deg, ${accentColor} 0%, #3D2176 100%)` } : {}}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-gray-800 inline-block" /> Available
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-gray-200 inline-block" /> Unavailable
            </span>
          </div>

          {availableDays.length === 0 && (
            <div className="mt-6 bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
              <p className="text-sm text-amber-700">No availability configured yet. Please contact the seller.</p>
            </div>
          )}
        </div>
      )}

      {/* ── STEP: Time Slots ── */}
      {step === 'time' && (
        <div className="mx-4 mt-6">
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="w-4 h-4" style={{ color: accentColor }} />
            <span className="font-semibold text-gray-800 text-sm">
              {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
            </span>
          </div>

          {slotsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : slots.length === 0 ? (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 text-center">
              <p className="text-sm text-amber-700 font-medium mb-1">No slots available for this date</p>
              <p className="text-xs text-amber-600">Please go back and pick a different date.</p>
              <button
                onClick={() => setStep('date')}
                className="mt-3 text-sm font-semibold underline"
                style={{ color: accentColor }}
              >
                ← Pick another date
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">{slots.length} time slots available</p>
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => handleTimeSelect(slot)}
                    className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                      selectedTime === slot
                        ? 'text-white border-transparent shadow-md'
                        : 'text-gray-700 border-gray-200 hover:border-gray-400'
                    }`}
                    style={selectedTime === slot ? { background: `linear-gradient(135deg, ${accentColor} 0%, #3D2176 100%)` } : {}}
                  >
                    {formatTime12(slot)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── STEP: Details ── */}
      {step === 'details' && (
        <div className="mx-4 mt-6">
          {/* Summary chip */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2 mb-6">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700">
              {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}&nbsp;•&nbsp;
              {selectedTime ? formatTime12(selectedTime) : ''}
            </span>
            <button
              onClick={() => setStep('time')}
              className="ml-auto text-xs font-semibold underline"
              style={{ color: accentColor }}
            >
              Change
            </button>
          </div>

          <h2 className="text-lg font-bold text-[#0F172A] mb-1">Your Details</h2>
          <p className="text-sm text-gray-500 mb-5">We&apos;ll use this to confirm your booking</p>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                className="input-field"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                placeholder="your@email.com"
                className="input-field"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                Phone <span className="text-red-400">*</span>
              </label>
              <div className="flex">
                <span className="bg-gray-50 px-3 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500 text-sm flex-shrink-0">+91</span>
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
        </div>
      )}

      {/* ── Sticky Pay / Next Button ── */}
      {step === 'details' && (
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-4 py-4">
          <button
            onClick={handlePayment}
            disabled={paying || !buyerName.trim() || !buyerEmail.includes('@') || buyerPhone.length < 10}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}CC 100%)` }}
          >
            {paying ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
            ) : (
              <><Lock className="w-4 h-4" /> Pay {formatPrice(price)} & Confirm</>
            )}
          </button>
          <p className="text-center text-[11px] text-gray-400 mt-2">PG auto-confirmation with manual UPI mode for non-gateway sellers</p>
        </div>
      )}
    </div>
  )
}






