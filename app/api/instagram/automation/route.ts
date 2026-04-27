import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getCreatorPlanSnapshot } from '@/lib/plan-gate'

function asText(value: unknown, max = 500): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized.slice(0, max) : null
}

function asKeywordList(value: unknown): string[] {
  if (!Array.isArray(value)) return ['link']

  const list = value
    .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
    .filter((entry) => entry.length > 0)
    .slice(0, 20)

  return list.length > 0 ? list : ['link']
}

async function resolveCreatorContext() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, creatorId: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: creator } = await supabase
    .from('creators')
    .select('id, plan')
    .eq('user_id', user.id)
    .single()

  if (!creator) {
    return { supabase, creatorId: null, error: NextResponse.json({ error: 'Creator not found' }, { status: 404 }) }
  }

  const planSnapshot = await getCreatorPlanSnapshot(creator.id)
  return {
    supabase,
    creatorId: creator.id,
    plan: planSnapshot.effectivePlan,
    error: null,
  }
}

export async function GET() {
  try {
    const context = await resolveCreatorContext()
    if (context.error) return context.error
    if (!context.creatorId) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    if (context.plan !== 'pro') {
      return NextResponse.json({ error: 'Automations are available on Pro plan only' }, { status: 403 })
    }

    const { data, error } = await context.supabase
      .from('instagram_automation_settings')
      .select('*')
      .eq('creator_id', context.creatorId)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch Instagram automation settings' }, { status: 500 })
    }

    return NextResponse.json({
      settings: data || {
        enabled: false,
        ig_business_account_id: '',
        page_access_token: '',
        trigger_keywords: ['link'],
        dm_template: 'Hey! Here is your link: {product_link}',
        default_product_id: null,
      },
    })
  } catch (error) {
    console.error('Instagram automation GET error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const context = await resolveCreatorContext()
    if (context.error) return context.error
    if (!context.creatorId) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    if (context.plan !== 'pro') {
      return NextResponse.json({ error: 'Automations are available on Pro plan only' }, { status: 403 })
    }

    const body = await request.json()
    const enabled = body.enabled === true
    const igBusinessAccountId = asText(body.ig_business_account_id, 120)
    const pageAccessToken = asText(body.page_access_token, 1024)
    const triggerKeywords = asKeywordList(body.trigger_keywords)
    const dmTemplate = asText(body.dm_template, 1000) || 'Hey! Here is your link: {product_link}'
    const defaultProductId = asText(body.default_product_id, 64)

    const { data, error } = await context.supabase
      .from('instagram_automation_settings')
      .upsert(
        {
          creator_id: context.creatorId,
          enabled,
          ig_business_account_id: igBusinessAccountId,
          page_access_token: pageAccessToken,
          trigger_keywords: triggerKeywords,
          dm_template: dmTemplate,
          default_product_id: defaultProductId || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'creator_id' }
      )
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to save Instagram automation settings' }, { status: 500 })
    }

    return NextResponse.json({ settings: data })
  } catch (error) {
    console.error('Instagram automation PUT error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
