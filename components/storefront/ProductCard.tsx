'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { formatPrice } from '@/lib/storefront-utils'
import { ProductImage } from './ProductImage'
import { ProductBadge } from './ProductBadge'
import { ReviewStars } from './ReviewStars'
import type { ProductCardProps } from '@/types'

export function ProductCard({
  product,
  storeSlug,
  accentColor,
  priority = false,
}: ProductCardProps) {
  const { id, title, price, compare_price, images, type, average_rating, review_count } = product

  const hasRating = average_rating !== undefined && average_rating > 0
  const hasComparePrice = compare_price && compare_price > price

  const ariaLabel = `Product: ${title}, Price: ${formatPrice(price)}`

  return (
    <Link
      href={`/${storeSlug}/${id}`}
      className="group block focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{ outlineColor: accentColor }}
      aria-label={ariaLabel}
    >
      <motion.article
        className="overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-lg"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <motion.div
            className="h-full w-full"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <ProductImage src={images[0]} alt={title} priority={priority} />
          </motion.div>

          <ProductBadge type={type} />
        </div>

        {/* Product Info */}
        <div className="p-3">
          <h3 className="line-clamp-2 text-sm font-medium text-gray-900">{title}</h3>

          {hasRating && review_count && review_count > 0 && (
            <div className="mt-1.5">
              <ReviewStars
                rating={average_rating!}
                size="sm"
                showCount={true}
                count={review_count}
              />
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <span className="text-base font-bold" style={{ color: accentColor }}>
              {formatPrice(price)}
            </span>

            {hasComparePrice && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(compare_price!)}
              </span>
            )}
          </div>
        </div>
      </motion.article>
    </Link>
  )
}
