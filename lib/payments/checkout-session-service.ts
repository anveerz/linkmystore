import Razorpay from 'razorpay'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeServerAmountWithCustomization } from '@/lib/customization-pricing'
import { buildUPILinkVariants, validateUPIId } from '@/lib/upi'
import { decryptSecret } from '@/lib/payments/crypto'
import { asText, computeDiscountAmount, isDuplicateOrderNumberError } from '@/lib/payments/order-utils'
import { getMonthlyUpiGmvPaisa, getPaymentAccountByCreatorId } from '@/lib/payments/payment-account-service'
import { isPgActive, isUpiFallbackAllowed } from '@/lib/payments/payment-policy-guards'
import type { PaymentAccountRow } from '@/lib/payments/types'

interface CheckoutAttributionInput {
  traffic_source?: string | null
  traffic_medium?: string | null
  traffic_campaign?: string | null
  traffic_referrer?: string | null
}

export interface CreateCheckoutSessionInput extends CheckoutAttributionInput {
  product_id: string
  creator_id?: string | null
  variant_index?: number | null
  buyer_name: string
  buyer_phone: string
  buyer_email?: string | null
  shipping_address?: Record<string, unknown> | null
  coupon_code?: string | null
  visitor_id?: string | null
  session_id?: string | null
  customization_data?: Record<string, unknown> | null
  booking_date?: string | null
  booking_time?: string | null
  duration_minutes?: number | null
}

interface CouponSummary {
  id: string
  code: string
  discount_amount: number
  original_amount: number
  final_amount: number
}

export type CreateCheckoutSessionResult =
  | {
      mode: 'pg'
      order_id: string
      order_number: string
      amount: number
      provider: 'razorpay'
      key_id: string
      gateway_order_id: string
      coupon: CouponSummary | null
    }
  | {
      mode: 'upi'
      order_id: string
      order_number: string
      amount: number
      upi_link: string
      upi_lite_link: string
      qr_link: string
      seller_upi_id: string
      seller_name: string
      transaction_ref: string
      transaction_note: string
      merchant_code: string
      coupon: CouponSummary | null
    }

function getAttributionMeta(input: CheckoutAttributionInput) {
  return {
    _source: asText(input.traffic_source, 64),
    _medium: asText(input.traffic_medium, 64),
    _campaign: asText(input.traffic_campaign, 96),
    _referrer: asText(input.traffic_referrer, 128),
  }
}

async function generateOrderNumber(supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: latestOrderRows } = await supabase
      .from('orders')
      .select('order_number')
      .like('order_number', `LMS-${today}-%`)
      .order('order_number', { ascending: false })
      .limit(1)

    const latestOrderNumber = latestOrderRows?.[0]?.order_number
    const latestSequenceMatch =
      typeof latestOrderNumber === 'string' ? latestOrderNumber.match(/-(\d+)$/) : null
    const nextSequence = latestSequenceMatch ? Number(latestSequenceMatch[1]) + 1 : 1
    return `LMS-${today}-${String(nextSequence).padStart(3, '0')}`
  }

  return `LMS-${today}-${Date.now().toString().slice(-6)}`
}

function createSellerRazorpayClient(account: PaymentAccountRow): Razorpay {
  if (!account.pg_key_id || !account.pg_secret_encrypted) {
    throw new Error('Seller gateway credentials are not configured')
  }

  const keySecret = decryptSecret(account.pg_secret_encrypted)
  if (!keySecret) {
    throw new Error('Seller gateway secret is not available')
  }

  return new Razorpay({
    key_id: account.pg_key_id,
    key_secret: keySecret,
  })
}

