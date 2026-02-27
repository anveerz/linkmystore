'use client'

import { useState } from 'react'
import VariantSelector from './VariantSelector'
import type { Variant, DigitalSubtype } from '@/types'

interface ProductDetailClientProps {
  variants: Variant[]
  accentColor: string
  basePrice: number
  slug: string
  productId: string
  isOutOfStock?: boolean
  digitalSubtype?: DigitalSubtype | null
  isLeadMagnet?: boolean
}

function getCtaConfig(
  digitalSubtype: DigitalSubtype | null | undefined,
  isLeadMagnet: boolean,
  isOutOfStock: boolean,
  price: number,
  accentColor: string
): { label: string; href?: string; disabled: boolean; bg: string } {
  if (isOutOfStock) {
    return { label: 'Out of Stock', disabled: true, bg: '#9ca3af' }
  }

  if (isLeadMagnet) {
    return {
      label: '🧲 Get for Free',
      href: 'claim',
      disabled: false,
      bg: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
    }
  }

  const priceStr = `₹${(price / 100).toLocaleString('en-IN')}`

  switch (digitalSubtype) {
    case 'coaching':
      return {
        label: `💬 Book a Session — ${priceStr}`,
        href: 'book',
        disabled: false,
        bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      }
    case 'calendar':
      return {
        label: `📅 Book Now — ${priceStr}`,
        href: 'book',
        disabled: false,
        bg: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      }
    case 'course':
      return {
        label: `🎓 Enroll Now — ${priceStr}`,
        href: 'checkout',
        disabled: false,
        bg: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
      }
    case 'membership':
      return {
        label: `⭐ Subscribe — ${priceStr}`,
        href: 'checkout',
        disabled: false,
        bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      }
    case 'template_library':
      return {
        label: `🎨 Get Templates — ${priceStr}`,
        href: 'checkout',
        disabled: false,
        bg: `linear-gradient(135deg, ${accentColor} 0%, #3D2176 100%)`,
      }
    case 'webinar':
      return {
        label: `🎥 Register — ${priceStr}`,
        href: 'checkout',
        disabled: false,
        bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      }
    case 'download':
    default:
      return {
        label: `Buy Now — ${priceStr}`,
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
}: ProductDetailClientProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [currentPrice, setCurrentPrice] = useState(basePrice)

  const handleSelect = (index: number) => {
    setSelectedIndex(index)
    const variant = variants[index]
    if (variant.price) {
      setCurrentPrice(variant.price)
    } else {
      setCurrentPrice(basePrice)
    }
  }

  const cta = getCtaConfig(digitalSubtype, isLeadMagnet, isOutOfStock, currentPrice, accentColor)

  const handleClick = () => {
    if (cta.disabled || !cta.href) return
    const variantParam = selectedIndex !== null && cta.href === 'checkout'
      ? `?variant=${selectedIndex}`
      : ''
    window.location.href = `/${slug}/${productId}/${cta.href}${variantParam}`
  }

  return (
    <>
      {variants && variants.length > 0 && (
        <VariantSelector
          variants={variants}
          accentColor={accentColor}
          onSelect={handleSelect}
          selectedIndex={selectedIndex}
        />
      )}

      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4 z-10">
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
            {isLeadMagnet ? (
              <span className="text-[11px] text-gray-400">🎁 Free — No payment required</span>
            ) : (
              <>
                <span className="text-[11px] text-gray-400">🔒 Secure Payment</span>
                <span className="text-[11px] text-gray-400">⚡ Powered by Razorpay</span>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
