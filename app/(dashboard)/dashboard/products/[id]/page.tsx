'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { MAX_IMAGES_PER_PRODUCT, MAX_IMAGE_SIZE_MB, MAX_DIGITAL_FILE_SIZE_MB } from '@/lib/constants'
import {
  ArrowLeft,
  Package,
  FileDown,
  Plus,
  X,
  Upload,
  FileText,
  Trash2,
  Loader2,
  Boxes,
  Sparkles,
  Tag,
  ChevronDown,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react'
import type { Variant } from '@/types'
import toast from 'react-hot-toast'

const PHYSICAL_CATEGORIES = [
  'Jewellery & Accessories',
  'Clothing & Fashion',
  'Home Decor & Furnishing',
  'Art & Craft',
  'Food & Beverages',
  'Beauty & Skincare',
  'Books & Stationery',
  'Toys & Games',
  'Electronics & Gadgets',
  'Sports & Fitness',
  'Baby & Kids',
  'Pet Supplies',
  'Plants & Gardening',
  'Health & Wellness',
  'Gift Hampers',
  'Handmade & Artisan',
]

const DIGITAL_CATEGORIES = [
  'E-books & Guides',
  'Templates & Presets',
  'Online Course',
  'Photography Presets',
  'Social Media Templates',
  'Planners & Journals',
  'Design Assets',
  'Music & Audio',
  'Videos & Tutorials',
  'Coaching & Consulting',
  'Financial Tools',
]

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  const supabase = useMemo(() => createClient(), [])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const digitalFileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [creatorId, setCreatorId] = useState<string | null>(null)
  const [storeSlug, setStoreSlug] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [comparePrice, setComparePrice] = useState('')
  const [type, setType] = useState<'physical' | 'digital'>('physical')
  const [category, setCategory] = useState('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [stock, setStock] = useState('')
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [digitalFile, setDigitalFile] = useState<File | null>(null)
  const [existingDigitalFile, setExistingDigitalFile] = useState<string | null>(null)
  const [variants, setVariants] = useState<{ name: string; price: string }[]>([])
  const [isActive, setIsActive] = useState(true)

  const categoryList = type === 'digital' ? DIGITAL_CATEGORIES : PHYSICAL_CATEGORIES

  useEffect(() => {
    const handleClickOutside = () => setShowCategoryDropdown(false)
    if (showCategoryDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showCategoryDropdown])

  const fetchProduct = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: creator } = await supabase
        .from('creators')
        .select('id, store_slug')
        .eq('user_id', user.id)
        .single()

      if (creator) {
        setCreatorId(creator.id)
        setStoreSlug(creator.store_slug)
      }

      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (error || !product) {
        toast.error('Product not found')
        router.push('/dashboard/products')
        return
      }

      setTitle(product.title)
      setDescription(product.description || '')
      setPrice((product.price / 100).toString())
      setComparePrice(product.compare_price ? (product.compare_price / 100).toString() : '')
      setType(product.type)
      setCategory(product.category || '')
      setStock(product.stock !== null && product.stock !== undefined ? product.stock.toString() : '')
      setExistingImages(product.images || [])
      setExistingDigitalFile(product.digital_file_url || null)
      setIsActive(product.is_active)

      if (product.variants && product.variants.length > 0) {
        setVariants(
          product.variants.map((v: Variant) => ({
            name: v.name,
            price: v.price ? (v.price / 100).toString() : '',
          }))
        )
      }
    } catch (error) {
      console.error('Error fetching product:', error)
      toast.error('Failed to load product')
    } finally {
      setPageLoading(false)
    }
  }, [productId, router, supabase])

  useEffect(() => {
    void fetchProduct()
  }, [fetchProduct])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const totalImages = existingImages.length + newImages.length + files.length

    if (totalImages > MAX_IMAGES_PER_PRODUCT) {
      toast.error(`Maximum ${MAX_IMAGES_PER_PRODUCT} images allowed`)
      return
    }

    for (const file of files) {
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        toast.error(`Image "${file.name}" exceeds ${MAX_IMAGE_SIZE_MB}MB limit`)
        continue
      }
      const preview = URL.createObjectURL(file)
      setNewImages(prev => [...prev, file])
      setImagePreviews(prev => [...prev, preview])
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index))
  }

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index])
    setNewImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleDigitalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_DIGITAL_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File exceeds ${MAX_DIGITAL_FILE_SIZE_MB}MB limit`)
      return
    }
    setDigitalFile(file)
    setExistingDigitalFile(null)
    if (digitalFileInputRef.current) digitalFileInputRef.current.value = ''
  }

  const removeDigitalFile = () => {
    setDigitalFile(null)
    setExistingDigitalFile(null)
  }

  const addVariant = () => setVariants(prev => [...prev, { name: '', price: '' }])
  const removeVariant = (index: number) => setVariants(prev => prev.filter((_, i) => i !== index))
  const updateVariant = (index: number, field: 'name' | 'price', value: string) => {
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
    })
  }

  const generateWithAI = async () => {
    if (!title.trim()) {
      toast.error('Please enter a product title first')
      return
    }

    setAiLoading(true)
    try {
      let imageBase64: string | undefined
      let imageMimeType: string | undefined

      if (newImages.length > 0) {
        imageBase64 = await fileToBase64(newImages[0])
        imageMimeType = newImages[0].type || 'image/jpeg'
      }
      // If no new images but existing, we can use the URL directly
      // (Gemini can accept image URLs too via imageUri, but base64 is simpler)

      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, imageMimeType, title, type }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'AI generation failed')

      if (data.description) setDescription(data.description)
      if (data.category && !category) setCategory(data.category)
      toast.success('Description generated! ✨')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'AI generation failed')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Product title is required'); return }
    if (!price || parseFloat(price) <= 0) { toast.error('Please set a valid price'); return }
    if (!creatorId) { toast.error('Creator not found'); return }

    setLoading(true)

    try {
      const newImageUrls: string[] = []
      for (const image of newImages) {
        const ext = image.name.split('.').pop()
        const path = `products/${creatorId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('product-images').upload(path, image)
        if (error) { toast.error('Image upload failed'); setLoading(false); return }
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
        newImageUrls.push(publicUrl)
      }

      let digitalFileUrl: string | null = existingDigitalFile
      if (digitalFile) {
        const path = `files/${creatorId}/${Date.now()}-${digitalFile.name}`
        const { error } = await supabase.storage.from('digital-files').upload(path, digitalFile)
        if (error) { toast.error('File upload failed'); setLoading(false); return }
        digitalFileUrl = path
      }

      const allImages = [...existingImages, ...newImageUrls]
      const priceInPaisa = Math.round(parseFloat(price) * 100)
      const comparePriceInPaisa = comparePrice ? Math.round(parseFloat(comparePrice) * 100) : null
      const stockValue = stock.trim() === '' ? null : parseInt(stock, 10)

      const formattedVariants: Variant[] = variants
        .filter(v => v.name.trim())
        .map(v => ({
          name: v.name.trim(),
          price: v.price ? Math.round(parseFloat(v.price) * 100) : undefined,
        }))

      const { error } = await supabase
        .from('products')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          price: priceInPaisa,
          compare_price: comparePriceInPaisa,
          type,
          images: allImages,
          variants: formattedVariants,
          digital_file_url: digitalFileUrl,
          category: category.trim() || null,
          stock: stockValue,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)

      if (error) { toast.error(error.message); setLoading(false); return }

      toast.success('Product updated! ✨')
      router.push('/dashboard/products')
    } catch (error) {
      console.error('Error updating product:', error)
      toast.error('Failed to update product')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return
    setLoading(true)
    const { error } = await supabase.from('products').delete().eq('id', productId)
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Product deleted')
    router.push('/dashboard/products')
  }

  const publicProductLink =
    storeSlug
      ? `${typeof window !== 'undefined' ? window.location.origin : 'https://linkmystore.in'}/${storeSlug}/${productId}`
      : ''

  const copyShareLink = async () => {
    if (!publicProductLink) return
    await navigator.clipboard.writeText(publicProductLink)
    setCopied(true)
    toast.success('Shareable link copied')
    setTimeout(() => setCopied(false), 2000)
  }

  if (pageLoading) {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
          <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="card mb-6 animate-pulse h-48" />
        <div className="card mb-6 animate-pulse h-64" />
        <div className="card mb-6 animate-pulse h-48" />
      </div>
    )
  }

  const totalImages = existingImages.length + newImages.length

  return (
    <div className="max-w-2xl">
      {/* Top Bar */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/products"
          className="w-10 h-10 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-[#0F172A]">Edit Product</h1>
      </div>

      {publicProductLink && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-[#1A1A2E] mb-2">Shareable Product Link</h2>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
            <span className="text-xs text-gray-600 font-mono truncate flex-1">{publicProductLink}</span>
            <button
              onClick={copyShareLink}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              title="Copy share link"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
            </button>
            <a
              href={publicProductLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              title="Open public product page"
            >
              <ExternalLink className="w-4 h-4 text-gray-600" />
            </a>
          </div>
        </div>
      )}

      {/* Product Type Card */}
      <div className="card mb-6 animate-in">
        <h2 className="text-lg font-semibold mb-4">What are you selling?</h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setType('physical')}
            className={`cursor-pointer rounded-xl border-2 p-5 transition-all text-left ${type === 'physical' ? 'border-orange-500 bg-orange-50/50 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <Package className="w-8 h-8 mb-3 text-gray-700" />
            <div className="font-semibold text-sm">Physical Product</div>
            <div className="text-xs text-gray-500 mt-1">Jewellery, clothing, crafts...</div>
          </button>
          <button
            onClick={() => setType('digital')}
            className={`cursor-pointer rounded-xl border-2 p-5 transition-all text-left ${type === 'digital' ? 'border-orange-500 bg-orange-50/50 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <FileDown className="w-8 h-8 mb-3 text-gray-700" />
            <div className="font-semibold text-sm">Digital Product</div>
            <div className="text-xs text-gray-500 mt-1">PDFs, presets, templates...</div>
          </button>
        </div>
      </div>

      {/* Details Card */}
      <div className="card mb-6 animate-in-delay-1">
        <h2 className="text-lg font-semibold mb-4">Product Details</h2>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Handmade Silver Necklace"
            className="input-field"
          />
        </div>

        {/* Description with AI button */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium">Description</label>
            <button
              onClick={generateWithAI}
              disabled={aiLoading || !title.trim()}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: aiLoading || !title.trim() ? undefined : 'linear-gradient(135deg, #E8651A 0%, #3D2176 100%)',
                color: aiLoading || !title.trim() ? undefined : 'white',
                border: aiLoading || !title.trim() ? '1px solid #e5e7eb' : 'none',
              }}
            >
              {aiLoading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" />Generate with AI</>
              )}
            </button>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your product — materials, size, what's included..."
            rows={4}
            className="input-field resize-none"
          />
        </div>

        {/* Category with dropdown */}
        <div className="mt-4 relative">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium">Category</label>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowCategoryDropdown(!showCategoryDropdown) }}
              className="flex items-center gap-1 text-xs text-orange-600 font-medium hover:text-orange-700"
            >
              <Tag className="w-3.5 h-3.5" />Browse
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Select or type a category"
              className="input-field pr-10"
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowCategoryDropdown(!showCategoryDropdown) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          {showCategoryDropdown && (
            <div
              className="absolute z-[9999] mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-2 max-h-48 overflow-y-auto">
                {categoryList.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setCategory(cat); setShowCategoryDropdown(false) }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${category === cat ? 'bg-orange-50 text-orange-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Card */}
      <div className="card mb-6 animate-in-delay-2">
        <h2 className="text-lg font-semibold mb-4">Pricing</h2>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Price <span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <span className="bg-gray-50 px-4 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500 font-semibold">₹</span>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="499" min="1" className="input-field rounded-l-none" />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-1.5">
            Compare at Price <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex">
            <span className="bg-gray-50 px-4 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500 font-semibold">₹</span>
            <input type="number" value={comparePrice} onChange={(e) => setComparePrice(e.target.value)} placeholder="699" min="0" className="input-field rounded-l-none" />
          </div>
        </div>

        {/* Stock (physical only) */}
        {type === 'physical' && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1.5">
              Stock Quantity <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="flex">
              <span className="bg-gray-50 px-4 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500">
                <Boxes className="w-5 h-5" />
              </span>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="Leave empty for unlimited"
                min="0"
                className="input-field rounded-l-none"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Leave empty for unlimited. Auto-decrements with each order. Shows &quot;Only X left!&quot; when &lt;= 5.
            </p>
          </div>
        )}
      </div>

      {/* Images Card */}
      <div className="card mb-6 animate-in-delay-3">
        <h2 className="text-lg font-semibold mb-1">Product Images</h2>
        <p className="text-sm text-gray-500 mb-4">Upload up to {MAX_IMAGES_PER_PRODUCT} images. First image is the cover.</p>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {existingImages.map((url, index) => (
            <div key={`existing-${index}`} className="w-full aspect-square rounded-xl border border-gray-200 relative overflow-hidden">
              <Image
                src={url}
                alt={`Product ${index + 1}`}
                width={400}
                height={400}
                unoptimized
                className="w-full h-full object-cover"
              />
              <button onClick={() => removeExistingImage(index)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 text-xs">
                <X className="w-3 h-3" />
              </button>
              {index === 0 && newImages.length === 0 && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">Cover</span>
              )}
            </div>
          ))}

          {imagePreviews.map((preview, index) => (
            <div key={`new-${index}`} className="w-full aspect-square rounded-xl border border-gray-200 relative overflow-hidden">
              <Image
                src={preview}
                alt={`Preview ${index + 1}`}
                width={400}
                height={400}
                unoptimized
                className="w-full h-full object-cover"
              />
              <button onClick={() => removeNewImage(index)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 text-xs">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {totalImages < MAX_IMAGES_PER_PRODUCT && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-400 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50"
            >
              <Plus className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-500 mt-1">Add</span>
            </button>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageSelect} className="hidden" />
      </div>

      {/* Digital File Card */}
      {type === 'digital' && (
        <div className="card mb-6 animate-in">
          <h2 className="text-lg font-semibold mb-1">Digital File</h2>
          <p className="text-sm text-gray-500 mb-4">This file will be delivered to buyers after payment</p>

          {!digitalFile && !existingDigitalFile ? (
            <button
              onClick={() => digitalFileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-orange-400 transition-colors"
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm text-gray-600">Click to upload your file</div>
              <div className="text-xs text-gray-400 mt-1">PDF, ZIP, images — up to {MAX_DIGITAL_FILE_SIZE_MB}MB</div>
            </button>
          ) : (
            <div className="border border-gray-200 rounded-xl p-4 flex items-center gap-4">
              <FileText className="w-6 h-6 text-orange-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {digitalFile ? digitalFile.name : existingDigitalFile?.split('/').pop()}
                </div>
                {digitalFile && <div className="text-xs text-gray-400">{formatFileSize(digitalFile.size)}</div>}
              </div>
              <button onClick={removeDigitalFile} className="p-1.5 text-red-400 hover:text-red-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <input ref={digitalFileInputRef} type="file" onChange={handleDigitalFileSelect} className="hidden" />
        </div>
      )}

      {/* Variants Card */}
      {type === 'physical' && (
        <div className="card mb-6 animate-in">
          <h2 className="text-lg font-semibold mb-1">Variants</h2>
          <p className="text-sm text-gray-500 mb-4">Add sizes, colors, or other options</p>

          {variants.length === 0 ? (
            <p className="text-sm text-gray-400">No variants added</p>
          ) : (
            <div className="space-y-3">
              {variants.map((variant, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input type="text" value={variant.name} onChange={(e) => updateVariant(index, 'name', e.target.value)} placeholder="e.g., Red / Large" className="input-field flex-1" />
                  <div className="flex items-center w-32">
                    <span className="bg-gray-50 px-3 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500 text-sm">₹</span>
                    <input type="number" value={variant.price} onChange={(e) => updateVariant(index, 'price', e.target.value)} placeholder="499" className="input-field rounded-l-none w-full" />
                  </div>
                  <button onClick={() => removeVariant(index)} className="p-2 text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button onClick={addVariant} className="btn-secondary text-sm py-2 px-4 mt-4 flex items-center gap-2">
            <Plus className="w-4 h-4" />Add Variant
          </button>
        </div>
      )}

      {/* Active Toggle */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Product Status</h3>
            <p className="text-sm text-gray-500">{isActive ? 'Visible on your store' : 'Hidden from your store'}</p>
          </div>
          <button
            onClick={() => setIsActive(!isActive)}
            className={`w-12 h-6 rounded-full transition-colors relative ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4 mt-8">
        <button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Saving...</> : 'Save Changes'}
        </button>
        <Link href="/dashboard/products" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Cancel</Link>
      </div>

      {/* Delete */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <h3 className="text-base font-semibold text-gray-700 mb-2">Delete Product</h3>
        <p className="text-sm text-gray-500 mb-4">Once deleted, this product cannot be recovered.</p>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3 px-6 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Trash2 className="w-5 h-5" />
          Delete Product
        </button>
      </div>
    </div>
  )
}
