interface UpiPaymentState {
  payment_method?: string | null
  payment_status?: string | null
  payment_verified?: boolean | null
}

export function isUpiPaymentConfirmed(order: UpiPaymentState): boolean {
  const isUpiMethod = order.payment_method === 'upi_direct' || order.payment_method === 'upi_manual'
  if (!isUpiMethod) return false
  return order.payment_verified === true || order.payment_status === 'paid'
}

export function isUpiPendingVerification(order: UpiPaymentState): boolean {
  const isUpiMethod = order.payment_method === 'upi_direct' || order.payment_method === 'upi_manual'
  if (!isUpiMethod) return false

  if (order.payment_status === 'failed' || order.payment_status === 'refunded' || order.payment_status === 'chargeback') {
    return false
  }

  return !isUpiPaymentConfirmed(order)
}
