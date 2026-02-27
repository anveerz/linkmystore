import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('product_id')
        const email = searchParams.get('email')

        if (!productId || !email) {
            return NextResponse.json({ error: 'product_id and email are required' }, { status: 400 })
        }

        const supabase = createAdminClient()

        const { data } = await supabase
            .from('course_enrollments')
            .select('*')
            .eq('product_id', productId)
            .eq('buyer_email', email)
            .single()

        if (!data) {
            return NextResponse.json({ error: 'Not enrolled' }, { status: 404 })
        }

        return NextResponse.json({ enrollment: data })
    } catch {
        return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { enrollment_id, lesson_id } = body

        if (!enrollment_id || !lesson_id) {
            return NextResponse.json({ error: 'enrollment_id and lesson_id are required' }, { status: 400 })
        }

        const supabase = createAdminClient()

        // Get current enrollment
        const { data: enrollment } = await supabase
            .from('course_enrollments')
            .select('lessons_completed')
            .eq('id', enrollment_id)
            .single()

        if (!enrollment) {
            return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
        }

        const completed = enrollment.lessons_completed || []
        if (!completed.includes(lesson_id)) {
            completed.push(lesson_id)
        }

        const { error } = await supabase
            .from('course_enrollments')
            .update({ lessons_completed: completed })
            .eq('id', enrollment_id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, lessons_completed: completed })
    } catch {
        return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
    }
}
