'use client'

import { Star, StarHalf } from 'lucide-react'
import { clampRating, roundRating } from '@/lib/storefront-utils'
import type { ReviewStarsProps } from '@/types'

export function ReviewStars({
  rating,
  size = 'sm',
  showCount = false,
  count = 0,
  color,
}: ReviewStarsProps) {
  const clampedRating = clampRating(rating)
  const roundedRating = roundRating(clampedRating)

  const fullStars = Math.floor(roundedRating)
  const hasHalfStar = roundedRating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  const iconSize = sizeClasses[size]
  const fillColor = color || 'text-yellow-400'
  const emptyColor = 'text-gray-300'

  const ariaLabel =
    showCount && count > 0
      ? `${roundedRating} out of 5 stars, ${count} reviews`
      : `${roundedRating} out of 5 stars`

  return (
    <div className="inline-flex items-center gap-1" role="img" aria-label={ariaLabel}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star
          key={`full-${i}`}
          className={`${iconSize} ${fillColor} fill-current`}
          aria-hidden="true"
        />
      ))}

      {hasHalfStar && (
        <StarHalf
          className={`${iconSize} ${fillColor} fill-current`}
          aria-hidden="true"
        />
      )}

      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star
          key={`empty-${i}`}
          className={`${iconSize} ${emptyColor}`}
          aria-hidden="true"
        />
      ))}

      {showCount && count > 0 && (
        <span className="ml-1 text-xs text-gray-600">({count})</span>
      )}
    </div>
  )
}
