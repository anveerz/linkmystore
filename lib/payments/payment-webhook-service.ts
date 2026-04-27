import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptSecret } from '@/lib/payments/crypto'
import { markOrderPaidAndFulfill } from '@/lib/payments/order-fulfillment'

interface RazorpayEventPayload {
  event?: string
  payload?: {
    payment?: {
      entity?: {
        id?: string
        order_id?: string
        status?: string
        notes?: Record<string, unknown>
      }
    }
    refund?: {
      entity?: {
        id?: string
        payment_id?: string
        status?: string
        notes?: Record<string, unknown>
      }
    }
    dispute?: {
      entity?: {
        id?: string
        payment_id?: string
        notes?: Record<string, unknown>
      }
    }
  }
  created_at?: number
}

interface OrderLookupResult {
  id: string
  creator_id: string
  gateway_order_id: string | null
  gateway_payment_id: string | null
  payment_status: string
}

function safeJsonParse(rawBody: string): RazorpayEventPayload | null {
  try {
    return JSON.parse(rawBody) as RazorpayEventPayload
  } catch {
    return null
  }
}

function getPaymentEntity(payload: RazorpayEventPayload) {
  return payload.payload?.payment?.entity || null
}

function getRefundEntity(payload: RazorpayEventPayload) {
  return payload.payload?.refund?.entity || null
}

function getDisputeEntity(payload: RazorpayEventPayload) {
  return payload.payload?.dispute?.entity || null
}

function inferOrderAndPaymentIds(payload: RazorpayEventPayload): {
  gatewayOrderId: string | null
  gatewayPaymentId: string | null
} {
  const payment = getPaymentEntity(payload)
  const refund = getRefundEntity(payload)
  const dispute = getDisputeEntity(payload)

  return {
    gatewayOrderId: payment?.order_id || null,
    gatewayPaymentId: payment?.id || refund?.payment_id || dispute?.payment_id || null,
  }
}

function buildEventId(
  rawPayload: RazorpayEventPayload,
  headerEventId: string | null,
  gatewayOrderId: string | null,
  gatewayPaymentId: string | null
): string {
  if (headerEventId) return headerEventId

  const eventType = rawPayload.event || 'unknown'
  const createdAt = rawPayload.created_at || Date.now()
  const source = `${eventType}:${gatewayOrderId || ''}:${gatewayPaymentId || ''}:${createdAt}`
  return `derived:${crypto.createHash('sha256').update(source).digest('hex').slice(0, 32)}`
}

async function findOrderForWebhook(gatewayOrderId: string | null, gatewayPaymentId: string | null): Promise<OrderLookupResult | null> {
  const admin = createAdminClient()

  if (gatewayOrderId) {
    const { data } = await admin
      .from('orders')
      .select('id, creator_id, gateway_order_id, gateway_payment_id, payment_status')
      .eq('gateway_order_id', gatewayOrderId)
      .maybeSingle()
    if (data) return data as OrderLookupResult
  }

  if (gatewayPaymentId) {
    const { data } = await admin
      .from('orders')
      .select('id, creator_id, gateway_order_id, gateway_payment_id, payment_status')
      .or(`gateway_payment_id.eq.${gatewayPaymentId},razorpay_payment_id.eq.${gatewayPaymentId}`)
      .maybeSingle()
    if (data) return data as OrderLookupResult
  }

  return null
}

async function getWebhookSecretForCreator(creatorId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('payment_accounts')
    .select('pg_webhook_secret_encrypted')
    .eq('creator_id', creatorId)
    .maybeSingle()

  if (!data?.pg_webhook_secret_encrypted) return null
  return decryptSecret(data.pg_webhook_secret_encrypted)
}

function verifySignature(rawBody: string, providedSignature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  const providedBuffer = Buffer.from(providedSignature, 'utf8')

  if (expectedBuffer.length !== providedBuffer.length) return false
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer)
}

