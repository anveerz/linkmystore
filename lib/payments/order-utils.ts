import { createAdminClient } from '@/lib/supabase/admin'

export function asText(value: unknown, max = 120): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized.slice(0, max) : null
}

export function isDuplicateOrderNumberError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String((error as { code?: unknown }).code || '') : ''
  const message = 'message' in error ? String((error as { message?: unknown }).message || '').toLowerCase() : ''
  return code === '23505' || message.includes('duplicate key')
}

export async function generateUniqueOrderNumber(maxAttempts = 5): Promise<string> {
  const supabase = createAdminClient()
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: latestOrderRows } = await supabase
      .from('orders')
      .select('order_number')
      .like('order_number', `LMS-${today}-%`)
      .order('order_number', { ascending: false })
      .limit(1)

    const latestOrderNumber = latestOrderRows?.[0]?.order_number
    const latestSequenceMatch =
      typeof latestOrderNumber === 'string' ? latestOrderNumber.match(/-(\d+)$/) : null
    const nextSequence = latestSequenceMatch ? Number(latestSequenceMatch[1]) + 1 : 1
    return `LMS-${today}-${String(nextSequence).padStart(3, '0')}`
  }

  return `LMS-${today}-${Date.now().toString().slice(-6)}`
}

export function computeDiscountAmount(
  amount: number,
  coupon: {
    discount_type: 'percent' | 'fixed'
    discount_value: number
    max_discount_amount?: number | null
  }
): number {
  let discountAmount = 0
  if (coupon.discount_type === 'percent') {
    discountAmount = Math.round((amount * coupon.discount_value) / 100)
    if (coupon.max_discount_amount) {
      discountAmount = Math.min(discountAmount, coupon.max_discount_amount)
    }
  } else {
    discountAmount = coupon.discount_value
  }
  return Math.max(0, Math.min(discountAmount, amount))
}

