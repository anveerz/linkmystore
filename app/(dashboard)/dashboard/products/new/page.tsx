'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  FREE_PRODUCT_LIMIT,
  MAX_IMAGES_PER_PRODUCT,
  MAX_IMAGE_SIZE_MB,
  PLAN_FEATURES,
  type ProductTypeShowcaseCard,
} from '@/lib/constants'
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Loader2,
  Lock,
  Plus,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type {
  AvailabilitySlot,
  CourseModule,
  DigitalSubtype,
  MeetingPlatform,
  MembershipData,
  PhysicalSubtype,
  Variant,
} from '@/types'
import ProductTypeShowcase from '@/components/products/ProductTypeShowcase'
import DigitalTypeSelector from '@/components/products/digital-type-selector'
import DownloadForm from '@/components/products/forms/download-form'
import CourseForm from '@/components/products/forms/course-form'
import CoachingForm from '@/components/products/forms/coaching-form'
import CalendarForm from '@/components/products/forms/calendar-form'
import LeadMagnetForm from '@/components/products/forms/lead-magnet-form'
import MembershipForm from '@/components/products/forms/membership-form'
import TemplateLibraryForm from '@/components/products/forms/template-library-form'

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

type Step = 'showcase' | 'digital-subtype' | 'form'

interface EditableCustomizationOption {
  id: string
  label: string
  priceDelta: string
}

interface EditableCustomizationGroup {
  id: string
  name: string
  required: boolean
  options: EditableCustomizationOption[]
}

interface AffiliatePreview {
  platform: string
  platform_name: string
  title: string
  description: string | null
  image: string | null
  price_in_paisa: number | null
  price: string | null
  metadata_available: boolean
  warning: string | null
}

interface AffiliateDraft {
  title: string
  description: string
  imageUrl: string
  price: string
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function formatAffiliatePriceInput(priceInPaisa: number | null) {
  if (!priceInPaisa || priceInPaisa <= 0) return ''
  return (priceInPaisa / 100).toFixed(2)
}

function buildAffiliateDraft(preview: AffiliatePreview): AffiliateDraft {
  return {
    title: preview.title || '',
    description: preview.description || '',
    imageUrl: preview.image || '',
    price: formatAffiliatePriceInput(preview.price_in_paisa),
  }
}

function isCreatorDeal(subtype: PhysicalSubtype) {
  return subtype === 'creator_deal'
}

function isCustomUploadSubtype(subtype: PhysicalSubtype) {
  return subtype === 'custom_photoframe' || subtype === 'portrait_canvas'
}

function defaultCustomizationGroups(subtype: PhysicalSubtype): EditableCustomizationGroup[] {
  if (subtype === 'custom_photoframe') {
    return [
      {
        id: uid('group'),
        name: 'Size',
        required: true,
        options: [
          { id: uid('opt'), label: '8x10 inch', priceDelta: '0' },
          { id: uid('opt'), label: '12x18 inch', priceDelta: '199' },
        ],
      },
      {
        id: uid('group'),
        name: 'Frame Material',
        required: true,
        options: [
          { id: uid('opt'), label: 'Wood', priceDelta: '0' },
          { id: uid('opt'), label: 'Metal', priceDelta: '249' },
        ],
      },
      {
        id: uid('group'),
        name: 'Edit Needed',
        required: true,
        options: [
          { id: uid('opt'), label: 'No editing', priceDelta: '0' },
          { id: uid('opt'), label: 'Basic editing', priceDelta: '149' },
        ],
      },
    ]
  }

  return [
    {
      id: uid('group'),
      name: 'Size',
      required: true,
      options: [
        { id: uid('opt'), label: 'A4', priceDelta: '0' },
        { id: uid('opt'), label: 'A3', priceDelta: '499' },
      ],
    },
    {
      id: uid('group'),
      name: 'Canvas / Material',
      required: true,
      options: [
        { id: uid('opt'), label: 'Standard canvas', priceDelta: '0' },
        { id: uid('opt'), label: 'Premium canvas', priceDelta: '399' },
      ],
    },
    {
      id: uid('group'),
      name: 'Quality / Detail',
      required: true,
      options: [
        { id: uid('opt'), label: 'Standard detail', priceDelta: '0' },
        { id: uid('opt'), label: 'Ultra detail', priceDelta: '699' },
      ],
    },
  ]
}

const MISSING_PRODUCTS_COLUMN_RE = /Could not find the '([^']+)' column of 'products' in the schema cache/i
const FALLBACK_PRODUCTS_COLUMNS = new Set(['physical_subtype', 'deal_data', 'customization_config'])
const FREE_PLAN_LIMIT_ERROR_TOKEN = 'FREE_PLAN_PRODUCT_LIMIT_REACHED'

function getMissingProductsColumn(errorMessage: string): string | null {
  const match = errorMessage.match(MISSING_PRODUCTS_COLUMN_RE)
  return match?.[1] || null
}

function mapProductInsertError(errorMessage: string): string {
  if (errorMessage.includes(FREE_PLAN_LIMIT_ERROR_TOKEN)) {
    return `Free plan allows up to ${FREE_PRODUCT_LIMIT} own products. Upgrade to Pro for unlimited products.`
  }
  return errorMessage
}

