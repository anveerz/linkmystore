'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/constants'
import { isUpiPaymentConfirmed, isUpiPendingVerification } from '@/lib/payment-status'
import { timeAgo } from '@/lib/utils'
import type { Order, Product } from '@/types'

interface OrderWithProduct extends Order {
  product?: Product
}

export default function OrdersPage() {
  const supabase = useMemo(() => createClient(), [])
  const [orders, setOrders] = useState<OrderWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'new' | 'shipped' | 'delivered' | 'cancelled' | 'pending_verification' | 'verified'
  >('all')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchOrders = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get creator
      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!creator) return

      // Get orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('creator_id', creator.id)
        .order('created_at', { ascending: false })

      if (!ordersData) {
        setOrders([])
        setLoading(false)
        return
      }

      // Get unique product IDs
      const productIds = [...new Set(ordersData.map(o => o.product_id))]

      // Fetch products
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds)

      // Merge orders with products
      const ordersWithProducts = ordersData.map(order => ({
        ...order,
        product: products?.find(p => p.id === order.product_id)
      }))

      setOrders(ordersWithProducts)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void fetchOrders()
  }, [fetchOrders])

  // Filter orders
  const filteredOrders = orders.filter(order => {
    // Status filter
    if (filterStatus === 'pending_verification') {
      if (!isUpiPendingVerification(order)) return false
    } else if (filterStatus === 'verified') {
      if (!isUpiPaymentConfirmed(order)) return false
    } else if (filterStatus !== 'all' && order.status !== filterStatus) {
      return false
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        order.order_number.toLowerCase().includes(query) ||
        order.buyer_name.toLowerCase().includes(query) ||
        order.product?.title?.toLowerCase().includes(query)
      )
    }

    return true
  })

  // Count orders by status
  const statusCounts = {
    all: orders.length,
    new: orders.filter(o => o.status === 'new').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    pending_verification: orders.filter(o => isUpiPendingVerification(o)).length,
    verified: orders.filter(o => isUpiPaymentConfirmed(o)).length,
  }

  const statusTabs: Array<{ key: typeof filterStatus; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pending_verification', label: 'Pending Verify' },
    { key: 'verified', label: 'Verified' },
    { key: 'new', label: 'New' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8651A]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Orders</h1>
          <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
            {orders.length}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filterStatus === tab.key
                ? 'bg-[#0F172A] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {tab.label} {statusCounts[tab.key] > 0 && `(${statusCounts[tab.key]})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by order number, buyer name, or product..."
          className="input-field pl-12"
        />
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="card py-12 text-center">
          <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto" />
          <p className="text-sm text-gray-500 mt-3">
            {searchQuery ? 'No orders match your search' : `No ${filterStatus === 'all' ? '' : filterStatus} orders`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <Link
              key={order.id}
              href={`/dashboard/orders/${order.id}`}
              className="card-hover p-4 block"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono text-gray-400">{order.order_number}</p>
                <div className="flex items-center gap-2">
                  {order.payment_method === 'upi_direct' && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isUpiPaymentConfirmed(order)
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {isUpiPaymentConfirmed(order) ? 'UPI Verified' : 'UPI Pending'}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${order.status === 'new' ? 'bg-yellow-100 text-yellow-700' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                    }`}>
                    {order.status === 'new' ? 'New' :
                      order.status === 'shipped' ? 'Shipped' :
                        order.status === 'delivered' ? 'Delivered' : 'Cancelled'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3">
                {order.product?.images?.[0] ? (
                  <Image
                    src={order.product.images[0]}
                    alt={order.product.title}
                    width={48}
                    height={48}
                    unoptimized
                    className="w-12 h-12 rounded-xl object-cover bg-gray-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {order.product?.title || 'Product'}
                  </p>
                  {order.variant && (
                    <p className="text-xs text-gray-500">{order.variant.name}</p>
                  )}
                  <p className="text-xs text-gray-400">by {order.buyer_name}</p>
                  {order.payment_method === 'upi_direct' && order.upi_reference_number && (
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      UPI Ref: <span className="font-mono">{order.upi_reference_number}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <p className="font-bold text-sm">{formatPrice(order.amount)}</p>
                <p className="text-xs text-gray-400">{timeAgo(order.created_at)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
