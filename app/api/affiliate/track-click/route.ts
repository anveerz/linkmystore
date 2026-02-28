import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function asText(value: unknown, max = 96) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized.slice(0, max) : null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const productId = asText(body.product_id, 64)

    if (!productId) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: product } = await admin
      .from('products')
      .select('id, creator_id, is_active, is_affiliate, affiliate_platform, affiliate_tagged_url')
      .eq('id', productId)
      .single()

    if (!product || !product.is_active) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (!product.is_affiliate || !product.affiliate_tagged_url) {
      return NextResponse.json({ error: 'This product is not an affiliate listing' }, { status: 400 })
    }

    await admin.from('affiliate_clicks').insert({
      creator_id: product.creator_id,
      product_id: product.id,
      affiliate_platform: product.affiliate_platform,
      visitor_id: asText(body.visitor_id, 96),
      session_id: asText(body.session_id, 96),
    })

    return NextResponse.json({
      success: true,
      redirect_url: product.affiliate_tagged_url,
      platform: product.affiliate_platform,
    })
  } catch (error) {
    console.error('Affiliate click tracking error:', error)
    return NextResponse.json({ error: 'Failed to track affiliate click' }, { status: 500 })
  }
}