export default function AddProductPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasInitializedFromQuery = useRef(false)
  const affiliatePreviewRequestRef = useRef(0)

  const [step, setStep] = useState<Step>('showcase')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [creatorId, setCreatorId] = useState<string | null>(null)

  const [creatorPlan, setCreatorPlan] = useState<'free' | 'pro'>('free')
  const [productCount, setProductCount] = useState(0)
  const [limitReached, setLimitReached] = useState(false)

  const [type, setType] = useState<'physical' | 'digital' | 'affiliate'>('physical')
  const [digitalSubtype, setDigitalSubtype] = useState<DigitalSubtype>('download')
  const [physicalSubtype, setPhysicalSubtype] = useState<PhysicalSubtype>('standard')

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

  const [variants, setVariants] = useState<{ name: string; price: string }[]>([])
  const [dealExternalUrl, setDealExternalUrl] = useState('')
  const [dealCouponCode, setDealCouponCode] = useState('')
  const [dealCouponNote, setDealCouponNote] = useState('')
  const [dealLabel, setDealLabel] = useState('Must-Buy')
  const [customizationGroups, setCustomizationGroups] = useState<EditableCustomizationGroup[]>([])

  const [digitalFiles, setDigitalFiles] = useState<File[]>([])
  const [modules, setModules] = useState<CourseModule[]>([])
  const [dripEnabled, setDripEnabled] = useState(false)
  const [dripIntervalDays, setDripIntervalDays] = useState('')

  const [duration, setDuration] = useState(30)
  const [counsellingDurationOptions, setCounsellingDurationOptions] = useState<
    Array<{ id: string; durationMinutes: string; price: string; label: string }>
  >([
    {
      id: uid('duration'),
      durationMinutes: '30',
      price: '',
      label: '',
    },
  ])
  const [platform, setPlatform] = useState<MeetingPlatform>('google_meet')
  const [meetingLink, setMeetingLink] = useState('')
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
  const [bufferMinutes, setBufferMinutes] = useState('15')
  const [advanceBookingDays, setAdvanceBookingDays] = useState('30')
  const [minNoticeHours, setMinNoticeHours] = useState('24')

  const [billingPeriod, setBillingPeriod] = useState<MembershipData['billing_period']>('monthly')
  const [benefits, setBenefits] = useState<string[]>([])
  const [contentFiles, setContentFiles] = useState<File[]>([])
  const [templates, setTemplates] = useState<{ file: File; name: string; category: string }[]>([])

  const [affiliateUrl, setAffiliateUrl] = useState('')
  const [affiliatePreview, setAffiliatePreview] = useState<AffiliatePreview | null>(null)
  const [affiliatePreviewUrl, setAffiliatePreviewUrl] = useState('')
  const [affiliatePreviewLoading, setAffiliatePreviewLoading] = useState(false)
  const [affiliatePreviewError, setAffiliatePreviewError] = useState<string | null>(null)
  const [affiliateDraft, setAffiliateDraft] = useState<AffiliateDraft>({
    title: '',
    description: '',
    imageUrl: '',
    price: '',
  })

  const fetchCreator = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: creator } = await supabase
        .from('creators')
        .select('id, plan')
        .eq('user_id', user.id)
        .single()

      if (!creator) {
        router.push('/onboarding')
        return
      }

      setCreatorId(creator.id)
      const plan = (creator.plan as 'free' | 'pro') || 'free'
      setCreatorPlan(plan)

      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creator.id)
        .eq('is_active', true)
        .or('is_affiliate.is.null,is_affiliate.eq.false')

      const currentCount = count ?? 0
      setProductCount(currentCount)
      setLimitReached(currentCount >= PLAN_FEATURES[plan].maxProducts)
    } catch (error) {
      console.error('Error fetching creator:', error)
      toast.error('Failed to load creator data')
    }
  }, [router, supabase])

  useEffect(() => {
    void fetchCreator()
  }, [fetchCreator])

  useEffect(() => {
    if (hasInitializedFromQuery.current) return
    hasInitializedFromQuery.current = true

    const queryType = searchParams.get('type')
    const querySubtype = searchParams.get('subtype')
    const queryPhysicalSubtype = searchParams.get('physical_subtype') as PhysicalSubtype | null

    const validSubtypes: DigitalSubtype[] = ['download', 'course', 'coaching', 'calendar', 'lead_magnet', 'membership', 'webinar', 'template_library']
    const validPhysical: PhysicalSubtype[] = ['standard', 'creator_deal', 'custom_photoframe', 'portrait_canvas']

    if (queryType === 'affiliate') {
      setType('affiliate')
      setStep('form')
      setSelectedCardId('affiliate')
      return
    }

    if (queryType === 'physical') {
      const selected = queryPhysicalSubtype && validPhysical.includes(queryPhysicalSubtype)
        ? queryPhysicalSubtype
        : 'standard'
      setType('physical')
      setPhysicalSubtype(selected)
      setStep('form')
      if (isCustomUploadSubtype(selected)) setCustomizationGroups(defaultCustomizationGroups(selected))
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
    const close = () => setShowCategoryDropdown(false)
    if (showCategoryDropdown) {
      document.addEventListener('click', close)
      return () => document.removeEventListener('click', close)
    }
  }, [showCategoryDropdown])

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (images.length + files.length > MAX_IMAGES_PER_PRODUCT) {
      toast.error(`Maximum ${MAX_IMAGES_PER_PRODUCT} images allowed`)
      return
    }

    const accepted: File[] = []
    const previews: string[] = []
    for (const file of files) {
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        toast.error(`Image too large: ${file.name}`)
        continue
      }
      accepted.push(file)
      previews.push(URL.createObjectURL(file))
    }

    setImages((prev) => [...prev, ...accepted])
    setImagePreviews((prev) => [...prev, ...previews])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index])
    setImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const addVariant = () => setVariants((prev) => [...prev, { name: '', price: '' }])
  const removeVariant = (index: number) => setVariants((prev) => prev.filter((_, i) => i !== index))
  const updateVariant = (index: number, field: 'name' | 'price', value: string) => {
    setVariants((prev) => prev.map((variant, i) => (i === index ? { ...variant, [field]: value } : variant)))
  }

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
  })

  const generateWithAI = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title first')
      return
    }

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
      toast.success('Description generated')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'AI generation failed')
    } finally {
      setAiLoading(false)
    }
  }

  const fetchAffiliatePreview = useCallback(async (rawUrl: string) => {
    const normalizedUrl = rawUrl.trim()
    if (!normalizedUrl) {
      setAffiliatePreview(null)
      setAffiliatePreviewUrl('')
      setAffiliatePreviewError(null)
      setAffiliateDraft({ title: '', description: '', imageUrl: '', price: '' })
      return null
    }

    const requestId = affiliatePreviewRequestRef.current + 1
    affiliatePreviewRequestRef.current = requestId
    setAffiliatePreviewLoading(true)
    setAffiliatePreviewError(null)

    try {
      const response = await fetch('/api/products/affiliate/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl }),
      })
      const data = await response.json()

      if (requestId !== affiliatePreviewRequestRef.current) {
        return null
      }

      if (!response.ok) {
        throw new Error(data.error || 'Could not fetch affiliate product details')
      }

      setAffiliatePreview(data.preview as AffiliatePreview)
      setAffiliatePreviewUrl(normalizedUrl)
      setAffiliatePreviewError(null)
      setAffiliateDraft(buildAffiliateDraft(data.preview as AffiliatePreview))
      return data.preview as AffiliatePreview
    } catch (error) {
      if (requestId === affiliatePreviewRequestRef.current) {
        setAffiliatePreview(null)
        setAffiliatePreviewUrl('')
        setAffiliatePreviewError(error instanceof Error ? error.message : 'Could not fetch affiliate product details')
        setAffiliateDraft({ title: '', description: '', imageUrl: '', price: '' })
      }
      return null
    } finally {
      if (requestId === affiliatePreviewRequestRef.current) {
        setAffiliatePreviewLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (type !== 'affiliate') return

    const normalizedUrl = affiliateUrl.trim()
    if (!normalizedUrl) {
      setAffiliatePreview(null)
      setAffiliatePreviewUrl('')
      setAffiliatePreviewError(null)
      setAffiliatePreviewLoading(false)
      setAffiliateDraft({ title: '', description: '', imageUrl: '', price: '' })
      return
    }

    if (normalizedUrl === affiliatePreviewUrl) {
      return
    }

    const timer = setTimeout(() => {
      void fetchAffiliatePreview(normalizedUrl)
    }, 600)

    return () => clearTimeout(timer)
  }, [affiliatePreviewUrl, affiliateUrl, fetchAffiliatePreview, type])

  const handleCardSelection = (card: ProductTypeShowcaseCard) => {
    if (card.proOnly && creatorPlan !== 'pro') {
      toast.error('Automations are available on Pro plan only')
      router.push('/dashboard/plan')
      return
    }

    if (card.id === 'automations') {
      router.push('/dashboard/automations')
      return
    }

    setSelectedCardId(card.id)

    if (card.type === 'affiliate') {
      setType('affiliate')
      setStep('form')
      setAffiliatePreview(null)
      setAffiliatePreviewUrl('')
      setAffiliatePreviewError(null)
      setAffiliateDraft({ title: '', description: '', imageUrl: '', price: '' })
      return
    }

    if (card.type === 'digital') {
      setType('digital')
      if (card.digitalSubtype) {
        setDigitalSubtype(card.digitalSubtype)
        setStep('form')
      } else {
        setStep('digital-subtype')
      }
      return
    }

    if (card.type === 'physical') {
      const selectedSubtype = card.physicalSubtype || 'standard'
      setType('physical')
      setPhysicalSubtype(selectedSubtype)
      setStep('form')
      setCustomizationGroups(isCustomUploadSubtype(selectedSubtype) ? defaultCustomizationGroups(selectedSubtype) : [])
    }
  }

  const handleDigitalSubtypeSelect = (subtype: DigitalSubtype) => {
    setType('digital')
    setDigitalSubtype(subtype)
    setStep('form')
  }

  const handleBack = () => {
    if (step === 'form') {
      setStep(selectedCardId ? 'showcase' : 'digital-subtype')
      return
    }
    if (step === 'digital-subtype') {
      setStep('showcase')
      return
    }
    router.push('/dashboard/products')
  }

  const handleSubmit = async () => {
    if (type === 'affiliate') {
      const normalizedUrl = affiliateUrl.trim()
      if (!normalizedUrl) {
        toast.error('Affiliate product URL is required')
        return
      }

      if (!affiliateDraft.title.trim()) {
        toast.error('Please review and enter an affiliate product title')
        return
      }

      let priceInPaisa: number | null = null
      if (affiliateDraft.price.trim()) {
        const parsedPrice = Number(affiliateDraft.price)
        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
          toast.error('Enter a valid affiliate price')
          return
        }
        priceInPaisa = Math.round(parsedPrice * 100)
      }

      setLoading(true)
      try {
        let preview = affiliatePreview
        if (!preview || affiliatePreviewUrl !== normalizedUrl) {
          preview = await fetchAffiliatePreview(normalizedUrl)
        }

        if (!preview) {
          throw new Error('Could not auto-fetch product details from this link')
        }

        const response = await fetch('/api/products/affiliate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: normalizedUrl,
            title: affiliateDraft.title.trim(),
            description: affiliateDraft.description.trim() || null,
            image_url: affiliateDraft.imageUrl.trim() || null,
            price_in_paisa: priceInPaisa,
          }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to create affiliate product')

        toast.success('Affiliate product added')
        router.push('/dashboard/products')
      } catch (error) {
        console.error(error)
        toast.error(error instanceof Error ? error.message : 'Failed to add affiliate product')
      } finally {
        setLoading(false)
      }
      return
    }

    if (!title.trim()) {
      toast.error('Product title is required')
      return
    }
    if (!creatorId) {
      toast.error('Creator not found')
      return
    }

    if (creatorPlan === 'free') {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creatorId)
        .eq('is_active', true)
        .or('is_affiliate.is.null,is_affiliate.eq.false')

      const currentCount = count ?? 0
      setProductCount(currentCount)
      setLimitReached(currentCount >= FREE_PRODUCT_LIMIT)

      if (currentCount >= FREE_PRODUCT_LIMIT) {
        toast.error(`Free plan allows up to ${FREE_PRODUCT_LIMIT} own products. Upgrade to Pro for unlimited products.`)
        return
      }
    }

    const isLeadMagnet = type === 'digital' && digitalSubtype === 'lead_magnet'
    const requiresDirectPrice = !isLeadMagnet && digitalSubtype !== 'coaching'
    if (requiresDirectPrice && (!price || parseFloat(price) <= 0)) {
      toast.error('Please set a valid price')
      return
    }
    if (images.length === 0) {
      toast.error('Please upload at least one cover image')
      return
    }

    if (type === 'physical' && isCreatorDeal(physicalSubtype)) {
      if (!dealExternalUrl.trim() || !dealCouponCode.trim()) {
        toast.error('Creator deal requires external URL and coupon code')
        return
      }
    }

    if (type === 'physical' && isCustomUploadSubtype(physicalSubtype)) {
      if (!customizationGroups.length || customizationGroups.some((group) => group.options.filter((option) => option.label.trim()).length === 0)) {
        toast.error('Each customization group needs at least one option')
        return
      }
    }

    if (type === 'digital') {
      if (['download', 'lead_magnet', 'webinar'].includes(digitalSubtype) && digitalFiles.length === 0) {
        toast.error('Please upload at least one digital file')
        return
      }
      if (digitalSubtype === 'template_library' && templates.length === 0) {
        toast.error('Please add at least one template')
        return
      }
    }

    setLoading(true)
    try {
      const imageUrls: string[] = []
      for (const image of images) {
        const ext = image.name.split('.').pop() || 'jpg'
        const path = `products/${creatorId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { data, error } = await supabase.storage.from('product-images').upload(path, image, { cacheControl: '3600', upsert: false })
        if (error) throw new Error(`Image upload failed: ${error.message}`)
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(data.path)
        imageUrls.push(urlData.publicUrl)
      }

      const digitalFileUrls: string[] = []
      const allFiles = [...digitalFiles, ...templates.map((template) => template.file), ...contentFiles]
      for (const file of allFiles) {
        const path = `files/${creatorId}/${Date.now()}-${file.name}`
        const { data, error } = await supabase.storage.from('digital-files').upload(path, file, { cacheControl: '3600', upsert: false })
        if (error) throw new Error(`File upload failed: ${error.message}`)
        digitalFileUrls.push(data.path)
      }

      const parsedCounsellingOptions =
        digitalSubtype === 'coaching'
          ? counsellingDurationOptions
            .map((row) => ({
              id: row.id,
              duration_minutes: Number(row.durationMinutes),
              price: Math.round((Number(row.price) || 0) * 100),
              label: row.label.trim() || undefined,
            }))
            .filter((row) => row.duration_minutes > 0 && row.price > 0)
          : []

      if (digitalSubtype === 'coaching' && parsedCounsellingOptions.length === 0) {
        throw new Error('Add at least one valid duration package for counselling')
      }

      const coachingBasePriceInPaisa =
        digitalSubtype === 'coaching' ? parsedCounsellingOptions[0].price : null

      const priceInPaisa = isLeadMagnet
        ? 0
        : (coachingBasePriceInPaisa ?? Math.round(parseFloat(price) * 100))
      const comparePriceInPaisa = comparePrice ? Math.round(parseFloat(comparePrice) * 100) : null
      const stockValue = stock.trim() === '' ? null : parseInt(stock, 10)
      const formattedVariants: Variant[] = variants.filter((variant) => variant.name.trim()).map((variant) => ({
        name: variant.name.trim(),
        price: variant.price ? Math.round(parseFloat(variant.price) * 100) : undefined,
      }))

      const productData: Record<string, unknown> = {
        creator_id: creatorId,
        title: title.trim(),
        description: description.trim() || null,
        price: priceInPaisa,
        compare_price: comparePriceInPaisa,
        type,
        ...(type === 'digital' && { digital_subtype: digitalSubtype }),
        ...(type === 'physical' && { physical_subtype: physicalSubtype }),
        images: imageUrls,
        variants: formattedVariants,
        digital_file_url: digitalFileUrls[0] || null,
        digital_file_urls: digitalFileUrls.length > 0 ? digitalFileUrls : null,
        category: category.trim() || null,
        stock: stockValue,
        is_active: isActive,
        is_lead_magnet: isLeadMagnet,
        sort_order: 0,
        course_data: digitalSubtype === 'course' ? {
          modules,
          drip_enabled: dripEnabled,
          drip_interval_days: dripIntervalDays ? parseInt(dripIntervalDays, 10) : undefined,
          total_lessons: modules.reduce((sum, module) => sum + module.lessons.length, 0),
        } : null,
        coaching_data: digitalSubtype === 'coaching' ? {
          duration_minutes: parsedCounsellingOptions[0]?.duration_minutes || 30,
          duration_options: parsedCounsellingOptions,
          meeting_platform: platform,
          meeting_link: meetingLink || undefined,
          availability,
          buffer_minutes: parseInt(bufferMinutes, 10) || 15,
          advance_booking_days: parseInt(advanceBookingDays, 10) || 30,
          min_notice_hours: parseInt(minNoticeHours, 10) || 24,
        } : null,
        calendar_data: digitalSubtype === 'calendar' ? {
          duration_minutes: duration,
          meeting_platform: platform,
          meeting_link: meetingLink || undefined,
          availability,
          buffer_minutes: parseInt(bufferMinutes, 10) || 15,
          advance_booking_days: parseInt(advanceBookingDays, 10) || 30,
          min_notice_hours: parseInt(minNoticeHours, 10) || 24,
        } : null,
        membership_data: digitalSubtype === 'membership' ? {
          billing_period: billingPeriod,
          benefits: benefits.filter((benefit) => benefit.trim()),
          content_file_urls: digitalFileUrls.slice(0, contentFiles.length),
        } : null,
        template_files: digitalSubtype === 'template_library' ? templates.map((template, index) => ({
          id: Math.random().toString(36).slice(2, 10),
          name: template.name,
          file_url: digitalFileUrls[index] || '',
          category: template.category || undefined,
        })) : null,
        deal_data: type === 'physical' && isCreatorDeal(physicalSubtype) ? {
          external_url: dealExternalUrl.trim(),
          coupon_code: dealCouponCode.trim().toUpperCase(),
          coupon_note: dealCouponNote.trim() || null,
          deal_label: dealLabel.trim() || 'Must-Buy',
        } : null,
        customization_config: type === 'physical' && isCustomUploadSubtype(physicalSubtype) ? {
          require_image_upload: true,
          max_images: 1,
          notes_enabled: true,
          option_groups: customizationGroups.map((group) => ({
            id: group.id,
            name: group.name,
            required: group.required,
            options: group.options.filter((option) => option.label.trim()).map((option) => ({
              id: option.id,
              label: option.label.trim(),
              price_delta: Math.round((Number(option.priceDelta) || 0) * 100),
            })),
          })),
        } : null,
      }

      const requiredColumnsForThisProduct = new Set<string>()
      if (type === 'physical' && physicalSubtype !== 'standard') {
        requiredColumnsForThisProduct.add('physical_subtype')
      }
      if (type === 'physical' && isCreatorDeal(physicalSubtype)) {
        requiredColumnsForThisProduct.add('deal_data')
      }
      if (type === 'physical' && isCustomUploadSubtype(physicalSubtype)) {
        requiredColumnsForThisProduct.add('customization_config')
      }

      let insertPayload: Record<string, unknown> = { ...productData }
      let productSaved = false

      for (let attempt = 0; attempt <= FALLBACK_PRODUCTS_COLUMNS.size; attempt += 1) {
        const { error } = await supabase.from('products').insert(insertPayload)
        if (!error) {
          productSaved = true
          break
        }

        const mappedError = mapProductInsertError(error.message || 'Failed to add product')
        if (mappedError !== error.message) {
          throw new Error(mappedError)
        }

        const missingColumn = getMissingProductsColumn(error.message || '')
        if (!missingColumn || !FALLBACK_PRODUCTS_COLUMNS.has(missingColumn)) {
          throw new Error(mappedError)
        }

        if (requiredColumnsForThisProduct.has(missingColumn)) {
          throw new Error(`Database migration is missing for "${missingColumn}". Run the latest products migration and retry.`)
        }

        const nextPayload = { ...insertPayload }
        delete nextPayload[missingColumn]
        insertPayload = nextPayload
      }

      if (!productSaved) {
        throw new Error('Could not save product due to schema mismatch. Please run latest database migration.')
      }

      toast.success('Product added')
      router.push('/dashboard/products')
    } catch (error) {
      console.error('Error adding product:', error)
      const message = error instanceof Error ? error.message : 'Failed to add product'
      if (message.includes('Free plan allows up to')) {
        setLimitReached(true)
      }
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const getStepTitle = () => {
    if (step === 'showcase') return 'Add Product'
    if (step === 'digital-subtype') return 'Choose Digital Product Type'
    if (type === 'affiliate') return 'Add Affiliate Product'
    if (type === 'physical' && isCreatorDeal(physicalSubtype)) return 'Add Creator Deal'
    if (type === 'physical' && physicalSubtype === 'custom_photoframe') return 'Add Custom Photoframe Product'
    if (type === 'physical' && physicalSubtype === 'portrait_canvas') return 'Add Portrait / Canvas Product'
    return type === 'physical' ? 'Add Physical Product' : 'Add Digital Product'
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8 flex items-center gap-4">
        <button onClick={handleBack} className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">{getStepTitle()}</h1>
          {creatorPlan === 'free' && <p className="text-sm text-gray-500">{productCount}/{FREE_PRODUCT_LIMIT} own products used on Free plan</p>}
        </div>
      </div>

      {limitReached && creatorPlan === 'free' && type !== 'affiliate' && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          <div className="flex items-center gap-2"><Lock className="h-4 w-4" /> Free plan product limit reached.</div>
          <Link href="/dashboard/plan" className="mt-2 inline-flex font-semibold text-[#4f7cff] hover:underline">Upgrade to Pro</Link>
        </div>
      )}

      {step === 'showcase' && <ProductTypeShowcase creatorPlan={creatorPlan} selectedId={selectedCardId} onSelect={handleCardSelection} />}

      {step === 'digital-subtype' && (
        <div className="card p-6">
          <DigitalTypeSelector onSelect={handleDigitalSubtypeSelect} selected={digitalSubtype} />
          <button type="button" onClick={() => setStep('form')} className="btn-primary mt-5 inline-flex items-center gap-2">
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === 'form' && (
        <>
          {type === 'physical' && (
            <div className="space-y-6">
              <div className="card">
                <h2 className="mb-4 text-lg font-semibold">Product Details</h2>
                <input value={title} onChange={(event) => setTitle(event.target.value)} className="input-field" placeholder="Product title" />
                <div className="mt-3 flex items-center justify-between">
                  <label className="text-sm font-medium">Description</label>
                  <button onClick={generateWithAI} disabled={aiLoading || !title.trim()} className="text-xs text-[#4f7cff]">{aiLoading ? 'Generating...' : 'Generate with AI'}</button>
                </div>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="input-field mt-1 resize-none" placeholder="Describe your product" />

                <div className="relative mt-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-sm font-medium">Category</label>
                    <button type="button" onClick={(event) => { event.stopPropagation(); setShowCategoryDropdown(!showCategoryDropdown) }} className="flex items-center gap-1 text-xs text-[#4f7cff]"><Tag className="h-3.5 w-3.5" /> Browse</button>
                  </div>
                  <div className="relative">
                    <input value={category} onChange={(event) => setCategory(event.target.value)} className="input-field pr-10" placeholder="Select or type category" />
                    <button type="button" onClick={(event) => { event.stopPropagation(); setShowCategoryDropdown(!showCategoryDropdown) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><ChevronDown className="h-4 w-4" /></button>
                  </div>
                  {showCategoryDropdown && (
                    <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl" onClick={(event) => event.stopPropagation()}>
                      {PHYSICAL_CATEGORIES.map((item) => (
                        <button key={item} type="button" onClick={() => { setCategory(item); setShowCategoryDropdown(false) }} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${category === item ? 'bg-[#edf2ff] text-[#355fe3]' : 'hover:bg-gray-50'}`}>{item}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <h2 className="mb-4 text-lg font-semibold">Pricing</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input type="number" value={price} onChange={(event) => setPrice(event.target.value)} className="input-field" placeholder="Price (INR)" />
                  <input type="number" value={comparePrice} onChange={(event) => setComparePrice(event.target.value)} className="input-field" placeholder="Compare price (optional)" />
                </div>
                {!isCreatorDeal(physicalSubtype) && <input type="number" value={stock} onChange={(event) => setStock(event.target.value)} className="input-field mt-3" placeholder="Stock (optional)" />}
              </div>

              {isCreatorDeal(physicalSubtype) && (
                <div className="card">
                  <h2 className="mb-4 text-lg font-semibold">Creator Deal Settings</h2>
                  <input value={dealExternalUrl} onChange={(event) => setDealExternalUrl(event.target.value)} className="input-field" placeholder="External deal URL" />
                  <input value={dealCouponCode} onChange={(event) => setDealCouponCode(event.target.value.toUpperCase())} className="input-field mt-3" placeholder="Coupon code" />
                  <input value={dealCouponNote} onChange={(event) => setDealCouponNote(event.target.value)} className="input-field mt-3" placeholder="Coupon note (optional)" />
                  <input value={dealLabel} onChange={(event) => setDealLabel(event.target.value)} className="input-field mt-3" placeholder="Deal label" />
                </div>
              )}

              {isCustomUploadSubtype(physicalSubtype) && (
                <div className="card">
                  <h2 className="mb-2 text-lg font-semibold">Customization Options</h2>
                  {customizationGroups.map((group, groupIndex) => (
                    <div key={group.id} className="mb-4 rounded-xl border border-gray-200 p-3">
                      <input
                        value={group.name}
                        onChange={(event) => setCustomizationGroups((prev) => prev.map((item, i) => i === groupIndex ? { ...item, name: event.target.value } : item))}
                        className="input-field"
                        placeholder="Group name"
                      />
                      <div className="mt-2 space-y-2">
                        {group.options.map((option, optionIndex) => (
                          <div key={option.id} className="flex gap-2">
                            <input value={option.label} onChange={(event) => setCustomizationGroups((prev) => prev.map((item, i) => i === groupIndex ? { ...item, options: item.options.map((opt, j) => j === optionIndex ? { ...opt, label: event.target.value } : opt) } : item))} className="input-field" placeholder="Option label" />
                            <input type="number" value={option.priceDelta} onChange={(event) => setCustomizationGroups((prev) => prev.map((item, i) => i === groupIndex ? { ...item, options: item.options.map((opt, j) => j === optionIndex ? { ...opt, priceDelta: event.target.value } : opt) } : item))} className="input-field w-28" placeholder="+INR" />
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => setCustomizationGroups((prev) => prev.map((item, i) => i === groupIndex ? { ...item, options: [...item.options, { id: uid('opt'), label: '', priceDelta: '0' }] } : item))} className="btn-secondary mt-2 text-xs">Add Option</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="card">
                <h2 className="mb-1 text-lg font-semibold">Product Images</h2>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {imagePreviews.map((preview, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-gray-200">
                      <Image src={preview} alt="" width={400} height={400} unoptimized className="h-full w-full object-cover" />
                      <button onClick={() => removeImage(i)} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES_PER_PRODUCT && (
                    <button onClick={() => fileInputRef.current?.click()} className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50"><Plus className="h-6 w-6 text-gray-400" /></button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageSelect} className="hidden" />
              </div>

              {!isCreatorDeal(physicalSubtype) && (
                <div className="card">
                  <h2 className="mb-1 text-lg font-semibold">Variants</h2>
                  {variants.map((variant, i) => (
                    <div key={i} className="mb-2 flex items-center gap-2">
                      <input value={variant.name} onChange={(event) => updateVariant(i, 'name', event.target.value)} className="input-field" placeholder="Variant name" />
                      <input type="number" value={variant.price} onChange={(event) => updateVariant(i, 'price', event.target.value)} className="input-field w-32" placeholder="Price" />
                      <button onClick={() => removeVariant(i)} className="rounded-lg p-2 text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                  <button onClick={addVariant} className="btn-secondary text-xs">Add Variant</button>
                </div>
              )}
            </div>
          )}

          {type === 'affiliate' && (
            <div className="card">
              <h2 className="mb-4 text-lg font-semibold">Affiliate Product Link</h2>
              <p className="mb-3 text-sm text-gray-600">
                Paste the product URL, let LinkMyStore fetch what it can, then review the details before saving.
              </p>
              <input
                value={affiliateUrl}
                onChange={(event) => setAffiliateUrl(event.target.value)}
                className="input-field"
                placeholder="https://www.amazon.in/... or https://www.flipkart.com/..."
              />

              {affiliatePreviewLoading && (
                <div className="mt-3 inline-flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching product details...
                </div>
              )}

              {affiliatePreviewError && (
                <p className="mt-3 text-sm text-red-600">{affiliatePreviewError}</p>
              )}

              {affiliatePreview && (
                <div className="mt-4 space-y-4 rounded-2xl border border-[#d7e0f4] bg-[#f8fbff] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#556486]">
                        {affiliatePreview.platform_name}
                      </p>
                      <p className="mt-1 text-sm text-[#64748b]">
                        Review the listing details before this affiliate product goes live.
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#4f7cff] shadow-sm">
                      Review before save
                    </span>
                  </div>

                  {affiliatePreview.warning && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {affiliatePreview.warning}
                    </div>
                  )}

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_280px]">
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]">Title</label>
                        <input
                          value={affiliateDraft.title}
                          onChange={(event) => setAffiliateDraft((prev) => ({ ...prev, title: event.target.value }))}
                          className="input-field"
                          placeholder="Product title"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]">Description</label>
                        <textarea
                          value={affiliateDraft.description}
                          onChange={(event) => setAffiliateDraft((prev) => ({ ...prev, description: event.target.value }))}
                          rows={4}
                          className="input-field resize-none"
                          placeholder="Short product description"
                        />
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]">Image URL</label>
                          <input
                            value={affiliateDraft.imageUrl}
                            onChange={(event) => setAffiliateDraft((prev) => ({ ...prev, imageUrl: event.target.value }))}
                            className="input-field"
                            placeholder="https://..."
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]">Price (INR)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={affiliateDraft.price}
                            onChange={(event) => setAffiliateDraft((prev) => ({ ...prev, price: event.target.value }))}
                            className="input-field"
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white bg-white p-4 shadow-[0_16px_32px_rgba(79,124,255,0.08)]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Store card preview</p>
                      <div className="mt-3 overflow-hidden rounded-xl border border-[#e2e8f0] bg-[#f8fafc]">
                        <div className="aspect-square overflow-hidden bg-[#eef3ff]">
                          {affiliateDraft.imageUrl ? (
                            <Image
                              src={affiliateDraft.imageUrl}
                              alt={affiliateDraft.title || affiliatePreview.platform_name}
                              width={480}
                              height={480}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center px-6 text-center text-xs text-[#7c8aa7]">
                              Add a product image URL for a stronger affiliate card.
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4f7cff]">
                            {affiliatePreview.platform_name}
                          </p>
                          <p className="line-clamp-2 text-sm font-semibold text-[#111a38]">
                            {affiliateDraft.title || 'Affiliate product title'}
                          </p>
                          {affiliateDraft.description ? (
                            <p className="line-clamp-3 text-xs leading-5 text-[#5f6c87]">
                              {affiliateDraft.description}
                            </p>
                          ) : null}
                          <p className="text-sm font-semibold text-[#4f7cff]">
                            {affiliateDraft.price.trim() ? `₹${affiliateDraft.price}` : 'Price optional'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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
              durationOptions={counsellingDurationOptions}
              setDurationOptions={setCounsellingDurationOptions}
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
            <LeadMagnetForm title={title} setTitle={setTitle} description={description} setDescription={setDescription} digitalFiles={digitalFiles} setDigitalFiles={setDigitalFiles} images={images} setImages={setImages} imagePreviews={imagePreviews} setImagePreviews={setImagePreviews} onGenerateAI={generateWithAI} aiLoading={aiLoading} />
          )}
          {type === 'digital' && digitalSubtype === 'membership' && (
            <MembershipForm title={title} setTitle={setTitle} description={description} setDescription={setDescription} price={price} setPrice={setPrice} billingPeriod={billingPeriod} setBillingPeriod={setBillingPeriod} benefits={benefits} setBenefits={setBenefits} images={images} setImages={setImages} imagePreviews={imagePreviews} setImagePreviews={setImagePreviews} contentFiles={contentFiles} setContentFiles={setContentFiles} onGenerateAI={generateWithAI} aiLoading={aiLoading} />
          )}
          {type === 'digital' && digitalSubtype === 'webinar' && (
            <DownloadForm title={title} setTitle={setTitle} description={description} setDescription={setDescription} price={price} setPrice={setPrice} comparePrice={comparePrice} setComparePrice={setComparePrice} digitalFiles={digitalFiles} setDigitalFiles={setDigitalFiles} images={images} setImages={setImages} imagePreviews={imagePreviews} setImagePreviews={setImagePreviews} category={category} setCategory={setCategory} onGenerateAI={generateWithAI} aiLoading={aiLoading} />
          )}
          {type === 'digital' && digitalSubtype === 'template_library' && (
            <TemplateLibraryForm title={title} setTitle={setTitle} description={description} setDescription={setDescription} price={price} setPrice={setPrice} comparePrice={comparePrice} setComparePrice={setComparePrice} templates={templates} setTemplates={setTemplates} images={images} setImages={setImages} imagePreviews={imagePreviews} setImagePreviews={setImagePreviews} onGenerateAI={generateWithAI} aiLoading={aiLoading} />
          )}

          {type !== 'affiliate' && (
            <div className="card mt-6">
              <div className="flex items-center justify-between">
                <div><h3 className="font-semibold">Product Status</h3><p className="text-sm text-gray-500">{isActive ? 'Visible on your store' : 'Hidden from your store'}</p></div>
                <button onClick={() => setIsActive(!isActive)} className={`relative h-6 w-12 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}><span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0'}`} /></button>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center gap-4">
            <button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center gap-2">{loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Saving...</> : 'Save Product'}</button>
            <button onClick={handleBack} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </>
      )}
    </div>
  )
}
