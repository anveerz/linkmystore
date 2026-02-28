export interface WhatsAppSendParams {
  to: string
  message: string
}

export interface WhatsAppSendResult {
  success: boolean
  provider: string
  response?: unknown
  error?: string
}

function normalizePhone(rawPhone: string) {
  const digits = rawPhone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `91${digits}`
  if (digits.startsWith('91') && digits.length >= 12) return digits
  return digits
}

export async function sendWhatsAppMessage(params: WhatsAppSendParams): Promise<WhatsAppSendResult> {
  const provider = (process.env.WHATSAPP_PROVIDER || 'generic').toLowerCase()
  const apiUrl = process.env.WHATSAPP_API_URL
  const apiKey = process.env.WHATSAPP_API_KEY

  if (!apiUrl || !apiKey) {
    return {
      success: false,
      provider,
      error: 'WhatsApp provider is not configured',
    }
  }

  const to = normalizePhone(params.to)
  if (!to) {
    return {
      success: false,
      provider,
      error: 'Invalid recipient phone number',
    }
  }

  let body: Record<string, unknown> = { to, message: params.message }

  if (provider === 'interakt') {
    body = {
      countryCode: '+91',
      phoneNumber: to.slice(-10),
      callbackData: 'lms_order_notification',
      type: 'Text',
      text: params.message,
    }
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const raw = await response.text()
    let parsed: unknown = raw
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = raw
    }

    if (!response.ok) {
      return {
        success: false,
        provider,
        response: parsed,
        error: `Provider responded with ${response.status}`,
      }
    }

    return {
      success: true,
      provider,
      response: parsed,
    }
  } catch (error) {
    return {
      success: false,
      provider,
      error: error instanceof Error ? error.message : 'Unknown provider error',
    }
  }
}
