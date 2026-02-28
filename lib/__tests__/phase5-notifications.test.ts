import { sendOrderNotificationIfEligible } from '@/lib/notifications'
import { SupabaseQueryMock } from '@/lib/__tests__/helpers/supabase-mock'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/whatsapp', () => ({
  sendWhatsAppMessage: jest.fn(),
}))

const { createAdminClient } = jest.requireMock('@/lib/supabase/admin') as {
  createAdminClient: jest.Mock
}
const { sendWhatsAppMessage } = jest.requireMock('@/lib/whatsapp') as {
  sendWhatsAppMessage: jest.Mock
}

describe('phase 5 - notification eligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not send WhatsApp for free plan creators', async () => {
    const db = new SupabaseQueryMock({
      creators: {
        selectSingle: [{ data: { plan: 'free', phone: '9876543210', whatsapp_number: null } }],
      },
    })
    createAdminClient.mockReturnValue(db)

    const result = await sendOrderNotificationIfEligible({
      creatorId: 'c1',
      orderNumber: 'LMS-20260227-001',
      buyerName: 'Buyer',
      amountInPaisa: 19900,
      upiReference: '123456789012',
    })

    expect(result).toBeNull()
    expect(sendWhatsAppMessage).not.toHaveBeenCalled()
  })

  it('does not send when creator has no WhatsApp/phone', async () => {
    const db = new SupabaseQueryMock({
      creators: {
        selectSingle: [{ data: { plan: 'pro', phone: null, whatsapp_number: null } }],
      },
    })
    createAdminClient.mockReturnValue(db)

    const result = await sendOrderNotificationIfEligible({
      creatorId: 'c2',
      orderNumber: 'LMS-20260227-002',
      buyerName: 'Buyer',
      amountInPaisa: 9900,
    })

    expect(result).toBeNull()
    expect(sendWhatsAppMessage).not.toHaveBeenCalled()
  })

  it('sends for pro creators and includes order details', async () => {
    const db = new SupabaseQueryMock({
      creators: {
        selectSingle: [{ data: { plan: 'pro', phone: '9876543210', whatsapp_number: '919876543210' } }],
      },
    })
    createAdminClient.mockReturnValue(db)
    sendWhatsAppMessage.mockResolvedValue({ success: true, provider: 'generic' })

    const result = await sendOrderNotificationIfEligible({
      creatorId: 'c3',
      orderNumber: 'LMS-20260227-003',
      buyerName: 'Anu',
      amountInPaisa: 12345,
      upiReference: '123456789012',
    })

    expect(sendWhatsAppMessage).toHaveBeenCalledWith({
      to: '919876543210',
      message: expect.stringContaining('Order: LMS-20260227-003'),
    })
    expect(sendWhatsAppMessage).toHaveBeenCalledWith({
      to: '919876543210',
      message: expect.stringContaining('UPI Ref: 123456789012'),
    })
    expect(result).toEqual({ success: true, provider: 'generic' })
  })
})
