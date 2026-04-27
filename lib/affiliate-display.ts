export interface AffiliateDisplayData {
  trustedPick: boolean
  promoLabel: string | null
  couponCode: string | null
  couponNote: string | null
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function asText(value: unknown, max = 120): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized) return null
  return normalized.slice(0, max)
}

export function getAffiliateDisplayData(value: unknown): AffiliateDisplayData {
  const metadata = asRecord(value)
  const trustedPick = typeof metadata.trusted_pick === 'boolean' ? metadata.trusted_pick : true
  const promoLabel = asText(metadata.promo_label, 40) || (trustedPick ? 'Trusted Pick' : null)
  const couponCode = asText(metadata.coupon_code, 40)?.toUpperCase() || null
  const couponNote = asText(metadata.coupon_note, 140)

  return {
    trustedPick,
    promoLabel,
    couponCode,
    couponNote,
  }
}
