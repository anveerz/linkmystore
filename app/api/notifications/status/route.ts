import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCreatorPlanSnapshot } from '@/lib/plan-gate'

function maskPhone(rawPhone: string | null): string | null {
  if (!rawPhone) return null
  const digits = rawPhone.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length <= 4) return `***${digits}`
  return `${'*'.repeat(Math.max(digits.length - 4, 2))}${digits.slice(-4)}`
}

export async function GET() {
  try {
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
      .select('id, plan, phone, whatsapp_number')
      .eq('user_id', user.id)
      .single()

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    const planSnapshot = await getCreatorPlanSnapshot(creator.id)
    const provider = (process.env.WHATSAPP_PROVIDER || 'generic').toLowerCase()
    const configured = Boolean(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_KEY)
    const recipient = creator.whatsapp_number || creator.phone || null
    const hasRecipient = Boolean(recipient)
    const isPro = planSnapshot.effectivePlan === 'pro'

    let issue: 'pro_required' | 'provider_not_configured' | 'recipient_missing' | null = null
    if (!isPro) {
      issue = 'pro_required'
    } else if (!configured) {
      issue = 'provider_not_configured'
    } else if (!hasRecipient) {
      issue = 'recipient_missing'
    }

    return NextResponse.json({
      plan: planSnapshot.effectivePlan,
      isPro,
      provider,
      configured,
      hasRecipient,
      recipientHint: maskPhone(recipient),
      canSend: issue === null,
      issue,
    })
  } catch (error) {
    console.error('Notification status error:', error)
    return NextResponse.json({ error: 'Failed to fetch notification status' }, { status: 500 })
  }
}
