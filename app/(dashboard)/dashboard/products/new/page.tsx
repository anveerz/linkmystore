'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { MAX_IMAGES_PER_PRODUCT, MAX_IMAGE_SIZE_MB } from '@/lib/constants'
import {
  ArrowLeft,
  Package,
  FileDown,
  Plus,
  X,
  Trash2,
  Loader2,
  Boxes,
  Sparkles,
  Tag,
  ChevronDown,
} from 'lucide-react'
import type { Variant, DigitalSubtype, CourseModule, AvailabilitySlot, MeetingPlatform, MembershipData } from '@/types'
import toast from 'react-hot-toast'

import DigitalTypeSelector from '@/components/products/digital-type-selector'
import DownloadForm from '@/components/products/forms/download-form'
import CourseForm from '@/components/products/forms/course-form'
import CoachingForm from '@/components/products/forms/coaching-form'
import CalendarForm from '@/components/products/forms/calendar-form'
import LeadMagnetForm from '@/components/products/forms/lead-magnet-form'
import MembershipForm from '@/components/products/forms/membership-form'
import TemplateLibraryForm from '@/components/products/forms/template-library-form'

const PHYSICAL_CATEGORIES = [
  'Jewellery & Accessories', 'Clothing & Fashion', 'Home Decor & Furnishing',
  'Art & Craft', 'Food & Beverages', 'Beauty & Skincare', 'Books & Stationery',
  'Toys & Games', 'Electronics & Gadgets', 'Sports & Fitness', 'Baby & Kids',
  'Pet Supplies', 'Plants & Gardening', 'Health & Wellness', 'Gift Hampers', 'Handmade & Artisan',
]

type Step = 'type' | 'digital-subtype' | 'form'

