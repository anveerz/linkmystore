'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ExternalLink, Loader2, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  PITCH_ANGLE_LIBRARY,
  scoreCreatorLead,
  type AudienceRegion,
  type CreatorLeadInput,
  type CreatorLeadNiche,
} from '@/lib/growth/creator-lead-scoring'

type LeadStatus = 'new' | 'shortlisted' | 'contacted' | 'replied' | 'interested' | 'won' | 'lost' | 'ignored'
type LeadTier = 'ideal' | 'strong' | 'possible' | 'low'

type LeadSignals = {
  postsReelsOften: boolean
  promotesBrandProducts: boolean
  promotesAffiliateProducts: boolean
  sellsOwnProducts: boolean
  hasDigitalProductPotential: boolean
  hasPhysicalProductPotential: boolean
  bioHasOrderIntent: boolean
  bioHasStoreLink: boolean
  bioHasAffiliateCodes: boolean
  bioHasWhatsAppOrderFlow: boolean
  highlightsShowCatalog: boolean
  highlightsShowTestimonials: boolean
  highlightsShowPricing: boolean
  usesDMsForOrders: boolean
  usesMarketplaceOnly: boolean
  hasExistingStandaloneStore: boolean
}

type LeadRow = {
  id: string
  owner_user_id: string
  platform: 'instagram'
  handle: string
  display_name?: string | null
  profile_url?: string | null
  niche?: string | null
  audience_region: AudienceRegion
  follower_count?: number | null
  average_reel_views?: number | null
  status: LeadStatus
  tier: LeadTier
  score: number
  pitch_angles: string[]
  reasons: string[]
  notes?: string | null
  last_contacted_at?: string | null
  signals?: Record<string, boolean> | null
  created_at: string
  updated_at: string
}

type LeadFormState = LeadSignals & {
  handle: string
  displayName: string
  profileUrl: string
  niche: CreatorLeadNiche | ''
  audienceRegion: AudienceRegion
  followerCount: string
  averageReelViews: string
  status: LeadStatus
  notes: string
}

const STATUS_OPTIONS: LeadStatus[] = ['new', 'shortlisted', 'contacted', 'replied', 'interested', 'won', 'lost', 'ignored']
const TIER_OPTIONS: Array<'all' | LeadTier> = ['all', 'ideal', 'strong', 'possible', 'low']
const NICHE_OPTIONS: CreatorLeadNiche[] = ['fashion', 'beauty', 'lifestyle', 'fitness', 'education', 'business', 'digital-products', 'food', 'home', 'parenting', 'local-business', 'other']
const AUDIENCE_OPTIONS: AudienceRegion[] = ['india', 'mixed', 'global']
const SIGNAL_FIELDS: Array<{ key: keyof LeadSignals; label: string }> = [
  { key: 'postsReelsOften', label: 'Posts reels often' },
  { key: 'promotesBrandProducts', label: 'Promotes brand products' },
  { key: 'promotesAffiliateProducts', label: 'Promotes affiliate products' },
  { key: 'sellsOwnProducts', label: 'Sells own products' },
  { key: 'hasDigitalProductPotential', label: 'Digital-product potential' },
  { key: 'hasPhysicalProductPotential', label: 'Physical-product potential' },
  { key: 'bioHasOrderIntent', label: 'Bio shows order intent' },
  { key: 'bioHasStoreLink', label: 'Already has store link' },
  { key: 'bioHasAffiliateCodes', label: 'Bio includes affiliate codes' },
  { key: 'bioHasWhatsAppOrderFlow', label: 'Uses WhatsApp for orders' },
  { key: 'highlightsShowCatalog', label: 'Highlights show catalog' },
  { key: 'highlightsShowTestimonials', label: 'Highlights show proof' },
  { key: 'highlightsShowPricing', label: 'Highlights show pricing' },
  { key: 'usesDMsForOrders', label: 'Uses DMs for orders' },
  { key: 'usesMarketplaceOnly', label: 'Marketplace-only links' },
  { key: 'hasExistingStandaloneStore', label: 'Already has standalone store' },
]

