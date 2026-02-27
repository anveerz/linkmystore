'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Landmark,
    CreditCard,
    Save,
    Eye,
    EyeOff,
    CheckCircle2,
    Shield,
    Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Creator } from '@/types'

export default function BankPage() {
    const supabase = useMemo(() => createClient(), [])
    const [creator, setCreator] = useState<Creator | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Bank Details
    const [accountName, setAccountName] = useState('')
    const [accountNumber, setAccountNumber] = useState('')
    const [confirmAccountNumber, setConfirmAccountNumber] = useState('')
    const [ifscCode, setIfscCode] = useState('')
    const [upiId, setUpiId] = useState('')
    const [showAccountNumber, setShowAccountNumber] = useState(false)
    const [activeTab, setActiveTab] = useState<'bank' | 'upi'>('bank')

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

            if (creatorData.bank_account) {
                setAccountName(creatorData.bank_account.account_name || '')
                setAccountNumber(creatorData.bank_account.account_number || '')
                setConfirmAccountNumber(creatorData.bank_account.account_number || '')
                setIfscCode(creatorData.bank_account.ifsc || '')
                setUpiId(creatorData.bank_account.upi_id || '')
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        void fetchData()
    }, [fetchData])

    const handleSave = async () => {
        if (!creator) return

        if (activeTab === 'bank') {
            if (!accountName.trim()) { toast.error('Please enter account holder name'); return }
            if (!accountNumber.trim()) { toast.error('Please enter account number'); return }
            if (accountNumber !== confirmAccountNumber) { toast.error('Account numbers do not match'); return }
            if (!ifscCode.trim()) { toast.error('Please enter IFSC code'); return }
        } else {
            if (!upiId.trim()) { toast.error('Please enter UPI ID'); return }
        }

        setSaving(true)

        try {
            const bankAccount = activeTab === 'bank' ? {
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

            toast.success('Payment details saved! 🏦')
            fetchData()
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to save'
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    const hasBankDetails = creator?.bank_account && (
        creator.bank_account.account_number || creator.bank_account.upi_id
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8651A]"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Page Header */}
            <div className="animate-in">
                <h1 className="text-2xl font-bold text-[#1A1A2E]">Bank & Payments</h1>
                <p className="text-sm text-[#555567] mt-1">
                    Add your bank details or UPI ID to receive payouts
                </p>
            </div>

            {/* Status Card */}
            <div className={`rounded-2xl p-5 border animate-in-delay-1 ${hasBankDetails
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
                }`}>
                <div className="flex items-center gap-3">
                    {hasBankDetails ? (
                        <>
                            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-green-800">Payment method configured</p>
                                <p className="text-sm text-green-600">
                                    {creator?.bank_account?.upi_id && `UPI: ${creator.bank_account.upi_id}`}
                                    {creator?.bank_account?.account_number && creator?.bank_account?.upi_id && ' • '}
                                    {creator?.bank_account?.account_number && `Bank: ****${creator.bank_account.account_number.slice(-4)}`}
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                <Landmark className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-amber-800">No payment method added</p>
                                <p className="text-sm text-amber-600">
                                    Add your details below to start receiving payouts
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Payment Details Form */}
            <div className="card animate-in-delay-2">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8651A] to-[#C75516] flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-[#1A1A2E]">Payment Details</h2>
                        <p className="text-xs text-[#8E8E9F]">Choose your preferred payout method</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex rounded-xl bg-[#F0ECF7] p-1 mb-6">
                    <button
                        onClick={() => setActiveTab('bank')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-center cursor-pointer transition-all ${activeTab === 'bank'
                            ? 'bg-white shadow-sm text-[#1A1A2E]'
                            : 'text-[#555567]'
                            }`}
                    >
                        🏦 Bank Account
                    </button>
                    <button
                        onClick={() => setActiveTab('upi')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-center cursor-pointer transition-all ${activeTab === 'upi'
                            ? 'bg-white shadow-sm text-[#1A1A2E]'
                            : 'text-[#555567]'
                            }`}
                    >
                        📱 UPI ID
                    </button>
                </div>

                <div className="space-y-4">
                    {activeTab === 'bank' ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                                    Account Holder Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={accountName}
                                    onChange={(e) => setAccountName(e.target.value)}
                                    className="input-field"
                                    placeholder="Name as per bank records"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                                    Account Number <span className="text-red-500">*</span>
                                </label>
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
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E9F] hover:text-[#555567]"
                                    >
                                        {showAccountNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                                    Confirm Account Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    value={confirmAccountNumber}
                                    onChange={(e) => setConfirmAccountNumber(e.target.value)}
                                    className="input-field"
                                    placeholder="Re-enter account number"
                                />
                                {confirmAccountNumber && accountNumber !== confirmAccountNumber && (
                                    <p className="text-xs text-red-500 mt-1">Account numbers don&apos;t match</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                                    IFSC Code <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={ifscCode}
                                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                                    className="input-field"
                                    placeholder="e.g., SBIN0001234"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                                    UPI ID <span className="text-[#8E8E9F]">(optional)</span>
                                </label>
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
                            <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                                UPI ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                                className="input-field"
                                placeholder="yourname@upi"
                            />
                            <p className="text-xs text-[#8E8E9F] mt-1.5">
                                We&apos;ll send payouts directly to your UPI ID
                            </p>

                            <div className="bg-[#FFF8F3] rounded-xl p-4 mt-4 flex items-start gap-3">
                                <Shield className="w-5 h-5 text-[#E8651A] mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-[#1A1A2E]">Secure & Fast</p>
                                    <p className="text-xs text-[#555567] mt-0.5">
                                        UPI payouts are processed within 24 hours. Your details are encrypted and never shared.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Payment Details
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
