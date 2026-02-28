import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { detectAffiliatePlatform, fetchProductMetadata, injectAffiliateTag } from '@/lib/affiliate'
import { AFFILIATE_PLATFORMS } from '@/lib/affiliate-config'

function asText(value: unknown, max = 200) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized.slice(0, max) : null
}

function toPriceInPaisa(value: unknown) {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num) || num <= 0) return null
  return Math.round(num * 100)
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const rawUrl = asText(body.url, 1000)
    const manualTitle = asText(body.title, 120)
    const manualDescription = asText(body.description, 1000)
    const manualCategory = asText(body.category, 80)
    const manualPriceInPaisa = toPriceInPaisa(body.price)

    if (!rawUrl) {
      return NextResponse.json({ error: 'Product URL is required' }, { status: 400 })
    }

    const platform = detectAffiliatePlatform(rawUrl)
    if (!platform) {
      return NextResponse.json(
        { error: 'Unsupported affiliate URL. Use Amazon, Flipkart, Myntra, Ajio, Nykaa, or Meesho.' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const { data: creator } = await admin
      .from('creators')
      .select('id, store_slug')
      .eq('user_id', user.id)
      .single()

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    const metadata = await fetchProductMetadata(rawUrl)
    const platformName = AFFILIATE_PLATFORMS[platform].name

    const title = manualTitle || metadata?.title || `${platformName} Product`
    const description = manualDescription || metadata?.description || null
    const price = manualPriceInPaisa ?? metadata?.priceInPaisa ?? 0
    const images = metadata?.image ? [metadata.image] : []
    const taggedUrl = injectAffiliateTag(rawUrl, platform, creator.store_slug || creator.id)

    const { data: product, error: insertError } = await admin
      .from('products')
      .insert({
        creator_id: creator.id,
        title,
        description,
        price,
        type: 'physical',
        images,
        variants: [],
        category: manualCategory || platformName,
        is_active: true,
        is_affiliate: true,
        affiliate_platform: platform,
        affiliate_original_url: rawUrl,
        affiliate_tagged_url: taggedUrl,
        affiliate_product_data: metadata || {},
      })
      .select('id, title, affiliate_platform, affiliate_tagged_url')
      .single()

    if (insertError || !product) {
      return NextResponse.json({ error: insertError?.message || 'Failed to create affiliate product' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      product,
    })
  } catch (error) {
    console.error('Create affiliate product error:', error)
    return NextResponse.json({ error: 'Failed to create affiliate product' }, { status: 500 })
  }
}