export async function createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CreateCheckoutSessionResult> {
  const supabase = createAdminClient()

  if (!input.buyer_name?.trim() || !input.buyer_phone?.trim()) {
    throw new Error('Buyer name and phone are required')
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', input.product_id)
    .eq('is_active', true)
    .single()

  if (productError || !product) {
    throw new Error('Product not found')
  }

  if (product.is_affiliate) {
    throw new Error('Affiliate products are purchased on partner platforms')
  }

  const creatorId = product.creator_id
  if (input.creator_id && input.creator_id !== creatorId) {
    throw new Error('Creator mismatch')
  }

  const { data: creator } = await supabase
    .from('creators')
    .select('id, store_name, created_at, bank_account')
    .eq('id', creatorId)
    .single()

  if (!creator) {
    throw new Error('Seller not found')
  }

  const paymentAccount = await getPaymentAccountByCreatorId(creatorId)
  const sellerUpiId = paymentAccount.upi_id || creator.bank_account?.upi_id || null

  let baseAmount = Number(product.price) || 0
  let selectedVariant = null
  const variantIndex = Number(input.variant_index || 0)
  if (product.variants && product.variants[variantIndex]?.price) {
    baseAmount = Number(product.variants[variantIndex].price) || baseAmount
    selectedVariant = product.variants[variantIndex]
  } else if (product.variants && product.variants[variantIndex]) {
    selectedVariant = product.variants[variantIndex]
  }

  if (product.digital_subtype === 'coaching' && input.duration_minutes) {
    const requestedDuration = Number(input.duration_minutes)
    const coachingData = (product.coaching_data || {}) as {
      duration_minutes?: number
      duration_options?: Array<{ duration_minutes: number; price: number }>
    }
    const durationOptions = Array.isArray(coachingData.duration_options)
      ? coachingData.duration_options
      : []

    if (durationOptions.length > 0) {
      const matched = durationOptions.find((option) => Number(option.duration_minutes) === requestedDuration)
      if (!matched) {
        throw new Error('Invalid duration option selected')
      }
      baseAmount = Number(matched.price) || baseAmount
    } else if (coachingData.duration_minutes && Number(coachingData.duration_minutes) !== requestedDuration) {
      throw new Error('Invalid duration selected')
    }
  }

  const customizationResult = computeServerAmountWithCustomization(
    baseAmount,
    product.customization_config,
    input.customization_data || null
  )

  if (!customizationResult.ok) {
    throw new Error(customizationResult.error)
  }

  const amountBeforeCoupon = customizationResult.finalAmount
  const computedCustomizationData = customizationResult.customizationData

  let discountAmount = 0
  let appliedCoupon: { id: string; code: string } | null = null
  const normalizedCouponCode = asText(input.coupon_code, 40)?.toUpperCase()

  if (normalizedCouponCode) {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('code', normalizedCouponCode)
      .eq('is_active', true)
      .single()

    if (coupon) {
      const now = new Date()
      const valid =
        (!coupon.starts_at || new Date(coupon.starts_at) <= now) &&
        (!coupon.ends_at || new Date(coupon.ends_at) >= now) &&
        (coupon.usage_limit === null || coupon.usage_limit === undefined || coupon.used_count < coupon.usage_limit) &&
        (!coupon.min_order_amount || amountBeforeCoupon >= coupon.min_order_amount) &&
        (!coupon.applicable_product_ids?.length || coupon.applicable_product_ids.includes(input.product_id))

      if (valid) {
        discountAmount = computeDiscountAmount(amountBeforeCoupon, coupon)
        appliedCoupon = { id: coupon.id, code: coupon.code }
      }
    }
  }

  const finalAmount = Math.max(100, amountBeforeCoupon - discountAmount)
  const attributionMeta = getAttributionMeta(input)
  const hasAttribution = Object.values(attributionMeta).some(Boolean)
  const shippingPayload =
    input.shipping_address && typeof input.shipping_address === 'object'
      ? { ...input.shipping_address, ...attributionMeta }
      : hasAttribution
        ? attributionMeta
        : {}

  if (input.booking_date) {
    ;(shippingPayload as Record<string, unknown>)._booking_date = input.booking_date
  }
  if (input.booking_time) {
    ;(shippingPayload as Record<string, unknown>)._booking_time = input.booking_time
  }
  if (input.duration_minutes) {
    ;(shippingPayload as Record<string, unknown>)._booking_duration_minutes = input.duration_minutes
  }

  const monthlyUpiGmv = await getMonthlyUpiGmvPaisa(creatorId)
  const fallbackGuard = isUpiFallbackAllowed({
    account: paymentAccount,
    creatorCreatedAt: creator.created_at,
    orderAmountPaisa: finalAmount,
    monthlyUpiGmvPaisa: monthlyUpiGmv,
  })

  const shouldUsePg = isPgActive(paymentAccount)
  const shouldUseUpi = !shouldUsePg && fallbackGuard.allowed

  if (!shouldUsePg && !shouldUseUpi) {
    throw new Error(fallbackGuard.reason || 'Payment gateway activation required before checkout')
  }

  let order: { id: string; order_number: string } | null = null
  let orderError: unknown = null
  let razorpayOrderId: string | null = null

  if (shouldUsePg) {
    const razorpay = createSellerRazorpayClient(paymentAccount)
    const razorpayOrder = await razorpay.orders.create({
      amount: finalAmount,
      currency: 'INR',
      receipt: `lms_${Date.now()}`,
    })
    razorpayOrderId = razorpayOrder.id
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const orderNumber = await generateOrderNumber(supabase)
    const { data: insertedOrder, error: insertError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        creator_id: creatorId,
        product_id: input.product_id,
        variant: selectedVariant,
        quantity: 1,
        buyer_name: input.buyer_name.trim(),
        buyer_phone: input.buyer_phone.trim(),
        buyer_email: input.buyer_email?.trim() || null,
        shipping_address: {
          ...(shippingPayload || {}),
          _coupon_code: normalizedCouponCode || null,
          _discount_amount: discountAmount || 0,
          _original_amount: amountBeforeCoupon,
        },
        ...(computedCustomizationData ? { customization_data: computedCustomizationData } : {}),
        amount: finalAmount,
        platform_fee: 0,
        payment_method: shouldUsePg ? 'pg_razorpay' : 'upi_manual',
        payment_status: shouldUsePg ? 'processing' : 'pending',
        payment_verified: false,
        razorpay_order_id: razorpayOrderId,
        gateway_order_id: razorpayOrderId,
        gateway_provider: shouldUsePg ? 'razorpay' : null,
        status: 'new',
        legacy_revenue_model: false,
      })
      .select('id, order_number')
      .single()

    if (!insertError && insertedOrder) {
      order = insertedOrder
      orderError = null
      break
    }
    orderError = insertError
    if (!isDuplicateOrderNumberError(insertError)) break
  }

  if (!order) {
    console.error('Create checkout session order insert error:', orderError)
    throw new Error('Failed to create order')
  }

  if (appliedCoupon) {
    await supabase.from('coupon_redemptions').insert({
      coupon_id: appliedCoupon.id,
      creator_id: creatorId,
      order_id: order.id,
      product_id: input.product_id,
      code: appliedCoupon.code,
      discount_amount: discountAmount,
    })

    const { data: couponRow } = await supabase
      .from('coupons')
      .select('used_count')
      .eq('id', appliedCoupon.id)
      .single()

    if (couponRow) {
      await supabase
        .from('coupons')
        .update({
          used_count: (couponRow.used_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appliedCoupon.id)
    }
  }

  await supabase
    .from('analytics_events')
    .insert({
      creator_id: creatorId,
      event_type: 'checkout_start',
      product_id: input.product_id,
      order_id: order.id,
      visitor_id: asText(input.visitor_id, 96),
      session_id: asText(input.session_id, 96),
      source: attributionMeta._source || 'direct',
      medium: attributionMeta._medium || 'direct',
      campaign: attributionMeta._campaign,
      referrer: attributionMeta._referrer,
      metadata: {
        payment_mode: shouldUsePg ? 'pg_primary' : 'upi_manual',
      },
    })
    .then(({ error }) => {
      if (error) console.warn('Analytics insert skipped:', error.message)
    })

  const couponSummary: CouponSummary | null = appliedCoupon
    ? {
        id: appliedCoupon.id,
        code: appliedCoupon.code,
        discount_amount: discountAmount,
        original_amount: amountBeforeCoupon,
        final_amount: finalAmount,
      }
    : null

  if (shouldUsePg && razorpayOrderId) {
    return {
      mode: 'pg',
      order_id: order.id,
      order_number: order.order_number,
      amount: finalAmount,
      provider: 'razorpay',
      key_id: paymentAccount.pg_key_id!,
      gateway_order_id: razorpayOrderId,
      coupon: couponSummary,
    }
  }

  if (!sellerUpiId) {
    throw new Error('Seller has not configured a UPI ID for manual checkout')
  }

  if (!validateUPIId(sellerUpiId)) {
    throw new Error('Seller UPI ID is invalid. Please update payment settings.')
  }

  const upiPayload = buildUPILinkVariants({
    payeeVPA: sellerUpiId,
    payeeName: creator.store_name,
    amount: finalAmount / 100,
    transactionNote: `Order-${order.order_number}`,
    transactionRef: order.order_number,
    merchantCode: '0000',
  })

  return {
    mode: 'upi',
    order_id: order.id,
    order_number: order.order_number,
    amount: finalAmount,
    upi_link: upiPayload.primary_link,
    upi_lite_link: upiPayload.lite_link,
    qr_link: upiPayload.qr_link,
    seller_upi_id: upiPayload.payee_vpa,
    seller_name: upiPayload.payee_name,
    transaction_ref: upiPayload.transaction_ref,
    transaction_note: upiPayload.transaction_note,
    merchant_code: upiPayload.merchant_code,
    coupon: couponSummary,
  }
}
