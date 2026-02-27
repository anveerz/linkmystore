'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Store,
  Landmark,
  Palette,
  Link as LinkIcon,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Creator } from '@/types'

const THEMES = [
  { id: 'default', name: 'Default', bg: 'bg-white', accent: 'bg-[#E8651A]' },
  { id: 'minimal', name: 'Minimal', bg: 'bg-white', accent: 'bg-gray-600' },
  { id: 'bold', name: 'Bold', bg: 'bg-gray-900', accent: 'bg-pink-500' },
  { id: 'elegant', name: 'Elegant', bg: 'bg-amber-50', accent: 'bg-amber-600' },
  { id: 'dark', name: 'Dark', bg: 'bg-gray-900', accent: 'bg-white' },
]

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [creator, setCreator] = useState<Creator | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  // Store Profile
  const [storeName, setStoreName] = useState('')
  const [bio, setBio] = useState('')
  const [instagramHandle, setInstagramHandle] = useState('')

  // Bank Details
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [upiId, setUpiId] = useState('')
  const [showAccountNumber, setShowAccountNumber] = useState(false)
  const [bankTab, setBankTab] = useState<'bank' | 'upi'>('bank')

  // Appearance
  const [selectedTheme, setSelectedTheme] = useState('default')
  const [accentColor, setAccentColor] = useState('#E8651A')
  const [announcementText, setAnnouncementText] = useState('')

  // Social Links
  const [instagram, setInstagram] = useState('')
  const [youtube, setYoutube] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [website, setWebsite] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: creatorData } = await supabase
        .from('creators')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!creatorData) return
      setCreator(creatorData)

      // Set profile fields
      setStoreName(creatorData.store_name || '')
      setBio(creatorData.bio || '')
      setInstagramHandle(creatorData.instagram_handle || '')

      // Set bank details
      if (creatorData.bank_account) {
        setAccountName(creatorData.bank_account.account_name || '')
        setAccountNumber(creatorData.bank_account.account_number || '')
        setConfirmAccountNumber(creatorData.bank_account.account_number || '')
        setIfscCode(creatorData.bank_account.ifsc || '')
        setUpiId(creatorData.bank_account.upi_id || '')
      }

      // Fetch settings
      const { data: settingsData } = await supabase
        .from('store_settings')
        .select('*')
        .eq('creator_id', creatorData.id)
        .single()

      if (settingsData) {
        setSelectedTheme(settingsData.theme || 'default')
        setAccentColor(settingsData.accent_color || '#E8651A')
        setAnnouncementText(settingsData.announcement_text || '')

        if (settingsData.social_links) {
          setInstagram(settingsData.social_links.instagram || '')
          setYoutube(settingsData.social_links.youtube || '')
          setWhatsapp(settingsData.social_links.whatsapp || '')
          setWebsite(settingsData.social_links.website || '')
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const saveStoreProfile = async () => {
    if (!creator) return
    setSaving('profile')

    try {
      const { error } = await supabase
        .from('creators')
        .update({
          store_name: storeName.trim(),
          bio: bio.trim() || null,
          instagram_handle: instagramHandle.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', creator.id)

      if (error) throw error

      toast.success('Store profile updated! 🎉')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save'
      toast.error(message)
    } finally {
      setSaving(null)
    }
  }

  const saveBankDetails = async () => {
    if (!creator) return

    // Validation
    if (bankTab === 'bank') {
      if (!accountName.trim()) {
        toast.error('Please enter account holder name')
        return
      }
      if (!accountNumber.trim()) {
        toast.error('Please enter account number')
        return
      }
      if (accountNumber !== confirmAccountNumber) {
        toast.error('Account numbers do not match')
        return
      }
      if (!ifscCode.trim()) {
        toast.error('Please enter IFSC code')
        return
      }
    } else {
      if (!upiId.trim()) {
        toast.error('Please enter UPI ID')
        return
      }
    }

    setSaving('bank')

    try {
      const bankAccount = bankTab === 'bank' ? {
        account_name: accountName.trim(),
        account_number: accountNumber.trim(),
        ifsc: ifscCode.trim(),
        upi_id: upiId.trim() || null,
      } : {
        account_name: accountName.trim() || null,
        account_number: accountNumber.trim() || null,
        ifsc: ifscCode.trim() || null,
        upi_id: upiId.trim(),
      }

      const { error } = await supabase
        .from('creators')
        .update({
          bank_account: bankAccount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', creator.id)

      if (error) throw error

      toast.success('Bank details saved! 🏦')
      fetchData()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save'
      toast.error(message)
    } finally {
      setSaving(null)
    }
  }

  const saveAppearance = async () => {
    if (!creator) return
    setSaving('appearance')

    try {
      const { error } = await supabase
        .from('store_settings')
        .update({
          theme: selectedTheme,
          accent_color: accentColor,
          announcement_text: announcementText.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('creator_id', creator.id)

      if (error) throw error

      toast.success('Appearance updated! ✨')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save'
      toast.error(message)
    } finally {
      setSaving(null)
    }
  }

  const saveSocialLinks = async () => {
    if (!creator) return
    setSaving('social')

    try {
      const { error } = await supabase
        .from('store_settings')
        .update({
          social_links: {
            instagram: instagram.trim() || null,
            youtube: youtube.trim() || null,
            whatsapp: whatsapp.trim() || null,
            website: website.trim() || null,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('creator_id', creator.id)

      if (error) throw error

      toast.success('Social links saved! 🔗')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save'
      toast.error(message)
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8651A]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Store Profile */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <Store className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold">Store Profile</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Store Name</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="input-field"
              placeholder="Your store name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Store URL</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">linkmystore.in/</span>
              <span className="font-medium">{creator?.store_slug}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Store URL cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              rows={3}
              className="input-field"
              placeholder="Tell visitors about your store..."
            />
            <p className="text-xs text-gray-400 mt-1">{bio.length}/200 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Instagram Handle</label>
            <div className="flex">
              <span className="bg-gray-50 px-3 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500">
                @
              </span>
              <input
                type="text"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                className="input-field rounded-l-none"
                placeholder="yourhandle"
              />
            </div>
          </div>

          <button
            onClick={saveStoreProfile}
            disabled={saving === 'profile'}
            className="btn-primary flex items-center gap-2"
          >
            {saving === 'profile' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bank Details */}
      <div className="card" id="bank">
        <div className="flex items-center gap-3 mb-6">
          <Landmark className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold">Bank Details</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Add your bank details to receive weekly payouts
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setBankTab('bank')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${bankTab === 'bank' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            Bank Account
          </button>
          <button
            onClick={() => setBankTab('upi')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${bankTab === 'upi' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            UPI ID
          </button>
        </div>

        <div className="space-y-4">
          {bankTab === 'bank' ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Account Holder Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="input-field"
                  placeholder="Name as per bank records"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Account Number</label>
                <div className="relative">
                  <input
                    type={showAccountNumber ? 'text' : 'password'}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="input-field pr-10"
                    placeholder="Enter account number"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccountNumber(!showAccountNumber)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showAccountNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Confirm Account Number</label>
                <input
                  type="password"
                  value={confirmAccountNumber}
                  onChange={(e) => setConfirmAccountNumber(e.target.value)}
                  className="input-field"
                  placeholder="Re-enter account number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">IFSC Code</label>
                <input
                  type="text"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  className="input-field"
                  placeholder="e.g., BARB0MUDHOL"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">UPI ID (optional)</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="input-field"
                  placeholder="yourname@upi"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1.5">UPI ID</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="input-field"
                placeholder="yourname@upi"
              />
              <p className="text-xs text-gray-400 mt-1">
                We&apos;ll send payouts directly to your UPI ID
              </p>
            </div>
          )}

          <button
            onClick={saveBankDetails}
            disabled={saving === 'bank'}
            className="btn-primary flex items-center gap-2"
          >
            {saving === 'bank' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Bank Details
              </>
            )}
          </button>
        </div>
      </div>

      {/* Store Appearance */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold">Appearance</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-3">Theme</label>
            <div className="grid grid-cols-5 gap-3">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`aspect-[3/4] rounded-xl border-2 cursor-pointer transition-all ${selectedTheme === theme.id
                    ? 'border-[#E8651A] ring-2 ring-[#E8651A]/20'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className={`h-full rounded-lg ${theme.bg} p-2 flex flex-col`}>
                    <div className={`w-full h-2 rounded ${theme.accent} mt-auto`} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">Accent Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer border-0"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="input-field w-32"
                placeholder="#E8651A"
              />
              <div
                className="w-8 h-8 rounded-full border border-gray-200"
                style={{ backgroundColor: accentColor }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Announcement Text</label>
            <input
              type="text"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              className="input-field"
              placeholder="e.g., Free shipping on orders above ₹999!"
            />
            <p className="text-xs text-gray-400 mt-1">
              Shows as a banner at the top of your store
            </p>
          </div>

          <button
            onClick={saveAppearance}
            disabled={saving === 'appearance'}
            className="btn-primary flex items-center gap-2"
          >
            {saving === 'appearance' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Appearance
              </>
            )}
          </button>
        </div>
      </div>

      {/* Social Links */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <LinkIcon className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold">Social Links</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Instagram</label>
            <div className="flex">
              <span className="bg-gray-50 px-3 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500">
                @
              </span>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="input-field rounded-l-none"
                placeholder="yourhandle"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">YouTube</label>
            <input
              type="text"
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
              className="input-field"
              placeholder="youtube.com/yourchannel"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">WhatsApp</label>
            <div className="flex">
              <span className="bg-gray-50 px-3 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500">
                +91
              </span>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="input-field rounded-l-none"
                placeholder="9876543210"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Website</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="input-field"
              placeholder="https://yourwebsite.com"
            />
          </div>

          <button
            onClick={saveSocialLinks}
            disabled={saving === 'social'}
            className="btn-primary flex items-center gap-2"
          >
            {saving === 'social' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Links
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  )
}
