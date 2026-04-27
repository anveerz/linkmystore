import { createAdminClient } from '@/lib/supabase/admin'
import { validateUPIReferenceNumber } from '@/lib/upi'
import { sendSellerManualUpiVerificationEmail } from '@/lib/email'
import { sendOrderNotificationIfEligible } from '@/lib/notifications'
import {
  createSellerManualUpiConfirmToken,
  getAppBaseUrl,
} from '@/lib/payments/order-action-tokens'
import { markOrderPaidAndFulfill } from '@/lib/payments/order-fulfillment'

const VALID_UPI_METHODS = ['upi_manual', 'upi_direct']

function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return normalized || null
}

async function resolveCreatorNotificationProfile(creatorId: string) {
  const admin = createAdminClient()
  const { data: creator } = await admin
    .from('creators')
    .select('id, user_id, email, store_name')
    .eq('id', creatorId)
    .single()

  if (!creator) {
    return null
  }

  const creatorEmail = normalizeEmail(creator.email)
  if (creatorEmail) {
    return {
      email: creatorEmail,
      storeName: creator.store_name || 'LinkMyStore Store',
    }
  }

  if (creator.user_id) {
    const { data } = await admin.auth.admin.getUserById(creator.user_id)
    const fallbackEmail = normalizeEmail(data.user?.email)
    if (fallbackEmail) {
      return {
        email: fallbackEmail,
        storeName: creator.store_name || 'LinkMyStore Store',
      }
    }
  }

  return {
    email: null,
    storeName: creator.store_name || 'LinkMyStore Store',
  }
}

export async function submitUpiProof(input: {
  orderId: string
  upiReferenceNumber?: string | null
  paymentScreenshotUrl?: string | null
}) {
  const normalizedReference = (input.upiReferenceNumber || '').replace(/\s/g, '')
  const screenshotUrl = input.paymentScreenshotUrl || null

  if (!normalizedReference && !screenshotUrl) {
    throw new Error('Provide either UPI reference number or payment screenshot')
  }

  if (normalizedReference && !validateUPIReferenceNumber(normalizedReference)) {
    throw new Error('Invalid UPI reference number. Expected 12 digits.')
  }

  const admin = createAdminClient()
  const { data: order } = await admin
    .from('orders')
    .select('id, payment_method, payment_status, creator_id, order_number, buyer_name, amount')
    .eq('id', input.orderId)
    .single()

  if (!order) throw new Error('Order not found')
  if (!VALID_UPI_METHODS.includes(order.payment_method || '')) {
    throw new Error('Order is not eligible for manual UPI proof flow')
  }
  if (order.payment_status === 'paid') {
    throw new Error('Order is already paid')
  }

  const { error: updateError } = await admin
    .from('orders')
    .update({
      payment_status: 'awaiting_manual_proof',
      upi_reference_number: normalizedReference || null,
      payment_screenshot_url: screenshotUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.orderId)

  if (updateError) {
    throw new Error(updateError.message || 'Failed to update order proof')
  }

  await sendOrderNotificationIfEligible({
    creatorId: order.creator_id,
    orderNumber: order.order_number,
    buyerName: order.buyer_name || 'Customer',
    amountInPaisa: order.amount || 0,
    upiReference: normalizedReference || null,
  }).catch((error) => {
    console.error('UPI proof notification failed:', error)
  })

  const creatorProfile = await resolveCreatorNotificationProfile(order.creator_id).catch((error) => {
    console.error('Creator email lookup failed:', error)
    return null
  })

  if (creatorProfile?.email) {
    const confirmToken = createSellerManualUpiConfirmToken({
      orderId: order.id,
      creatorId: order.creator_id,
    })
    const baseUrl = getAppBaseUrl()

    await sendSellerManualUpiVerificationEmail({
      to: creatorProfile.email,
      storeName: creatorProfile.storeName,
      orderNumber: order.order_number,
      buyerName: order.buyer_name || 'Customer',
      amountInPaisa: order.amount || 0,
      upiReference: normalizedReference || null,
      paymentScreenshotUrl: screenshotUrl,
      confirmOrderUrl: `${baseUrl}/orders/confirm/${order.id}?token=${encodeURIComponent(confirmToken)}`,
      dashboardOrderUrl: `${baseUrl}/dashboard/orders/${order.id}`,
    }).then((result) => {
      console.info('Seller manual UPI email sent:', {
        orderId: order.id,
        orderNumber: order.order_number,
        to: creatorProfile.email,
        emailId: result.id,
      })
    }).catch((error) => {
      console.error('Seller manual UPI email failed:', error)
    })
  }

  return {
    success: true,
    message: 'Payment proof submitted. Seller verification is pending.',
  }
}

export async function verifyUpiOrderBySeller(input: {
  orderId: string
  creatorId: string
  upiReferenceNumber?: string | null
}) {
  const admin = createAdminClient()
  const { data: order } = await admin
    .from('orders')
    .select('id, creator_id, payment_method, payment_status, upi_reference_number, payment_screenshot_url')
    .eq('id', input.orderId)
    .single()

  if (!order) throw new Error('Order not found')
  if (order.creator_id !== input.creatorId) throw new Error('Forbidden')
  if (!VALID_UPI_METHODS.includes(order.payment_method || '')) {
    throw new Error('Order is not a UPI manual verification order')
  }
  if (order.payment_status === 'paid') {
    return {
      success: true,
      alreadyPaid: true,
      message: 'Payment already verified',
    }
  }

  const upiReference = input.upiReferenceNumber?.trim() || order.upi_reference_number || null
  if (!upiReference && !order.payment_screenshot_url) {
    throw new Error('Buyer has not submitted UPI reference number or screenshot proof yet')
  }

  await markOrderPaidAndFulfill({
    orderId: input.orderId,
    provider: 'none',
    upiReference,
    verifiedBy: 'seller',
  })

  return {
    success: true,
    message: 'UPI payment verified successfully',
  }
}
