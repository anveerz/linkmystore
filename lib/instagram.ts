interface SendInstagramDmInput {
  igBusinessAccountId: string
  recipientId: string
  message: string
  accessToken: string
}

export async function sendInstagramDm(input: SendInstagramDmInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${input.igBusinessAccountId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: input.recipientId },
          message: { text: input.message },
          messaging_product: 'instagram',
        }),
      }
    )

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      const message = payload?.error?.message || `Instagram API ${response.status}`
      return { ok: false, error: message }
    }

    return { ok: true }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : 'Network error' }
  }
}

export function textHasKeyword(text: string, keywords: string[]): boolean {
  const normalized = text.toLowerCase()
  return keywords.some((keyword) => {
    const key = keyword.trim().toLowerCase()
    return key.length > 0 && normalized.includes(key)
  })
}

export function buildInstagramDmMessage(template: string, values: Record<string, string>): string {
  let message = template
  for (const [key, value] of Object.entries(values)) {
    message = message.replaceAll(`{${key}}`, value)
  }
  return message
}
