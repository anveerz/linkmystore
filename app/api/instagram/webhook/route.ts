import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildInstagramDmMessage, sendInstagramDm, textHasKeyword } from '@/lib/instagram'

interface IncomingDmEvent {
  igBusinessAccountId: string
  recipientId: string
  text: string
}

function extractIncomingEvents(payload: unknown): IncomingDmEvent[] {
  if (!payload || typeof payload !== 'object') return []
  const root = payload as Record<string, unknown>
  if (!Array.isArray(root.entry)) return []

  const events: IncomingDmEvent[] = []
  for (const rawEntry of root.entry) {
    if (!rawEntry || typeof rawEntry !== 'object') continue
    const entry = rawEntry as Record<string, unknown>
    const igBusinessAccountId = typeof entry.id === 'string' ? entry.id : ''
    if (!igBusinessAccountId) continue

    if (Array.isArray(entry.messaging)) {
      for (const rawMessage of entry.messaging) {
        if (!rawMessage || typeof rawMessage !== 'object') continue
        const messageEvent = rawMessage as Record<string, unknown>
        const sender = messageEvent.sender as Record<string, unknown> | undefined
        const message = messageEvent.message as Record<string, unknown> | undefined
        const recipientId = typeof sender?.id === 'string' ? sender.id : ''
        const text = typeof message?.text === 'string' ? message.text : ''
        if (recipientId && text) {
          events.push({ igBusinessAccountId, recipientId, text })
        }
      }
    }

    if (Array.isArray(entry.changes)) {
      for (const rawChange of entry.changes) {
        if (!rawChange || typeof rawChange !== 'object') continue
        const change = rawChange as Record<string, unknown>
        const value = change.value as Record<string, unknown> | undefined
        const from = value?.from as Record<string, unknown> | undefined
        const recipientId = typeof from?.id === 'string' ? from.id : ''
        const text = typeof value?.text === 'string' ? value.text : ''
        if (recipientId && text) {
          events.push({ igBusinessAccountId, recipientId, text })
        }
      }
    }
  }

  return events
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge || '', { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const incomingEvents = extractIncomingEvents(payload)

    if (incomingEvents.length === 0) {
      return NextResponse.json({ success: true })
    }

    const supabase = createAdminClient()
    const accountIds = Array.from(new Set(incomingEvents.map((event) => event.igBusinessAccountId)))

    const { data: settingsRows, error: settingsError } = await supabase
      .from('instagram_automation_settings')
      .select('*')
      .eq('enabled', true)
      .in('ig_business_account_id', accountIds)

    if (settingsError || !settingsRows || settingsRows.length === 0) {
      return NextResponse.json({ success: true })
    }

    const settingsByAccount = new Map(
      settingsRows
        .filter((row) => typeof row.ig_business_account_id === 'string')
        .map((row) => [row.ig_business_account_id as string, row])
    )

    const creatorCache = new Map<string, { store_slug: string; store_name: string }>()
    const productLinkCache = new Map<string, string>()

    for (const event of incomingEvents) {
      const settings = settingsByAccount.get(event.igBusinessAccountId)
      if (!settings) continue

      const keywords = Array.isArray(settings.trigger_keywords)
        ? (settings.trigger_keywords as string[])
        : []

      if (!textHasKeyword(event.text, keywords)) {
        await supabase.from('instagram_dm_logs').insert({
          creator_id: settings.creator_id,
          ig_business_account_id: settings.ig_business_account_id,
          recipient_id: event.recipientId,
          trigger_text: event.text,
          status: 'skipped',
          metadata: { reason: 'keyword_no_match' },
        })
        continue
      }

      let creatorMeta = creatorCache.get(settings.creator_id)
      if (!creatorMeta) {
        const { data: creator } = await supabase
          .from('creators')
          .select('store_slug, store_name')
          .eq('id', settings.creator_id)
          .single()

        if (!creator) continue
        creatorMeta = { store_slug: creator.store_slug, store_name: creator.store_name }
        creatorCache.set(settings.creator_id, creatorMeta)
      }

      let productLink = productLinkCache.get(settings.creator_id) || ''
      if (!productLink) {
        let productId = settings.default_product_id as string | null
        if (!productId) {
          const { data: fallbackProduct } = await supabase
            .from('products')
            .select('id')
            .eq('creator_id', settings.creator_id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          productId = fallbackProduct?.id || null
        }

        productLink = productId
          ? `https://linkmystore.in/${creatorMeta.store_slug}/${productId}`
          : `https://linkmystore.in/${creatorMeta.store_slug}`

        productLinkCache.set(settings.creator_id, productLink)
      }

      if (!settings.page_access_token) {
        await supabase.from('instagram_dm_logs').insert({
          creator_id: settings.creator_id,
          ig_business_account_id: event.igBusinessAccountId,
          recipient_id: event.recipientId,
          trigger_text: event.text,
          status: 'failed',
          error_message: 'Missing page access token',
        })
        continue
      }

      const message = buildInstagramDmMessage(settings.dm_template || 'Here is your link: {product_link}', {
        store_name: creatorMeta.store_name,
        store_link: `https://linkmystore.in/${creatorMeta.store_slug}`,
        product_link: productLink,
      })

      const result = await sendInstagramDm({
        igBusinessAccountId: event.igBusinessAccountId,
        recipientId: event.recipientId,
        message,
        accessToken: settings.page_access_token,
      })

      await supabase.from('instagram_dm_logs').insert({
        creator_id: settings.creator_id,
        ig_business_account_id: event.igBusinessAccountId,
        recipient_id: event.recipientId,
        trigger_text: event.text,
        sent_message: message,
        status: result.ok ? 'sent' : 'failed',
        error_message: result.ok ? null : result.error,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Instagram webhook error:', error)
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