const DEFAULT_SIGNALS: LeadSignals = {
  postsReelsOften: true,
  promotesBrandProducts: false,
  promotesAffiliateProducts: false,
  sellsOwnProducts: false,
  hasDigitalProductPotential: false,
  hasPhysicalProductPotential: true,
  bioHasOrderIntent: false,
  bioHasStoreLink: false,
  bioHasAffiliateCodes: false,
  bioHasWhatsAppOrderFlow: false,
  highlightsShowCatalog: false,
  highlightsShowTestimonials: false,
  highlightsShowPricing: false,
  usesDMsForOrders: false,
  usesMarketplaceOnly: false,
  hasExistingStandaloneStore: false,
}

const EMPTY_FORM: LeadFormState = {
  handle: '',
  displayName: '',
  profileUrl: '',
  niche: '',
  audienceRegion: 'india',
  followerCount: '',
  averageReelViews: '',
  status: 'new',
  notes: '',
  ...DEFAULT_SIGNALS,
}

function normalizeHandle(value: string) {
  return value.trim().replace(/^@+/, '').toLowerCase()
}

function compactNumber(value: number | null | undefined) {
  if (!value || value <= 0) return '—'
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function buildLeadInput(form: LeadFormState): CreatorLeadInput {
  return {
    niche: form.niche || undefined,
    followerCount: form.followerCount ? Number(form.followerCount) : null,
    averageReelViews: form.averageReelViews ? Number(form.averageReelViews) : null,
    audienceRegion: form.audienceRegion,
    postsReelsOften: form.postsReelsOften,
    promotesBrandProducts: form.promotesBrandProducts,
    promotesAffiliateProducts: form.promotesAffiliateProducts,
    sellsOwnProducts: form.sellsOwnProducts,
    hasDigitalProductPotential: form.hasDigitalProductPotential,
    hasPhysicalProductPotential: form.hasPhysicalProductPotential,
    bioHasOrderIntent: form.bioHasOrderIntent,
    bioHasStoreLink: form.bioHasStoreLink,
    bioHasAffiliateCodes: form.bioHasAffiliateCodes,
    bioHasWhatsAppOrderFlow: form.bioHasWhatsAppOrderFlow,
    highlightsShowCatalog: form.highlightsShowCatalog,
    highlightsShowTestimonials: form.highlightsShowTestimonials,
    highlightsShowPricing: form.highlightsShowPricing,
    usesDMsForOrders: form.usesDMsForOrders,
    usesMarketplaceOnly: form.usesMarketplaceOnly,
    hasExistingStandaloneStore: form.hasExistingStandaloneStore,
  }
}

function formFromLead(lead: LeadRow): LeadFormState {
  return {
    handle: lead.handle,
    displayName: lead.display_name || '',
    profileUrl: lead.profile_url || '',
    niche: (lead.niche as CreatorLeadNiche | null) || '',
    audienceRegion: lead.audience_region,
    followerCount: lead.follower_count ? String(lead.follower_count) : '',
    averageReelViews: lead.average_reel_views ? String(lead.average_reel_views) : '',
    status: lead.status,
    notes: lead.notes || '',
    ...DEFAULT_SIGNALS,
    ...(lead.signals || {}),
  }
}

export default function InternalOutreachClient() {
  const supabase = useMemo(() => createClient(), [])
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [tierFilter, setTierFilter] = useState<'all' | LeadTier>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all')
  const [showEditor, setShowEditor] = useState(false)
  const [editingLead, setEditingLead] = useState<LeadRow | null>(null)
  const [form, setForm] = useState<LeadFormState>(EMPTY_FORM)

  const preview = useMemo(() => scoreCreatorLead(buildLeadInput(form)), [form])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Please log in again.')
      setOwnerUserId(user.id)

      const { data, error } = await supabase
        .from('internal_outreach_leads')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('score', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeads((data || []) as LeadRow[])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load internal outreach')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredLeads = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return leads.filter((lead) => {
      const matchesSearch = !query || lead.handle.toLowerCase().includes(query) || (lead.display_name || '').toLowerCase().includes(query) || (lead.notes || '').toLowerCase().includes(query)
      const matchesTier = tierFilter === 'all' || lead.tier === tierFilter
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
      return matchesSearch && matchesTier && matchesStatus
    })
  }, [leads, searchTerm, tierFilter, statusFilter])

  const resetEditor = () => {
    setEditingLead(null)
    setForm(EMPTY_FORM)
    setShowEditor(false)
  }

  const saveLead = async () => {
    if (!ownerUserId) return toast.error('Refresh and try again.')
    const handle = normalizeHandle(form.handle)
    if (!handle) return toast.error('Instagram handle is required.')

    const result = scoreCreatorLead(buildLeadInput(form))
    const now = new Date().toISOString()
    const payload = {
      owner_user_id: ownerUserId,
      platform: 'instagram' as const,
      handle,
      display_name: form.displayName.trim() || null,
      profile_url: form.profileUrl.trim() || `https://instagram.com/${handle}`,
      niche: form.niche || null,
      audience_region: form.audienceRegion,
      follower_count: form.followerCount ? Number(form.followerCount) : null,
      average_reel_views: form.averageReelViews ? Number(form.averageReelViews) : null,
      status: form.status,
      tier: result.tier,
      score: result.score,
      pitch_angles: result.pitchAngles,
      reasons: result.reasons,
      notes: form.notes.trim() || null,
      last_contacted_at: ['contacted', 'replied', 'interested', 'won'].includes(form.status) ? editingLead?.last_contacted_at || now : editingLead?.last_contacted_at || null,
      signals: SIGNAL_FIELDS.reduce<Record<string, boolean>>((acc, field) => {
        acc[field.key] = form[field.key]
        return acc
      }, {}),
      scoring_breakdown: result.breakdown,
      updated_at: now,
    }

    try {
      setSaving(true)
      if (editingLead) {
        const { data, error } = await supabase.from('internal_outreach_leads').update(payload).eq('id', editingLead.id).select('*').single()
        if (error) throw error
        setLeads((current) => current.map((lead) => (lead.id === editingLead.id ? (data as LeadRow) : lead)))
      } else {
        const { data, error } = await supabase.from('internal_outreach_leads').insert(payload).select('*').single()
        if (error) throw error
        setLeads((current) => [data as LeadRow, ...current].sort((a, b) => b.score - a.score))
      }
      toast.success(editingLead ? 'Lead updated' : 'Lead added')
      resetEditor()
    } catch (error) {
      const duplicate = typeof error === 'object' && error && 'code' in error && (error as { code?: string }).code === '23505'
      toast.error(duplicate ? 'That handle is already saved here.' : error instanceof Error ? error.message : 'Failed to save lead')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (lead: LeadRow, status: LeadStatus) => {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('internal_outreach_leads')
      .update({
        status,
        updated_at: now,
        last_contacted_at: ['contacted', 'replied', 'interested', 'won'].includes(status) ? lead.last_contacted_at || now : lead.last_contacted_at || null,
      })
      .eq('id', lead.id)
      .select('*')
      .single()

    if (error) return toast.error(error.message || 'Failed to update status')
    setLeads((current) => current.map((row) => (row.id === lead.id ? (data as LeadRow) : row)))
  }

  const removeLead = async (lead: LeadRow) => {
    if (!confirm(`Remove @${lead.handle}?`)) return
    const { error } = await supabase.from('internal_outreach_leads').delete().eq('id', lead.id)
    if (error) return toast.error(error.message || 'Failed to remove lead')
    setLeads((current) => current.filter((row) => row.id !== lead.id))
  }

  if (loading) {
    return <div className="page-shell flex min-h-screen items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#4f7cff]" /></div>
  }

  return (
    <>
      <div className="page-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-[28px] border border-[#d8e1f7] bg-[linear-gradient(180deg,#fcfdff_0%,#f2f6ff_100%)] p-6 shadow-[0_18px_42px_rgba(79,124,255,0.08)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#4f7cff]">Internal only</p>
                <h1 className="mt-2 text-3xl font-bold text-[#111a38]">Outreach CRM</h1>
                <p className="mt-2 max-w-3xl text-sm text-[#5f6c87]">Private creator acquisition workspace for LinkMyStore. This route is not exposed inside seller dashboards.</p>
              </div>
              <div className="flex gap-2">
                <Link href="/dashboard" className="btn-secondary inline-flex items-center px-4 py-3 text-sm font-semibold">Back to dashboard</Link>
                <button type="button" onClick={() => setShowEditor(true)} className="btn-primary inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold"><Plus className="h-4 w-4" /> Add lead</button>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#d8e1f7] bg-white p-4 shadow-[0_14px_32px_rgba(79,124,255,0.06)]">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8da0c5]" />
                <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search handle, name, or notes" className="w-full rounded-2xl border border-[#d8e1f7] bg-[#fbfcff] py-3 pl-10 pr-4 text-sm outline-none focus:border-[#4f7cff]" />
              </div>
              <select value={tierFilter} onChange={(event) => setTierFilter(event.target.value as 'all' | LeadTier)} className="rounded-2xl border border-[#d8e1f7] bg-[#fbfcff] px-4 py-3 text-sm outline-none">
                {TIER_OPTIONS.map((option) => <option key={option} value={option}>{option === 'all' ? 'All tiers' : option}</option>)}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | LeadStatus)} className="rounded-2xl border border-[#d8e1f7] bg-[#fbfcff] px-4 py-3 text-sm outline-none">
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>

          {filteredLeads.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[#cfdbfb] bg-[#f8fbff] px-6 py-16 text-center text-[#5f6c87]">No internal leads yet.</div>
          ) : (
            <div className="space-y-4">
              {filteredLeads.map((lead) => {
                const primaryAngle = lead.pitch_angles[0]
                const pitch = primaryAngle ? PITCH_ANGLE_LIBRARY[primaryAngle as keyof typeof PITCH_ANGLE_LIBRARY] : null
                return (
                  <div key={lead.id} className="rounded-[24px] border border-[#d8e1f7] bg-white p-5 shadow-[0_14px_34px_rgba(79,124,255,0.05)]">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${lead.tier === 'ideal' ? 'bg-[linear-gradient(125deg,#4f7cff_0%,#7a5dff_100%)] text-white' : 'bg-[#eef4ff] text-[#3559d1]'}`}>{lead.tier.toUpperCase()} • {lead.score}/100</span>
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{lead.status}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <h2 className="text-2xl font-bold text-[#111a38]">{lead.display_name || `@${lead.handle}`}</h2>
                          <span className="text-sm text-[#5f6c87]">@{lead.handle}</span>
                          {lead.profile_url ? <Link href={lead.profile_url} target="_blank" className="inline-flex items-center gap-1 text-sm font-medium text-[#4f7cff]">View profile <ExternalLink className="h-3.5 w-3.5" /></Link> : null}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3 text-sm text-[#5f6c87]">
                          <span>Followers: <strong className="text-[#111a38]">{compactNumber(lead.follower_count)}</strong></span>
                          <span>Reel views: <strong className="text-[#111a38]">{compactNumber(lead.average_reel_views)}</strong></span>
                          <span>Audience: <strong className="text-[#111a38]">{lead.audience_region}</strong></span>
                        </div>
                        {pitch ? <div className="mt-4 rounded-2xl border border-[#d9e4ff] bg-[#f7f9ff] px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4f7cff]">Best angle</p><p className="mt-2 text-sm font-semibold text-[#111a38]">{pitch.headline}</p></div> : null}
                        {lead.notes ? <p className="mt-4 text-sm leading-6 text-[#47546f]">{lead.notes}</p> : null}
                      </div>
                      <div className="flex w-full flex-col gap-3 xl:w-[240px]">
                        <select value={lead.status} onChange={(event) => void updateStatus(lead, event.target.value as LeadStatus)} className="rounded-2xl border border-[#d8e1f7] bg-[#fbfcff] px-4 py-3 text-sm outline-none">
                          {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setEditingLead(lead); setForm(formFromLead(lead)); setShowEditor(true) }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#d8e1f7] bg-white px-4 py-2.5 text-sm font-semibold text-[#111a38] hover:bg-[#f7f9ff]"><PencilLine className="h-4 w-4" /> Edit</button>
                          <button type="button" onClick={() => void removeLead(lead)} className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showEditor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09112e]/55 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-[30px] border border-[#d8e1f7] bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.28)]">
            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4f7cff]">{editingLead ? 'Edit lead' : 'New lead'}</p>
                    <h2 className="mt-2 text-2xl font-bold text-[#111a38]">{editingLead ? `Update @${editingLead.handle}` : 'Add an internal outreach lead'}</h2>
                  </div>
                  <button type="button" onClick={() => { resetForm() }} className="rounded-full border border-[#d8e1f7] px-3 py-1.5 text-sm font-medium text-[#5f6c87]">Close</button>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Field label="Instagram handle"><input value={form.handle} onChange={(event) => setForm((current) => ({ ...current, handle: event.target.value }))} className="w-full rounded-2xl border border-[#d8e1f7] bg-[#fbfcff] px-4 py-3 text-sm outline-none" /></Field>
                  <Field label="Display name"><input value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} className="w-full rounded-2xl border border-[#d8e1f7] bg-[#fbfcff] px-4 py-3 text-sm outline-none" /></Field>
                  <Field label="Profile URL"><input value={form.profileUrl} onChange={(event) => setForm((current) => ({ ...current, profileUrl: event.target.value }))} className="w-full rounded-2xl border border-[#d8e1f7] bg-[#fbfcff] px-4 py-3 text-sm outline-none" /></Field>
                  <Field label="Niche"><select value={form.niche} onChange={(event) => setForm((current) => ({ ...current, niche: event.target.value as CreatorLeadNiche | '' }))} className="w-full rounded-2xl border border-[#d8e1f7] bg-[#fbfcff] px-4 py-3 text-sm outline-none"><option value="">Select niche</option>{NICHE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
                  <Field label="Follower count"><input value={form.followerCount} onChange={(event) => setForm((current) => ({ ...current, followerCount: event.target.value.replace(/[^\d]/g, '') }))} className="w-full rounded-2xl border border-[#d8e1f7] bg-[#fbfcff] px-4 py-3 text-sm outline-none" /></Field>
                  <Field label="Average reel views"><input value={form.averageReelViews} onChange={(event) => setForm((current) => ({ ...current, averageReelViews: event.target.value.replace(/[^\d]/g, '') }))} className="w-full rounded-2xl border border-[#d8e1f7] bg-[#fbfcff] px-4 py-3 text-sm outline-none" /></Field>
                  <Field label="Audience region"><select value={form.audienceRegion} onChange={(event) => setForm((current) => ({ ...current, audienceRegion: event.target.value as AudienceRegion }))} className="w-full rounded-2xl border border-[#d8e1f7] bg-[#fbfcff] px-4 py-3 text-sm outline-none">{AUDIENCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
                  <Field label="Status"><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as LeadStatus }))} className="w-full rounded-2xl border border-[#d8e1f7] bg-[#fbfcff] px-4 py-3 text-sm outline-none">{STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
                </div>
                <Field label="Notes"><textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={4} className="mt-2 w-full rounded-2xl border border-[#d8e1f7] bg-[#fbfcff] px-4 py-3 text-sm outline-none" /></Field>
                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {SIGNAL_FIELDS.map((field) => (
                    <label key={field.key} className="flex items-center gap-3 rounded-2xl border border-[#d8e1f7] bg-[#fbfcff] px-4 py-3 text-sm text-[#111a38]">
                      <input type="checkbox" checked={form[field.key]} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.checked }))} className="h-4 w-4 rounded border-[#cfdcfb] text-[#4f7cff]" />
                      {field.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-[#d8e1f7] bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4f7cff]">Live scoring</p>
                <div className="mt-4 flex items-end gap-2"><span className="text-4xl font-bold text-[#111a38]">{preview.score}</span><span className="pb-1 text-sm text-[#5f6c87]">/100</span></div>
                <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${preview.tier === 'ideal' ? 'bg-[linear-gradient(125deg,#4f7cff_0%,#7a5dff_100%)] text-white' : 'bg-[#eef4ff] text-[#3559d1]'}`}>{preview.tier.toUpperCase()} fit</div>
                {preview.pitchAngles.length > 0 ? <div className="mt-5 rounded-2xl border border-[#d8e1f7] bg-white px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da0c5]">Best angle</p><p className="mt-2 text-sm font-semibold text-[#111a38]">{PITCH_ANGLE_LIBRARY[preview.pitchAngles[0]].headline}</p></div> : null}
                {preview.reasons.length > 0 ? <div className="mt-5 flex flex-wrap gap-2">{preview.reasons.slice(0, 4).map((reason) => <span key={reason} className="inline-flex rounded-full bg-white px-3 py-1 text-xs text-[#5f6c87]">{reason}</span>)}</div> : null}
                <div className="mt-6 flex gap-2">
                  <button type="button" onClick={() => { resetForm() }} className="btn-secondary flex-1 py-3 text-sm font-semibold">Cancel</button>
                  <button type="button" onClick={() => void saveLead()} disabled={saving} className="btn-primary flex-1 py-3 text-sm font-semibold disabled:opacity-70">{saving ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span> : editingLead ? 'Save changes' : 'Save lead'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )

  function resetForm() {
    setEditingLead(null)
    setForm(EMPTY_FORM)
    setShowEditor(false)
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="mt-4 block"><span className="mb-2 block text-sm font-semibold text-[#111a38]">{label}</span>{children}</label>
}
