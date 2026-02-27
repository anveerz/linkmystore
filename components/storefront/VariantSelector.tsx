'use client'

import type { Variant } from '@/types'

interface VariantSelectorProps {
  variants: Variant[]
  accentColor: string
  onSelect: (index: number) => void
  selectedIndex: number | null
}

export default function VariantSelector({ 
  variants, 
  accentColor, 
  onSelect, 
  selectedIndex 
}: VariantSelectorProps) {
  if (variants.length === 0) return null

  return (
    <div className="mt-6">
      <label className="text-sm font-semibold text-[#0F172A] mb-3 block">
        Select Option
      </label>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border-2 cursor-pointer transition-all ${
              selectedIndex === index
                ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/5 text-[var(--accent-color)]'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
            style={{
              '--accent-color': accentColor,
              ...(selectedIndex === index && {
                borderColor: accentColor,
                backgroundColor: `${accentColor}0D`,
                color: accentColor,
              }),
            } as React.CSSProperties}
          >
            {variant.name}
          </button>
        ))}
      </div>
    </div>
  )
}