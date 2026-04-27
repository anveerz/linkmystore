import crypto from 'crypto'

export type OrderActionTokenPurpose =
  | 'seller_manual_upi_confirm'
  | 'buyer_digital_delivery'

interface BaseOrderActionTokenPayload {
  v: 1
  purpose: OrderActionTokenPurpose
  orderId: string
  exp: number
}

export interface SellerManualUpiConfirmTokenPayload extends BaseOrderActionTokenPayload {
  purpose: 'seller_manual_upi_confirm'
  creatorId: string
}

export interface BuyerDigitalDeliveryTokenPayload extends BaseOrderActionTokenPayload {
  purpose: 'buyer_digital_delivery'
  buyerEmail: string
}

type OrderActionTokenPayload =
  | SellerManualUpiConfirmTokenPayload
  | BuyerDigitalDeliveryTokenPayload

function getTokenSecret() {
  const configured =
    process.env.ORDER_EMAIL_ACTION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ''

  if (!configured) {
    throw new Error('ORDER_EMAIL_ACTION_SECRET or SUPABASE_SERVICE_ROLE_KEY must be configured')
  }

  return configured
}

function signTokenPayload(encodedPayload: string) {
  return crypto
    .createHmac('sha256', getTokenSecret())
    .update(encodedPayload)
    .digest('base64url')
}

function encodePayload(payload: OrderActionTokenPayload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

function decodePayload(token: string): OrderActionTokenPayload {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    return JSON.parse(decoded) as OrderActionTokenPayload
  } catch {
    throw new Error('Invalid action token payload')
  }
}

function normalizeBaseUrl(url: string) {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

export function getAppBaseUrl() {
  return normalizeBaseUrl(
    process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'
  )
}

export function createSellerManualUpiConfirmToken(input: {
  orderId: string
  creatorId: string
  expiresInSeconds?: number
}) {
  const payload: SellerManualUpiConfirmTokenPayload = {
    v: 1,
    purpose: 'seller_manual_upi_confirm',
    orderId: input.orderId,
    creatorId: input.creatorId,
    exp: Math.floor(Date.now() / 1000) + (input.expiresInSeconds || 60 * 60 * 24 * 7),
  }

  const encodedPayload = encodePayload(payload)
  return `${encodedPayload}.${signTokenPayload(encodedPayload)}`
}

export function createBuyerDigitalDeliveryToken(input: {
  orderId: string
  buyerEmail: string
  expiresInSeconds?: number
}) {
  const payload: BuyerDigitalDeliveryTokenPayload = {
    v: 1,
    purpose: 'buyer_digital_delivery',
    orderId: input.orderId,
    buyerEmail: input.buyerEmail.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + (input.expiresInSeconds || 60 * 60 * 24 * 7),
  }

  const encodedPayload = encodePayload(payload)
  return `${encodedPayload}.${signTokenPayload(encodedPayload)}`
}

export function verifyOrderActionToken(token: string): OrderActionTokenPayload {
  const normalizedToken = token.trim()
  const [encodedPayload, providedSignature] = normalizedToken.split('.')

  if (!encodedPayload || !providedSignature) {
    throw new Error('Invalid action token')
  }

  const expectedSignature = signTokenPayload(encodedPayload)
  const signaturesMatch =
    providedSignature.length === expectedSignature.length &&
    crypto.timingSafeEqual(
      Buffer.from(providedSignature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    )

  if (!signaturesMatch) {
    throw new Error('Invalid action token signature')
  }

  const payload = decodePayload(encodedPayload)
  if (payload.v !== 1) {
    throw new Error('Unsupported action token version')
  }

  const now = Math.floor(Date.now() / 1000)
  if (!payload.exp || payload.exp < now) {
    throw new Error('Action token has expired')
  }

  return payload
}
