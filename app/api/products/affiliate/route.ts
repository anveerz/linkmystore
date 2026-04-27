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

function asUrl(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized) return null
  try {
    const parsed = new URL(normalized)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    return parsed.toString()
  } catch {
    return null
  }
}

function asPriceInPaisa(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value < 0) return null
  return Math.round(value)
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
    const manualTitle = asText(body.title, 180)
    const manualDescription = asText(body.description, 1200)
    const manualImageUrl = asUrl(body.image_url)
    const manualPriceInPaisa = asPriceInPaisa(body.price_in_paisa)

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
    if (!metadata) {
      console.warn('Affiliate metadata fetch incomplete, falling back to seller-reviewed values.', { rawUrl, platform })
    }

    const platformName = AFFILIATE_PLATFORMS[platform].name

    const title = manualTitle || metadata?.title || `${platformName} Product`
    const description = manualDescription || metadata?.description || null
    const price = manualPriceInPaisa ?? metadata?.priceInPaisa ?? 0
    const image = manualImageUrl || metadata?.image || null
    const images = image ? [image] : []
    const taggedUrl = injectAffiliateTag(rawUrl, platform, creator.store_slug || creator.id)
    const affiliateProductData: Record<string, unknown> = {
      ...metadata,
      seller_reviewed_title: manualTitle,
      seller_reviewed_description: manualDescription,
      seller_reviewed_image: manualImageUrl,
      seller_reviewed_price_in_paisa: manualPriceInPaisa,
      metadata_available: Boolean(metadata),
      trusted_pick: true,
    }

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
        category: platformName,
        is_active: true,
        is_affiliate: true,
        affiliate_platform: platform,
        affiliate_original_url: rawUrl,
        affiliate_tagged_url: taggedUrl,
        affiliate_product_data: affiliateProductData,
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
