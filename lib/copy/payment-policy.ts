import { PAYMENT_PROVIDER_FEE_DISCLOSURE } from '@/lib/payments/constants'

export const paymentPolicyCopy = {
  gatewayFeeDisclosure: PAYMENT_PROVIDER_FEE_DISCLOSURE,
  pgConfirmation: 'Payment confirmation is automatic after successful gateway capture.',
  upiManualConfirmation:
    'Manual UPI mode requires buyer proof submission and seller verification before order confirmation.',
  fallbackEligibility:
    'Manual UPI mode is available for sellers who have not activated gateway checkout.',
  directPaymentWarning:
    'In manual UPI mode, buyers pay the seller directly via UPI. LinkMyStore does not hold these funds.',
  trustSupport:
    'Use Report this Store and Grievance channels for fraud, abuse, or unresolved payment disputes.',
} as const
