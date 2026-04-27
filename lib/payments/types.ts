export type PaymentMode = 'pg_primary' | 'upi_fallback'
export type PaymentProvider = 'razorpay' | 'none'

export type PgStatus =
  | 'not_started'
  | 'onboarding_started'
  | 'pending_kyc'
  | 'under_review'
  | 'active'
  | 'rejected'
  | 'suspended'

export type OrderPaymentStatus =
  | 'pending'
  | 'awaiting_manual_proof'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'chargeback'

export type VerificationTier = 'unverified' | 'identity_verified' | 'business_verified'

export interface PaymentAccountRow {
  id: string
  creator_id: string
  provider: PaymentProvider
  payment_mode: PaymentMode
  pg_status: PgStatus
  pg_account_label: string | null
  pg_key_id: string | null
  pg_secret_encrypted: string | null
  pg_webhook_secret_encrypted: string | null
  upi_id: string | null
  upi_fallback_enabled: boolean
  upi_fallback_expires_at: string | null
  created_at: string
  updated_at: string
}

