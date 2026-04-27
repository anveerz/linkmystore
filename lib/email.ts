import { Resend } from 'resend'
import { PLATFORM_CONTACT_EMAIL } from '@/lib/site'

export interface CounsellingBookingEmailPayload {
  to: string
  buyerName?: string | null
  storeName: string
  sessionTitle: string
  bookingDate: string
  bookingTime: string
  durationMinutes: number
  paidAmountInPaisa: number
  meetingLink?: string | null
}

export interface SellerManualUpiVerificationEmailPayload {
  to: string
  storeName: string
  orderNumber: string
  buyerName: string
  amountInPaisa: number
  confirmOrderUrl: string
  dashboardOrderUrl?: string | null
  upiReference?: string | null
  paymentScreenshotUrl?: string | null
}

export interface BuyerDigitalDeliveryEmailPayload {
  to: string
  buyerName?: string | null
  storeName: string
  orderNumber: string
  productTitle: string
  accessUrl: string
}

const DEFAULT_FROM_EMAIL = `LinkMyStore <${PLATFORM_CONTACT_EMAIL}>`

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  return new Resend(apiKey)
}

function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL
}

function unwrapEmailSendResult(
  response: Awaited<ReturnType<ReturnType<typeof getResendClient>['emails']['send']>>,
  failureMessage: string
) {
  if (response.error) {
    throw new Error(response.error.message || failureMessage)
  }

  return {
    sent: true as const,
    id: response.data?.id || null,
  }
}

function formatAmount(amountInPaisa: number) {
  return `INR ${(amountInPaisa / 100).toLocaleString('en-IN')}`
}

