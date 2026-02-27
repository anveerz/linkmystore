import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AvailabilitySlot } from '@/types'

interface BookingConfig {
    availability?: AvailabilitySlot[]
    duration_minutes?: number
    buffer_minutes?: number
    min_notice_hours?: number
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('product_id')
        const date = searchParams.get('date')

        if (!productId || !date) {
            return NextResponse.json({ error: 'product_id and date are required' }, { status: 400 })
        }

        const supabase = createAdminClient()

        // Get product to read availability & duration
        const { data: product } = await supabase
            .from('products')
            .select('coaching_data, calendar_data')
            .eq('id', productId)
            .single()

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        const config = (product.coaching_data || product.calendar_data) as BookingConfig | null
        if (!config) {
            return NextResponse.json({ error: 'No booking configuration found' }, { status: 400 })
        }

        const dayOfWeek = new Date(date).getDay()
        const daySlots = config.availability?.filter((s) => s.day_of_week === dayOfWeek) || []

        if (daySlots.length === 0) {
            return NextResponse.json({ slots: [], message: 'No availability on this day' })
        }

        // Get existing bookings for this date
        const { data: existingBookings } = await supabase
            .from('bookings')
            .select('booking_time, duration_minutes')
            .eq('product_id', productId)
            .eq('booking_date', date)
            .eq('status', 'confirmed')

        const bookedTimes = new Set((existingBookings || []).map(b => b.booking_time))

        // Generate time slots
        const duration = config.duration_minutes || 30
        const buffer = config.buffer_minutes || 0
        const slots: string[] = []

        for (const daySlot of daySlots) {
            const [startH, startM] = daySlot.start_time.split(':').map(Number)
            const [endH, endM] = daySlot.end_time.split(':').map(Number)
            const startMinutes = startH * 60 + startM
            const endMinutes = endH * 60 + endM

            for (let m = startMinutes; m + duration <= endMinutes; m += duration + buffer) {
                const hh = String(Math.floor(m / 60)).padStart(2, '0')
                const mm = String(m % 60).padStart(2, '0')
                const timeStr = `${hh}:${mm}`
                if (!bookedTimes.has(timeStr + ':00') && !bookedTimes.has(timeStr)) {
                    slots.push(timeStr)
                }
            }
        }

        // Filter past times if booking for today
        const now = new Date()
        const today = now.toISOString().slice(0, 10)
        const minNoticeMs = (config.min_notice_hours || 0) * 60 * 60 * 1000
        const filteredSlots = date === today
            ? slots.filter(t => {
                const slotTime = new Date(date + 'T' + t + ':00')
                return slotTime.getTime() > now.getTime() + minNoticeMs
            })
            : slots

        return NextResponse.json({ slots: filteredSlots })
    } catch (error: unknown) {
        console.error('Available slots error:', error)
        return NextResponse.json({ error: 'Failed to get available slots' }, { status: 500 })
    }
}
