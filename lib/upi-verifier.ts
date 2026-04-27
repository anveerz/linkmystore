import { validateUPIId } from '@/lib/upi'

export interface UpiVerificationResult {
  valid: boolean
  provider: 'local'
  name: string | null
  message?: string
}

export async function verifyUpiId(upiId: string): Promise<UpiVerificationResult> {
  const normalized = upiId.trim().toLowerCase()
  if (!normalized) {
    return {
      valid: false,
      provider: 'local',
      name: null,
      message: 'UPI ID is required',
    }
  }

  if (!validateUPIId(normalized)) {
    return {
      valid: false,
      provider: 'local',
      name: null,
      message: 'Enter a valid UPI ID format',
    }
  }

  return {
    valid: true,
    provider: 'local',
    name: null,
  }
}
