import { V3_PAYMENT_FLAGS } from '@/lib/payments/constants'
import type { PaymentAccountRow } from '@/lib/payments/types'

interface UpiFallbackGuardInput {
  account: PaymentAccountRow
  creatorCreatedAt: string | null | undefined
  orderAmountPaisa: number
  monthlyUpiGmvPaisa: number
  now?: Date
}

export interface UpiFallbackGuardResult {
  allowed: boolean
  reason: string | null
}

export function isPgActive(account: PaymentAccountRow | null | undefined): boolean {
  if (!account) return false
  return account.pg_status === 'active' && !!account.pg_key_id && !!account.pg_secret_encrypted
}

export function isUpiFallbackAllowed(input: UpiFallbackGuardInput): UpiFallbackGuardResult {
  const { account } = input

  if (!account.upi_fallback_enabled) {
    return { allowed: false, reason: 'Manual UPI mode is disabled for this store.' }
  }

  if (!account.upi_id) {
    return { allowed: false, reason: 'Seller has not configured a UPI ID for manual UPI checkout.' }
  }

  if (isPgActive(account) && V3_PAYMENT_FLAGS.pgPrimary) {
    return { allowed: false, reason: 'Gateway is active. Buyer will be redirected to secure gateway checkout.' }
  }

  return { allowed: true, reason: null }
}
