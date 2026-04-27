import { buildUPILinkVariants, generateUPILink, validateUPIId, validateUPIReferenceNumber } from '@/lib/upi'

describe('phase 2 - upi logic', () => {
  it('generates a valid UPI deep link with encoded params', () => {
    const link = generateUPILink({
      payeeVPA: 'seller@upi',
      payeeName: 'My Store',
      amount: 199,
      transactionNote: 'Order-LMS-20260227-001',
    })

    expect(link.startsWith('upi://pay?')).toBe(true)
    expect(link).toContain('pa=seller%40upi')
    expect(link).toContain('pn=My+Store')
    expect(link).toContain('am=199.00')
    expect(link).toContain('cu=INR')
    expect(link).toContain('tr=Order-LMS-20260227-001')
    expect(link).toContain('mc=0000')
  })

  it('validates UPI IDs', () => {
    expect(validateUPIId('name@upi')).toBe(true)
    expect(validateUPIId('9876543210@paytm')).toBe(true)
    expect(validateUPIId('bad-upi-id')).toBe(false)
    expect(validateUPIId('@upi')).toBe(false)
  })

  it('validates 12-digit UPI reference number with spaces', () => {
    expect(validateUPIReferenceNumber('1234 5678 9012')).toBe(true)
    expect(validateUPIReferenceNumber('123456789012')).toBe(true)
    expect(validateUPIReferenceNumber('123456')).toBe(false)
    expect(validateUPIReferenceNumber('ABC456789012')).toBe(false)
  })

  it('builds a scan-friendly QR UPI link without merchant-only fields', () => {
    const links = buildUPILinkVariants({
      payeeVPA: 'seller@upi',
      payeeName: 'My Store',
      amount: 199,
      transactionNote: 'Order-LMS-20260227-001',
    })

    expect(links.qr_link.startsWith('upi://pay?')).toBe(true)
    expect(links.qr_link).toContain('pa=seller%40upi')
    expect(links.qr_link).toContain('am=199.00')
    expect(links.qr_link).toContain('cu=INR')
    expect(links.qr_link).not.toContain('tr=')
    expect(links.qr_link).not.toContain('mc=')
  })
})
