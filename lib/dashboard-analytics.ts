import type { AnalyticsEvent, Order, Product } from '@/types'

export type RevenueRange = 'daily' | 'weekly' | 'monthly'

export interface RevenuePoint {
  label: string
  value: number
  orders: number
}

export interface RankedMetric {
  label: string
  count: number
  percentage: number
}

export interface TopProductMetric {
  id: string
  title: string
  orders: number
  revenue: number
  share: number
}

export interface DashboardAnalytics {
  totalSales: number
  totalOrders: number
  totalEarnings: number
  thisMonthSales: number
  thisMonthOrders: number
  thisWeekSales: number
  thisWeekOrders: number
  avgOrderValue: number
  salesGrowth: number
  conversionRate: number
  repeatCustomerRate: number
  deliveryRate: number
  storeViewCount: number
  productViewCount: number
  checkoutStartCount: number
  purchaseEventCount: number
  paidOrders: Order[]
  topProducts: TopProductMetric[]
  revenueSeries: Record<RevenueRange, RevenuePoint[]>
  customerStates: RankedMetric[]
  customerCities: RankedMetric[]
  trafficSources: RankedMetric[]
  trackedTrafficCount: number
}

function toStartOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toMonthKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function getWeekStart(date: Date): Date {
  const start = toStartOfDay(date)
  const day = (start.getDay() + 6) % 7 // Monday = 0
  start.setDate(start.getDate() - day)
  return start
}

function createDistribution(input: Map<string, number>, limit = 5): RankedMetric[] {
  const total = Array.from(input.values()).reduce((sum, count) => sum + count, 0)
  if (total === 0) return []

  return Array.from(input.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({
      label,
      count,
      percentage: Math.round((count / total) * 1000) / 10,
    }))
}

function getBuyerKey(order: Order): string {
  const phone = (order.buyer_phone || '').trim().toLowerCase()
  const email = (order.buyer_email || '').trim().toLowerCase()
  if (phone) return `phone:${phone}`
  if (email) return `email:${email}`
  return `name:${(order.buyer_name || 'unknown').trim().toLowerCase()}`
}

function getShippingMeta(order: Order): Record<string, unknown> | null {
  if (!order.shipping_address || typeof order.shipping_address !== 'object') {
    return null
  }
  return order.shipping_address as unknown as Record<string, unknown>
}

function readText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function normalizeTrafficSource(raw: string): string {
  const value = raw.toLowerCase().trim()
  if (!value) return 'Direct / Unknown'

  const pickFromHost = (host: string) => {
    if (host.includes('instagram')) return 'Instagram'
    if (host.includes('facebook')) return 'Facebook'
    if (host.includes('youtube') || host.includes('youtu.be')) return 'YouTube'
    if (host.includes('whatsapp')) return 'WhatsApp'
    if (host.includes('t.co') || host.includes('twitter') || host.includes('x.com')) return 'X'
    if (host.includes('google')) return 'Google'
    return ''
  }

  if (value === 'ig' || value.includes('instagram')) return 'Instagram'
  if (value === 'wa' || value.includes('whatsapp')) return 'WhatsApp'
  if (value.includes('facebook')) return 'Facebook'
  if (value.includes('youtube') || value.includes('youtu.be')) return 'YouTube'
  if (value.includes('google')) return 'Google'
  if (value.includes('direct') || value === 'none' || value === 'unknown') return 'Direct / Unknown'

  if (value.includes('http://') || value.includes('https://')) {
    try {
      const host = new URL(value).hostname.replace(/^www\./, '')
      const mapped = pickFromHost(host)
      if (mapped) return mapped
      return toTitleCase(host)
    } catch {
      return toTitleCase(value)
    }
  }

  if (value.includes('.')) {
    const host = value.replace(/^www\./, '')
    const mapped = pickFromHost(host)
    if (mapped) return mapped
    return toTitleCase(host)
  }

  return toTitleCase(value)
}

function getTrafficSource(order: Order): { label: string; tracked: boolean } {
  const meta = getShippingMeta(order)
  const explicitSource = readText(meta?._source) || readText(meta?.source) || readText(meta?._utm_source)
  const explicitReferrer = readText(meta?._referrer)

  if (explicitSource) {
    return { label: normalizeTrafficSource(explicitSource), tracked: true }
  }

  if (explicitReferrer) {
    return { label: normalizeTrafficSource(explicitReferrer), tracked: true }
  }

  return { label: 'Direct / Unknown', tracked: false }
}

