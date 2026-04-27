import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_CATEGORIES = new Set([
  'fraud',
  'non_delivery',
  'payment_issue',
  'counterfeit',
  'abuse',
  'other',
])

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const creatorId = typeof body?.creator_id === 'string' ? body.creator_id : ''
    const storeSlug = typeof body?.store_slug === 'string' ? body.store_slug.trim() : ''
    const categoryRaw = typeof body?.category === 'string' ? body.category.trim().toLowerCase() : ''
    const description = typeof body?.description === 'string' ? body.description.trim() : ''

    if ((!creatorId && !storeSlug) || !description) {
      return NextResponse.json(
        { error: 'creator_id or store_slug, and description are required' },
        { status: 400 }
      )
    }

    const category = ALLOWED_CATEGORIES.has(categoryRaw) ? categoryRaw : 'other'
    const admin = createAdminClient()

    let resolvedCreatorId = creatorId
    let resolvedStoreSlug = storeSlug

    if (!resolvedCreatorId && resolvedStoreSlug) {
      const { data: creator } = await admin
        .from('creators')
        .select('id, store_slug')
        .eq('store_slug', resolvedStoreSlug)
        .maybeSingle()
      if (!creator) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 })
      }
      resolvedCreatorId = creator.id
      resolvedStoreSlug = creator.store_slug
    }

    if (resolvedCreatorId && !resolvedStoreSlug) {
      const { data: creator } = await admin
        .from('creators')
        .select('store_slug')
        .eq('id', resolvedCreatorId)
        .maybeSingle()
      if (!creator) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 })
      }
      resolvedStoreSlug = creator.store_slug
    }

    const evidenceUrls = Array.isArray(body?.evidence_urls)
      ? body.evidence_urls.filter((value: unknown) => typeof value === 'string' && value.trim())
      : []

    const { data: report, error } = await admin
      .from('store_reports')
      .insert({
        creator_id: resolvedCreatorId,
        store_slug: resolvedStoreSlug,
        category,
        description,
        buyer_name: typeof body?.buyer_name === 'string' ? body.buyer_name.trim() : null,
        buyer_phone: typeof body?.buyer_phone === 'string' ? body.buyer_phone.trim() : null,
        buyer_email: typeof body?.buyer_email === 'string' ? body.buyer_email.trim() : null,
        order_reference: typeof body?.order_reference === 'string' ? body.order_reference.trim() : null,
        upi_reference: typeof body?.upi_reference === 'string' ? body.upi_reference.trim() : null,
        evidence_urls: evidenceUrls,
      })
      .select('id, created_at')
      .single()

    if (error || !report) {
      return NextResponse.json({ error: error?.message || 'Failed to submit report' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      report_id: report.id,
      created_at: report.created_at,
      message: 'Store report submitted. Our trust team will review this complaint.',
    })
  } catch (error) {
    console.error('Store report error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit store report' },
      { status: 500 }
    )
  }
}

