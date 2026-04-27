export interface UPILinkParams {
  payeeVPA: string       // seller's UPI ID (e.g., name@upi)
  payeeName: string      // seller's store name
  amount: number         // in rupees (NOT paisa)
  transactionNote: string // e.g., "Order-LMS-20260227-001"
  transactionRef?: string
  merchantCode?: string
  currency?: string
}

export interface UPILinkVariants {
  primary_link: string
  lite_link: string
  qr_link: string
  transaction_ref: string
  transaction_note: string
  merchant_code: string
  amount_display: string
  payee_vpa: string
  payee_name: string
}

function sanitizeText(value: string, maxLength: number): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength)
}

function sanitizePayeeName(value: string): string {
  const cleaned = sanitizeText(value, 40).replace(/[^A-Za-z0-9 .,&()-]/g, '')
  return cleaned || 'Seller'
}

function sanitizeTransactionNote(value: string): string {
  const cleaned = sanitizeText(value, 80).replace(/[^\w .,:/#()-]/g, '')
  return cleaned || 'Order payment'
}

function sanitizeTransactionRef(value: string): string {
  return sanitizeText(value, 35).replace(/[^A-Za-z0-9_-]/g, '') || `LMS${Date.now()}`
}

function sanitizeMerchantCode(value: string): string {
  return sanitizeText(value, 4).replace(/[^A-Za-z0-9]/g, '') || '0000'
}

function formatAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '1.00'
  return amount.toFixed(2)
}

function buildUPILink(input: {
  payeeVPA: string
  payeeName: string
  amount: string
  transactionNote: string
  transactionRef: string
  merchantCode: string
  currency: string
  includeAmount: boolean
  includeTransactionNote?: boolean
  includeTransactionRef?: boolean
  includeMerchantCode?: boolean
}): string {
  const query = new URLSearchParams()
  query.set('pa', input.payeeVPA)
  query.set('pn', input.payeeName)
  query.set('cu', input.currency)
  if (input.includeMerchantCode ?? true) {
    query.set('mc', input.merchantCode)
  }
  if (input.includeTransactionRef ?? true) {
    query.set('tr', input.transactionRef)
  }
  if (input.includeTransactionNote ?? true) {
    query.set('tn', input.transactionNote)
  }
  if (input.includeAmount) {
    query.set('am', input.amount)
  }

  return `upi://pay?${query.toString()}`
}

export function buildUPILinkVariants(params: UPILinkParams): UPILinkVariants {
  const currency = sanitizeText(params.currency || 'INR', 3).toUpperCase() || 'INR'
  const payeeVPA = params.payeeVPA.trim().toLowerCase()
  const payeeName = sanitizePayeeName(params.payeeName)
  const amountDisplay = formatAmount(params.amount)
  const transactionNote = sanitizeTransactionNote(params.transactionNote)
  const transactionRef = sanitizeTransactionRef(params.transactionRef || transactionNote.replace(/\s+/g, '-'))
  const merchantCode = sanitizeMerchantCode(params.merchantCode || '0000')

  return {
    primary_link: buildUPILink({
      payeeVPA,
      payeeName,
      amount: amountDisplay,
      transactionNote,
      transactionRef,
      merchantCode,
      currency,
      includeAmount: true,
    }),
    lite_link: buildUPILink({
      payeeVPA,
      payeeName,
      amount: amountDisplay,
      transactionNote,
      transactionRef,
      merchantCode,
      currency,
      includeAmount: false,
    }),
    qr_link: buildUPILink({
      payeeVPA,
      payeeName,
      amount: amountDisplay,
      transactionNote,
      transactionRef,
      merchantCode,
      currency,
      includeAmount: true,
      includeTransactionNote: false,
      includeTransactionRef: false,
      includeMerchantCode: false,
    }),
    transaction_ref: transactionRef,
    transaction_note: transactionNote,
    merchant_code: merchantCode,
    amount_display: amountDisplay,
    payee_vpa: payeeVPA,
    payee_name: payeeName,
  }
}

export function generateUPILink(params: UPILinkParams): string {
  return buildUPILinkVariants(params).primary_link
}

export function validateUPIId(upiId: string): boolean {
  // UPI ID format: username@provider (e.g., name@upi, phone@paytm, name@okicici)
  const normalized = upiId.trim().toLowerCase()
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/
  return upiRegex.test(normalized)
}

export function validateUPIReferenceNumber(ref: string): boolean {
  // UPI reference numbers are typically 12 digits
  const cleaned = ref.replace(/\s/g, '')
  return /^\d{12}$/.test(cleaned)
}