export default function AddProductPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasInitializedFromQuery = useRef(false)

  // Step state
  const [step, setStep] = useState<Step>('type')
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [creatorId, setCreatorId] = useState<string | null>(null)

  // Product type
  const [type, setType] = useState<'physical' | 'digital'>(
    (searchParams.get('type') as 'physical' | 'digital') || 'physical'
  )
  const [digitalSubtype, setDigitalSubtype] = useState<DigitalSubtype>('download')

  // Common fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [comparePrice, setComparePrice] = useState('')
  const [category, setCategory] = useState('')
  const [stock, setStock] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)

  // Digital download files
  const [digitalFiles, setDigitalFiles] = useState<File[]>([])

  // Physical product
  const [variants, setVariants] = useState<{ name: string; price: string }[]>([])

  // Course state
  const [modules, setModules] = useState<CourseModule[]>([])
  const [dripEnabled, setDripEnabled] = useState(false)
  const [dripIntervalDays, setDripIntervalDays] = useState('')

  // Coaching/Calendar state
  const [duration, setDuration] = useState(30)
  const [sessionType, setSessionType] = useState<'1on1' | 'group'>('1on1')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [platform, setPlatform] = useState<MeetingPlatform>('google_meet')
  const [meetingLink, setMeetingLink] = useState('')
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
  const [bufferMinutes, setBufferMinutes] = useState('15')
  const [advanceBookingDays, setAdvanceBookingDays] = useState('30')
  const [minNoticeHours, setMinNoticeHours] = useState('24')

  // Membership state
  const [billingPeriod, setBillingPeriod] = useState<MembershipData['billing_period']>('monthly')
  const [benefits, setBenefits] = useState<string[]>([])
  const [contentFiles, setContentFiles] = useState<File[]>([])

  // Template library state
  const [templates, setTemplates] = useState<{ file: File; name: string; category: string }[]>([])

  const fetchCreator = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: creator } = await supabase.from('creators').select('id').eq('user_id', user.id).single()
      if (creator) setCreatorId(creator.id)
    } catch (error) {
      console.error('Error fetching creator:', error)
      toast.error('Failed to load creator data')
    }
  }, [router, supabase])

  useEffect(() => {
    void fetchCreator()
  }, [fetchCreator])

  useEffect(() => {
    // Hydrate initial wizard step from query params once (used by onboarding redirects).
    if (hasInitializedFromQuery.current) return
    hasInitializedFromQuery.current = true

    const queryType = searchParams.get('type')
    const querySubtype = searchParams.get('subtype')
    const validSubtypes: DigitalSubtype[] = [
      'download',
      'course',
      'coaching',
      'calendar',
      'lead_magnet',
      'membership',
      'webinar',
      'template_library',
    ]

    if (queryType === 'physical') {
      setType('physical')
      setStep('form')
      return
    }

    if (queryType === 'digital') {
      setType('digital')
      if (querySubtype && validSubtypes.includes(querySubtype as DigitalSubtype)) {
        setDigitalSubtype(querySubtype as DigitalSubtype)
        setStep('form')
      } else {
        setStep('digital-subtype')
      }
    }
  }, [searchParams])

  useEffect(() => {
    const handleClickOutside = () => setShowCategoryDropdown(false)
    if (showCategoryDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showCategoryDropdown])

  // --- Physical product helpers ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (images.length + files.length > MAX_IMAGES_PER_PRODUCT) {
      toast.error(`Maximum ${MAX_IMAGES_PER_PRODUCT} images allowed`)
      return
    }
    for (const file of files) {
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) continue
      setImages(prev => [...prev, file])
      setImagePreviews(prev => [...prev, URL.createObjectURL(file)])
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index])
    setImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const addVariant = () => setVariants(prev => [...prev, { name: '', price: '' }])
  const removeVariant = (index: number) => setVariants(prev => prev.filter((_, i) => i !== index))
  const updateVariant = (index: number, field: 'name' | 'price', value: string) => {
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v))
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
    if (!title.trim()) { toast.error('Please enter a title first'); return }
    setAiLoading(true)
    try {
      let imageBase64: string | undefined
      let imageMimeType: string | undefined
      if (images.length > 0) {
        imageBase64 = await fileToBase64(images[0])
        imageMimeType = images[0].type || 'image/jpeg'
      }
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

  // --- Type selection handlers ---
  const handleTypeSelect = (selectedType: 'physical' | 'digital') => {
    setType(selectedType)
    if (selectedType === 'physical') {
      setStep('form')
    }
  }

  const handleDigitalSubtypeSelect = (subtype: DigitalSubtype) => {
    setDigitalSubtype(subtype)
    setStep('form')
  }

  const handleContinueToDigitalSubtype = () => {
    setStep('digital-subtype')
  }

  // --- Submit ---
  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Product title is required'); return }
    if (!creatorId) { toast.error('Creator not found'); return }

    const isLeadMagnet = type === 'digital' && digitalSubtype === 'lead_magnet'
    if (!isLeadMagnet && (!price || parseFloat(price) <= 0)) {
      toast.error('Please set a valid price')
      return
    }

    // Validate cover image - required for all products
    if (images.length === 0) {
      toast.error('Please upload at least one cover image for your product')
      return
    }

    // Validate digital files for product types that require them
    if (type === 'digital') {
      const requiresFiles = ['download', 'lead_magnet', 'webinar']
      
      if (requiresFiles.includes(digitalSubtype) && digitalFiles.length === 0) {
        toast.error('Please upload at least one digital file for this product type')
        return
      }
      
      if (digitalSubtype === 'template_library' && templates.length === 0) {
        toast.error('Please add at least one template file')
        return
      }
      
      // Membership content files are optional - membership can be benefits-only
    }

    setLoading(true)

    try {
      // Upload images
      const imageUrls: string[] = []
      for (const image of images) {
        const ext = image.name.split('.').pop() || 'jpg'
        const path = `products/${creatorId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { data, error } = await supabase.storage.from('product-images').upload(path, image, { cacheControl: '3600', upsert: false })
        if (error) { toast.error(`Image upload failed: ${error.message}`); setLoading(false); return }
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(data.path)
        imageUrls.push(urlData.publicUrl)
      }

      // Upload digital files
      const digitalFileUrls: string[] = []
      const allFiles = [...digitalFiles, ...templates.map(t => t.file), ...contentFiles]
      for (const file of allFiles) {
        const path = `files/${creatorId}/${Date.now()}-${file.name}`
        const { data, error } = await supabase.storage.from('digital-files').upload(path, file, { cacheControl: '3600', upsert: false })
        if (error) { toast.error(`File upload failed: ${error.message}`); setLoading(false); return }
        digitalFileUrls.push(data.path)
      }

      const priceInPaisa = isLeadMagnet ? 0 : Math.round(parseFloat(price) * 100)
      const comparePriceInPaisa = comparePrice ? Math.round(parseFloat(comparePrice) * 100) : null
      const stockValue = stock.trim() === '' ? null : parseInt(stock, 10)

      const formattedVariants: Variant[] = variants
        .filter(v => v.name.trim())
        .map(v => ({ name: v.name.trim(), price: v.price ? Math.round(parseFloat(v.price) * 100) : undefined }))

      // Build subtype-specific data
      let courseData = null
      let coachingData = null
      let calendarData = null
      let membershipData = null
      let templateFilesData = null

      if (type === 'digital') {
        if (digitalSubtype === 'course') {
          courseData = {
            modules,
            drip_enabled: dripEnabled,
            drip_interval_days: dripIntervalDays ? parseInt(dripIntervalDays) : undefined,
            total_lessons: modules.reduce((sum, m) => sum + m.lessons.length, 0),
          }
        }

        if (digitalSubtype === 'coaching') {
          coachingData = {
            duration_minutes: duration,
            session_type: sessionType,
            max_participants: maxParticipants ? parseInt(maxParticipants) : undefined,
            meeting_platform: platform,
            meeting_link: meetingLink || undefined,
            availability,
            buffer_minutes: parseInt(bufferMinutes) || 15,
            advance_booking_days: parseInt(advanceBookingDays) || 30,
            min_notice_hours: parseInt(minNoticeHours) || 24,
          }
        }

        if (digitalSubtype === 'calendar') {
          calendarData = {
            duration_minutes: duration,
            meeting_platform: platform,
            meeting_link: meetingLink || undefined,
            availability,
            buffer_minutes: parseInt(bufferMinutes) || 15,
            advance_booking_days: parseInt(advanceBookingDays) || 30,
            min_notice_hours: parseInt(minNoticeHours) || 24,
          }
        }

        if (digitalSubtype === 'membership') {
          membershipData = {
            billing_period: billingPeriod,
            benefits: benefits.filter(b => b.trim()),
            content_file_urls: digitalFileUrls.slice(0, contentFiles.length),
          }
        }

        if (digitalSubtype === 'template_library') {
          templateFilesData = templates.map((t, i) => ({
            id: Math.random().toString(36).slice(2, 10),
            name: t.name,
            file_url: digitalFileUrls[i] || '',
            category: t.category || undefined,
          }))
        }
      }

      const productData: Record<string, unknown> = {
        creator_id: creatorId,
        title: title.trim(),
        description: description.trim() || null,
        price: priceInPaisa,
        compare_price: comparePriceInPaisa,
        type,
        ...(type === 'digital' && { digital_subtype: digitalSubtype }),
        images: imageUrls,
        variants: formattedVariants,
        digital_file_url: digitalFileUrls[0] || null,
        digital_file_urls: digitalFileUrls.length > 0 ? digitalFileUrls : null,
        category: category.trim() || null,
        stock: stockValue,
        is_active: isActive,
        is_lead_magnet: isLeadMagnet,
        sort_order: 0,
        course_data: courseData,
        coaching_data: coachingData,
        calendar_data: calendarData,
        membership_data: membershipData,
        template_files: templateFilesData,
      }

      const { error } = await supabase.from('products').insert(productData)

      if (error) {
        toast.error(`Failed to save product: ${error.message}`)
        setLoading(false)
        return
      }

      toast.success('Product added! 🎉')
      router.push('/dashboard/products')
    } catch (error) {
      console.error('Error adding product:', error)
      toast.error('Failed to add product')
    } finally {
      setLoading(false)
    }
  }

  // --- Render ---
  const getStepTitle = () => {
    if (step === 'type') return 'Add Product'
    if (step === 'digital-subtype') return 'Choose Digital Product Type'
    if (type === 'physical') return 'Add Physical Product'
    const subtypeLabels: Record<DigitalSubtype, string> = {
      download: 'Digital Download',
      course: 'Online Course',
      coaching: '1-on-1 Coaching',
      calendar: 'Calendar Booking',
      lead_magnet: 'Lead Magnet',
      membership: 'Membership',
      webinar: 'Webinar',
      template_library: 'Template Library',
    }
    return `Add ${subtypeLabels[digitalSubtype]}`
  }

  const handleBack = () => {
    if (step === 'form' && type === 'digital') setStep('digital-subtype')
    else if (step === 'digital-subtype') setStep('type')
    else if (step === 'form' && type === 'physical') setStep('type')
    else router.push('/dashboard/products')
  }

  return (
    <div className="max-w-2xl">
      {/* Top Bar */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">{getStepTitle()}</h1>
      </div>

      {/* Step 1: Product Type */}
      {step === 'type' && (
        <div className="card animate-in">
          <h2 className="text-lg font-semibold mb-4">What are you selling?</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => { handleTypeSelect('physical'); }}
              className={`cursor-pointer rounded-xl border-2 p-5 transition-all text-left ${type === 'physical' && step === 'type'
                ? 'border-orange-500 bg-orange-50/50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <Package className="w-8 h-8 mb-3 text-gray-700" />
              <div className="font-semibold text-sm">Physical Product</div>
              <div className="text-xs text-gray-500 mt-1">Jewellery, clothing, crafts...</div>
            </button>
            <button
              onClick={() => { setType('digital'); handleContinueToDigitalSubtype(); }}
              className={`cursor-pointer rounded-xl border-2 p-5 transition-all text-left ${type === 'digital'
                ? 'border-orange-500 bg-orange-50/50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <FileDown className="w-8 h-8 mb-3 text-gray-700" />
              <div className="font-semibold text-sm">Digital Product</div>
              <div className="text-xs text-gray-500 mt-1">Courses, coaching, downloads...</div>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Digital Subtype Selection */}
      {step === 'digital-subtype' && (
        <div className="card animate-in">
          <DigitalTypeSelector
            onSelect={handleDigitalSubtypeSelect}
            selected={digitalSubtype}
          />
        </div>
      )}

      {/* Step 3: Form */}
      {step === 'form' && (
        <>
          {/* Physical Product Form */}
          {type === 'physical' && (
            <div className="space-y-6">
              {/* Details */}
              <div className="card animate-in">
                <h2 className="text-lg font-semibold mb-4">Product Details</h2>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Title <span className="text-red-500">*</span></label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Handmade Silver Necklace" className="input-field" />
                </div>
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
                      {aiLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><Sparkles className="w-3.5 h-3.5" /> {images.length > 0 ? 'Generate from Image' : 'Generate with AI'}</>}
                    </button>
                  </div>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your product..." rows={4} className="input-field resize-none" />
                </div>
                <div className="mt-4 relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium">Category</label>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setShowCategoryDropdown(!showCategoryDropdown) }} className="flex items-center gap-1 text-xs text-orange-600 font-medium hover:text-orange-700">
                      <Tag className="w-3.5 h-3.5" /> Browse
                    </button>
                  </div>
                  <div className="relative">
                    <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Select or type a category" className="input-field pr-10" />
                    <button type="button" onClick={(e) => { e.stopPropagation(); setShowCategoryDropdown(!showCategoryDropdown) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  {showCategoryDropdown && (
                    <div className="absolute z-[9999] mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                      <div className="p-2 max-h-48 overflow-y-auto">
                        {PHYSICAL_CATEGORIES.map((cat) => (
                          <button key={cat} type="button" onClick={() => { setCategory(cat); setShowCategoryDropdown(false) }} className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${category === cat ? 'bg-orange-50 text-orange-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div className="card animate-in-delay-1">
                <h2 className="text-lg font-semibold mb-4">Pricing</h2>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Price <span className="text-red-500">*</span></label>
                  <div className="flex">
                    <span className="bg-gray-50 px-4 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500 font-semibold">₹</span>
                    <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="499" min="1" className="input-field rounded-l-none" />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1.5">Compare at Price <span className="text-gray-400 font-normal">(optional)</span></label>
                  <div className="flex">
                    <span className="bg-gray-50 px-4 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500 font-semibold">₹</span>
                    <input type="number" value={comparePrice} onChange={(e) => setComparePrice(e.target.value)} placeholder="699" min="0" className="input-field rounded-l-none" />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1.5">Stock Quantity <span className="text-gray-400 font-normal">(optional)</span></label>
                  <div className="flex">
                    <span className="bg-gray-50 px-4 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500"><Boxes className="w-5 h-5" /></span>
                    <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Leave empty for unlimited" min="0" className="input-field rounded-l-none" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Leave empty for unlimited. Shows &quot;Only X left!&quot; when &lt;= 5.</p>
                </div>
              </div>

              {/* Images */}
              <div className="card animate-in-delay-2">
                <h2 className="text-lg font-semibold mb-1">Product Images</h2>
                <p className="text-sm text-gray-500 mb-4">Upload up to {MAX_IMAGES_PER_PRODUCT} images. First image is the cover.</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {imagePreviews.map((preview, i) => (
                    <div key={i} className="w-full aspect-square rounded-xl border border-gray-200 relative overflow-hidden">
                      <Image src={preview} alt="" width={400} height={400} unoptimized className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(i)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"><X className="w-3 h-3" /></button>
                      {i === 0 && <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">Cover</span>}
                    </div>
                  ))}
                  {images.length < MAX_IMAGES_PER_PRODUCT && (
                    <button onClick={() => fileInputRef.current?.click()} className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-400 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50">
                      <Plus className="w-6 h-6 text-gray-400" /><span className="text-xs text-gray-500 mt-1">Add</span>
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageSelect} className="hidden" />
              </div>

              {/* Variants */}
              <div className="card animate-in-delay-3">
                <h2 className="text-lg font-semibold mb-1">Variants</h2>
                <p className="text-sm text-gray-500 mb-4">Add sizes, colors, or other options</p>
                {variants.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {variants.map((variant, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <input type="text" value={variant.name} onChange={(e) => updateVariant(i, 'name', e.target.value)} placeholder="e.g., Red / Large" className="input-field flex-1" />
                        <div className="flex items-center w-32">
                          <span className="bg-gray-50 px-3 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500 text-sm">₹</span>
                          <input type="number" value={variant.price} onChange={(e) => updateVariant(i, 'price', e.target.value)} placeholder="499" className="input-field rounded-l-none w-full" />
                        </div>
                        <button onClick={() => removeVariant(i)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={addVariant} className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Add Variant</button>
              </div>
            </div>
          )}

          {/* Digital Product Forms */}
          {type === 'digital' && digitalSubtype === 'download' && (
            <DownloadForm
              title={title} setTitle={setTitle}
              description={description} setDescription={setDescription}
              price={price} setPrice={setPrice}
              comparePrice={comparePrice} setComparePrice={setComparePrice}
              digitalFiles={digitalFiles} setDigitalFiles={setDigitalFiles}
              images={images} setImages={setImages}
              imagePreviews={imagePreviews} setImagePreviews={setImagePreviews}
              category={category} setCategory={setCategory}
              onGenerateAI={generateWithAI} aiLoading={aiLoading}
            />
          )}

          {type === 'digital' && digitalSubtype === 'course' && (
            <CourseForm
              title={title} setTitle={setTitle}
              description={description} setDescription={setDescription}
              price={price} setPrice={setPrice}
              comparePrice={comparePrice} setComparePrice={setComparePrice}
              modules={modules} setModules={setModules}
              dripEnabled={dripEnabled} setDripEnabled={setDripEnabled}
              dripIntervalDays={dripIntervalDays} setDripIntervalDays={setDripIntervalDays}
              images={images} setImages={setImages}
              imagePreviews={imagePreviews} setImagePreviews={setImagePreviews}
              onGenerateAI={generateWithAI} aiLoading={aiLoading}
            />
          )}

          {type === 'digital' && digitalSubtype === 'coaching' && (
            <CoachingForm
              title={title} setTitle={setTitle}
              description={description} setDescription={setDescription}
              price={price} setPrice={setPrice}
              comparePrice={comparePrice} setComparePrice={setComparePrice}
              duration={duration} setDuration={setDuration}
              sessionType={sessionType} setSessionType={setSessionType}
              maxParticipants={maxParticipants} setMaxParticipants={setMaxParticipants}
              platform={platform} setPlatform={setPlatform}
              meetingLink={meetingLink} setMeetingLink={setMeetingLink}
              availability={availability} setAvailability={setAvailability}
              bufferMinutes={bufferMinutes} setBufferMinutes={setBufferMinutes}
              advanceBookingDays={advanceBookingDays} setAdvanceBookingDays={setAdvanceBookingDays}
              minNoticeHours={minNoticeHours} setMinNoticeHours={setMinNoticeHours}
              onGenerateAI={generateWithAI} aiLoading={aiLoading}
            />
          )}

          {type === 'digital' && digitalSubtype === 'calendar' && (
            <CalendarForm
              title={title} setTitle={setTitle}
              description={description} setDescription={setDescription}
              price={price} setPrice={setPrice}
              comparePrice={comparePrice} setComparePrice={setComparePrice}
              duration={duration} setDuration={setDuration}
              platform={platform} setPlatform={setPlatform}
              meetingLink={meetingLink} setMeetingLink={setMeetingLink}
              availability={availability} setAvailability={setAvailability}
              bufferMinutes={bufferMinutes} setBufferMinutes={setBufferMinutes}
              advanceBookingDays={advanceBookingDays} setAdvanceBookingDays={setAdvanceBookingDays}
              minNoticeHours={minNoticeHours} setMinNoticeHours={setMinNoticeHours}
              onGenerateAI={generateWithAI} aiLoading={aiLoading}
            />
          )}

          {type === 'digital' && digitalSubtype === 'lead_magnet' && (
            <LeadMagnetForm
              title={title} setTitle={setTitle}
              description={description} setDescription={setDescription}
              digitalFiles={digitalFiles} setDigitalFiles={setDigitalFiles}
              images={images} setImages={setImages}
              imagePreviews={imagePreviews} setImagePreviews={setImagePreviews}
              onGenerateAI={generateWithAI} aiLoading={aiLoading}
            />
          )}

          {type === 'digital' && digitalSubtype === 'membership' && (
            <MembershipForm
              title={title} setTitle={setTitle}
              description={description} setDescription={setDescription}
              price={price} setPrice={setPrice}
              billingPeriod={billingPeriod} setBillingPeriod={setBillingPeriod}
              benefits={benefits} setBenefits={setBenefits}
              images={images} setImages={setImages}
              imagePreviews={imagePreviews} setImagePreviews={setImagePreviews}
              contentFiles={contentFiles} setContentFiles={setContentFiles}
              onGenerateAI={generateWithAI} aiLoading={aiLoading}
            />
          )}

          {type === 'digital' && (digitalSubtype === 'webinar') && (
            <DownloadForm
              title={title} setTitle={setTitle}
              description={description} setDescription={setDescription}
              price={price} setPrice={setPrice}
              comparePrice={comparePrice} setComparePrice={setComparePrice}
              digitalFiles={digitalFiles} setDigitalFiles={setDigitalFiles}
              images={images} setImages={setImages}
              imagePreviews={imagePreviews} setImagePreviews={setImagePreviews}
              category={category} setCategory={setCategory}
              onGenerateAI={generateWithAI} aiLoading={aiLoading}
            />
          )}

          {type === 'digital' && digitalSubtype === 'template_library' && (
            <TemplateLibraryForm
              title={title} setTitle={setTitle}
              description={description} setDescription={setDescription}
              price={price} setPrice={setPrice}
              comparePrice={comparePrice} setComparePrice={setComparePrice}
              templates={templates} setTemplates={setTemplates}
              images={images} setImages={setImages}
              imagePreviews={imagePreviews} setImagePreviews={setImagePreviews}
              onGenerateAI={generateWithAI} aiLoading={aiLoading}
            />
          )}

          {/* Active Toggle */}
          <div className="card mt-6">
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
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</> : 'Save Product'}
            </button>
            <button onClick={handleBack} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
          </div>
        </>
      )}
    </div>
  )
}
