import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPaymentAccountByCreatorId, updatePaymentAccount } from '@/lib/payments/payment-account-service'
import { isPgActive } from '@/lib/payments/payment-policy-guards'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const requestedCreatorId = url.searchParams.get('creator_id')

    const admin = createAdminClient()
    const creatorQuery = admin
      .from('creators')
      .select('id')
      .eq('user_id', user.id)

    if (requestedCreatorId) {
      creatorQuery.eq('id', requestedCreatorId)
    }

    const { data: creator } = await creatorQuery.single()
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    const account = await getPaymentAccountByCreatorId(creator.id)
    const pgActive = isPgActive(account)

    let latestAccount = account
    if (pgActive && account.upi_fallback_enabled) {
      latestAccount = await updatePaymentAccount(account.id, {
        upi_fallback_enabled: false,
      })
    }

    return NextResponse.json({
      success: true,
      payment_account_id: latestAccount.id,
      pg_status: latestAccount.pg_status,
      payment_mode: latestAccount.payment_mode,
      provider: latestAccount.provider,
      upi_id: latestAccount.upi_id,
      upi_fallback_enabled: latestAccount.upi_fallback_enabled,
      upi_fallback_expires_at: latestAccount.upi_fallback_expires_at,
      pg_active: pgActive,
    })
  } catch (error) {
    console.error('Payment account status error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch payment status' },
      { status: 400 }
    )
  }
}