function formatDateTime(date: string, time: string) {
  const dateTime = new Date(`${date}T${time}:00`)
  if (Number.isNaN(dateTime.getTime())) {
    return `${date} ${time}`
  }

  return dateTime.toLocaleString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function buildGoogleCalendarLink({
  title,
  description,
  startDate,
  endDate,
}: {
  title: string
  description: string
  startDate: Date
  endDate: Date
}) {
  const formatForGoogle = (value: Date) =>
    value
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description,
    dates: `${formatForGoogle(startDate)}/${formatForGoogle(endDate)}`,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export async function sendCounsellingBookingEmail(payload: CounsellingBookingEmailPayload) {
  const resend = getResendClient()
  const from = getFromEmail()
  const formattedDateTime = formatDateTime(payload.bookingDate, payload.bookingTime)
  const amountText = formatAmount(payload.paidAmountInPaisa)

  const startDate = new Date(`${payload.bookingDate}T${payload.bookingTime}:00`)
  const endDate = new Date(startDate.getTime() + payload.durationMinutes * 60 * 1000)
  const calendarLink =
    Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())
      ? null
      : buildGoogleCalendarLink({
        title: payload.sessionTitle,
        description: payload.meetingLink || `${payload.sessionTitle} with ${payload.storeName}`,
        startDate,
        endDate,
      })

  const meetingLine = payload.meetingLink
    ? `<p><strong>Meeting Link:</strong> <a href="${payload.meetingLink}">${payload.meetingLink}</a></p>`
    : '<p><strong>Meeting Link:</strong> The seller will share it before the session.</p>'

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px">
      <h2 style="margin-bottom:8px">Booking Confirmed</h2>
      <p style="margin-top:0">Hi ${payload.buyerName || 'there'}, your counselling session is confirmed.</p>
      <p><strong>Session:</strong> ${payload.sessionTitle}</p>
      <p><strong>Date & Time:</strong> ${formattedDateTime}</p>
      <p><strong>Duration:</strong> ${payload.durationMinutes} minutes</p>
      <p><strong>Paid Amount:</strong> ${amountText}</p>
      ${meetingLine}
      ${calendarLink ? `<p><a href="${calendarLink}">Add to Calendar</a></p>` : ''}
      <p style="margin-top:20px;color:#555">Seller: ${payload.storeName}</p>
      <p style="margin-top:20px;color:#6b7280;font-size:13px">For fulfilment or session questions, contact the seller directly. To report fraud, abuse, or policy issues on LinkMyStore, email ${PLATFORM_CONTACT_EMAIL}.</p>
    </div>
  `

  const textLines = [
    'Booking Confirmed',
    `Session: ${payload.sessionTitle}`,
    `Date & Time: ${formattedDateTime}`,
    `Duration: ${payload.durationMinutes} minutes`,
    `Paid Amount: ${amountText}`,
    payload.meetingLink
      ? `Meeting Link: ${payload.meetingLink}`
      : 'Meeting Link: Seller will share before the session',
    calendarLink ? `Add to Calendar: ${calendarLink}` : null,
    `Seller: ${payload.storeName}`,
    `For platform-level fraud or abuse reports only: ${PLATFORM_CONTACT_EMAIL}`,
  ].filter(Boolean)

  const response = await resend.emails.send({
    from,
    to: payload.to,
    subject: `Booking Confirmed: ${payload.sessionTitle}`,
    html,
    text: textLines.join('\n'),
  })

  return unwrapEmailSendResult(response, 'Failed to send counselling booking email')
}

export async function sendSellerManualUpiVerificationEmail(
  payload: SellerManualUpiVerificationEmailPayload
) {
  const resend = getResendClient()
  const from = getFromEmail()
  const amountText = formatAmount(payload.amountInPaisa)
  const screenshotLine = payload.paymentScreenshotUrl
    ? `<p><strong>Screenshot:</strong> <a href="${payload.paymentScreenshotUrl}">View payment proof</a></p>`
    : ''
  const dashboardLine = payload.dashboardOrderUrl
    ? `<p><a href="${payload.dashboardOrderUrl}">Open this order in dashboard</a></p>`
    : ''

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px">
      <h2 style="margin-bottom:8px">Manual UPI Payment Awaiting Your Confirmation</h2>
      <p style="margin-top:0">A buyer has submitted payment proof for a new order on ${payload.storeName}.</p>
      <p><strong>Order:</strong> ${payload.orderNumber}</p>
      <p><strong>Buyer:</strong> ${payload.buyerName}</p>
      <p><strong>Amount:</strong> ${amountText}</p>
      ${payload.upiReference ? `<p><strong>UPI Reference:</strong> ${payload.upiReference}</p>` : ''}
      ${screenshotLine}
      <p style="margin:24px 0">
        <a href="${payload.confirmOrderUrl}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600">
          Confirm This Order
        </a>
      </p>
      ${dashboardLine}
      <p style="color:#6b7280;font-size:13px">Confirming this order will mark the payment as verified and trigger buyer delivery.</p>
      <p style="color:#6b7280;font-size:13px">Platform contact for abuse, fraud, or policy escalation: ${PLATFORM_CONTACT_EMAIL}</p>
    </div>
  `

  const textLines = [
    'Manual UPI Payment Awaiting Your Confirmation',
    `Store: ${payload.storeName}`,
    `Order: ${payload.orderNumber}`,
    `Buyer: ${payload.buyerName}`,
    `Amount: ${amountText}`,
    payload.upiReference ? `UPI Reference: ${payload.upiReference}` : null,
    payload.paymentScreenshotUrl ? `Screenshot: ${payload.paymentScreenshotUrl}` : null,
    `Confirm this order: ${payload.confirmOrderUrl}`,
    payload.dashboardOrderUrl ? `Open dashboard order: ${payload.dashboardOrderUrl}` : null,
    `Platform contact: ${PLATFORM_CONTACT_EMAIL}`,
  ].filter(Boolean)

  const response = await resend.emails.send({
    from,
    to: payload.to,
    subject: `Confirm manual UPI order ${payload.orderNumber}`,
    html,
    text: textLines.join('\n'),
  })

  return unwrapEmailSendResult(response, 'Failed to send seller manual UPI verification email')
}

export async function sendBuyerDigitalDeliveryEmail(
  payload: BuyerDigitalDeliveryEmailPayload
) {
  const resend = getResendClient()
  const from = getFromEmail()
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px">
      <h2 style="margin-bottom:8px">Your Download Is Ready</h2>
      <p style="margin-top:0">Hi ${payload.buyerName || 'there'}, your order has been confirmed by ${payload.storeName}.</p>
      <p><strong>Product:</strong> ${payload.productTitle}</p>
      <p><strong>Order:</strong> ${payload.orderNumber}</p>
      <p style="margin:24px 0">
        <a href="${payload.accessUrl}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600">
          Access Your Download
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px">This is a single-use access link. Open it only when you are ready to download your files.</p>
      <p style="color:#6b7280;font-size:13px">For fulfilment questions, contact the seller directly. To report fraud or abuse on LinkMyStore, email ${PLATFORM_CONTACT_EMAIL}.</p>
    </div>
  `

  const textLines = [
    'Your Download Is Ready',
    `Product: ${payload.productTitle}`,
    `Order: ${payload.orderNumber}`,
    `Access your download: ${payload.accessUrl}`,
    'This is a single-use access link. Open it only when you are ready to download your files.',
    `For platform-level fraud or abuse reports only: ${PLATFORM_CONTACT_EMAIL}`,
  ]

  const response = await resend.emails.send({
    from,
    to: payload.to,
    subject: `Your download is ready: ${payload.productTitle}`,
    html,
    text: textLines.join('\n'),
  })

  return unwrapEmailSendResult(response, 'Failed to send buyer digital delivery email')
}

