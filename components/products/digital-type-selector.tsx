'use client'

import {
    FileDown,
    GraduationCap,
    UserCheck,
    CalendarPlus,
    Magnet,
    Crown,
    Video,
    Palette,
} from 'lucide-react'
import type { DigitalSubtype } from '@/types'

const DIGITAL_TYPES: {
    type: DigitalSubtype
    label: string
    emoji: string
    description: string
    icon: React.ElementType
    gradient: string
    borderColor: string
}[] = [
        {
            type: 'download',
            label: 'Digital Download',
            emoji: '📥',
            description: 'Sell PDFs, e-books, presets, templates & more',
            icon: FileDown,
            gradient: 'from-blue-500/10 to-blue-600/5',
            borderColor: 'border-blue-500',
        },
        {
            type: 'course',
            label: 'Online Course',
            emoji: '🎓',
            description: 'Build courses with modules, lessons & videos',
            icon: GraduationCap,
            gradient: 'from-purple-500/10 to-purple-600/5',
            borderColor: 'border-purple-500',
        },
        {
            type: 'coaching',
            label: '1-on-1 Coaching',
            emoji: '💬',
            description: 'Private counselling & coaching sessions with booking',
            icon: UserCheck,
            gradient: 'from-emerald-500/10 to-emerald-600/5',
            borderColor: 'border-emerald-500',
        },
        {
            type: 'calendar',
            label: 'Calendar Booking',
            emoji: '📅',
            description: 'Let clients book time slots with you',
            icon: CalendarPlus,
            gradient: 'from-orange-500/10 to-orange-600/5',
            borderColor: 'border-orange-500',
        },
        {
            type: 'lead_magnet',
            label: 'Lead Magnet',
            emoji: '🧲',
            description: 'Free download to capture emails & grow audience',
            icon: Magnet,
            gradient: 'from-pink-500/10 to-pink-600/5',
            borderColor: 'border-pink-500',
        },
        {
            type: 'membership',
            label: 'Membership',
            emoji: '⭐',
            description: 'Recurring subscriptions for exclusive content',
            icon: Crown,
            gradient: 'from-amber-500/10 to-amber-600/5',
            borderColor: 'border-amber-500',
        },
        {
            type: 'webinar',
            label: 'Webinar',
            emoji: '🎥',
            description: 'Host live or recorded webinar sessions',
            icon: Video,
            gradient: 'from-red-500/10 to-red-600/5',
            borderColor: 'border-red-500',
        },
        {
            type: 'template_library',
            label: 'Template Library',
            emoji: '🎨',
            description: 'Collection of design & social media templates',
            icon: Palette,
            gradient: 'from-indigo-500/10 to-indigo-600/5',
            borderColor: 'border-indigo-500',
        },
    ]

interface DigitalTypeSelectorProps {
    onSelect: (type: DigitalSubtype) => void
    selected?: DigitalSubtype
}

export default function DigitalTypeSelector({ onSelect, selected }: DigitalTypeSelectorProps) {
    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-[#1A1A2E]">What type of digital product?</h2>
                <p className="text-sm text-[#8E8E9F] mt-1">Choose the best fit for what you&apos;re offering</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DIGITAL_TYPES.map((item) => {
                    const isSelected = selected === item.type

                    return (
                        <button
                            key={item.type}
                            onClick={() => onSelect(item.type)}
                            className={`
                relative text-left rounded-2xl border-2 p-4 transition-all duration-200
                hover:shadow-md hover:-translate-y-0.5 cursor-pointer group
                ${isSelected
                                    ? `${item.borderColor} bg-gradient-to-br ${item.gradient} shadow-sm`
                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                }
              `}
                        >
                            {/* Selected indicator */}
                            {isSelected && (
                                <div className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center ${item.borderColor} bg-white`}>
                                    <div className={`w-2.5 h-2.5 rounded-full ${item.borderColor.replace('border-', 'bg-')}`} />
                                </div>
                            )}

                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                                    <span className="text-lg">{item.emoji}</span>
                                </div>
                                <div className="min-w-0">
                                    <div className="font-semibold text-sm text-[#1A1A2E]">{item.label}</div>
                                    <div className="text-xs text-[#8E8E9F] mt-0.5 leading-relaxed">{item.description}</div>
                                </div>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