function buildDailySeries(paidOrders: Order[], days = 14): RevenuePoint[] {
  const today = toStartOfDay(new Date())
  const slots: Array<{ key: string; label: string; value: number; orders: number }> = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    slots.push({
      key: toDateKey(date),
      label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      value: 0,
      orders: 0,
    })
  }

  const slotMap = new Map(slots.map((slot) => [slot.key, slot]))
  for (const order of paidOrders) {
    const key = toDateKey(new Date(order.created_at))
    const slot = slotMap.get(key)
    if (!slot) continue
    slot.value += order.amount
    slot.orders += 1
  }

  return slots.map(({ label, value, orders }) => ({ label, value, orders }))
}

function buildWeeklySeries(paidOrders: Order[], weeks = 12): RevenuePoint[] {
  const currentWeekStart = getWeekStart(new Date())
  const slots: Array<{ key: string; label: string; value: number; orders: number }> = []

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(currentWeekStart)
    weekStart.setDate(currentWeekStart.getDate() - i * 7)
    slots.push({
      key: toDateKey(weekStart),
      label: weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      value: 0,
      orders: 0,
    })
  }

  const slotMap = new Map(slots.map((slot) => [slot.key, slot]))
  for (const order of paidOrders) {
    const weekStart = getWeekStart(new Date(order.created_at))
    const slot = slotMap.get(toDateKey(weekStart))
    if (!slot) continue
    slot.value += order.amount
    slot.orders += 1
  }

  return slots.map(({ label, value, orders }) => ({ label, value, orders }))
}

function buildMonthlySeries(paidOrders: Order[], months = 12): RevenuePoint[] {
  const now = new Date()
  const slots: Array<{ key: string; label: string; value: number; orders: number }> = []

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    slots.push({
      key: toMonthKey(date),
      label: date.toLocaleDateString('en-IN', { month: 'short' }),
      value: 0,
      orders: 0,
    })
  }

  const slotMap = new Map(slots.map((slot) => [slot.key, slot]))
  for (const order of paidOrders) {
    const key = toMonthKey(new Date(order.created_at))
    const slot = slotMap.get(key)
    if (!slot) continue
    slot.value += order.amount
    slot.orders += 1
  }

  return slots.map(({ label, value, orders }) => ({ label, value, orders }))
}

function getTrafficSourceFromEvent(event: AnalyticsEvent): { label: string; tracked: boolean } {
  const source = readText(event.source) || readText(event.referrer)
  if (source) {
    return { label: normalizeTrafficSource(source), tracked: true }
  }
  return { label: 'Direct / Unknown', tracked: false }
}

