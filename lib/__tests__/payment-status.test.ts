import { isUpiPaymentConfirmed, isUpiPendingVerification } from '@/lib/payment-status'

describe('payment status helpers', () => {
  it('treats payment_status=paid as confirmed even if payment_verified is false', () => {
    const order = {
      payment_method: 'upi_direct',
      payment_status: 'paid',
      payment_verified: false,
    }

    expect(isUpiPaymentConfirmed(order)).toBe(true)
    expect(isUpiPendingVerification(order)).toBe(false)
  })

  it('marks upi order as pending when not paid and not verified', () => {
    const order = {
      payment_method: 'upi_direct',
      payment_status: 'pending',
      payment_verified: false,
    }

    expect(isUpiPaymentConfirmed(order)).toBe(false)
    expect(isUpiPendingVerification(order)).toBe(true)
  })

  it('does not treat non-upi as upi pending/confirmed', () => {
    const order = {
      payment_method: 'razorpay',
      payment_status: 'paid',
      payment_verified: false,
    }

    expect(isUpiPaymentConfirmed(order)).toBe(false)
    expect(isUpiPendingVerification(order)).toBe(false)
  })
})