async function persistEvent(input: {
  creatorId: string
  orderId: string | null
  provider: 'razorpay'
  eventId: string
  eventType: string
  rawPayload: RazorpayEventPayload
  status: 'processed' | 'ignored' | 'failed'
}): Promise<'inserted' | 'duplicate'> {
  const admin = createAdminClient()
  const { error } = await admin.from('payment_events').insert({
    creator_id: input.creatorId,
    order_id: input.orderId,
    provider: input.provider,
    event_id: input.eventId,
    event_type: input.eventType,
    raw_payload: input.rawPayload,
    status: input.status,
    processed_at: new Date().toISOString(),
  })

  if (!error) return 'inserted'
  if (error.code === '23505') return 'duplicate'
  throw new Error(error.message || 'Failed to persist payment event')
}

async function updateOrderPaymentState(orderId: string, nextStatus: 'failed' | 'refunded' | 'chargeback', gatewayPaymentId: string | null) {
  const admin = createAdminClient()
  await admin
    .from('orders')
    .update({
      payment_status: nextStatus,
      gateway_payment_id: gatewayPaymentId,
      razorpay_payment_id: gatewayPaymentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
}

export async function processRazorpayWebhook(input: {
  rawBody: string
  razorpaySignature: string | null
  headerEventId: string | null
}): Promise<{ code: number; body: { success: boolean; message: string } }> {
  const payload = safeJsonParse(input.rawBody)
  if (!payload) {
    return { code: 400, body: { success: false, message: 'Invalid JSON payload' } }
  }

  const eventType = payload.event || 'unknown'
  const { gatewayOrderId, gatewayPaymentId } = inferOrderAndPaymentIds(payload)
  const order = await findOrderForWebhook(gatewayOrderId, gatewayPaymentId)

  if (!order) {
    return { code: 202, body: { success: true, message: 'No linked order found for event' } }
  }

  const webhookSecret = await getWebhookSecretForCreator(order.creator_id)
  if (!webhookSecret || !input.razorpaySignature) {
    return { code: 400, body: { success: false, message: 'Webhook secret/signature missing' } }
  }

  if (!verifySignature(input.rawBody, input.razorpaySignature, webhookSecret)) {
    return { code: 401, body: { success: false, message: 'Invalid webhook signature' } }
  }

  const eventId = buildEventId(payload, input.headerEventId, gatewayOrderId, gatewayPaymentId)

  const eventInsert = await persistEvent({
    creatorId: order.creator_id,
    orderId: order.id,
    provider: 'razorpay',
    eventId,
    eventType,
    rawPayload: payload,
    status: 'processed',
  })

  if (eventInsert === 'duplicate') {
    return { code: 200, body: { success: true, message: 'Duplicate webhook ignored' } }
  }

  if (eventType === 'payment.captured' || eventType === 'order.paid') {
    await markOrderPaidAndFulfill({
      orderId: order.id,
      provider: 'razorpay',
      gatewayOrderId: gatewayOrderId || order.gateway_order_id,
      gatewayPaymentId,
      verifiedBy: 'webhook',
    })
    return { code: 200, body: { success: true, message: 'Payment captured' } }
  }

  if (eventType === 'payment.failed') {
    await updateOrderPaymentState(order.id, 'failed', gatewayPaymentId)
    return { code: 200, body: { success: true, message: 'Payment marked failed' } }
  }

  if (eventType.startsWith('refund.')) {
    await updateOrderPaymentState(order.id, 'refunded', gatewayPaymentId)
    return { code: 200, body: { success: true, message: 'Payment marked refunded' } }
  }

  if (eventType.startsWith('dispute.')) {
    await updateOrderPaymentState(order.id, 'chargeback', gatewayPaymentId)
    return { code: 200, body: { success: true, message: 'Payment marked chargeback' } }
  }

  return { code: 200, body: { success: true, message: `Event ${eventType} recorded` } }
}

