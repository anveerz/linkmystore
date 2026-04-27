'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wallet, CheckCircle2, Calendar, Landmark, AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatPrice } from '@/lib/constants'
import { formatShortDate } from '@/lib/utils'
import type { Creator, Payout } from '@/types'

export default function PayoutsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [creator, setCreator] = useState<Creator | null>(null)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [pendingAmount, setPendingAmount] = useState(0)
  const [totalPaidOut, setTotalPaidOut] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: creatorData } = await supabase
        .from('creators')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!creatorData) return
      setCreator(creatorData)

      // Kept for affiliate and legacy payout tracking.
      const { data: payoutsData } = await supabase
        .from('payouts')
        .select('*')
        .eq('creator_id', creatorData.id)
        .order('created_at', { ascending: false })

      setPayouts(payoutsData || [])

      const completedPayouts = (payoutsData || []).filter((p) => p.status === 'completed')
      const paidOut = completedPayouts.reduce((sum, p) => sum + p.amount, 0)
      const pendingPayouts = (payoutsData || [])
        .filter((p) => p.status === 'pending' || p.status === 'processing')
        .reduce((sum, p) => sum + p.amount, 0)

      setTotalPaidOut(paidOut)
      setPendingAmount(pendingPayouts)
    } catch (error) {
      console.error('Error fetching payouts:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const hasBankDetails = creator?.bank_account && (
    creator.bank_account.account_number || creator.bank_account.upi_id
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f7cff]" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Affiliate & Legacy Payouts</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#edf2ff] flex items-center justify-center">
              <Wallet className="w-5 h-5 text-[#4f7cff]" />
            </div>
            <span className="text-sm text-gray-500">Pending Queue</span>
          </div>
          <p className="text-2xl font-bold">{formatPrice(pendingAmount)}</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-sm text-gray-500">Total Released</span>
          </div>
          <p className="text-2xl font-bold">{formatPrice(totalPaidOut)}</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-sm text-gray-500">Processing Window</span>
          </div>
          <p className="text-lg font-bold">As per payout cycle</p>
          <p className="text-xs text-gray-400 mt-1">Own-product settlement is handled directly by payment rail</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Landmark className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold">Payout Account</h2>
        </div>

        {hasBankDetails ? (
          <div>
            {creator.bank_account?.upi_id && (
              <div className="mb-3">
                <p className="text-sm text-gray-500">UPI ID</p>
                <p className="font-medium">{creator.bank_account.upi_id}</p>
              </div>
            )}

            {creator.bank_account?.account_number && (
              <div className="mb-3">
                <p className="text-sm text-gray-500">Account Number</p>
                <p className="font-medium">XXXX XXXX {creator.bank_account.account_number.slice(-4)}</p>
              </div>
            )}

            {creator.bank_account?.ifsc && (
              <div className="mb-3">
                <p className="text-sm text-gray-500">IFSC Code</p>
                <p className="font-medium">{creator.bank_account.ifsc}</p>
              </div>
            )}

            {creator.bank_account?.account_name && (
              <div className="mb-3">
                <p className="text-sm text-gray-500">Account Name</p>
                <p className="font-medium">{creator.bank_account.account_name}</p>
              </div>
            )}

            <div className="flex items-center gap-2 mt-4">
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Verified</span>
              <Link href="/dashboard/payments" className="text-sm text-[#4f7cff] hover:underline">
                Edit
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Add your payment details</p>
                <p className="text-sm text-amber-700 mt-1">
                  You have <span className="font-semibold">{formatPrice(pendingAmount)}</span> in pending payout queue
                </p>
                <Link href="/dashboard/payments" className="btn-primary mt-3 inline-flex items-center gap-2">
                  Add Payment Details
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Payout History</h2>

        {payouts.length === 0 ? (
          <div className="card py-8 text-center">
            <Wallet className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-sm text-gray-500 mt-3">No payouts yet</p>
            <p className="text-xs text-gray-400 mt-1">This section tracks affiliate and legacy payout transfers.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payouts.map((payout) => (
              <div key={payout.id} className="card p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">
                    Week of {formatShortDate(payout.period_start)} - {formatShortDate(payout.period_end)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{payout.order_count} orders</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatPrice(payout.amount)}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      payout.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : payout.status === 'processing'
                          ? 'bg-blue-100 text-blue-700'
                          : payout.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {payout.status === 'pending'
                      ? 'Pending'
                      : payout.status === 'processing'
                        ? 'Processing'
                        : payout.status === 'completed'
                          ? 'Paid'
                          : 'Failed'}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{formatShortDate(payout.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
