import { createAdminClient } from '@/lib/supabase/admin'
import { sendBuyerDigitalDeliveryEmail, sendCounsellingBookingEmail } from '@/lib/email'
import { sendOrderNotificationIfEligible } from '@/lib/notifications'
import {
  buildBuyerDigitalDeliveryAccessUrl,
  isInstantDigitalDeliveryProduct,
} from '@/lib/payments/digital-delivery'

type FulfillmentProvider = 'razorpay' | 'none'

interface MarkOrderPaidInput {
  orderId: string
  provider: FulfillmentProvider
  gatewayOrderId?: string | null
  gatewayPaymentId?: string | null
  upiReference?: string | null
  verifiedBy?: 'webhook' | 'seller' | 'system'
}

interface OrderRow {
  id: string
  order_number: string
  creator_id: string
  product_id: string
  payment_method: string
  payment_status: string
  payment_verified: boolean | null
  buyer_name: string
  buyer_phone: string
  buyer_email: string | null
  amount: number
  shipping_address: Record<string, unknown> | null
  status: string
  upi_reference_number: string | null
  payment_screenshot_url: string | null
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  gateway_order_id: string | null
  gateway_payment_id: string | null
  gateway_provider: string | null
  digital_download_url: string | null
}

interface ProductRow {
  id: string
  creator_id: string
  title: string
  type: 'physical' | 'digital'
  digital_subtype: string | null
  digital_file_url: string | null
  digital_file_urls: string[] | null
  template_files: Array<{ name?: string | null; file_url?: string | null }> | null
  membership_data: { content_file_urls?: string[] | null } | null
  stock: number | null
  coaching_data: Record<string, unknown> | null
  calendar_data: Record<string, unknown> | null
}

function readText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized : null
}

function readBookingMeta(shippingAddress: Record<string, unknown> | null) {
  const bookingDate =
    readText(shippingAddress?._booking_date) ||
    readText(shippingAddress?.booking_date)
  const bookingTime =
    readText(shippingAddress?._booking_time) ||
    readText(shippingAddress?.booking_time)
  const durationValue =
    shippingAddress?._booking_duration_minutes ?? shippingAddress?.duration_minutes
  const duration = Number(durationValue || 0)

  return {
    bookingDate,
    bookingTime,
    durationMinutes: Number.isFinite(duration) && duration > 0 ? duration : null,
  }
}

async function maybeCreateDigitalDownloadUrl(order: OrderRow, product: ProductRow): Promise<string | null> {
  if (!isInstantDigitalDeliveryProduct(product)) {
    return order.digital_download_url || null
  }

  return buildBuyerDigitalDeliveryAccessUrl(order)
}

async function maybeCreateCourseEnrollment(order: OrderRow, product: ProductRow) {
  if (product.type !== 'digital' || product.digital_subtype !== 'course') return
  if (!order.buyer_email) return

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('course_enrollments')
    .select('id')
    .eq('product_id', order.product_id)
    .eq('buyer_email', order.buyer_email)
    .maybeSingle()

  if (existing?.id) return

  await admin.from('course_enrollments').insert({
    product_id: order.product_id,
    order_id: order.id,
    buyer_email: order.buyer_email,
    buyer_phone: order.buyer_phone || '',
    lessons_completed: [],
  })
}

async function maybeCreateBooking(order: OrderRow, product: ProductRow) {
  if (product.type !== 'digital') return
  if (!['coaching', 'calendar'].includes(product.digital_subtype || '')) return

  const { bookingDate, bookingTime, durationMinutes } = readBookingMeta(order.shipping_address)
  if (!bookingDate || !bookingTime) return

  const admin = createAdminClient()
  const { data: existingBooking } = await admin
    .from('bookings')
    .select('id')
    .eq('order_id', order.id)
    .maybeSingle()

  if (existingBooking?.id) return

  const config =
    product.digital_subtype === 'coaching'
      ? (product.coaching_data || {})
      : (product.calendar_data || {})

  let duration = durationMinutes || Number((config as { duration_minutes?: number }).duration_minutes || 30)
  if (product.digital_subtype === 'coaching') {
    const coachingConfig = config as {
      duration_minutes?: number
      duration_options?: Array<{ duration_minutes: number }>
      meeting_link?: string
    }
    const options = Array.isArray(coachingConfig.duration_options) ? coachingConfig.duration_options : []
    if (options.length > 0) {
      const isAllowed = options.some((option) => Number(option.duration_minutes) === duration)
      if (!isAllowed) {
        duration = Number(options[0]?.duration_minutes || duration)
      }
    } else if (coachingConfig.duration_minutes) {
      duration = Number(coachingConfig.duration_minutes)
    }
  }

  const meetingLink = readText((config as { meeting_link?: string }).meeting_link)

  const { data: booking } = await admin
    .from('bookings')
    .insert({
      product_id: order.product_id,
      creator_id: order.creator_id,
      order_id: order.id,
      buyer_name: order.buyer_name || 'Customer',
      buyer_email: order.buyer_email,
      buyer_phone: order.buyer_phone || '',
      booking_date: bookingDate,
      booking_time: bookingTime,
      duration_minutes: duration,
      status: 'confirmed',
      meeting_link: meetingLink,
    })
    .select('id')
    .single()

  if (product.digital_subtype !== 'coaching' || !booking?.id || !order.buyer_email) {
    return
  }

  const { data: creatorProfile } = await admin
    .from('creators')
    .select('store_name')
    .eq('id', order.creator_id)
    .single()

  await sendCounsellingBookingEmail({
    to: order.buyer_email,
    buyerName: order.buyer_name || null,
    storeName: creatorProfile?.store_name || 'LinkMyStore Seller',
    sessionTitle: product.title || '1-on-1 Session',
    bookingDate,
    bookingTime,
    durationMinutes: duration,
    paidAmountInPaisa: order.amount || 0,
    meetingLink,
  }).then((result) => {
    console.info('Counselling booking email sent:', {
      orderId: order.id,
      bookingId: booking.id,
      to: order.buyer_email,
      emailId: result.id,
    })
  }).catch((error) => {
    console.error('Counselling booking email failed:', {
      orderId: order.id,
      bookingId: booking.id,
      error,
    })
  })
}

