'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BadgePercent, Loader2, Plus, Ticket, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatPrice } from '@/lib/constants'
import type { Coupon, Product } from '@/types'

interface CouponFormState {
  code: string
  discountType: 'percent' | 'fixed'
  discountValue: string
  minOrderAmount: string
  maxDiscountAmount: string
  usageLimit: string
  startsAt: string
  endsAt: string
  productId: string
}

const INITIAL_FORM: CouponFormState = {
  code: '',
  discountType: 'percent',
  discountValue: '',
  minOrderAmount: '',
  maxDiscountAmount: '',
  usageLimit: '',
  startsAt: '',
  endsAt: '',
  productId: '',
}

export default function CouponsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState<CouponFormState>(INITIAL_FORM)

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

      const [couponResponse, productResponse] = await Promise.all([
        fetch('/api/coupons'),
        supabase
          .from('products')
          .select('id,title,price,type,is_active,creator_id,images,variants,sort_order,created_at')
          .eq('creator_id', creator.id)
          .order('created_at', { ascending: false }),
      ])

      const couponPayload = await couponResponse.json()
      if (couponResponse.ok) {
        setCoupons((couponPayload.coupons || []) as Coupon[])
      } else {
        toast.error(couponPayload.error || 'Failed to load coupons')
      }

      setProducts((productResponse.data || []) as Product[])
    } catch (error) {
      console.error('Coupons fetch error:', error)
      toast.error('Could not load coupons')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const activeCouponCount = useMemo(
    () => coupons.filter((coupon) => coupon.is_active).length,
    [coupons]
  )

  const createCoupon = async () => {
    if (!form.code.trim()) {
      toast.error('Coupon code is required')
      return
    }

    if (!form.discountValue || Number(form.discountValue) <= 0) {
      toast.error('Enter a valid discount value')
      return
    }

    setSaving(true)
    try {
      const discountValue =
        form.discountType === 'fixed'
          ? Math.round(Number(form.discountValue) * 100)
          : Math.round(Number(form.discountValue))

      const minOrderAmount = form.minOrderAmount ? Math.round(Number(form.minOrderAmount) * 100) : null
      const maxDiscountAmount = form.maxDiscountAmount ? Math.round(Number(form.maxDiscountAmount) * 100) : null
      const usageLimit = form.usageLimit ? Math.round(Number(form.usageLimit)) : null

      const response = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          discount_type: form.discountType,
          discount_value: discountValue,
          min_order_amount: minOrderAmount,
          max_discount_amount: maxDiscountAmount,
          usage_limit: usageLimit,
          starts_at: form.startsAt || null,
          ends_at: form.endsAt || null,
          applicable_product_ids: form.productId ? [form.productId] : null,
          is_active: true,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        toast.error(payload.error || 'Failed to create coupon')
        return
      }

      setCoupons((prev) => [payload.coupon as Coupon, ...prev])
      setForm(INITIAL_FORM)
      toast.success('Coupon created')
    } catch (error) {
      console.error('Coupons create error:', error)
      toast.error('Failed to create coupon')
    } finally {
      setSaving(false)
    }
  }

  const toggleCoupon = async (coupon: Coupon) => {
    try {
      const response = await fetch(`/api/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !coupon.is_active }),
      })

      const payload = await response.json()
      if (!response.ok) {
        toast.error(payload.error || 'Failed to update coupon')
        return
      }

      setCoupons((prev) => prev.map((entry) => (entry.id === coupon.id ? payload.coupon : entry)))
    } catch (error) {
      console.error('Coupons toggle error:', error)
      toast.error('Failed to update coupon')
    }
  }

  const deleteCoupon = async (coupon: Coupon) => {
    const confirmed = window.confirm(`Delete coupon ${coupon.code}?`)
    if (!confirmed) return

    try {
      const response = await fetch(`/api/coupons/${coupon.id}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) {
        toast.error(payload.error || 'Failed to delete coupon')
        return
      }

      setCoupons((prev) => prev.filter((entry) => entry.id !== coupon.id))
      toast.success('Coupon deleted')
    } catch (error) {
      console.error('Coupons delete error:', error)
      toast.error('Failed to delete coupon')
    }
  }

  const couponLabel = (coupon: Coupon) => {
    if (coupon.discount_type === 'percent') return `${coupon.discount_value}% OFF`
    return `${formatPrice(coupon.discount_value)} OFF`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Coupons</h1>
          <span className="bg-gradient-to-r from-[#E8651A]/10 to-[#3D2176]/10 text-[#3D2176] text-xs font-semibold px-3 py-1 rounded-full">
            {activeCouponCount} active
          </span>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#E8651A]" />
          Create Coupon
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={form.code}
            onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
            placeholder="Code (e.g., FESTIVE20)"
            className="input-field"
          />
          <select
            value={form.discountType}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, discountType: e.target.value as 'percent' | 'fixed' }))
            }
            className="input-field"
          >
            <option value="percent">Percentage</option>
            <option value="fixed">Fixed Amount</option>
          </select>
          <input
            type="number"
            min="1"
            value={form.discountValue}
            onChange={(e) => setForm((prev) => ({ ...prev, discountValue: e.target.value }))}
            placeholder={form.discountType === 'percent' ? 'Discount %' : 'Discount in ₹'}
            className="input-field"
          />
          <input
            type="number"
            min="0"
            value={form.minOrderAmount}
            onChange={(e) => setForm((prev) => ({ ...prev, minOrderAmount: e.target.value }))}
            placeholder="Min order in ₹ (optional)"
            className="input-field"
          />
          <input
            type="number"
            min="0"
            value={form.maxDiscountAmount}
            onChange={(e) => setForm((prev) => ({ ...prev, maxDiscountAmount: e.target.value }))}
            placeholder="Max discount in ₹ (optional)"
            className="input-field"
            disabled={form.discountType === 'fixed'}
          />
          <input
            type="number"
            min="0"
            value={form.usageLimit}
            onChange={(e) => setForm((prev) => ({ ...prev, usageLimit: e.target.value }))}
            placeholder="Usage limit (optional)"
            className="input-field"
          />
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))}
            className="input-field"
          />
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => setForm((prev) => ({ ...prev, endsAt: e.target.value }))}
            className="input-field"
          />
          <select
            value={form.productId}
            onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))}
            className="input-field sm:col-span-2"
          >
            <option value="">Apply to all products</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.title}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={createCoupon}
          disabled={saving}
          className="btn-primary inline-flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {saving ? 'Creating...' : 'Create Coupon'}
        </button>
      </div>

      <div className="space-y-3">
        {coupons.length === 0 ? (
          <div className="card py-14 text-center">
            <Ticket className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No coupons created yet</p>
          </div>
        ) : (
          coupons.map((coupon) => (
            <div key={coupon.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-mono font-semibold text-[#1A1A2E]">{coupon.code}</p>
                  <p className="text-xs text-[#8E8E9F] mt-1 flex items-center gap-1">
                    <BadgePercent className="w-3.5 h-3.5" />
                    {couponLabel(coupon)}
                  </p>
                  <p className="text-xs text-[#8E8E9F] mt-1">
                    Used {coupon.used_count} {coupon.usage_limit ? `/ ${coupon.usage_limit}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCoupon(coupon)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                      coupon.is_active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {coupon.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => deleteCoupon(coupon)}
                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
