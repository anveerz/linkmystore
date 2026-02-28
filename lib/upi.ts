export interface UPILinkParams {
  payeeVPA: string       // seller's UPI ID (e.g., name@upi)
  payeeName: string      // seller's store name
  amount: number         // in rupees (NOT paisa)
  transactionNote: string // e.g., "Order-LMS-20260227-001"
  currency?: string
}

export function generateUPILink(params: UPILinkParams): string {
  const { payeeVPA, payeeName, amount, transactionNote, currency = 'INR' } = params

  const upiUrl = new URL('upi://pay')
  upiUrl.searchParams.set('pa', payeeVPA)
  upiUrl.searchParams.set('pn', payeeName)
  upiUrl.searchParams.set('am', amount.toFixed(2))
  upiUrl.searchParams.set('cu', currency)
  upiUrl.searchParams.set('tn', transactionNote)

  return upiUrl.toString()
}

export function validateUPIId(upiId: string): boolean {
  // UPI ID format: username@provider (e.g., name@upi, phone@paytm, name@okicici)
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/
  return upiRegex.test(upiId)
}

export function validateUPIReferenceNumber(ref: string): boolean {
  // UPI reference numbers are typically 12 digits
  const cleaned = ref.replace(/\s/g, '')
  return /^\d{12}$/.test(cleaned)
}
