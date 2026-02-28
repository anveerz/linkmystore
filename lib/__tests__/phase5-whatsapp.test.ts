import { sendWhatsAppMessage } from '@/lib/whatsapp'

describe('phase 5 - whatsapp client', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    jest.restoreAllMocks()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('returns configuration error when provider env is missing', async () => {
    delete process.env.WHATSAPP_API_URL
    delete process.env.WHATSAPP_API_KEY

    const result = await sendWhatsAppMessage({ to: '9876543210', message: 'hello' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('not configured')
  })

  it('normalizes phone and sends generic provider payload', async () => {
    process.env.WHATSAPP_PROVIDER = 'generic'
    process.env.WHATSAPP_API_URL = 'https://wa.example/send'
    process.env.WHATSAPP_API_KEY = 'secret'

    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )

    const result = await sendWhatsAppMessage({ to: '98765-43210', message: 'new order' })

    expect(result.success).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://wa.example/send',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ to: '919876543210', message: 'new order' }),
      })
    )
  })

  it('builds interakt payload format when provider is interakt', async () => {
    process.env.WHATSAPP_PROVIDER = 'interakt'
    process.env.WHATSAPP_API_URL = 'https://interakt.example/send'
    process.env.WHATSAPP_API_KEY = 'secret'

    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    )

    const result = await sendWhatsAppMessage({ to: '+91 9876543210', message: 'hi' })

    expect(result.success).toBe(true)
    const requestInit = fetchMock.mock.calls[0][1] as RequestInit
    expect(requestInit.body).toBe(
      JSON.stringify({
        countryCode: '+91',
        phoneNumber: '9876543210',
        callbackData: 'lms_order_notification',
        type: 'Text',
        text: 'hi',
      })
    )
  })
})
