import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage, type WhatsAppSendResult } from '@/lib/whatsapp'

interface OrderNotificationParams {
  creatorId: string
  orderNumber: string
  buyerName: string
  amountInPaisa: number
  upiReference?: string | null
}

export async function sendOrderNotificationIfEligible(
  params: OrderNotificationParams
): Promise<WhatsAppSendResult | null> {
  const admin = createAdminClient()
  const { data: creator } = await admin
    .from('creators')
    .select('plan, phone, whatsapp_number')
    .eq('id', params.creatorId)
    .single()

  if (!creator || creator.plan !== 'pro') {
    return null
  }

  const to = creator.whatsapp_number || creator.phone
  if (!to) {
    return null
  }

  const amount = (params.amountInPaisa / 100).toLocaleString('en-IN')
  const messageParts = [
    `New order received`,
    `Order: ${params.orderNumber}`,
    `Buyer: ${params.buyerName}`,
    `Amount: INR ${amount}`,
  ]

  if (params.upiReference) {
    messageParts.push(`UPI Ref: ${params.upiReference}`)
  }

  return sendWhatsAppMessage({
    to,
    message: messageParts.join('\n'),
  })
}
