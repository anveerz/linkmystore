'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft,
  Check,
  Circle,
  MapPin,
  Phone,
  Mail,
  FileDown,
  Truck,
  Copy,
  MessageCircle,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatPrice } from '@/lib/constants'
import { isUpiPaymentConfirmed, isUpiPendingVerification } from '@/lib/payment-status'
import { timeAgo } from '@/lib/utils'
import type { Order, Product } from '@/types'

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [order, setOrder] = useState<Order | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [verifyingPayment, setVerifyingPayment] = useState(false)
  const [showShippingForm, setShowShippingForm] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')

  const fetchOrder = useCallback(async () => {
    try {
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('id', params.id)
        .single()

      if (!orderData) {
        toast.error('Order not found')
        router.push('/dashboard/orders')
        return
      }

      setOrder(orderData)

      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('id', orderData.product_id)
        .single()

      setProduct(productData)
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }, [params.id, router, supabase])

  useEffect(() => {
    void fetchOrder()
  }, [fetchOrder])

  const handleMarkShipped = async () => {
    if (!order) return
    if (isUpiPendingVerification(order)) {
      toast.error('Verify UPI payment before shipping this order')
      return
    }
    setUpdating(true)

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'shipped',
          tracking_number: trackingNumber || null,
          tracking_url: trackingUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      if (error) throw error

      toast.success('Order marked as shipped! 📦')
      setShowShippingForm(false)
      fetchOrder()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update order'
      toast.error(message)
    } finally {
      setUpdating(false)
    }
  }

  const handleMarkDelivered = async () => {
    if (!order) return
    if (!confirm('Mark this order as delivered?')) return

    setUpdating(true)

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'delivered',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      if (error) throw error

      toast.success('Order marked as delivered! ✅')
      fetchOrder()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update order'
      toast.error(message)
    } finally {
      setUpdating(false)
    }
  }

  const handleVerifyUpiPayment = async () => {
    if (!order || order.payment_method !== 'upi_direct' || isUpiPaymentConfirmed(order)) return

    if (!confirm('Mark this UPI payment as verified?')) return

    setVerifyingPayment(true)
    try {
      const response = await fetch(`/api/orders/${order.id}/verify-payment`, { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify payment')
      }

      toast.success('Payment verified')
      await fetchOrder()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to verify payment'
      toast.error(message)
    } finally {
      setVerifyingPayment(false)
    }
  }

  const copyAddress = () => {
    if (!order?.shipping_address) return
    const addr = order.shipping_address
    const fullAddress = `${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}\n${addr.city}, ${addr.state} - ${addr.pincode}`
    navigator.clipboard.writeText(fullAddress)
    toast.success('Address copied!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8651A]"></div>
      </div>
    )
  }

  if (!order || !product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Order not found</p>
        <Link href="/dashboard/orders" className="btn-primary mt-4 inline-block">
          Back to Orders
        </Link>
      </div>
    )
  }

  const statusSteps = [
    { key: 'new', label: 'Order Placed' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
  ]

  const currentStepIndex = statusSteps.findIndex(s => s.key === order.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/orders" className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Order {order.order_number}</h1>
          <p className="text-sm text-gray-500">{timeAgo(order.created_at)}</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${order.status === 'new' ? 'bg-yellow-100 text-yellow-700' :
          order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
            order.status === 'delivered' ? 'bg-green-100 text-green-700' :
              'bg-red-100 text-red-700'
          }`}>
          {order.status === 'new' ? 'New' :
            order.status === 'shipped' ? 'Shipped' :
              order.status === 'delivered' ? 'Delivered' : 'Cancelled'}
        </span>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-6 lg:space-y-0">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Timeline */}
          <div className="card">
            <h2 className="font-semibold mb-4">Order Status</h2>

            <div className="space-y-4">
              {statusSteps.map((step, index) => {
                const isCompleted = index < currentStepIndex
                const isCurrent = index === currentStepIndex
                const isPending = index > currentStepIndex

                return (
                  <div key={step.key} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCompleted ? 'bg-gradient-to-br from-[#E8651A] to-[#C75516] text-white' :
                      isCurrent ? 'bg-gradient-to-br from-[#E8651A] to-[#C75516] text-white animate-pulse' :
                        'bg-gray-200 text-gray-400'
                      }`}>
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Circle className="w-3 h-3" />
                      )}
                    </div>

                    <div>
                      <p className={`font-medium ${isPending ? 'text-gray-400' : 'text-gray-900'}`}>
                        {step.label}
                      </p>
                      {isCurrent && order.status === 'shipped' && order.tracking_number && (
                        <p className="text-xs text-gray-500">
                          Tracking: {order.tracking_number}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Action Buttons */}
            {isUpiPendingVerification(order) && (
              <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
                <p className="text-sm font-medium text-orange-800">
                  UPI payment is pending verification.
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Verify payment before shipping this order.
                </p>
                <button
                  onClick={handleVerifyUpiPayment}
                  disabled={verifyingPayment}
                  className="btn-primary mt-3 flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {verifyingPayment ? 'Verifying...' : 'Mark Payment Verified'}
                </button>
              </div>
            )}

            {order.status === 'new' && !showShippingForm && (
              <button
                onClick={() => setShowShippingForm(true)}
                className="btn-primary mt-6"
                disabled={updating || isUpiPendingVerification(order)}
              >
                Mark as Shipped
              </button>
            )}

            {order.status === 'new' && showShippingForm && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl space-y-4">
                <h3 className="font-medium">Shipping Details</h3>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Tracking number (optional)"
                  className="input-field"
                />
                <input
                  type="text"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="Tracking link (optional)"
                  className="input-field"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleMarkShipped}
                    disabled={updating}
                    className="btn-primary flex-1"
                  >
                    {updating ? 'Updating...' : 'Confirm Shipped'}
                  </button>
                  <button
                    onClick={() => setShowShippingForm(false)}
                    className="btn-secondary"
                    disabled={updating}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {order.status === 'shipped' && (
              <button
                onClick={handleMarkDelivered}
                disabled={updating}
                className="btn-primary mt-6 bg-green-500 hover:bg-green-600"
              >
                {updating ? 'Updating...' : 'Mark as Delivered'}
              </button>
            )}

            {order.status === 'delivered' && (
              <div className="mt-6 p-4 bg-green-50 rounded-xl flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-green-700 font-medium">Order completed</span>
              </div>
            )}
          </div>

          {/* Product Card */}
          <div className="card">
            <h2 className="font-semibold mb-4">Product</h2>
            <div className="flex gap-4">
              {product.images?.[0] ? (
                <Image
                  src={product.images[0]}
                  alt={product.title}
                  width={64}
                  height={64}
                  unoptimized
                  className="w-16 h-16 rounded-xl object-cover bg-gray-100"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gray-100" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{product.title}</p>
                {order.variant && (
                  <p className="text-sm text-gray-500">{order.variant.name}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${product.type === 'physical' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                    {product.type === 'physical' ? 'Physical' : 'Digital'}
                  </span>
                </div>
              </div>
              <p className="font-bold gradient-text">{formatPrice(order.amount)}</p>
            </div>
          </div>

          {/* Payment Card */}
          <div className="card">
            <h2 className="font-semibold mb-4">Payment</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Method</span>
                <span className="font-medium text-gray-700">
                  {order.payment_method === 'upi_direct' ? 'Direct UPI' : 'Razorpay'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount Paid</span>
                <span className="font-bold">{formatPrice(order.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {order.payment_method === 'upi_direct' ? 'Platform Fee' : 'Platform Fee (4%)'}
                </span>
                <span className="text-gray-500">{formatPrice(order.platform_fee)}</span>
              </div>
              <div className="h-px bg-gray-100 my-2" />
              <div className="flex justify-between">
                <span className="font-medium">Your Earnings</span>
                <span className="font-bold text-green-600">{formatPrice(order.amount - order.platform_fee)}</span>
              </div>
              <div className="h-px bg-gray-100 my-2" />
              {order.razorpay_payment_id && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Payment ID</span>
                  <span className="font-mono text-gray-400 text-xs">{order.razorpay_payment_id}</span>
                </div>
              )}
              {order.upi_reference_number && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">UPI Reference</span>
                  <span className="font-mono text-gray-500 text-xs">{order.upi_reference_number}</span>
                </div>
              )}
              {order.payment_screenshot_url && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Screenshot</span>
                  <a
                    href={order.payment_screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#E8651A] hover:underline inline-flex items-center gap-1"
                  >
                    View
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Status</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                  {order.payment_status}
                </span>
              </div>
              {order.payment_method === 'upi_direct' && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Verification</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isUpiPaymentConfirmed(order) ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {isUpiPaymentConfirmed(order) ? 'Verified' : 'Pending'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Customer Card */}
          <div className="card">
            <h2 className="font-semibold mb-4">Customer</h2>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-lg font-semibold text-gray-500">
                  {order.buyer_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold">{order.buyer_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <Phone className="w-4 h-4 text-gray-400" />
              <a href={`tel:${order.buyer_phone}`} className="text-sm text-gray-600 hover:text-gray-900">
                {order.buyer_phone}
              </a>
              <a
                href={`https://wa.me/${order.buyer_phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200 flex items-center gap-1"
              >
                <MessageCircle className="w-3 h-3" />
                WhatsApp
              </a>
            </div>

            {order.buyer_email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <a href={`mailto:${order.buyer_email}`} className="text-sm text-gray-600 hover:text-gray-900 truncate">
                  {order.buyer_email}
                </a>
              </div>
            )}
          </div>

          {/* Shipping Address */}
          {product.type === 'physical' && order.shipping_address && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <h2 className="font-semibold">Shipping Address</h2>
                </div>
                <button
                  onClick={copyAddress}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p>{order.shipping_address.line1}</p>
                {order.shipping_address.line2 && (
                  <p>{order.shipping_address.line2}</p>
                )}
                <p>{order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}</p>
              </div>
            </div>
          )}

          {/* Digital Delivery */}
          {product.type === 'digital' && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <FileDown className="w-4 h-4 text-gray-400" />
                <h2 className="font-semibold">Digital Delivery</h2>
              </div>

              {order.digital_download_url ? (
                <div className="text-sm">
                  <p className="text-green-600 flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Download link generated
                  </p>
                  {order.digital_downloaded && (
                    <p className="text-green-600 mt-1 text-xs">Downloaded by buyer ✓</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No download link</p>
              )}
            </div>
          )}

          {/* Tracking Info */}
          {order.tracking_number && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-gray-400" />
                <h2 className="font-semibold">Tracking</h2>
              </div>
              <p className="text-sm text-gray-600">{order.tracking_number}</p>
              {order.tracking_url && (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#E8651A] hover:underline mt-1 inline-block"
                >
                  Track shipment →
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
