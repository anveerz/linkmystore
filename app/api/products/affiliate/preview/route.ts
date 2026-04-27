import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { detectAffiliatePlatform, fetchProductMetadata } from '@/lib/affiliate'
import { AFFILIATE_PLATFORMS } from '@/lib/affiliate-config'

function asText(value: unknown, max = 200) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized.slice(0, max) : null
}

function formatPrice(priceInPaisa: number | undefined) {
  if (!priceInPaisa || priceInPaisa <= 0) return null
  return (priceInPaisa / 100).toFixed(2)
}

function getAffiliateReviewWarning(input: {
  platformName: string
  title?: string
  description?: string
  image?: string
  metadataAvailable: boolean
}) {
  if (!input.metadataAvailable) {
    return `We could not fetch clean product details from ${input.platformName}. Review and complete the fields before saving.`
  }

  const normalizedTitle = (input.title || '').trim().toLowerCase()
  const genericTitle =
    !normalizedTitle ||
    normalizedTitle === `${input.platformName.toLowerCase()} product` ||
    normalizedTitle === input.platformName.toLowerCase()

  if (genericTitle || !input.image || !input.description) {
    return `Some details from ${input.platformName} look incomplete. Review the title, image, description, and price before saving.`
  }

  return null
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

    const platformName = AFFILIATE_PLATFORMS[platform].name
    const metadata = await fetchProductMetadata(rawUrl)
    const metadataAvailable = Boolean(metadata)
    const title = metadata?.title || `${platformName} Product`
    const description = metadata?.description || null
    const image = metadata?.image || null
    const priceInPaisa = metadata?.priceInPaisa ?? null

    return NextResponse.json({
      success: true,
      preview: {
        platform,
        platform_name: platformName,
        title,
        description,
        image,
        price_in_paisa: priceInPaisa,
        price: formatPrice(priceInPaisa ?? undefined),
        metadata_available: metadataAvailable,
        warning: getAffiliateReviewWarning({
          platformName,
          title,
          description: description || undefined,
          image: image || undefined,
          metadataAvailable,
        }),
      },
    })
  } catch (error) {
    console.error('Affiliate preview error:', error)
    return NextResponse.json({ error: 'Failed to fetch affiliate product details' }, { status: 500 })
  }
}
