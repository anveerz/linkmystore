import { AFFILIATE_PLATFORMS, type AffiliatePlatform } from '@/lib/affiliate-config'

export interface AffiliateProductMetadata {
  title?: string
  description?: string
  image?: string
  priceInPaisa?: number
}

function normalizeHost(input: string) {
  return input.replace(/^www\./, '').toLowerCase()
}

function sanitizeSubTag(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
}

function extractMetaTag(html: string, keys: string[]) {
  for (const key of keys) {
    const regex = new RegExp(
      `<meta[^>]+(?:property|name)=['"]${key}['"][^>]+content=['"]([^'"]+)['"][^>]*>`,
      'i'
    )
    const match = html.match(regex)
    if (match?.[1]) {
      return match[1].trim()
    }
  }
  return undefined
}

function parsePriceToPaisa(raw: string | undefined) {
  if (!raw) return undefined
  const numeric = raw.replace(/[^0-9.]/g, '')
  const asNumber = Number(numeric)
  if (!Number.isFinite(asNumber) || asNumber <= 0) return undefined
  return Math.round(asNumber * 100)
}

export function detectAffiliatePlatform(rawUrl: string): AffiliatePlatform | null {
  let host = ''
  try {
    const parsed = new URL(rawUrl)
    host = normalizeHost(parsed.hostname)
  } catch {
    return null
  }

  const entry = Object.entries(AFFILIATE_PLATFORMS).find(([, config]) =>
    config.domains.some((domain) => host === domain || host.endsWith(`.${domain}`))
  )

  return (entry?.[0] as AffiliatePlatform) || null
}

export function injectAffiliateTag(rawUrl: string, platform: AffiliatePlatform, creatorKey: string) {
  const parsed = new URL(rawUrl)
  const config = AFFILIATE_PLATFORMS[platform]
  const subTag = sanitizeSubTag(creatorKey)

  if (config.tagParam && config.tagValue) {
    parsed.searchParams.set(config.tagParam, config.tagValue)
  }

  if (config.idParam && config.idValue) {
    parsed.searchParams.set(config.idParam, config.idValue)
  }

  if (config.subTagParam) {
    parsed.searchParams.set(config.subTagParam, subTag)
  }

  return parsed.toString()
}

export async function fetchProductMetadata(rawUrl: string): Promise<AffiliateProductMetadata | null> {
  try {
    const response = await fetch(rawUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkMyStoreBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })

    if (!response.ok) return null

    const html = await response.text()
    const title =
      extractMetaTag(html, ['og:title', 'twitter:title']) ||
      html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim()
    const description = extractMetaTag(html, ['og:description', 'description', 'twitter:description'])
    const image = extractMetaTag(html, ['og:image', 'twitter:image'])
    const rawPrice =
      extractMetaTag(html, ['product:price:amount', 'og:price:amount']) ||
      html.match(/"price"\s*:\s*"?([0-9.]+)"?/i)?.[1]

    const priceInPaisa = parsePriceToPaisa(rawPrice)

    return {
      title: title || undefined,
      description: description || undefined,
      image: image || undefined,
      priceInPaisa,
    }
  } catch {
    return null
  }
}
