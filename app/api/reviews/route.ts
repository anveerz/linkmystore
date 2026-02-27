import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/reviews?product_id=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')

    if (!productId) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('id, buyer_name, rating, comment, created_at')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Reviews fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
    }

    return NextResponse.json({ reviews: reviews || [] })
  } catch (error) {
    console.error('Reviews GET error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST /api/reviews
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { product_id, order_id, buyer_name, buyer_phone, rating, comment } = body

    // Validate required fields
    if (!product_id || !order_id) {
      return NextResponse.json({ error: 'product_id and order_id are required' }, { status: 400 })
    }
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }
    if (!buyer_name?.trim()) {
      return NextResponse.json({ error: 'Buyer name is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify the order exists and is paid (prevent fake reviews)
    const { data: order } = await supabase
      .from('orders')
      .select('id, payment_status, product_id')
      .eq('id', order_id)
      .eq('product_id', product_id)
      .eq('payment_status', 'paid')
      .single()

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or payment not confirmed' },
        { status: 404 }
      )
    }

    // Check if a review already exists for this order
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('order_id', order_id)
      .single()

    if (existingReview) {
      return NextResponse.json({ error: 'You have already reviewed this order' }, { status: 409 })
    }

    // Insert review
    const { error: insertError } = await supabase.from('reviews').insert({
      product_id,
      order_id,
      buyer_name: buyer_name.trim(),
      buyer_phone: buyer_phone || null,
      rating,
      comment: comment?.trim() || null,
    })

    if (insertError) {
      console.error('Review insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save review' }, { status: 500 })
    }

    // Update avg_rating and review_count on the product
    const { data: allRatings } = await supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', product_id)

    if (allRatings && allRatings.length > 0) {
      const avgRating =
        allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
      await supabase
        .from('products')
        .update({
          avg_rating: Math.round(avgRating * 10) / 10,
          review_count: allRatings.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product_id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reviews POST error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
