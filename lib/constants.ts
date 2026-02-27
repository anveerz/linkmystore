export const PLATFORM_FEE_PERCENT = 4
export const FREE_PRODUCT_LIMIT = 10
export const MAX_IMAGES_PER_PRODUCT = 5
export const MAX_IMAGE_SIZE_MB = 5
export const MAX_DIGITAL_FILE_SIZE_MB = 100
export const MIN_PAYOUT_AMOUNT = 10000 // ₹100 in paisa
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function formatPrice(paisa: number): string {
  return '₹' + (paisa / 100).toLocaleString('en-IN')
}

export function calculatePlatformFee(amountInPaisa: number): number {
  return Math.round(amountInPaisa * PLATFORM_FEE_PERCENT / 100)
}
