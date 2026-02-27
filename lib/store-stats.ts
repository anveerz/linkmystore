/**
 * Store statistics calculation utilities
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { StoreStats } from '@/types'

export async function calculateStoreStats(creatorId: string): Promise<StoreStats> {
  const supabase = createAdminClient()

  const { count: totalOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creatorId)
    .eq('payment_status', 'paid')

  const stats: StoreStats = {
    total_orders: totalOrders || 0,
    average_rating: 0,
    review_count: 0,
    response_time: undefined,
    verified: false,
    member_since: 'Member since 2024',
  }

  return stats
}

export function getCategoryCounts(products: { type?: string; category?: string }[]): Record<string, number> {
  const counts: Record<string, number> = {
    all: products.length,
    physical: 0,
    digital: 0,
  }

  products.forEach((product) => {
    if (product.type === 'physical') {
      counts.physical++
    } else if (product.type === 'digital') {
      counts.digital++
    }

    if (product.category) {
      counts[product.category] = (counts[product.category] || 0) + 1
    }
  })

  return counts
}
