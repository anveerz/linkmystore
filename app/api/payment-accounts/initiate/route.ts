import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ensurePaymentAccountForCreator,
  updatePaymentAccount,
} from '@/lib/payments/payment-account-service'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const provider = body?.provider === 'razorpay' ? 'razorpay' : 'razorpay'

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const creatorQuery = admin
      .from('creators')
      .select('id')
      .eq('user_id', user.id)

    if (body?.creator_id) {
      creatorQuery.eq('id', body.creator_id)
    }

    const { data: creator } = await creatorQuery.maybeSingle()
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    const account = await ensurePaymentAccountForCreator(creator.id)
    if (account.pg_status === 'active') {
      return NextResponse.json({
        success: true,
        onboarding_url: process.env.RAZORPAY_ONBOARDING_URL || null,
        payment_account_id: account.id,
        pg_status: account.pg_status,
      })
    }

    const updated = await updatePaymentAccount(account.id, {
      provider,
      pg_status: 'onboarding_started',
      payment_mode: 'pg_primary',
    })

    const onboardingUrl =
      process.env.RAZORPAY_ONBOARDING_URL ||
      'https://dashboard.razorpay.com/signin?screen=signup'

    return NextResponse.json({
      success: true,
      onboarding_url: onboardingUrl,
      payment_account_id: updated.id,
      pg_status: updated.pg_status,
    })
  } catch (error) {
    console.error('Payment account initiate error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate payment onboarding' },
      { status: 400 }
    )
  }
}