export function buildDashboardAnalytics(
  allOrders: Order[],
  products: Product[],
  analyticsEvents: AnalyticsEvent[] = []
): DashboardAnalytics {
  const paidOrders = allOrders
    .filter((order) => order.payment_status === 'paid')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  const startOfWeek = getWeekStart(now)

  const thisMonthOrders = paidOrders.filter((order) => {
    const createdAt = new Date(order.created_at)
    return createdAt >= startOfMonth
  })

  const lastMonthOrders = paidOrders.filter((order) => {
    const createdAt = new Date(order.created_at)
    return createdAt >= startOfLastMonth && createdAt <= endOfLastMonth
  })

  const thisWeekOrders = paidOrders.filter((order) => {
    const createdAt = new Date(order.created_at)
    return createdAt >= startOfWeek
  })

  const totalSales = paidOrders.reduce((sum, order) => sum + order.amount, 0)
  const totalPlatformFees = paidOrders.reduce((sum, order) => sum + order.platform_fee, 0)
  const totalEarnings = totalSales - totalPlatformFees
  const thisMonthSales = thisMonthOrders.reduce((sum, order) => sum + order.amount, 0)
  const lastMonthSales = lastMonthOrders.reduce((sum, order) => sum + order.amount, 0)
  const thisWeekSales = thisWeekOrders.reduce((sum, order) => sum + order.amount, 0)

  const salesGrowth = lastMonthSales > 0
    ? Math.round(((thisMonthSales - lastMonthSales) / lastMonthSales) * 100)
    : thisMonthSales > 0 ? 100 : 0

  const storeViewEvents = analyticsEvents.filter((event) => event.event_type === 'store_view')
  const productViewEvents = analyticsEvents.filter((event) => event.event_type === 'product_view')
  const checkoutStartEvents = analyticsEvents.filter((event) => event.event_type === 'checkout_start')
  const purchaseEvents = analyticsEvents.filter((event) => event.event_type === 'purchase')
  const livePurchaseEvents = purchaseEvents.filter((event) => {
    const metadata =
      event.metadata && typeof event.metadata === 'object'
        ? (event.metadata as Record<string, unknown>)
        : null
    return metadata?.backfilled !== true
  })

  const conversionPurchaseCount = checkoutStartEvents.length > 0
    ? livePurchaseEvents.length
    : paidOrders.length

  const conversionRate = checkoutStartEvents.length > 0
    ? Math.round((conversionPurchaseCount / checkoutStartEvents.length) * 1000) / 10
    : allOrders.length > 0
      ? Math.round((paidOrders.length / allOrders.length) * 1000) / 10
      : 0

  const deliveredCount = paidOrders.filter((order) => order.status === 'delivered').length
  const deliveryRate = paidOrders.length > 0
    ? Math.round((deliveredCount / paidOrders.length) * 1000) / 10
    : 0

  const buyers = new Map<string, number>()
  for (const order of paidOrders) {
    const key = getBuyerKey(order)
    buyers.set(key, (buyers.get(key) || 0) + 1)
  }
  const repeatBuyers = Array.from(buyers.values()).filter((count) => count > 1).length
  const repeatCustomerRate = buyers.size > 0
    ? Math.round((repeatBuyers / buyers.size) * 1000) / 10
    : 0

  const productsById = new Map(products.map((product) => [product.id, product]))
  const productOrderMap = new Map<string, { orders: number; revenue: number }>()
  for (const order of paidOrders) {
    const current = productOrderMap.get(order.product_id) || { orders: 0, revenue: 0 }
    current.orders += order.quantity || 1
    current.revenue += order.amount
    productOrderMap.set(order.product_id, current)
  }

  const topProducts = Array.from(productOrderMap.entries())
    .map(([id, metric]) => {
      const title = productsById.get(id)?.title || 'Untitled Product'
      const share = totalSales > 0 ? Math.round((metric.revenue / totalSales) * 1000) / 10 : 0
      return {
        id,
        title,
        orders: metric.orders,
        revenue: metric.revenue,
        share,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  const stateCount = new Map<string, number>()
  const cityCount = new Map<string, number>()
  for (const order of paidOrders) {
    const address = order.shipping_address as unknown as Record<string, unknown> | null
    if (!address) continue

    const state = toTitleCase(readText(address.state))
    if (state) {
      stateCount.set(state, (stateCount.get(state) || 0) + 1)
    }

    const city = toTitleCase(readText(address.city))
    if (city) {
      cityCount.set(city, (cityCount.get(city) || 0) + 1)
    }
  }

  const trafficCount = new Map<string, number>()
  let trackedTrafficCount = 0
  if (purchaseEvents.length > 0) {
    for (const event of purchaseEvents) {
      const source = getTrafficSourceFromEvent(event)
      trafficCount.set(source.label, (trafficCount.get(source.label) || 0) + 1)
      if (source.tracked) trackedTrafficCount += 1
    }
  } else {
    for (const order of paidOrders) {
      const source = getTrafficSource(order)
      trafficCount.set(source.label, (trafficCount.get(source.label) || 0) + 1)
      if (source.tracked) trackedTrafficCount += 1
    }
  }

  return {
    totalSales,
    totalOrders: paidOrders.length,
    totalEarnings,
    thisMonthSales,
    thisMonthOrders: thisMonthOrders.length,
    thisWeekSales,
    thisWeekOrders: thisWeekOrders.length,
    avgOrderValue: paidOrders.length > 0 ? Math.round(totalSales / paidOrders.length) : 0,
    salesGrowth,
    conversionRate,
    repeatCustomerRate,
    deliveryRate,
    storeViewCount: storeViewEvents.length,
    productViewCount: productViewEvents.length,
    checkoutStartCount: checkoutStartEvents.length,
    purchaseEventCount: conversionPurchaseCount,
    paidOrders,
    topProducts,
    revenueSeries: {
      daily: buildDailySeries(paidOrders),
      weekly: buildWeeklySeries(paidOrders),
      monthly: buildMonthlySeries(paidOrders),
    },
    customerStates: createDistribution(stateCount, 5),
    customerCities: createDistribution(cityCount, 5),
    trafficSources: createDistribution(trafficCount, 6),
    trackedTrafficCount,
  }
}
