import { createAdminClient } from '@/lib/supabase/admin'
import type { PaymentAccountRow, PaymentMode, PaymentProvider, PgStatus } from '@/lib/payments/types'
import { UPI_FALLBACK_LIMITS } from '@/lib/payments/constants'

interface CreatorRow {
  id: string
  created_at?: string | null
  bank_account?: { upi_id?: string } | null
}

export async function getCreatorById(creatorId: string): Promise<CreatorRow | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('creators')
    .select('id, created_at, bank_account')
    .eq('id', creatorId)
    .single()

  return (data as CreatorRow | null) || null
}

function computeFallbackExpiry(creatorCreatedAt?: string | null): string {
  const base = creatorCreatedAt ? new Date(creatorCreatedAt) : new Date()
  const expiry = new Date(base)
  expiry.setDate(expiry.getDate() + UPI_FALLBACK_LIMITS.daysFromCreatorCreation)
  return expiry.toISOString()
}

export async function ensurePaymentAccountForCreator(creatorId: string): Promise<PaymentAccountRow> {
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('payment_accounts')
    .select('*')
    .eq('creator_id', creatorId)
    .single()

  if (existing) {
    return existing as PaymentAccountRow
  }

  const creator = await getCreatorById(creatorId)
  if (!creator) {
    throw new Error('Creator not found')
  }

  const { data: inserted, error } = await supabase
    .from('payment_accounts')
    .insert({
      creator_id: creatorId,
      provider: 'razorpay',
      payment_mode: 'pg_primary',
      pg_status: 'not_started',
      upi_id: creator.bank_account?.upi_id || null,
      upi_fallback_enabled: true,
      upi_fallback_expires_at: computeFallbackExpiry(creator.created_at),
    })
    .select('*')
    .single()

  if (error || !inserted) {
    throw new Error(error?.message || 'Could not create payment account')
  }

  return inserted as PaymentAccountRow
}

export async function getPaymentAccountByCreatorId(creatorId: string): Promise<PaymentAccountRow> {
  const account = await ensurePaymentAccountForCreator(creatorId)
  const creator = await getCreatorById(creatorId)
  const creatorUpiId = creator?.bank_account?.upi_id?.trim() || null
  const accountUpiId = account.upi_id?.trim() || null
  const pgActive =
    account.pg_status === 'active' && !!account.pg_key_id && !!account.pg_secret_encrypted

  const updates: Partial<{
    upi_id: string | null
    upi_fallback_enabled: boolean
  }> = {}

  if (creatorUpiId !== accountUpiId) {
    updates.upi_id = creatorUpiId
  }

  if (pgActive && account.upi_fallback_enabled) {
    updates.upi_fallback_enabled = false
  }

  if (Object.keys(updates).length > 0) {
    return updatePaymentAccount(account.id, updates)
  }

  return account
}

export async function updatePaymentAccount(
  paymentAccountId: string,
  updates: Partial<{
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
  }>
): Promise<PaymentAccountRow> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('payment_accounts')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentAccountId)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update payment account')
  }

  return data as PaymentAccountRow
}

export async function getMonthlyUpiGmvPaisa(creatorId: string): Promise<number> {
  const supabase = createAdminClient()
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  const { data } = await supabase
    .from('orders')
    .select('amount')
    .eq('creator_id', creatorId)
    .in('payment_method', ['upi_manual', 'upi_direct'])
    .gte('created_at', monthStart.toISOString())
    .in('payment_status', ['pending', 'awaiting_manual_proof', 'processing', 'paid'])

  return (data || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
}
