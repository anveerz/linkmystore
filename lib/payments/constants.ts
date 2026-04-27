export const V3_PAYMENT_FLAGS = {
  checkoutUnified: process.env.V3_CHECKOUT_UNIFIED !== 'false',
  pgPrimary: process.env.V3_PG_PRIMARY !== 'false',
  upiFallbackLimits: process.env.V3_UPI_FALLBACK_LIMITS !== 'false',
  trustSurfaces: process.env.V3_TRUST_SURFACES !== 'false',
} as const

export const UPI_FALLBACK_LIMITS = {
  daysFromCreatorCreation: Number(process.env.UPI_FALLBACK_DAYS || 30),
  maxOrderAmountPaisa: Number(process.env.UPI_FALLBACK_MAX_ORDER_PAISA || 500000), // Rs 5,000
  monthlyGmvCapPaisa: Number(process.env.UPI_FALLBACK_MONTHLY_GMV_PAISA || 5000000), // Rs 50,000
} as const

export const PAYMENT_PROVIDER_FEE_DISCLOSURE =
  'Provider fees apply as per gateway plan (typically around 2% + GST in India). Actual charges vary by method and provider.'

