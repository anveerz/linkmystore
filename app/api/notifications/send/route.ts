import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCreatorPlanSnapshot } from '@/lib/plan-gate'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export async function POST(request: Request) {
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

    if (planSnapshot.effectivePlan !== 'pro') {
      return NextResponse.json({ error: 'WhatsApp notifications are available on Pro plan only' }, { status: 403 })
    }

    const body = await request.json()
    const message =
      typeof body.message === 'string' && body.message.trim()
        ? body.message.trim().slice(0, 1000)
        : 'Test notification from LinkMyStore'
    const to =
      (typeof body.to === 'string' && body.to.trim()) ||
      creator.whatsapp_number ||
      creator.phone

    if (!to) {
      return NextResponse.json({ error: 'No WhatsApp number configured' }, { status: 400 })
    }

    const result = await sendWhatsAppMessage({ to, message })
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send notification', result }, { status: 500 })
    }

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Send notification error:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
