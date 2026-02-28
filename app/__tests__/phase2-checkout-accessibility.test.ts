import fs from 'fs'
import path from 'path'

describe('phase 2 checkout accessibility and payment-confirmation UX', () => {
  const checkoutFile = path.join(process.cwd(), 'app', '[slug]', '[productId]', 'checkout', 'page.tsx')
  const source = fs.readFileSync(checkoutFile, 'utf8')

  it('keeps explicit labels for UPI confirmation inputs', () => {
    expect(source).toContain('UPI Reference Number (12 digits)')
    expect(source).toContain('Payment Screenshot (optional)')
  })

  it('supports screenshot upload with constrained file input', () => {
    expect(source).toContain('type="file"')
    expect(source).toContain('accept="image/*"')
    expect(source).toContain('Upload Screenshot')
  })

  it('retains confirm-step resubmission controls and navigation fallback', () => {
    expect(source).toContain('I Have Paid - Confirm Payment')
    expect(source).toContain('Open UPI App Again')
    expect(source).toContain('Back to Store')
  })
})
