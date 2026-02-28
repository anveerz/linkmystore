export const PLATFORM_FEE_PERCENT = 4
export const FREE_PRODUCT_LIMIT = 5
export const MAX_IMAGES_PER_PRODUCT = 5
export const MAX_IMAGE_SIZE_MB = 5
export const MAX_DIGITAL_FILE_SIZE_MB = 100
export const MIN_PAYOUT_AMOUNT = 10000 // ₹100 in paisa
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// ─── Plan System ────────────────────────────────────────────────
export const PRO_PLAN_PRICE = 19900 // ₹199 in paisa
export const PRO_PLAN_PRICE_DISPLAY = '₹199/mo'

export type PlanType = 'free' | 'pro'

export const PLAN_FEATURES = {
  free: {
    maxProducts: 5,
    maxCategories: 1,
    themes: ['default'] as string[],
    analytics: 'basic' as const,
    notifications: ['email'] as string[],
    seoEnabled: false,
    showBranding: true,
    affiliateCommissionSplit: 0.5, // 50% to platform
  },
  pro: {
    maxProducts: Infinity,
    maxCategories: Infinity,
    themes: ['default', 'minimal', 'bold', 'elegant', 'dark'] as string[],
    analytics: 'full' as const,
    notifications: ['email', 'whatsapp'] as string[],
    seoEnabled: true,
    showBranding: false,
    affiliateCommissionSplit: 1.0, // 100% to seller
  },
} as const

export const STORE_CATEGORIES = [
  'Fashion',
  'Art & Craft',
  'Beauty',
  'Food',
  'Digital Products',
  'Services',
  'Other',
] as const

export function formatPrice(paisa: number): string {
  return '₹' + (paisa / 100).toLocaleString('en-IN')
}

export function calculatePlatformFee(amountInPaisa: number): number {
  return Math.round(amountInPaisa * PLATFORM_FEE_PERCENT / 100)
}
