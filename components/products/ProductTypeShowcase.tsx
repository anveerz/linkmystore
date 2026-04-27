'use client'

import { Lock, Sparkles } from 'lucide-react'
import {
  PRODUCT_TYPE_SHOWCASE_CARDS,
  type PlanType,
  type ProductTypeShowcaseCard,
} from '@/lib/constants'

interface ProductTypeShowcaseProps {
  creatorPlan: PlanType
  selectedId?: string | null
  onSelect: (card: ProductTypeShowcaseCard) => void
}

export default function ProductTypeShowcase({
  creatorPlan,
  selectedId,
  onSelect,
}: ProductTypeShowcaseProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[#1A1A2E]">Choose what you want to sell</h2>
        <p className="mt-1 text-sm text-[#8E8E9F]">Pick a product mode to open the right creation flow.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PRODUCT_TYPE_SHOWCASE_CARDS.map((card) => {
          const isLocked = Boolean(card.proOnly && creatorPlan !== 'pro')
          const isSelected = selectedId === card.id

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => !isLocked && onSelect(card)}
              className={`relative rounded-2xl border-2 p-4 text-left transition-all ${
                isSelected
                  ? 'border-[#E8651A] bg-[#F0ECF7] shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${isLocked ? 'cursor-not-allowed opacity-65' : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-xl">
                    {card.emoji}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A2E]">{card.title}</p>
                  </div>
                </div>
                {isLocked ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#1A1A2E] px-2 py-0.5 text-[10px] font-semibold text-white">
                    <Lock className="h-3 w-3" />
                    {card.lockedLabel || 'Pro'}
                  </span>
                ) : isSelected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E8651A]/10 px-2 py-0.5 text-[10px] font-semibold text-[#E8651A]">
                    <Sparkles className="h-3 w-3" />
                    Selected
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#6B6B7B]">{card.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
