import {
  PITCH_ANGLE_LIBRARY,
  scoreCreatorLead,
  recommendPitchAngles,
} from '@/lib/growth/creator-lead-scoring'

describe('creator lead scoring', () => {
  it('marks creator-commerce hybrids with clear order intent as ideal leads', () => {
    const result = scoreCreatorLead({
      niche: 'fashion',
      followerCount: 18000,
      averageReelViews: 22000,
      audienceRegion: 'india',
      postsReelsOften: true,
      promotesBrandProducts: true,
      promotesAffiliateProducts: true,
      sellsOwnProducts: true,
      hasPhysicalProductPotential: true,
      bioHasOrderIntent: true,
      bioHasStoreLink: false,
      bioHasAffiliateCodes: true,
      bioHasWhatsAppOrderFlow: true,
      highlightsShowCatalog: true,
      highlightsShowTestimonials: true,
      highlightsShowPricing: true,
      usesDMsForOrders: true,
    })

    expect(result.tier).toBe('ideal')
    expect(result.score).toBeGreaterThanOrEqual(75)
    expect(result.pitchAngles).toEqual(
      expect.arrayContaining([
        'creator-storefront',
        'own-products',
        'affiliate-stack',
        'brand-collab-sales',
        'manual-orders-to-storefront',
      ])
    )
  })

  it('pushes education creators toward digital-product messaging', () => {
    const result = scoreCreatorLead({
      niche: 'education',
      followerCount: 6200,
      averageReelViews: 9100,
      audienceRegion: 'india',
      postsReelsOften: true,
      hasDigitalProductPotential: true,
      bioHasOrderIntent: true,
      bioHasStoreLink: false,
      highlightsShowPricing: true,
    })

    expect(result.tier).toBe('strong')
    expect(result.pitchAngles).toContain('digital-products')
    expect(PITCH_ANGLE_LIBRARY['digital-products'].headline).toContain('Sell templates')
  })

  it('penalizes large creators that already have a standalone storefront', () => {
    const result = scoreCreatorLead({
      niche: 'beauty',
      followerCount: 340000,
      averageReelViews: 48000,
      audienceRegion: 'mixed',
      postsReelsOften: true,
      promotesBrandProducts: true,
      hasExistingStandaloneStore: true,
      bioHasStoreLink: true,
    })

    expect(result.tier).not.toBe('ideal')
    expect(result.score).toBeLessThan(75)
    expect(result.breakdown.complexityPenalty).toBeLessThan(0)
  })

  it('recommends link-in-bio upgrade when there is no storefront link', () => {
    const angles = recommendPitchAngles({
      followerCount: 4500,
      postsReelsOften: true,
      bioHasStoreLink: false,
      usesMarketplaceOnly: true,
    })

    expect(angles).toEqual(
      expect.arrayContaining(['creator-storefront', 'link-in-bio-upgrade'])
    )
  })
})