async function maybeSendDigitalDeliveryEmail(order: OrderRow, product: ProductRow) {
  if (!isInstantDigitalDeliveryProduct(product)) return
  if (!order.buyer_email || !order.digital_download_url) return

  const admin = createAdminClient()
  const { data: creatorProfile } = await admin
    .from('creators')
    .select('store_name')
    .eq('id', order.creator_id)
    .single()

  await sendBuyerDigitalDeliveryEmail({
    to: order.buyer_email,
    buyerName: order.buyer_name || null,
    storeName: creatorProfile?.store_name || 'LinkMyStore Seller',
    orderNumber: order.order_number,
    productTitle: product.title || 'Your purchase',
    accessUrl: order.digital_download_url,
  }).then((result) => {
    console.info('Digital delivery email sent:', {
      orderId: order.id,
      orderNumber: order.order_number,
      to: order.buyer_email,
      emailId: result.id,
    })
  }).catch((error) => {
    console.error('Digital delivery email failed:', {
      orderId: order.id,
      error,
    })
  })
}

async function maybeDecrementStock(product: ProductRow) {
  if (product.stock === null || product.stock === undefined || product.stock <= 0) {
    return
  }

  const admin = createAdminClient()
  await admin
    .from('products')
    .update({
      stock: Math.max(0, product.stock - 1),
      updated_at: new Date().toISOString(),
    })
    .eq('id', product.id)
}

async function trackPurchaseAnalytics(order: OrderRow, verifiedBy: string | null) {
  const admin = createAdminClient()
  await admin.from('analytics_events').insert({
    creator_id: order.creator_id,
    event_type: 'purchase',
    product_id: order.product_id,
    order_id: order.id,
    metadata: {
      payment_method: order.payment_method,
      verified_by: verifiedBy,
      backfilled: false,
    },
  }).then(({ error }) => {
    if (error) {
      console.warn('Purchase analytics insert skipped:', error.message)
    }
  })
}

export async function markOrderPaidAndFulfill(input: MarkOrderPaidInput): Promise<{ alreadyPaid: boolean; order: OrderRow }> {
  const admin = createAdminClient()
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('*')
    .eq('id', input.orderId)
    .single()

  if (orderError || !order) {
    throw new Error('Order not found')
  }

  const orderRow = order as OrderRow
  if (orderRow.payment_status === 'paid') {
    return { alreadyPaid: true, order: orderRow }
  }

  const { data: product, error: productError } = await admin
    .from('products')
    .select('*')
    .eq('id', orderRow.product_id)
    .single()

  if (productError || !product) {
    throw new Error('Product not found for order')
  }
  const productRow = product as ProductRow

  const digitalDownloadUrl = await maybeCreateDigitalDownloadUrl(orderRow, productRow)

  const updatePayload: Record<string, unknown> = {
    payment_status: 'paid',
    payment_verified: true,
    payment_verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    digital_download_url: digitalDownloadUrl,
  }

  if (input.upiReference) {
    updatePayload.upi_reference_number = input.upiReference
  }

  if (input.provider === 'razorpay') {
    updatePayload.gateway_provider = 'razorpay'
    if (input.gatewayOrderId) {
      updatePayload.gateway_order_id = input.gatewayOrderId
      updatePayload.razorpay_order_id = input.gatewayOrderId
    }
    if (input.gatewayPaymentId) {
      updatePayload.gateway_payment_id = input.gatewayPaymentId
      updatePayload.razorpay_payment_id = input.gatewayPaymentId
    }
  }

  const { data: updatedOrder, error: updateError } = await admin
    .from('orders')
    .update(updatePayload)
    .eq('id', input.orderId)
    .select('*')
    .single()

  if (updateError || !updatedOrder) {
    throw new Error(updateError?.message || 'Failed to update order payment status')
  }

  const updatedOrderRow = updatedOrder as OrderRow

  await maybeDecrementStock(productRow).catch((error) => {
    console.error('Stock decrement failed (non-critical):', error)
  })

  await trackPurchaseAnalytics(updatedOrderRow, input.verifiedBy || null).catch((error) => {
    console.error('Purchase analytics failed (non-critical):', error)
  })

  await maybeCreateCourseEnrollment(updatedOrderRow, productRow).catch((error) => {
    console.error('Course enrollment failed (non-critical):', error)
  })

  await maybeCreateBooking(updatedOrderRow, productRow).catch((error) => {
    console.error('Booking creation failed (non-critical):', error)
  })

  await maybeSendDigitalDeliveryEmail(updatedOrderRow, productRow).catch((error) => {
    console.error('Digital delivery failed (non-critical):', error)
  })

  await sendOrderNotificationIfEligible({
    creatorId: updatedOrderRow.creator_id,
    orderNumber: updatedOrderRow.order_number,
    buyerName: updatedOrderRow.buyer_name || 'Customer',
    amountInPaisa: updatedOrderRow.amount || 0,
    upiReference: input.upiReference || null,
  }).catch((error) => {
    console.error('Order notification failed (non-critical):', error)
  })

  return { alreadyPaid: false, order: updatedOrderRow }
}
