interface UpiPaymentState {
  payment_method?: string | null
  payment_status?: string | null
  payment_verified?: boolean | null
}

export function isUpiPaymentConfirmed(order: UpiPaymentState): boolean {
  if (order.payment_method !== 'upi_direct') return false
  return order.payment_verified === true || order.payment_status === 'paid'
}

export function isUpiPendingVerification(order: UpiPaymentState): boolean {
  return order.payment_method === 'upi_direct' && !isUpiPaymentConfirmed(order)
}
