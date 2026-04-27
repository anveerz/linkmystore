import type { DigitalSubtype, PhysicalSubtype } from '@/types'

export const PLATFORM_FEE_PERCENT = 4
export const FREE_PRODUCT_LIMIT = 5
export const MAX_IMAGES_PER_PRODUCT = 5
export const MAX_IMAGE_SIZE_MB = 5
export const MAX_DIGITAL_FILE_SIZE_MB = 100
export const MIN_PAYOUT_AMOUNT = 10000 // ₹100 in paisa
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const PRO_PLAN_PRICE = 29900 // ₹299 in paisa
export const PRO_PLAN_PRICE_DISPLAY = '₹299/mo'
export type ProPlanTermMonths = 1 | 3 | 6 | 12

export const PRO_PLAN_TERM_PRICING: Record<
  ProPlanTermMonths,
  {
    months: ProPlanTermMonths
    label: string
    amount: number
    discountPercent: number
    badge?: string
  }
> = {
  1: {
    months: 1,
    label: '1 month',
    amount: 29900,
    discountPercent: 0,
  },
  3: {
    months: 3,
    label: '3 months',
    amount: 80700,
    discountPercent: 10,
    badge: 'Save 10%',
  },
  6: {
    months: 6,
    label: '6 months',
    amount: 152500,
    discountPercent: 15,
    badge: 'Save 15%',
  },
  12: {
    months: 12,
    label: '12 months',
    amount: 287000,
    discountPercent: 20,
    badge: 'Save 20%',
  },
}

export const PRO_PLAN_TERM_OPTIONS = [
  PRO_PLAN_TERM_PRICING[1],
  PRO_PLAN_TERM_PRICING[3],
  PRO_PLAN_TERM_PRICING[6],
  PRO_PLAN_TERM_PRICING[12],
] as const

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
    affiliateCommissionSplit: 0.5,
  },
  pro: {
    maxProducts: Infinity,
    maxCategories: Infinity,
    themes: ['default', 'minimal', 'bold', 'elegant', 'dark'] as string[],
    analytics: 'full' as const,
    notifications: ['email', 'whatsapp'] as string[],
    seoEnabled: true,
    showBranding: false,
    affiliateCommissionSplit: 1.0,
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

export interface ProductTypeShowcaseCard {
  id: string
  title: string
  description: string
  emoji: string
  type?: 'physical' | 'digital' | 'affiliate'
  digitalSubtype?: DigitalSubtype
  physicalSubtype?: PhysicalSubtype
  proOnly?: boolean
  lockedLabel?: string
}

export const PRODUCT_TYPE_SHOWCASE_CARDS: ProductTypeShowcaseCard[] = [
  {
    id: 'physical',
    title: 'Physical Product',
    description: 'Ship your own products with stock and variants.',
    emoji: '📦',
    type: 'physical',
    physicalSubtype: 'standard',
  },
  {
    id: 'affiliate',
    title: 'Affiliate Product',
    description: 'Add Amazon/Flipkart links and earn via referrals.',
    emoji: '🔗',
    type: 'affiliate',
  },
  {
    id: 'creator_deal',
    title: 'Creator Deal',
    description: 'Physical deal mode with external URL and visible coupon.',
    emoji: '🎯',
    type: 'physical',
    physicalSubtype: 'creator_deal',
  },
  {
    id: 'pdf_ebook',
    title: 'PDF / eBook',
    description: 'Sell downloadable PDFs, guides, and files.',
    emoji: '📘',
    type: 'digital',
    digitalSubtype: 'download',
  },
  {
    id: 'template_library',
    title: 'Template Library',
    description: 'Bundle templates in organized packs.',
    emoji: '🎨',
    type: 'digital',
    digitalSubtype: 'template_library',
  },
  {
    id: 'booking',
    title: 'Booking / Appointments',
    description: 'Let customers book slots from your availability.',
    emoji: '📅',
    type: 'digital',
    digitalSubtype: 'calendar',
  },
  {
    id: 'subscription',
    title: 'Subscription Content',
    description: 'Recurring plans for exclusive members.',
    emoji: '⭐',
    type: 'digital',
    digitalSubtype: 'membership',
  },
  {
    id: 'counselling',
    title: '1-on-1 Counselling',
    description: 'Duration packages with paid booking.',
    emoji: '💬',
    type: 'digital',
    digitalSubtype: 'coaching',
  },
  {
    id: 'custom_photoframe',
    title: 'Custom Photoframes',
    description: 'Collect photo upload and frame preferences.',
    emoji: '🖼️',
    type: 'physical',
    physicalSubtype: 'custom_photoframe',
  },
  {
    id: 'portrait_canvas',
    title: 'Portrait / Canvas Art',
    description: 'Take uploads and sell art by size/material/quality.',
    emoji: '🎨',
    type: 'physical',
    physicalSubtype: 'portrait_canvas',
  },
  {
    id: 'automations',
    title: 'Automations',
    description: 'Automate replies and delivery workflows.',
    emoji: '🤖',
    proOnly: true,
    lockedLabel: 'Pro',
  },
]

export function formatPrice(paisa: number): string {
  return '₹' + (paisa / 100).toLocaleString('en-IN')
}

export function isValidProPlanTerm(value: unknown): value is ProPlanTermMonths {
  return value === 1 || value === 3 || value === 6 || value === 12
}

export function getProPlanTermPricing(months: ProPlanTermMonths) {
  return PRO_PLAN_TERM_PRICING[months]
}

export function calculatePlatformFee(amountInPaisa: number): number {
  return Math.round(amountInPaisa * PLATFORM_FEE_PERCENT / 100)
}
