'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/constants'
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ImageIcon,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  ExternalLink,
  Star,
} from 'lucide-react'
import type { Product, Creator } from '@/types'
import toast from 'react-hot-toast'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [creator, setCreator] = useState<Creator | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const fetchProducts = useCallback(async () => {
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

      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('creator_id', creatorData.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      setProducts(productsData || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void fetchProducts()
  }, [fetchProducts])

  const toggleActive = async (product: Product) => {
    const newValue = !product.is_active

    setProducts(prev =>
      prev.map(p => p.id === product.id ? { ...p, is_active: newValue } : p)
    )

    const { error } = await supabase
      .from('products')
      .update({ is_active: newValue })
      .eq('id', product.id)

    if (error) {
      setProducts(prev =>
        prev.map(p => p.id === product.id ? { ...p, is_active: !newValue } : p)
      )
      toast.error('Failed to update product')
    } else {
      toast.success(newValue ? 'Product is visible on your store' : 'Product is hidden from your store')
    }
  }

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Delete "${product.title}"? This can't be undone.`)) return

    setDeleting(product.id)

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)

    if (error) {
      toast.error(error.message)
    } else {
      setProducts(prev => prev.filter(p => p.id !== product.id))
      toast.success('Product deleted')
    }

    setDeleting(null)
  }

  const copyProductLink = (product: Product) => {
    if (!creator) return
    const url = `${window.location.origin}/${creator.store_slug}/${product.id}`
    navigator.clipboard.writeText(url)
    setCopiedId(product.id)
    toast.success('Product link copied')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getStockStatus = (stock: number | null | undefined) => {
    if (stock === null || stock === undefined) return null // unlimited
    if (stock === 0) return { label: 'Out of stock', color: 'bg-red-100 text-red-700', urgent: true }
    if (stock <= 5) return { label: `Only ${stock} left`, color: 'bg-amber-100 text-amber-700', urgent: true }
    return { label: `${stock} in stock`, color: 'bg-green-100 text-green-700', urgent: false }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className="h-8 w-24 bg-[#e7eeff] rounded-lg animate-pulse" />
            <div className="h-6 w-12 bg-[#e7eeff] rounded-full ml-3 animate-pulse" />
          </div>
          <div className="h-12 w-36 bg-[#e7eeff] rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-gray-100 h-72 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Products</h1>
          <span className="ml-3 rounded-full bg-[linear-gradient(125deg,rgba(79,124,255,0.14)_0%,rgba(122,93,255,0.12)_100%)] px-3 py-1 text-xs font-semibold text-[#3953c6]">
            {products.length}
          </span>
        </div>
        <Link href="/dashboard/products/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Product
        </Link>
      </div>

      {/* Empty State */}
      {products.length === 0 && (
        <div className="card py-16">
          <div className="flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,rgba(79,124,255,0.12)_0%,rgba(122,93,255,0.08)_100%)]">
              <Package className="w-12 h-12 text-[#4f7cff]" />
            </div>
            <h3 className="text-xl font-bold mt-4">No products yet</h3>
            <p className="text-gray-500 text-sm mt-2 max-w-sm text-center">
              Add your first product and start selling to your followers
            </p>
            <Link href="/dashboard/products/new" className="btn-primary mt-6 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Your First Product
            </Link>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product) => {
            const stockStatus = getStockStatus(product.stock)
            const productUrl = creator ? `${creator.store_slug}/${product.id}` : ''
            const shortUrl = productUrl.length > 30 ? productUrl.slice(0, 28) + '...' : productUrl

            return (
              <div key={product.id} className={`card-hover p-0 overflow-hidden ${!product.is_active ? 'opacity-60' : ''}`}>
                {/* Image Area */}
                <Link href={`/dashboard/products/${product.id}`}>
                  <div className="h-48 bg-gray-100 relative">
                    {product.images && product.images[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.title}
                        width={800}
                        height={600}
                        unoptimized
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-300" />
                      </div>
                    )}

                    {/* Stock Warning */}
                    {stockStatus?.urgent && (
                      <div className="absolute bottom-3 left-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${stockStatus.color}`}>
                          <AlertTriangle className="w-3 h-3" />
                          {stockStatus.label}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Visibility Toggle */}
                <div className="absolute top-3 left-3">
                  <button
                    onClick={() => toggleActive(product)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition-all ${
                      product.is_active
                        ? 'bg-[linear-gradient(125deg,#4f7cff_0%,#7a5dff_100%)] text-white shadow-[0_12px_24px_rgba(79,124,255,0.24)]'
                        : 'bg-slate-700/80 text-white'
                    }`}
                    title={product.is_active ? 'Hide product from your store' : 'Show product on your store'}
                    aria-label={product.is_active ? 'Hide product from your store' : 'Show product on your store'}
                  >
                    {product.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>

                {/* Content Area */}
                <div className="p-4">
                  <Link href={`/dashboard/products/${product.id}`}>
                    <h3 className="text-sm font-semibold text-[#1A1A2E] truncate">
                      {product.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-bold gradient-text">
                        {formatPrice(product.price)}
                      </span>
                      {product.compare_price && product.compare_price > product.price && (
                        <span className="text-sm text-gray-400 line-through">
                          {formatPrice(product.compare_price)}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Stock & Category */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {stockStatus && !stockStatus.urgent && (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${stockStatus.color}`}>
                        {stockStatus.label}
                      </span>
                    )}
                    {product.category && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {product.category}
                      </span>
                    )}
                    {product.avg_rating && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        {product.avg_rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {/* Shareable Link */}
                  {creator && (
                    <div className="mt-3 flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-100">
                      <ExternalLink className="w-3 h-3 text-[#8E8E9F] flex-shrink-0" />
                      <span className="text-[10px] text-[#8E8E9F] truncate flex-1 font-mono">
                        {shortUrl}
                      </span>
                      <button
                        onClick={() => copyProductLink(product)}
                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Copy product link"
                      >
                        {copiedId === product.id ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3 text-[#555567]" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Bar */}
                <div className="px-4 pb-4 flex items-center gap-2">
                  <Link
                    href={`/dashboard/products/${product.id}`}
                    className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 flex-1 justify-center"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(product)}
                    disabled={deleting === product.id}
                    className="bg-red-50 hover:bg-red-100 text-red-600 py-1.5 px-3 rounded-lg text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {deleting === product.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
