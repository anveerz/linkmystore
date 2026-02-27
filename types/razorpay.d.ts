interface RazorpaySuccessResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

interface RazorpayErrorResponse {
  error: {
    code: string
    description: string
    source: string
    step: string
    reason: string
    metadata?: Record<string, string>
  }
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill?: {
    name?: string
    contact?: string
    email?: string
  }
  config?: Record<string, unknown>
  theme?: {
    color?: string
    backdrop_color?: string
  }
  modal?: {
    ondismiss?: () => void
    confirm_close?: boolean
  }
  notes?: Record<string, string>
  handler?: (response: RazorpaySuccessResponse) => void | Promise<void>
}

interface RazorpayInstance {
  on(event: 'payment.failed', handler: (response: RazorpayErrorResponse) => void): void
  open(): void
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance
}

interface Window {
  Razorpay: RazorpayConstructor
}
