'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Mail, Download } from 'lucide-react'
import type { LeadCapture } from '@/types'
import toast from 'react-hot-toast'

export default function LeadsPage() {
    const [leads, setLeads] = useState<LeadCapture[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = useMemo(() => createClient(), [])

    const fetchLeads = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: creatorData } = await supabase.from('creators').select('*').eq('user_id', user.id).single()
            if (!creatorData) return

            const { data } = await supabase
                .from('lead_captures')
                .select('*')
                .eq('creator_id', creatorData.id)
                .order('created_at', { ascending: false })

            setLeads(data || [])
        } catch (e) {
            console.error('Error fetching leads:', e)
            toast.error('Failed to load leads')
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        void fetchLeads()
    }, [fetchLeads])

    const exportCSV = () => {
        if (leads.length === 0) { toast.error('No leads to export'); return }
        const header = 'Name,Email,Phone,Date\n'
        const rows = leads.map(l =>
            `"${l.name}","${l.email}","${l.phone || ''}","${new Date(l.created_at).toLocaleDateString('en-IN')}"`
        ).join('\n')
        const blob = new Blob([header + rows], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('CSV downloaded! 📋')
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-32 bg-gray-100 rounded-lg animate-pulse" />
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-[#1A1A2E]">Leads</h1>
                    <span className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-700 text-xs font-semibold px-3 py-1 rounded-full">
                        {leads.length}
                    </span>
                </div>
                {leads.length > 0 && (
                    <button onClick={exportCSV} className="btn-secondary py-2 px-4 text-sm flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                )}
            </div>

            {leads.length === 0 ? (
                <div className="card py-16 text-center">
                    <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-400">No leads yet</h3>
                    <p className="text-sm text-gray-300 mt-1">Create a lead magnet product to start capturing emails</p>
                </div>
            ) : (
                <div className="card p-0 overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50 text-xs font-semibold text-[#8E8E9F] uppercase tracking-wider border-b border-gray-100">
                        <div className="col-span-4">Name</div>
                        <div className="col-span-4">Email</div>
                        <div className="col-span-2">Phone</div>
                        <div className="col-span-2">Date</div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-gray-50">
                        {leads.map(lead => (
                            <div key={lead.id} className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-gray-50/50 transition-colors">
                                <div className="col-span-4 flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center text-[10px] font-bold text-pink-600">
                                        {lead.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium truncate">{lead.name}</span>
                                </div>
                                <div className="col-span-4">
                                    <span className="text-sm text-gray-600 truncate flex items-center gap-1">
                                        <Mail className="w-3 h-3 text-gray-300" />
                                        {lead.email}
                                    </span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-sm text-gray-500">
                                        {lead.phone || '—'}
                                    </span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-xs text-gray-400">
                                        {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
