'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, Bot, Loader2, MessageCircle, Save, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import type { InstagramAutomationSettings, InstagramDmLog, Product } from '@/types'

interface SettingsForm {
  enabled: boolean
  ig_business_account_id: string
  page_access_token: string
  trigger_keywords: string
  dm_template: string
  default_product_id: string
}

const DEFAULT_TEMPLATE = 'Hey! Here is your link: {product_link}'

export default function AutomationsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testRecipient, setTestRecipient] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [logs, setLogs] = useState<InstagramDmLog[]>([])
  const [form, setForm] = useState<SettingsForm>({
    enabled: false,
    ig_business_account_id: '',
    page_access_token: '',
    trigger_keywords: 'link',
    dm_template: DEFAULT_TEMPLATE,
    default_product_id: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!creator) return

      const [settingsResponse, productsResponse, logsResponse] = await Promise.all([
        fetch('/api/instagram/automation'),
        supabase
          .from('products')
          .select('id,title,creator_id,type,price,images,variants,sort_order,created_at,is_active')
          .eq('creator_id', creator.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('instagram_dm_logs')
          .select('*')
          .eq('creator_id', creator.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      const settingsPayload = await settingsResponse.json()
      if (settingsResponse.ok) {
        const settings = settingsPayload.settings as InstagramAutomationSettings
        setForm({
          enabled: Boolean(settings.enabled),
          ig_business_account_id: settings.ig_business_account_id || '',
          page_access_token: settings.page_access_token || '',
          trigger_keywords: settings.trigger_keywords?.join(', ') || 'link',
          dm_template: settings.dm_template || DEFAULT_TEMPLATE,
          default_product_id: settings.default_product_id || '',
        })
      }

      setProducts((productsResponse.data || []) as Product[])
      setLogs((logsResponse.data || []) as InstagramDmLog[])
    } catch (error) {
      console.error('Automations fetch error:', error)
      toast.error('Failed to load automation settings')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const saveSettings = async () => {
    setSaving(true)
    try {
      const triggerKeywords = form.trigger_keywords
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)

      const response = await fetch('/api/instagram/automation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: form.enabled,
          ig_business_account_id: form.ig_business_account_id.trim(),
          page_access_token: form.page_access_token.trim(),
          trigger_keywords: triggerKeywords,
          dm_template: form.dm_template.trim() || DEFAULT_TEMPLATE,
          default_product_id: form.default_product_id || null,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        toast.error(payload.error || 'Failed to save settings')
        return
      }

      toast.success('Instagram automation saved')
    } catch (error) {
      console.error('Automations save error:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const sendTestDm = async () => {
    if (!testRecipient.trim()) {
      toast.error('Enter recipient ID')
      return
    }

    setTesting(true)
    try {
      const response = await fetch('/api/instagram/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: testRecipient.trim() }),
      })
      const payload = await response.json()
      if (!response.ok) {
        toast.error(payload.error || 'Test DM failed')
        return
      }

      toast.success('Test DM sent')
      await fetchData()
    } catch (error) {
      console.error('Automations test error:', error)
      toast.error('Test DM failed')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-72 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Instagram Auto-DMs</h1>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${form.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {form.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      {/* Professional account requirement notice */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-800">
            Requires a Professional Instagram Account
          </p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Instagram&apos;s Messaging API only works with <strong>Business</strong> or <strong>Creator</strong> (professional) accounts.
            Personal accounts are blocked by Instagram and cannot receive or send automated DMs.
          </p>
          <p className="text-xs text-amber-700 leading-relaxed">
            <strong>How to switch (free, takes 2 minutes):</strong> Open Instagram app → Profile → ☰ Menu → Settings →
            Account → <em>Switch to Professional Account</em> → choose <em>Creator</em> or <em>Business</em>.
          </p>
          <a
            href="https://help.instagram.com/502981923235522"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs font-medium text-amber-800 underline underline-offset-2 mt-1"
          >
            Instagram Help: Switch to a Professional Account →
          </a>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#1A1A2E]">Automation Settings</p>
            <p className="text-xs text-[#8E8E9F] mt-0.5">
              Webhook URL: <span className="font-mono">/api/instagram/webhook</span>
            </p>
          </div>
          <button
            onClick={() => setForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
            className={`w-12 h-6 rounded-full transition-colors relative ${form.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${form.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <input
            type="text"
            value={form.ig_business_account_id}
            onChange={(e) => setForm((prev) => ({ ...prev, ig_business_account_id: e.target.value }))}
            placeholder="Instagram Business Account ID"
            className="input-field"
          />
          <input
            type="password"
            value={form.page_access_token}
            onChange={(e) => setForm((prev) => ({ ...prev, page_access_token: e.target.value }))}
            placeholder="Instagram Page Access Token"
            className="input-field"
          />
          <input
            type="text"
            value={form.trigger_keywords}
            onChange={(e) => setForm((prev) => ({ ...prev, trigger_keywords: e.target.value }))}
            placeholder="Trigger keywords (comma separated, e.g. link, price, buy)"
            className="input-field"
          />
          <textarea
            value={form.dm_template}
            onChange={(e) => setForm((prev) => ({ ...prev, dm_template: e.target.value }))}
            placeholder="DM template"
            rows={4}
            className="input-field resize-none"
          />
          <p className="text-xs text-[#8E8E9F]">
            Placeholders: <code>{'{product_link}'}</code>, <code>{'{store_link}'}</code>, <code>{'{store_name}'}</code>
          </p>
          <select
            value={form.default_product_id}
            onChange={(e) => setForm((prev) => ({ ...prev, default_product_id: e.target.value }))}
            className="input-field"
          >
            <option value="">Use latest active product link</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.title}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={saveSettings}
          disabled={saving}
          className="btn-primary inline-flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="card space-y-3">
        <p className="text-sm font-semibold text-[#1A1A2E] flex items-center gap-2">
          <Send className="w-4 h-4 text-[#E8651A]" />
          Send Test DM
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={testRecipient}
            onChange={(e) => setTestRecipient(e.target.value)}
            placeholder="Instagram recipient ID"
            className="input-field"
          />
          <button
            onClick={sendTestDm}
            disabled={testing}
            className="btn-secondary whitespace-nowrap inline-flex items-center justify-center gap-2"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            {testing ? 'Sending...' : 'Send Test'}
          </button>
        </div>
      </div>

      <div className="card">
        <p className="text-sm font-semibold text-[#1A1A2E] mb-3 flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#3D2176]" />
          Recent DM Logs
        </p>
        {logs.length === 0 ? (
          <p className="text-sm text-[#8E8E9F]">No DM activity yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono text-gray-500">{log.recipient_id || 'recipient'}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    log.status === 'sent'
                      ? 'bg-green-100 text-green-700'
                      : log.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}>
                    {log.status}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{log.trigger_text || log.error_message || '-'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
