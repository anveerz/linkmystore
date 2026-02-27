'use client'

import { ShoppingBag, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatNumber } from '@/lib/storefront-utils'
import { ReviewStars } from './ReviewStars'
import type { TrustBadgesProps } from '@/types'

export function TrustBadges({ stats }: TrustBadgesProps) {
  const { total_orders, average_rating, review_count, response_time } = stats

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {total_orders > 0 && (
        <motion.div
          className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.15 }}
        >
          <ShoppingBag className="h-3.5 w-3.5 text-gray-600" aria-hidden="true" />
          <span>{formatNumber(total_orders)} orders</span>
        </motion.div>
      )}

      {average_rating > 0 && review_count > 0 && (
        <motion.div
          className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.15 }}
        >
          <ReviewStars
            rating={average_rating}
            size="sm"
            showCount={true}
            count={review_count}
          />
        </motion.div>
      )}

      {response_time && (
        <motion.div
          className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.15 }}
        >
          <Clock className="h-3.5 w-3.5 text-gray-600" aria-hidden="true" />
          <span>{response_time}</span>
        </motion.div>
      )}
    </div>
  )
}
