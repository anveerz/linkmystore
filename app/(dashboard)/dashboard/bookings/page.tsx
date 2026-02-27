'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    CalendarCheck,
    Clock,
    CheckCircle,
    XCircle,
    Video,
    Calendar,
    User,
} from 'lucide-react'
import type { Booking } from '@/types'
import toast from 'react-hot-toast'

export default function BookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming')
    const supabase = useMemo(() => createClient(), [])

    const fetchBookings = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: creatorData } = await supabase.from('creators').select('*').eq('user_id', user.id).single()
            if (!creatorData) return

            const { data } = await supabase
                .from('bookings')
                .select('*')
                .eq('creator_id', creatorData.id)
                .order('booking_date', { ascending: true })
                .order('booking_time', { ascending: true })

            setBookings(data || [])
        } catch (e) {
            console.error('Error fetching bookings:', e)
            toast.error('Failed to load bookings')
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        void fetchBookings()
    }, [fetchBookings])

    const updateStatus = async (id: string, status: 'confirmed' | 'completed' | 'cancelled') => {
        const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
        if (error) {
            toast.error('Failed to update')
        } else {
            setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
            toast.success(`Booking ${status}`)
        }
    }

    const now = new Date().toISOString().slice(0, 10)
    const filtered = bookings.filter(b => {
        if (filter === 'cancelled') return b.status === 'cancelled'
        if (filter === 'past') return b.booking_date < now || b.status === 'completed'
        return b.booking_date >= now && b.status !== 'cancelled' && b.status !== 'completed'
    })

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-32 bg-gray-100 rounded-lg animate-pulse" />
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-[#1A1A2E]">Bookings</h1>
                    <span className="bg-gradient-to-r from-[#E8651A]/10 to-[#3D2176]/10 text-[#3D2176] text-xs font-semibold px-3 py-1 rounded-full">
                        {bookings.length}
                    </span>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
                {(['upcoming', 'past', 'cancelled'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f
                                ? 'bg-[#E8651A] text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {f === 'upcoming' ? '📅 Upcoming' : f === 'past' ? '✅ Past' : '❌ Cancelled'}
                    </button>
                ))}
            </div>

            {/* Bookings List */}
            {filtered.length === 0 ? (
                <div className="card py-16 text-center">
                    <CalendarCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-400">No {filter} bookings</h3>
                    <p className="text-sm text-gray-300 mt-1">
                        {filter === 'upcoming' ? 'When clients book sessions, they\'ll appear here' : 'No bookings found'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(booking => (
                        <div key={booking.id} className="card p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 flex items-center justify-center flex-shrink-0">
                                        <User className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-[#1A1A2E]">{booking.buyer_name}</h3>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-[#8E8E9F]">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(booking.booking_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {booking.booking_time}
                                            </span>
                                            <span>{booking.duration_minutes} min</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            {booking.buyer_phone && <span className="text-[10px] text-gray-400">{booking.buyer_phone}</span>}
                                            {booking.buyer_email && <span className="text-[10px] text-gray-400">{booking.buyer_email}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${booking.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                            booking.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-700'
                                        }`}>
                                        {booking.status}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            {booking.status === 'confirmed' && (
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                    <button
                                        onClick={() => updateStatus(booking.id, 'completed')}
                                        className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" /> Complete
                                    </button>
                                    <button
                                        onClick={() => updateStatus(booking.id, 'cancelled')}
                                        className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <XCircle className="w-3.5 h-3.5" /> Cancel
                                    </button>
                                    {booking.meeting_link && (
                                        <a href={booking.meeting_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors ml-auto">
                                            <Video className="w-3.5 h-3.5" /> Join Meeting
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
