'use client'

import { useRouter } from 'next/navigation'

interface BuyButtonProps {
  price: number
  accentColor: string
  slug: string
  productId: string
  selectedVariant?: number | null
}

export default function BuyButton({ 
  price, 
  accentColor, 
  slug, 
  productId, 
  selectedVariant 
}: BuyButtonProps) {
  const router = useRouter()

  const formatPrice = (paisa: number) => {
    return '₹' + (paisa / 100).toLocaleString('en-IN')
  }

  const handleBuy = () => {
    const query = new URLSearchParams(window.location.search)

    if (selectedVariant !== null && selectedVariant !== undefined) {
      query.set('variant', String(selectedVariant))
    } else {
      query.delete('variant')
    }

    const queryString = query.toString()
    router.push(`/${slug}/${productId}/checkout${queryString ? `?${queryString}` : ''}`)
  }

  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4 z-10">
      <div className="max-w-lg mx-auto">
        <button
          onClick={handleBuy}
          className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}CC 100%)`,
          }}
        >
          Buy Now — {formatPrice(price)}
        </button>
        
        <div className="flex items-center justify-center gap-4 mt-3">
          <span className="text-[11px] text-gray-400">🔒 Secure Payment</span>
          <span className="text-[11px] text-gray-400">⚡ PG auto-confirmation with manual UPI mode</span>
        </div>
      </div>
    </div>
  )
}


