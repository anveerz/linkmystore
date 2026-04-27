'use client'

import { useState } from 'react'
import VariantSelector from './VariantSelector'
import type { Variant, DigitalSubtype, StoreSettings } from '@/types'
import { getStorefrontTheme } from '@/lib/storefront-theme'

interface ProductDetailClientProps {
  variants: Variant[]
  accentColor: string
  basePrice: number
  slug: string
  productId: string
  isOutOfStock?: boolean
  digitalSubtype?: DigitalSubtype | null
  isLeadMagnet?: boolean
  isAffiliate?: boolean
  affiliatePlatform?: string | null
  affiliateTaggedUrl?: string | null
  isCreatorDeal?: boolean
  dealExternalUrl?: string | null
  dealLabel?: string | null
  theme?: StoreSettings['theme']
}

function getPlatformLabel(platform?: string | null) {
  if (!platform) return 'Partner'
  const map: Record<string, string> = {
    amazon: 'Amazon',
    flipkart: 'Flipkart',
    myntra: 'Myntra',
    ajio: 'Ajio',
    nykaa: 'Nykaa',
    meesho: 'Meesho',
  }
  return map[platform] || 'Partner'
}

function getCtaConfig(
  digitalSubtype: DigitalSubtype | null | undefined,
  isLeadMagnet: boolean,
  isOutOfStock: boolean,
  price: number,
  accentColor: string,
  isAffiliate: boolean,
  affiliatePlatform?: string | null,
  isCreatorDeal?: boolean,
  dealLabel?: string | null
): { label: string; href?: string; disabled: boolean; bg: string } {
  if (isOutOfStock) {
    return { label: 'Out of Stock', disabled: true, bg: '#9ca3af' }
  }

  if (isCreatorDeal) {
    return {
      label: dealLabel ? `Open ${dealLabel} Deal` : 'Open Must-Buy Deal',
      href: 'creator_deal_external',
      disabled: false,
      bg: 'linear-gradient(135deg, #E8651A 0%, #C2410C 100%)',
    }
  }

  if (isAffiliate) {
    return {
      label: `Buy on ${getPlatformLabel(affiliatePlatform)}`,
      href: 'affiliate',
      disabled: false,
      bg: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
    }
  }

  if (isLeadMagnet) {
    return {
      label: 'Get for Free',
      href: 'claim',
      disabled: false,
      bg: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
    }
  }

  const priceStr = `INR ${(price / 100).toLocaleString('en-IN')}`

  switch (digitalSubtype) {
    case 'coaching':
      return {
        label: `Book a Session - ${priceStr}`,
        href: 'book',
        disabled: false,
        bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      }
    case 'calendar':
      return {
        label: `Book Now - ${priceStr}`,
        href: 'book',
        disabled: false,
        bg: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      }
    case 'course':
      return {
        label: `Enroll Now - ${priceStr}`,
        href: 'checkout',
        disabled: false,
        bg: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
      }
    case 'membership':
      return {
        label: `Subscribe - ${priceStr}`,
        href: 'checkout',
        disabled: false,
        bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      }
    case 'template_library':
      return {
        label: `Get Templates - ${priceStr}`,
        href: 'checkout',
        disabled: false,
        bg: `linear-gradient(135deg, ${accentColor} 0%, #3D2176 100%)`,
      }
    case 'webinar':
      return {
        label: `Register - ${priceStr}`,
        href: 'checkout',
        disabled: false,
        bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      }
    case 'download':
    default:
      return {
        label: `Buy Now - ${priceStr}`,
        href: 'checkout',
        disabled: false,
        bg: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}CC 100%)`,
      }
  }
}

export default function ProductDetailClient({
  variants,
  accentColor,
  basePrice,
  slug,
  productId,
  isOutOfStock = false,
  digitalSubtype,
  isLeadMagnet = false,
  isAffiliate = false,
  affiliatePlatform,
  affiliateTaggedUrl,
  isCreatorDeal = false,
  dealExternalUrl,
  dealLabel,
  theme,
}: ProductDetailClientProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [currentPrice, setCurrentPrice] = useState(basePrice)
  const themeStyles = getStorefrontTheme(theme)

  const handleSelect = (index: number) => {
    setSelectedIndex(index)
    const variant = variants[index]
    if (variant.price) {
      setCurrentPrice(variant.price)
    } else {
      setCurrentPrice(basePrice)
    }
  }

  const cta = getCtaConfig(
    digitalSubtype,
    isLeadMagnet,
    isOutOfStock,
    currentPrice,
    accentColor,
    isAffiliate,
    affiliatePlatform,
    isCreatorDeal,
    dealLabel
  )

  const handleClick = async () => {
    if (cta.disabled || !cta.href) return

    if (isCreatorDeal) {
      if (dealExternalUrl) {
        window.open(dealExternalUrl, '_blank', 'noopener,noreferrer')
      }
      return
    }

    if (isAffiliate) {
      try {
        const response = await fetch('/api/affiliate/track-click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: productId,
            visitor_id: typeof window !== 'undefined' ? localStorage.getItem('lms_visitor_id') : null,
            session_id: typeof window !== 'undefined' ? sessionStorage.getItem('lms_session_id') : null,
          }),
        })
        const data = await response.json()
        const target = data?.redirect_url || affiliateTaggedUrl
        if (target) {
          window.open(target, '_blank', 'noopener,noreferrer')
        }
      } catch {
        if (affiliateTaggedUrl) {
          window.open(affiliateTaggedUrl, '_blank', 'noopener,noreferrer')
        }
      }
      return
    }

    const variantParam = selectedIndex !== null && cta.href === 'checkout'
      ? `?variant=${selectedIndex}`
      : ''
    window.location.href = `/${slug}/${productId}/${cta.href}${variantParam}`
  }

  return (
    <>
      {variants && variants.length > 0 && !isAffiliate && !isCreatorDeal && (
        <VariantSelector
          variants={variants}
          accentColor={accentColor}
          onSelect={handleSelect}
          selectedIndex={selectedIndex}
        />
      )}

      <div className={`sticky bottom-0 px-4 py-4 z-10 ${themeStyles.sticky}`}>
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleClick}
            disabled={cta.disabled}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            style={{ background: cta.bg }}
          >
            {cta.label}
          </button>

          <div className="flex items-center justify-center gap-4 mt-3">
            {isAffiliate ? (
              <span className={`text-[11px] ${themeStyles.mutedText}`}>External purchase on partner platform</span>
            ) : isCreatorDeal ? (
              <span className={`text-[11px] ${themeStyles.mutedText}`}>External purchase with coupon support</span>
            ) : isLeadMagnet ? (
              <span className={`text-[11px] ${themeStyles.mutedText}`}>Free - No payment required</span>
            ) : (
              <span className={`text-[11px] ${themeStyles.mutedText}`}>PG auto-confirmation or manual UPI mode</span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

