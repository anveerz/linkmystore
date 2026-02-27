/**
 * Utility functions for storefront premium redesign
 */

export function formatPrice(paisa: number): string {
  if (paisa < 0) {
    throw new Error('Price must be a non-negative integer')
  }

  const rupees = paisa / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rupees)
}

export function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${Math.floor(num / 1000)}K+`
  }
  return num.toString()
}

export function isValidHexColor(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)
}

export function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.includes('supabase')
  } catch {
    return false
  }
}

export function sanitizeContent(content: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  return content.replace(/[&<>"'/]/g, (char) => map[char] || char)
}

export function clampRating(rating: number): number {
  return Math.max(0, Math.min(5, rating))
}

export function roundRating(rating: number): number {
  return Math.round(rating * 10) / 10
}

export function isValidProduct(product: {
  title?: string
  price?: number
  images?: string[] | null
  category?: string
  average_rating?: number
  review_count?: number
}): boolean {
  if (!product) return false

  if (!product.title || product.title.length < 1 || product.title.length > 100) {
    return false
  }

  // Allow price = 0 for free lead magnets
  if (typeof product.price !== 'number' || product.price < 0) {
    return false
  }

  if (product.images !== undefined && product.images !== null && !Array.isArray(product.images)) {
    return false
  }

  if (product.category && product.category.length > 50) {
    return false
  }

  if (product.average_rating !== undefined) {
    if (product.average_rating < 0 || product.average_rating > 5) {
      return false
    }
  }

  if (product.review_count !== undefined && product.review_count < 0) {
    return false
  }

  return true
}
