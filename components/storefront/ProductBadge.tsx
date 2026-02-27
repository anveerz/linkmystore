import type { ProductBadgeProps } from '@/types'

export function ProductBadge({ type }: ProductBadgeProps) {
  const isDigital = type === 'digital'

  return (
    <span
      className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${
        isDigital ? 'bg-purple-600' : 'bg-orange-600'
      }`}
      aria-label={`${isDigital ? 'Digital' : 'Physical'} product`}
    >
      {isDigital ? 'Digital' : 'Physical'}
    </span>
  )
}
