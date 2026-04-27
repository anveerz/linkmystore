import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-razorpay-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (webhookSecret) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex')

      if (expectedSignature !== signature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    }

    const event = JSON.parse(body)
    const admin = createAdminClient()

    switch (event.event) {
      case 'subscription.activated': {
        const sub = event.payload.subscription.entity
        const creatorId = sub.notes?.creator_id
        if (creatorId) {
          await admin.from('creators').update({ plan: 'pro' }).eq('id', creatorId)
          await admin.from('subscriptions').upsert({
            creator_id: creatorId,
            plan: 'pro',
            status: 'active',
            razorpay_subscription_id: sub.id,
            current_period_start: new Date(sub.current_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'creator_id' })
          await admin.from('store_settings').update({
            show_branding: false,
            seo_enabled: true,
          }).eq('creator_id', creatorId)
        }
        break
      }

      case 'subscription.charged': {
        const sub = event.payload.subscription.entity
        const creatorId = sub.notes?.creator_id
        if (creatorId) {
          await admin.from('subscriptions').update({
            status: 'active',
            current_period_start: new Date(sub.current_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('creator_id', creatorId)
        }
        break
      }

      case 'subscription.cancelled': {
        const sub = event.payload.subscription.entity
        const creatorId = sub.notes?.creator_id
        if (creatorId) {
          await admin.from('subscriptions').update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('creator_id', creatorId)

          // Downgrade plan when subscription period ends
          const periodEnd = sub.current_end ? new Date(sub.current_end * 1000) : new Date()
          if (periodEnd <= new Date()) {
            await admin.from('creators').update({ plan: 'free' }).eq('id', creatorId)
            await admin.from('store_settings').update({
              show_branding: true,
              seo_enabled: false,
            }).eq('creator_id', creatorId)
          }
        }
        break
      }

      case 'subscription.halted':
      case 'subscription.pending': {
        const sub = event.payload.subscription.entity
        const creatorId = sub.notes?.creator_id
        if (creatorId) {
          await admin.from('subscriptions').update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          }).eq('creator_id', creatorId)
        }
        break
      }

      case 'subscription.expired': {
        const sub = event.payload.subscription.entity
        const creatorId = sub.notes?.creator_id
        if (creatorId) {
          await admin.from('creators').update({ plan: 'free' }).eq('id', creatorId)
          await admin.from('subscriptions').update({
            status: 'expired',
            updated_at: new Date().toISOString(),
          }).eq('creator_id', creatorId)
          await admin.from('store_settings').update({
            show_branding: true,
            seo_enabled: false,
          }).eq('creator_id', creatorId)
        }
        break
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Subscription webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
