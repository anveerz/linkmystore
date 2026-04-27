import Razorpay from 'razorpay'

export const REQUIRED_RAZORPAY_WEBHOOK_EVENTS = [
  'payment.captured',
  'order.paid',
  'payment.failed',
  'refund.created',
  'refund.processed',
  'refund.failed',
  'dispute.created',
  'dispute.won',
  'dispute.lost',
] as const

interface RazorpayWebhookListResponse {
  items?: Array<{
    id: string
    url?: string | null
  }>
}

function normalizeUrl(value: string): string {
  const parsed = new URL(value)
  parsed.hash = ''
  parsed.search = ''
  return parsed.toString().replace(/\/$/, '')
}

function buildEventMap(events: readonly string[]): Record<string, boolean> {
  return events.reduce<Record<string, boolean>>((acc, eventName) => {
    acc[eventName] = true
    return acc
  }, {})
}

export function resolveRazorpayWebhookUrl(input: {
  explicitWebhookUrl?: string | null
  appBaseUrl?: string | null
  requestUrl?: string | null
}): string {
  const explicit = input.explicitWebhookUrl?.trim()
  if (explicit) {
    const parsed = new URL(explicit)
    return parsed.toString()
  }

  const baseCandidate = input.appBaseUrl?.trim() || input.requestUrl?.trim() || ''
  if (!baseCandidate) {
    throw new Error('Could not determine webhook URL. Provide webhook_url or NEXT_PUBLIC_APP_URL.')
  }

  const base = new URL(baseCandidate)
  return new URL('/api/payments/razorpay/webhook', base).toString()
}

export async function upsertRazorpayWebhook(input: {
  keyId: string
  keySecret: string
  webhookSecret: string
  webhookUrl: string
}) {
  const razorpay = new Razorpay({
    key_id: input.keyId,
    key_secret: input.keySecret,
  })

  const normalizedWebhookUrl = normalizeUrl(input.webhookUrl)
  const eventMap = buildEventMap(REQUIRED_RAZORPAY_WEBHOOK_EVENTS)
  const list = (await razorpay.webhooks.all({ count: 100 })) as RazorpayWebhookListResponse
  const existing = (list.items || []).find((item) => {
    if (!item?.url) return false
    try {
      return normalizeUrl(item.url) === normalizedWebhookUrl
    } catch {
      return false
    }
  })

  const payload = {
    url: normalizedWebhookUrl,
    secret: input.webhookSecret,
    active: 'true',
    events: eventMap,
  }

  if (existing?.id) {
    const updated = await razorpay.webhooks.edit(payload, existing.id)
    return {
      action: 'updated' as const,
      webhookId: updated.id,
      url: updated.url,
    }
  }

  const created = await razorpay.webhooks.create(payload)
  return {
    action: 'created' as const,
    webhookId: created.id,
    url: created.url,
  }
}
