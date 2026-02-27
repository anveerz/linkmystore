'use client'

import { Plus, X, Loader2, Sparkles, Clock, Users, Video, Phone } from 'lucide-react'
import type { AvailabilitySlot, MeetingPlatform } from '@/types'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DURATIONS = [15, 30, 45, 60, 90, 120]
const PLATFORMS: { value: MeetingPlatform; label: string; icon: React.ElementType }[] = [
    { value: 'google_meet', label: 'Google Meet', icon: Video },
    { value: 'zoom', label: 'Zoom', icon: Video },
    { value: 'whatsapp_call', label: 'WhatsApp Call', icon: Phone },
    { value: 'phone', label: 'Phone Call', icon: Phone },
]

interface CoachingFormProps {
    title: string
    setTitle: (v: string) => void
    description: string
    setDescription: (v: string) => void
    price: string
    setPrice: (v: string) => void
    comparePrice: string
    setComparePrice: (v: string) => void
    duration: number
    setDuration: (v: number) => void
    sessionType: '1on1' | 'group'
    setSessionType: (v: '1on1' | 'group') => void
    maxParticipants: string
    setMaxParticipants: (v: string) => void
    platform: MeetingPlatform
    setPlatform: (v: MeetingPlatform) => void
    meetingLink: string
    setMeetingLink: (v: string) => void
    availability: AvailabilitySlot[]
    setAvailability: (v: AvailabilitySlot[]) => void
    bufferMinutes: string
    setBufferMinutes: (v: string) => void
    advanceBookingDays: string
    setAdvanceBookingDays: (v: string) => void
    minNoticeHours: string
    setMinNoticeHours: (v: string) => void
    onGenerateAI: () => void
    aiLoading: boolean
}

