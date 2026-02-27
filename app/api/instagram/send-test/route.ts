import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendInstagramDm } from '@/lib/instagram'

function asText(value: unknown, max = 300): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized.slice(0, max) : null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const recipientId = asText(body.recipient_id, 120)

    if (!recipientId) {
      return NextResponse.json({ error: 'recipient_id is required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: creator } = await supabase
      .from('creators')
      .select('id, store_name, store_slug')
      .eq('user_id', user.id)
      .single()

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    const { data: settings } = await supabase
      .from('instagram_automation_settings')
      .select('*')
      .eq('creator_id', creator.id)
      .single()

    if (!settings?.ig_business_account_id || !settings?.page_access_token) {
      return NextResponse.json({ error: 'Instagram account not configured yet' }, { status: 400 })
    }

    const message = `Test DM from ${creator.store_name}. Your store link: https://linkmystore.in/${creator.store_slug}`
    const result = await sendInstagramDm({
      igBusinessAccountId: settings.ig_business_account_id,
      recipientId,
      message,
      accessToken: settings.page_access_token,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Failed to send test DM' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Instagram send-test error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
