import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encryptSecret } from '@/lib/payments/crypto'
import { updatePaymentAccount } from '@/lib/payments/payment-account-service'
import {
  resolveRazorpayWebhookUrl,
  upsertRazorpayWebhook,
} from '@/lib/payments/razorpay-webhook-sync'

interface PaymentAccountOwnerRow {
  id: string
  creator_id: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const paymentAccountId = typeof body?.payment_account_id === 'string' ? body.payment_account_id : ''
    const keyId = typeof body?.key_id === 'string' ? body.key_id.trim() : ''
    const keySecret = typeof body?.key_secret === 'string' ? body.key_secret.trim() : ''
    const webhookSecret = typeof body?.webhook_secret === 'string' ? body.webhook_secret.trim() : ''
    const explicitWebhookUrl = typeof body?.webhook_url === 'string' ? body.webhook_url.trim() : ''

    if (!paymentAccountId || !keyId || !keySecret) {
      return NextResponse.json(
        { error: 'payment_account_id, key_id, and key_secret are required' },
        { status: 400 }
      )
    }

    const resolvedWebhookSecret = webhookSecret || randomBytes(24).toString('hex')

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: creator } = await admin
      .from('creators')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    const { data: ownedAccount } = await admin
      .from('payment_accounts')
      .select('id, creator_id')
      .eq('id', paymentAccountId)
      .eq('creator_id', creator.id)
      .single()

    if (!ownedAccount) {
      return NextResponse.json({ error: 'Payment account not found' }, { status: 404 })
    }

    const accountRow = ownedAccount as PaymentAccountOwnerRow
    const webhookUrl = resolveRazorpayWebhookUrl({
      explicitWebhookUrl,
      appBaseUrl: process.env.RAZORPAY_WEBHOOK_URL || process.env.NEXT_PUBLIC_APP_URL || null,
      requestUrl: request.url,
    })

    const webhookSync = await upsertRazorpayWebhook({
      keyId,
      keySecret,
      webhookSecret: resolvedWebhookSecret,
      webhookUrl,
    })

    const updated = await updatePaymentAccount(accountRow.id, {
      provider: 'razorpay',
      payment_mode: 'pg_primary',
      pg_status: 'active',
      pg_account_label:
        typeof body?.pg_account_label === 'string' ? body.pg_account_label.trim() : 'Razorpay',
      pg_key_id: keyId,
      pg_secret_encrypted: encryptSecret(keySecret),
      pg_webhook_secret_encrypted: encryptSecret(resolvedWebhookSecret),
      upi_fallback_enabled: false,
    })

    return NextResponse.json({
      success: true,
      connected: true,
      pg_status: updated.pg_status,
      webhook_secret_generated: !webhookSecret,
      webhook: {
        action: webhookSync.action,
        webhook_id: webhookSync.webhookId,
        webhook_url: webhookSync.url,
      },
    })
  } catch (error) {
    console.error('Payment account connect error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect payment account' },
      { status: 400 }
    )
  }
}
