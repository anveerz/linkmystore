'use client'

import { Plus, X, Loader2, Sparkles, Video, Phone, Trash2 } from 'lucide-react'
import type { AvailabilitySlot, MeetingPlatform } from '@/types'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const PLATFORMS: { value: MeetingPlatform; label: string; icon: React.ElementType }[] = [
  { value: 'google_meet', label: 'Google Meet', icon: Video },
  { value: 'zoom', label: 'Zoom', icon: Video },
  { value: 'whatsapp_call', label: 'WhatsApp Call', icon: Phone },
  { value: 'phone', label: 'Phone Call', icon: Phone },
]

interface DurationOptionRow {
  id: string
  durationMinutes: string
  price: string
  label: string
}

interface CoachingFormProps {
  title: string
  setTitle: (v: string) => void
  description: string
  setDescription: (v: string) => void
  durationOptions: DurationOptionRow[]
  setDurationOptions: (v: DurationOptionRow[]) => void
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
  title,
  setTitle,
  description,
  setDescription,
  durationOptions,
  setDurationOptions,
  platform,
  setPlatform,
  meetingLink,
  setMeetingLink,
  availability,
  setAvailability,
  bufferMinutes,
  setBufferMinutes,
  advanceBookingDays,
  setAdvanceBookingDays,
  minNoticeHours,
  setMinNoticeHours,
  onGenerateAI,
  aiLoading,
}: CoachingFormProps) {
  const addAvailability = () => {
    setAvailability([...availability, { day_of_week: 1, start_time: '09:00', end_time: '17:00' }])
  }

  const updateAvailability = (index: number, field: keyof AvailabilitySlot, value: AvailabilitySlot[keyof AvailabilitySlot]) => {
    setAvailability(availability.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot)))
  }

  const removeAvailability = (index: number) => {
    setAvailability(availability.filter((_, i) => i !== index))
  }

  const addDurationOption = () => {
    setDurationOptions([
      ...durationOptions,
      {
        id: Math.random().toString(36).slice(2, 10),
        durationMinutes: '',
        price: '',
        label: '',
      },
    ])
  }

  const updateDurationOption = (id: string, field: keyof DurationOptionRow, value: string) => {
    setDurationOptions(durationOptions.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  const removeDurationOption = (id: string) => {
    setDurationOptions(durationOptions.filter((row) => row.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="card animate-in">
        <h2 className="text-lg font-semibold mb-4">Counselling Details</h2>
        <div>
          <label className="block text-sm font-medium mb-1.5">Session Title <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g., 1-on-1 Counselling"
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
              {aiLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><Sparkles className="w-3.5 h-3.5" /> Generate with AI</>}
            </button>
          </div>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What will the session cover?"
            rows={4}
            className="input-field resize-none"
          />
        </div>
      </div>

      <div className="card animate-in-delay-1">
        <h2 className="text-lg font-semibold mb-1">Duration Packages</h2>
        <p className="text-sm text-gray-500 mb-4">Add one or more packages. First package price is used as base listing price.</p>

        <div className="space-y-3">
          {durationOptions.map((row) => (
            <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[120px_140px_1fr_auto] gap-2 items-center">
              <input
                type="number"
                min="5"
                value={row.durationMinutes}
                onChange={(event) => updateDurationOption(row.id, 'durationMinutes', event.target.value)}
                className="input-field"
                placeholder="Minutes"
              />
              <input
                type="number"
                min="1"
                value={row.price}
                onChange={(event) => updateDurationOption(row.id, 'price', event.target.value)}
                className="input-field"
                placeholder="Price (INR)"
              />
              <input
                value={row.label}
                onChange={(event) => updateDurationOption(row.id, 'label', event.target.value)}
                className="input-field"
                placeholder="Label (optional, e.g. Deep Dive)"
              />
              <button type="button" onClick={() => removeDurationOption(row.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <button type="button" onClick={addDurationOption} className="btn-secondary mt-3 inline-flex items-center gap-2 text-sm px-4 py-2">
          <Plus className="w-4 h-4" /> Add Duration Package
        </button>
      </div>

      <div className="card animate-in-delay-2">
        <h2 className="text-lg font-semibold mb-4">Meeting Setup</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Meeting Platform</label>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPlatform(item.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                  platform === item.value
                    ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-400'
                    : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {(platform === 'google_meet' || platform === 'zoom') && (
          <div>
            <label className="block text-sm font-medium mb-1.5">Meeting Link <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="url"
              value={meetingLink}
              onChange={(event) => setMeetingLink(event.target.value)}
              placeholder="https://meet.google.com/..."
              className="input-field"
            />
            <p className="text-xs text-gray-400 mt-1">Used for confirmed paid bookings only.</p>
          </div>
        )}
      </div>

      <div className="card animate-in-delay-3">
        <h2 className="text-lg font-semibold mb-1">Weekly Availability</h2>
        <p className="text-sm text-gray-500 mb-4">Set your available days and times for bookings</p>

        {availability.length > 0 && (
          <div className="space-y-2 mb-4">
            {availability.map((slot, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                <select value={slot.day_of_week} onChange={(event) => updateAvailability(index, 'day_of_week', parseInt(event.target.value, 10))} className="text-sm bg-white border border-gray-200 rounded-lg px-2 py-1.5">
                  {DAYS.map((day, i) => <option key={i} value={i}>{day}</option>)}
                </select>
                <input type="time" value={slot.start_time} onChange={(event) => updateAvailability(index, 'start_time', event.target.value)} className="text-sm bg-white border border-gray-200 rounded-lg px-2 py-1.5" />
                <span className="text-xs text-gray-400">to</span>
                <input type="time" value={slot.end_time} onChange={(event) => updateAvailability(index, 'end_time', event.target.value)} className="text-sm bg-white border border-gray-200 rounded-lg px-2 py-1.5" />
                <button onClick={() => removeAvailability(index)} className="text-red-400 hover:text-red-600 p-1 ml-auto"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}

        <button onClick={addAvailability} className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Add Time Slot</button>

        <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input type="number" value={bufferMinutes} onChange={(event) => setBufferMinutes(event.target.value)} className="input-field" placeholder="Buffer min" />
          <input type="number" value={advanceBookingDays} onChange={(event) => setAdvanceBookingDays(event.target.value)} className="input-field" placeholder="Days ahead" />
          <input type="number" value={minNoticeHours} onChange={(event) => setMinNoticeHours(event.target.value)} className="input-field" placeholder="Notice hours" />
        </div>
      </div>
    </div>
  )
}
