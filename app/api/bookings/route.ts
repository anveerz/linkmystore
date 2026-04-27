import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const creatorId = searchParams.get('creator_id')
        const productId = searchParams.get('product_id')
        const date = searchParams.get('date')

        const supabase = createAdminClient()

        let query = supabase.from('bookings').select('*')

        if (creatorId) query = query.eq('creator_id', creatorId)
        if (productId) query = query.eq('product_id', productId)
        if (date) query = query.eq('booking_date', date)

        query = query.order('booking_date', { ascending: true }).order('booking_time', { ascending: true })

        const { data, error } = await query

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ bookings: data })
    } catch {
        return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const {
            product_id,
            creator_id,
            buyer_name,
            buyer_email,
            buyer_phone,
            booking_date,
            booking_time,
            duration_minutes,
            meeting_link,
            order_id,
            notes,
        } = body

        if (!product_id || !creator_id || !buyer_name || !buyer_phone || !booking_date || !booking_time) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const supabase = createAdminClient()

        const { data: product } = await supabase
            .from('products')
            .select('id, creator_id, is_active, digital_subtype')
            .eq('id', product_id)
            .maybeSingle()

        if (!product || product.creator_id !== creator_id || product.is_active !== true) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        if (product.digital_subtype !== 'coaching' && product.digital_subtype !== 'calendar') {
            return NextResponse.json({ error: 'Product is not bookable' }, { status: 400 })
        }

        // Check for conflicting bookings
        const { data: existing } = await supabase
            .from('bookings')
            .select('id')
            .eq('product_id', product_id)
            .eq('booking_date', booking_date)
            .eq('booking_time', booking_time)
            .eq('status', 'confirmed')

        if (existing && existing.length > 0) {
            return NextResponse.json({ error: 'This time slot is already booked' }, { status: 409 })
        }

        const { data, error } = await supabase
            .from('bookings')
            .insert({
                product_id,
                creator_id,
                buyer_name,
                buyer_email: buyer_email || null,
                buyer_phone,
                booking_date,
                booking_time,
                duration_minutes: duration_minutes || 30,
                meeting_link: meeting_link || null,
                order_id: order_id || null,
                notes: notes || null,
                status: 'confirmed',
            })
            .select('id')
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, booking_id: data.id })
    } catch {
        return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }
}
