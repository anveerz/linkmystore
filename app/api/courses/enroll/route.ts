import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { product_id, order_id, buyer_email, buyer_phone } = body

        if (!product_id || !order_id || !buyer_email || !buyer_phone) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const supabase = createAdminClient()

        const { data: product } = await supabase
            .from('products')
            .select('id, digital_subtype, is_active')
            .eq('id', product_id)
            .maybeSingle()

        if (!product || product.is_active !== true) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        if (product.digital_subtype !== 'course') {
            return NextResponse.json({ error: 'Product is not a course' }, { status: 400 })
        }

        // Check for existing enrollment
        const { data: existing } = await supabase
            .from('course_enrollments')
            .select('id')
            .eq('product_id', product_id)
            .eq('buyer_email', buyer_email)
            .single()

        if (existing) {
            return NextResponse.json({ success: true, enrollment_id: existing.id, message: 'Already enrolled' })
        }

        const { data, error } = await supabase
            .from('course_enrollments')
            .insert({
                product_id,
                order_id,
                buyer_email,
                buyer_phone,
                lessons_completed: [],
            })
            .select('id')
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, enrollment_id: data.id })
    } catch (error: unknown) {
        console.error('Course enroll error:', error)
        return NextResponse.json({ error: 'Failed to enroll in course' }, { status: 500 })
    }
}