export default function CoachingForm({
    title, setTitle,
    description, setDescription,
    price, setPrice,
    comparePrice, setComparePrice,
    duration, setDuration,
    sessionType, setSessionType,
    maxParticipants, setMaxParticipants,
    platform, setPlatform,
    meetingLink, setMeetingLink,
    availability, setAvailability,
    bufferMinutes, setBufferMinutes,
    advanceBookingDays, setAdvanceBookingDays,
    minNoticeHours, setMinNoticeHours,
    onGenerateAI, aiLoading,
}: CoachingFormProps) {

    const addAvailability = () => {
        setAvailability([...availability, { day_of_week: 1, start_time: '09:00', end_time: '17:00' }])
    }

    const updateAvailability = (index: number, field: keyof AvailabilitySlot, value: AvailabilitySlot[keyof AvailabilitySlot]) => {
        setAvailability(availability.map((s, i) => i === index ? { ...s, [field]: value } : s))
    }

    const removeAvailability = (index: number) => {
        setAvailability(availability.filter((_, i) => i !== index))
    }

    return (
        <div className="space-y-6">
            {/* Session Details */}
            <div className="card animate-in">
                <h2 className="text-lg font-semibold mb-4">Session Details</h2>
                <div>
                    <label className="block text-sm font-medium mb-1.5">
                        Session Title <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Career Counselling Session"
                        className="input-field"
                    />
                </div>

                <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium">Description</label>
                        <button
                            onClick={onGenerateAI}
                            disabled={aiLoading || !title.trim()}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                                background: aiLoading || !title.trim() ? undefined : 'linear-gradient(135deg, #E8651A 0%, #3D2176 100%)',
                                color: aiLoading || !title.trim() ? undefined : 'white',
                                border: aiLoading || !title.trim() ? '1px solid #e5e7eb' : 'none',
                            }}
                        >
                            {aiLoading ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                            ) : (
                                <><Sparkles className="w-3.5 h-3.5" /> Generate with AI</>
                            )}
                        </button>
                    </div>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What will the session cover? What can clients expect?"
                        rows={4}
                        className="input-field resize-none"
                    />
                </div>
            </div>

            {/* Session Configuration */}
            <div className="card animate-in-delay-1">
                <h2 className="text-lg font-semibold mb-4">Session Configuration</h2>

                {/* Session Type */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Session Type</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setSessionType('1on1')}
                            className={`rounded-xl border-2 p-3 text-left transition-all ${sessionType === '1on1' ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <Users className="w-5 h-5 mb-1 text-emerald-600" />
                            <div className="text-sm font-semibold">1-on-1</div>
                            <div className="text-[10px] text-gray-500">Private session</div>
                        </button>
                        <button
                            onClick={() => setSessionType('group')}
                            className={`rounded-xl border-2 p-3 text-left transition-all ${sessionType === 'group' ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <Users className="w-5 h-5 mb-1 text-emerald-600" />
                            <div className="text-sm font-semibold">Group</div>
                            <div className="text-[10px] text-gray-500">Multiple participants</div>
                        </button>
                    </div>
                </div>

                {sessionType === 'group' && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1.5">Max Participants</label>
                        <input
                            type="number"
                            value={maxParticipants}
                            onChange={(e) => setMaxParticipants(e.target.value)}
                            placeholder="10"
                            min="2"
                            className="input-field w-32"
                        />
                    </div>
                )}

                {/* Duration */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Duration
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {DURATIONS.map(d => (
                            <button
                                key={d}
                                onClick={() => setDuration(d)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${duration === d
                                        ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-400'
                                        : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
                                    }`}
                            >
                                {d} min
                            </button>
                        ))}
                    </div>
                </div>

                {/* Platform */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Meeting Platform</label>
                    <div className="grid grid-cols-2 gap-2">
                        {PLATFORMS.map(p => (
                            <button
                                key={p.value}
                                onClick={() => setPlatform(p.value)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${platform === p.value
                                        ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-400'
                                        : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
                                    }`}
                            >
                                <p.icon className="w-4 h-4" />
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Meeting Link */}
                {(platform === 'google_meet' || platform === 'zoom') && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1.5">Meeting Link <span className="text-gray-400 font-normal">(optional)</span></label>
                        <input
                            type="url"
                            value={meetingLink}
                            onChange={(e) => setMeetingLink(e.target.value)}
                            placeholder="https://meet.google.com/abc-defg-hij"
                            className="input-field"
                        />
                        <p className="text-xs text-gray-400 mt-1">You can add this later for each booking</p>
                    </div>
                )}
            </div>

            {/* Availability */}
            <div className="card animate-in-delay-2">
                <h2 className="text-lg font-semibold mb-1">Weekly Availability</h2>
                <p className="text-sm text-gray-500 mb-4">Set your available days and times for bookings</p>

                {availability.length === 0 ? (
                    <p className="text-sm text-gray-400 mb-3">No availability set. Add your available time slots.</p>
                ) : (
                    <div className="space-y-2 mb-4">
                        {availability.map((slot, index) => (
                            <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                                <select
                                    value={slot.day_of_week}
                                    onChange={(e) => updateAvailability(index, 'day_of_week', parseInt(e.target.value))}
                                    className="text-sm bg-white border border-gray-200 rounded-lg px-2 py-1.5"
                                >
                                    {DAYS.map((day, i) => (
                                        <option key={i} value={i}>{day}</option>
                                    ))}
                                </select>
                                <input
                                    type="time"
                                    value={slot.start_time}
                                    onChange={(e) => updateAvailability(index, 'start_time', e.target.value)}
                                    className="text-sm bg-white border border-gray-200 rounded-lg px-2 py-1.5"
                                />
                                <span className="text-xs text-gray-400">to</span>
                                <input
                                    type="time"
                                    value={slot.end_time}
                                    onChange={(e) => updateAvailability(index, 'end_time', e.target.value)}
                                    className="text-sm bg-white border border-gray-200 rounded-lg px-2 py-1.5"
                                />
                                <button onClick={() => removeAvailability(index)} className="text-red-400 hover:text-red-600 p-1 ml-auto">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <button onClick={addAvailability} className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Time Slot
                </button>

                {/* Booking Rules */}
                <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-[#8E8E9F] mb-1">Buffer between sessions</label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                value={bufferMinutes}
                                onChange={(e) => setBufferMinutes(e.target.value)}
                                placeholder="15"
                                min="0"
                                className="input-field text-sm w-20 py-2"
                            />
                            <span className="text-xs text-gray-400">min</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[#8E8E9F] mb-1">Book up to</label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                value={advanceBookingDays}
                                onChange={(e) => setAdvanceBookingDays(e.target.value)}
                                placeholder="30"
                                min="1"
                                className="input-field text-sm w-20 py-2"
                            />
                            <span className="text-xs text-gray-400">days ahead</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[#8E8E9F] mb-1">Minimum notice</label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                value={minNoticeHours}
                                onChange={(e) => setMinNoticeHours(e.target.value)}
                                placeholder="24"
                                min="1"
                                className="input-field text-sm w-20 py-2"
                            />
                            <span className="text-xs text-gray-400">hours</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pricing */}
            <div className="card animate-in-delay-3">
                <h2 className="text-lg font-semibold mb-4">Pricing</h2>
                <div>
                    <label className="block text-sm font-medium mb-1.5">Price per Session <span className="text-red-500">*</span></label>
                    <div className="flex">
                        <span className="bg-gray-50 px-4 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500 font-semibold">₹</span>
                        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="999" min="1" className="input-field rounded-l-none" />
                    </div>
                </div>
                <div className="mt-4">
                    <label className="block text-sm font-medium mb-1.5">Compare at Price <span className="text-gray-400 font-normal">(optional)</span></label>
                    <div className="flex">
                        <span className="bg-gray-50 px-4 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500 font-semibold">₹</span>
                        <input type="number" value={comparePrice} onChange={(e) => setComparePrice(e.target.value)} placeholder="1999" min="0" className="input-field rounded-l-none" />
                    </div>
                </div>
            </div>
        </div>
    )
}
