'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { formatPrice } from '@/lib/storefront-utils'
import { getAffiliateDisplayData } from '@/lib/affiliate-display'
import { ProductImage } from './ProductImage'
import { ProductBadge } from './ProductBadge'
import { ReviewStars } from './ReviewStars'
import type { ProductCardProps } from '@/types'
import { getStorefrontTheme } from '@/lib/storefront-theme'

export function ProductCard({
  product,
  storeSlug,
  accentColor,
  priority = false,
  theme,
}: ProductCardProps) {
  const themeStyles = getStorefrontTheme(theme)

  const {
    id,
    title,
    price,
    compare_price,
    images,
    type,
    average_rating,
    review_count,
    is_affiliate,
    affiliate_platform,
    affiliate_product_data,
    physical_subtype,
    deal_data,
  } = product

  const hasRating = average_rating !== undefined && average_rating > 0
  const hasComparePrice = compare_price && compare_price > price
  const affiliateDisplayData = is_affiliate ? getAffiliateDisplayData(affiliate_product_data) : null
  const isCreatorDeal = type === 'physical' && physical_subtype === 'creator_deal'
  const creatorDealData = (deal_data as {
    coupon_code?: string
    coupon_note?: string
    deal_label?: string
  } | null) || null

  const ariaLabel = is_affiliate
    ? `Affiliate product: ${title}`
    : `Product: ${title}, Price: ${formatPrice(price)}`

  return (
    <Link
      href={`/${storeSlug}/${id}`}
      className="group block focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{ outlineColor: accentColor }}
      aria-label={ariaLabel}
    >
      <motion.article
        className={`overflow-hidden rounded-2xl transition-shadow duration-200 hover:shadow-lg ${themeStyles.card}`}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {/* Product Image */}
        <div className={`relative aspect-square overflow-hidden ${themeStyles.productImageBg}`}>
          <motion.div
            className="relative h-full w-full"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <ProductImage src={images[0]} alt={title} priority={priority} />
          </motion.div>

          <ProductBadge type={type} />
          {is_affiliate && (
            <span className="absolute right-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-medium text-white">
              {affiliate_platform
                ? `On ${affiliate_platform.charAt(0).toUpperCase()}${affiliate_platform.slice(1)}`
                : 'Affiliate'}
            </span>
          )}
          {is_affiliate && affiliateDisplayData?.promoLabel && (
            <span className="absolute left-2 bottom-2 rounded-full bg-emerald-700/90 px-2 py-0.5 text-[10px] font-semibold text-white">
              {affiliateDisplayData.promoLabel}
            </span>
          )}
          {isCreatorDeal && creatorDealData?.deal_label && (
            <span className="absolute left-2 bottom-2 rounded-full bg-amber-700/90 px-2 py-0.5 text-[10px] font-semibold text-white">
              {creatorDealData.deal_label}
            </span>
          )}
        </div>

        {/* Product Info */}
        <div className="p-3">
          <h3 className={`line-clamp-2 text-sm font-medium ${themeStyles.cardTitle}`}>{title}</h3>

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
              <span className={`text-xs line-through ${themeStyles.mutedText}`}>
                {formatPrice(compare_price!)}
              </span>
            )}
          </div>

          {is_affiliate && affiliateDisplayData?.couponCode && (
            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Use Code</p>
              <p className="text-xs font-bold text-emerald-900">{affiliateDisplayData.couponCode}</p>
              {affiliateDisplayData.couponNote && (
                <p className="mt-0.5 text-[11px] text-emerald-700 line-clamp-2">{affiliateDisplayData.couponNote}</p>
              )}
            </div>
          )}
          {isCreatorDeal && creatorDealData?.coupon_code && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Use Code</p>
              <p className="text-xs font-bold text-amber-900">{creatorDealData.coupon_code}</p>
              {creatorDealData.coupon_note && (
                <p className="mt-0.5 text-[11px] text-amber-700 line-clamp-2">{creatorDealData.coupon_note}</p>
              )}
            </div>
          )}
        </div>
      </motion.article>
    </Link>
  )
}
