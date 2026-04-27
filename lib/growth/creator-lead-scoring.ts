export type CreatorLeadNiche =
  | 'fashion'
  | 'beauty'
  | 'lifestyle'
  | 'fitness'
  | 'education'
  | 'business'
  | 'digital-products'
  | 'food'
  | 'home'
  | 'parenting'
  | 'local-business'
  | 'other'

export type AudienceRegion = 'india' | 'mixed' | 'global'

export type CreatorLeadTier = 'ideal' | 'strong' | 'possible' | 'low'

export type CreatorPitchAngle =
  | 'creator-storefront'
  | 'own-products'
  | 'digital-products'
  | 'affiliate-stack'
  | 'brand-collab-sales'
  | 'manual-orders-to-storefront'
  | 'link-in-bio-upgrade'

export interface CreatorLeadInput {
  niche?: CreatorLeadNiche
  followerCount?: number | null
  averageReelViews?: number | null
  audienceRegion?: AudienceRegion
  postsReelsOften?: boolean
  promotesBrandProducts?: boolean
  promotesAffiliateProducts?: boolean
  sellsOwnProducts?: boolean
  hasDigitalProductPotential?: boolean
  hasPhysicalProductPotential?: boolean
  bioHasOrderIntent?: boolean
  bioHasStoreLink?: boolean
  bioHasAffiliateCodes?: boolean
  bioHasWhatsAppOrderFlow?: boolean
  highlightsShowCatalog?: boolean
  highlightsShowTestimonials?: boolean
  highlightsShowPricing?: boolean
  usesDMsForOrders?: boolean
  usesMarketplaceOnly?: boolean
  hasExistingStandaloneStore?: boolean
}

export interface CreatorLeadScoreBreakdown {
  monetizationIntent: number
  storefrontNeed: number
  audienceReadiness: number
  momentum: number
  complexityPenalty: number
}

export interface CreatorLeadScoreResult {
  score: number
  tier: CreatorLeadTier
  breakdown: CreatorLeadScoreBreakdown
  reasons: string[]
  pitchAngles: CreatorPitchAngle[]
}

const INDIA_FIT_NICHES = new Set<CreatorLeadNiche>([
  'fashion',
  'beauty',
  'lifestyle',
  'fitness',
  'education',
  'business',
  'digital-products',
  'home',
  'parenting',
  'local-business',
])

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value))
}

function scoreFollowerBand(followerCount: number | null | undefined) {
  if (!followerCount || followerCount <= 0) return 0
  if (followerCount < 1000) return 2
  if (followerCount <= 10000) return 8
  if (followerCount <= 50000) return 10
  if (followerCount <= 250000) return 8
  if (followerCount <= 1000000) return 5
  return 3
}

function scoreReelMomentum(averageReelViews: number | null | undefined) {
  if (!averageReelViews || averageReelViews <= 0) return 0
  if (averageReelViews < 3000) return 2
  if (averageReelViews < 10000) return 5
  if (averageReelViews < 50000) return 8
  return 10
}

export function recommendPitchAngles(input: CreatorLeadInput): CreatorPitchAngle[] {
  const angles = new Set<CreatorPitchAngle>()

  angles.add('creator-storefront')

  if (input.sellsOwnProducts || input.hasPhysicalProductPotential) {
    angles.add('own-products')
  }

  if (input.hasDigitalProductPotential || input.niche === 'education' || input.niche === 'digital-products') {
    angles.add('digital-products')
  }

  if (input.promotesAffiliateProducts || input.bioHasAffiliateCodes) {
    angles.add('affiliate-stack')
  }

  if (input.promotesBrandProducts) {
    angles.add('brand-collab-sales')
  }

  if (input.usesDMsForOrders || input.bioHasWhatsAppOrderFlow || input.bioHasOrderIntent) {
    angles.add('manual-orders-to-storefront')
  }

  if (!input.bioHasStoreLink || input.usesMarketplaceOnly) {
    angles.add('link-in-bio-upgrade')
  }

  return Array.from(angles)
}

export function scoreCreatorLead(input: CreatorLeadInput): CreatorLeadScoreResult {
  const reasons: string[] = []

  let monetizationIntent = 0
  if (input.sellsOwnProducts) {
    monetizationIntent += 16
    reasons.push('Already selling own products or drops.')
  }
  if (input.promotesAffiliateProducts) {
    monetizationIntent += 10
    reasons.push('Already monetizing through affiliate promotions.')
  }
  if (input.promotesBrandProducts) {
    monetizationIntent += 8
    reasons.push('Promotes brand products and can convert audience trust into sales.')
  }
  if (input.bioHasOrderIntent) {
    monetizationIntent += 8
    reasons.push('Bio shows buying or order intent.')
  }
  if (input.bioHasAffiliateCodes) {
    monetizationIntent += 6
    reasons.push('Bio already includes affiliate or promo code behavior.')
  }

  let storefrontNeed = 0
  if (input.usesDMsForOrders) {
    storefrontNeed += 10
    reasons.push('Likely handling sales manually through DMs.')
  }
  if (input.bioHasWhatsAppOrderFlow) {
    storefrontNeed += 8
    reasons.push('Currently routing orders through WhatsApp, which LinkMyStore can simplify.')
  }
  if (!input.bioHasStoreLink) {
    storefrontNeed += 7
    reasons.push('No real storefront link in bio.')
  }
  if (input.usesMarketplaceOnly) {
    storefrontNeed += 7
    reasons.push('Relies on marketplace links instead of a creator-controlled storefront.')
  }
  if (input.highlightsShowCatalog || input.highlightsShowPricing || input.highlightsShowTestimonials) {
    storefrontNeed += 6
    reasons.push('Already curating product or proof content that belongs in a storefront.')
  }
  if (input.hasDigitalProductPotential) {
    storefrontNeed += 6
    reasons.push('Has digital-product potential that fits instant delivery workflows.')
  }
  if (input.hasPhysicalProductPotential) {
    storefrontNeed += 4
  }

  let audienceReadiness = 0
  audienceReadiness += scoreFollowerBand(input.followerCount)
  audienceReadiness += scoreReelMomentum(input.averageReelViews)
  if (input.postsReelsOften) {
    audienceReadiness += 6
    reasons.push('Posts reels consistently, which supports discovery and product pushes.')
  }
  if (input.audienceRegion === 'india') {
    audienceReadiness += 8
  } else if (input.audienceRegion === 'mixed') {
    audienceReadiness += 5
  } else if (input.audienceRegion === 'global') {
    audienceReadiness += 2
  }
  if (input.niche && INDIA_FIT_NICHES.has(input.niche)) {
    audienceReadiness += 4
  }

  let momentum = 0
  if (input.niche === 'education' || input.niche === 'digital-products') {
    momentum += 8
    reasons.push('Good fit for digital offers, templates, or paid knowledge products.')
  }
  if (input.promotesBrandProducts && input.promotesAffiliateProducts) {
    momentum += 8
    reasons.push('Already behaves like a creator-commerce hybrid.')
  }
  if (input.sellsOwnProducts && (input.hasDigitalProductPotential || input.hasPhysicalProductPotential)) {
    momentum += 8
    reasons.push('Can use the same storefront for both own products and promoted products.')
  }
  if (input.highlightsShowCatalog && input.highlightsShowTestimonials) {
    momentum += 6
    reasons.push('Shows proof and catalog behavior that usually converts well.')
  }

  let complexityPenalty = 0
  if (input.hasExistingStandaloneStore) {
    complexityPenalty -= 18
    reasons.push('May already have a stronger standalone stack, so conversion will be harder.')
  }
  if (input.hasExistingStandaloneStore && input.bioHasStoreLink) {
    complexityPenalty -= 6
  }
  if ((input.followerCount || 0) > 250000 && input.hasExistingStandaloneStore) {
    complexityPenalty -= 8
  }

  const breakdown: CreatorLeadScoreBreakdown = {
    monetizationIntent,
    storefrontNeed,
    audienceReadiness,
    momentum,
    complexityPenalty,
  }

  const score = clampScore(
    monetizationIntent +
      storefrontNeed +
      audienceReadiness +
      momentum +
      complexityPenalty
  )

  let tier: CreatorLeadTier = 'low'
  if (score >= 75) tier = 'ideal'
  else if (score >= 58) tier = 'strong'
  else if (score >= 40) tier = 'possible'

  return {
    score,
    tier,
    breakdown,
    reasons,
    pitchAngles: recommendPitchAngles(input),
  }
}

export const CREATOR_SEGMENTS = [
  {
    label: 'Emerging creator-seller',
    fit: 'Best early-conversion target',
    description: 'Usually 1k-20k followers, reels-led, and still selling through DMs, WhatsApp, or informal links.',
  },
  {
    label: 'Creator-commerce hybrid',
    fit: 'High-quality core ICP',
    description: 'Promotes brand products, affiliate picks, and sometimes own drops. Needs one storefront instead of scattered links.',
  },
  {
    label: 'Knowledge seller',
    fit: 'Strong digital-product fit',
    description: 'Coaches, educators, or niche experts selling templates, ebooks, sessions, or guides.',
  },
  {
    label: 'Local Instagram business',
    fit: 'Good physical-product fit',
    description: 'Small businesses using Instagram as the main storefront and manually handling payments and fulfillment.',
  },
] as const

export const PITCH_ANGLE_LIBRARY: Record<CreatorPitchAngle, { headline: string; whyItWorks: string }> = {
  'creator-storefront': {
    headline: 'Turn your profile into a real storefront',
    whyItWorks: 'Useful when the creator has audience trust but no clean place to sell.',
  },
  'own-products': {
    headline: 'Sell your own products without building a full ecommerce stack',
    whyItWorks: 'Strong for creators launching drops, merch, curated kits, or handmade products.',
  },
  'digital-products': {
    headline: 'Sell templates, guides, ebooks, and paid resources from one simple link',
    whyItWorks: 'Strong for educators, experts, and creators with repeatable knowledge products.',
  },
  'affiliate-stack': {
    headline: 'List affiliate picks beside your own offers in the same storefront',
    whyItWorks: 'Great for creators already monetizing recommendations and product links.',
  },
  'brand-collab-sales': {
    headline: 'Give sponsored product pushes a cleaner buying path',
    whyItWorks: 'Best when creators frequently promote brand products and want better conversion from content.',
  },
  'manual-orders-to-storefront': {
    headline: 'Move from DM and WhatsApp orders to a cleaner storefront flow',
    whyItWorks: 'Works when the creator is clearly juggling manual order collection.',
  },
  'link-in-bio-upgrade': {
    headline: 'Replace a weak bio link with a page built for selling',
    whyItWorks: 'Best when the creator has traffic but no serious sales destination.',
  },
}
