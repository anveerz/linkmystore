import { notFound } from 'next/navigation'
import { Truck, Zap, Star, AlertCircle, BookOpen, Clock, Video, Calendar, Play, CheckCircle, Layers, FileText } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAffiliateDisplayData } from '@/lib/affiliate-display'
import { getCreatorPlanSnapshot } from '@/lib/plan-gate'
import EventTracker from '@/components/analytics/EventTracker'
import ImageGallery from '@/components/storefront/ImageGallery'
import ProductNav from '@/components/storefront/ProductNav'
import ProductDetailClient from '@/components/storefront/ProductDetailClient'
import type { Variant, DigitalSubtype, CourseData, CoachingData, CalendarData, MembershipData, TemplateFile, StoreSettings } from '@/types'

const RESERVED_SLUGS = [
  'login',
  'dashboard',
  'onboarding',
  'auth',
  'api',
  'checkout',
  '_next',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  '.well-known',
]

async function getProductData(slug: string, productId: string) {
  const supabase = createAdminClient()

  const { data: creator } = await supabase
    .from('creators')
    .select('*')
    .eq('store_slug', slug)
    .eq('is_active', true)
    .single()

  if (!creator) return null

  const planSnapshot = await getCreatorPlanSnapshot(creator.id)
  const effectiveCreator = {
    ...creator,
    plan: planSnapshot.effectivePlan,
  }

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('creator_id', effectiveCreator.id)
    .eq('is_active', true)
    .single()

  if (!product) return null

  const { data: settings } = await supabase
    .from('store_settings')
    .select('*')
    .eq('creator_id', effectiveCreator.id)
    .single()

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, buyer_name, rating, comment, created_at')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(20)

  const rawSettings = (settings || {
    theme: 'default',
    accent_color: '#E8651A',
    social_links: {},
    announcement_text: null,
    show_branding: true,
    seo_enabled: false,
  }) as StoreSettings

  const normalizedSettings: StoreSettings = effectiveCreator.plan === 'pro'
    ? {
        ...rawSettings,
        show_branding: rawSettings.show_branding ?? false,
        seo_enabled: rawSettings.seo_enabled ?? true,
      }
    : {
        ...rawSettings,
        theme: 'default',
        show_branding: true,
        seo_enabled: false,
      }

  return { creator: effectiveCreator, product, settings: normalizedSettings, reviews: reviews || [] }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; productId: string }> }) {
  const { slug, productId } = await params
  const data = await getProductData(slug, productId)

  if (!data) return { title: 'Product Not Found' }

  const seoEnabled = data.creator.plan === 'pro' && data.settings?.seo_enabled === true
  const { product, creator } = data
  const isLeadMagnet = product.is_lead_magnet || product.digital_subtype === 'lead_magnet'
  const priceDisplay = isLeadMagnet ? 'Free' : `Rs ${(product.price / 100).toLocaleString('en-IN')}`

  if (!seoEnabled) {
    return {
      title: `${product.title} | ${creator.store_name}`,
      description: `Product from ${creator.store_name} on LinkMyStore`,
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  return {
    title: `${product.title} - ${priceDisplay} | ${creator.store_name}`,
    description: product.description || `Buy ${product.title} from ${creator.store_name}`,
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: `${product.title} - ${priceDisplay}`,
      description: product.description || `Available on ${creator.store_name}`,
      images: product.images?.[0] ? [product.images[0]] : [],
    },
  }
}
function formatPrice(paisa: number) {
  return '₹' + (paisa / 100).toLocaleString('en-IN')
}

function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${iconSize} ${star <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
    </div>
  )
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── Digital Subtype Section Components ────────────────────────────────────

function CourseSection({ courseData, accentColor }: { courseData: CourseData; accentColor: string }) {
  const totalMinutes = courseData.total_duration_minutes || 0
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return (
    <div className="px-4 pb-4">
      <div className="border-t border-gray-100 pt-5">
        <h2 className="text-base font-bold text-[#0F172A] mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4" style={{ color: accentColor }} />
          What&apos;s in this course
        </h2>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-purple-700">{courseData.modules?.length || 0}</div>
            <div className="text-xs text-purple-600 mt-0.5">Modules</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-purple-700">{courseData.total_lessons || 0}</div>
            <div className="text-xs text-purple-600 mt-0.5">Lessons</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-purple-700">
              {totalMinutes > 0 ? (hours > 0 ? `${hours}h` : `${minutes}m`) : '—'}
            </div>
            <div className="text-xs text-purple-600 mt-0.5">Duration</div>
          </div>
        </div>

        {/* Drip info */}
        {courseData.drip_enabled && courseData.drip_interval_days && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-xs text-amber-700">
              New lessons unlock every {courseData.drip_interval_days} day{courseData.drip_interval_days > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Curriculum */}
        {courseData.modules && courseData.modules.length > 0 && (
          <div className="space-y-3">
            {courseData.modules.slice(0, 4).map((mod, modIdx) => (
              <div key={mod.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">Module {modIdx + 1}</span>
                    <span className="text-sm font-semibold text-gray-700 line-clamp-1">{mod.title}</span>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{mod.lessons?.length || 0} lessons</span>
                </div>
                {mod.lessons && mod.lessons.slice(0, 3).map((lesson) => (
                  <div key={lesson.id} className="px-3 py-2 flex items-center gap-2 border-t border-gray-50">
                    {lesson.content_type === 'video' ? (
                      <Play className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    ) : lesson.content_type === 'file' ? (
                      <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    ) : (
                      <BookOpen className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    )}
                    <span className="text-xs text-gray-600 flex-1 line-clamp-1">{lesson.title}</span>
                    {lesson.is_preview && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">Preview</span>
                    )}
                    {lesson.duration_minutes && (
                      <span className="text-xs text-gray-400 flex-shrink-0">{lesson.duration_minutes}m</span>
                    )}
                  </div>
                ))}
                {mod.lessons && mod.lessons.length > 3 && (
                  <div className="px-3 py-2 border-t border-gray-50">
                    <span className="text-xs text-gray-400">+{mod.lessons.length - 3} more lessons</span>
                  </div>
                )}
              </div>
            ))}
            {courseData.modules.length > 4 && (
              <p className="text-xs text-center text-gray-400 pb-1">
                +{courseData.modules.length - 4} more modules after enrollment
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const PLATFORM_LABELS: Record<string, string> = {
  google_meet: '📹 Google Meet',
  zoom: '💻 Zoom',
  whatsapp_call: '📱 WhatsApp Call',
  phone: '📞 Phone Call',
}

function CoachingSection({
  coachingData,
  accentColor,
  productPrice,
}: {
  coachingData: CoachingData
  accentColor: string
  productPrice: number
}) {
  const activeDays = [...new Set((coachingData.availability || []).map((slot) => slot.day_of_week))].sort()

  const durationPackages =
    Array.isArray(coachingData.duration_options) && coachingData.duration_options.length > 0
      ? coachingData.duration_options
      : [
          {
            duration_minutes: Number(coachingData.duration_minutes || 30),
            price: Number(productPrice || 0),
            label: 'Session',
          },
        ]

  return (
    <div className="px-4 pb-4">
      <div className="border-t border-gray-100 pt-5">
        <h2 className="text-base font-bold text-[#0F172A] mb-4 flex items-center gap-2">
          <Video className="w-4 h-4" style={{ color: accentColor }} />
          Counselling Details
        </h2>

        <div className="mb-4 space-y-2">
          {durationPackages.map((option, index) => (
            <div
              key={`${option.duration_minutes}-${option.price}-${index}`}
              className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  {option.label || `${option.duration_minutes} min session`}
                </p>
                <p className="text-xs text-emerald-600">{option.duration_minutes} minutes</p>
              </div>
              <p className="text-sm font-bold text-emerald-700">{formatPrice(option.price)}</p>
            </div>
          ))}
        </div>

        {coachingData.meeting_platform && (
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-3 flex items-center gap-2">
            <span className="text-sm text-gray-700 font-medium">
              {PLATFORM_LABELS[coachingData.meeting_platform] || coachingData.meeting_platform}
            </span>
          </div>
        )}

        {activeDays.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Available Days</p>
            <div className="flex flex-wrap gap-1.5">
              {DAY_NAMES.map((day, index) => (
                <span
                  key={index}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    activeDays.includes(index) ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {day}
                </span>
              ))}
            </div>
          </div>
        )}

        {coachingData.advance_booking_days > 0 && (
          <p className="text-xs text-gray-400 mt-3">Book up to {coachingData.advance_booking_days} days in advance</p>
        )}

        {coachingData.min_notice_hours > 0 && (
          <p className="text-xs text-gray-400 mt-1">Requires {coachingData.min_notice_hours}h advance notice</p>
        )}
      </div>
    </div>
  )
}

function CalendarSection({ calendarData, accentColor }: { calendarData: CalendarData; accentColor: string }) {
  const activeDays = [...new Set((calendarData.availability || []).map((s) => s.day_of_week))].sort()

  return (
    <div className="px-4 pb-4">
      <div className="border-t border-gray-100 pt-5">
        <h2 className="text-base font-bold text-[#0F172A] mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: accentColor }} />
          Booking Details
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-orange-50 rounded-xl p-3">
            <div className="text-xs font-semibold text-orange-600 mb-1">Duration</div>
            <div className="text-lg font-bold text-orange-700">{calendarData.duration_minutes} min</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-3">
            <div className="text-xs font-semibold text-orange-600 mb-1">Book Ahead</div>
            <div className="text-lg font-bold text-orange-700">{calendarData.advance_booking_days || 30} days</div>
          </div>
        </div>
        {calendarData.meeting_platform && (
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-3">
            <span className="text-sm text-gray-700 font-medium">
              {PLATFORM_LABELS[calendarData.meeting_platform] || calendarData.meeting_platform}
            </span>
          </div>
        )}
        {activeDays.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Available Days</p>
            <div className="flex flex-wrap gap-1.5">
              {DAY_NAMES.map((day, idx) => (
                <span
                  key={idx}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    activeDays.includes(idx) ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {day}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const BILLING_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Every 3 months',
  yearly: 'Yearly',
}

function MembershipSection({ membershipData, accentColor }: { membershipData: MembershipData; accentColor: string }) {
  return (
    <div className="px-4 pb-4">
      <div className="border-t border-gray-100 pt-5">
        <h2 className="text-base font-bold text-[#0F172A] mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          Membership Benefits
        </h2>
        {membershipData.billing_period && (
          <div className="inline-flex items-center bg-amber-50 border border-amber-200 rounded-full px-3 py-1 mb-4">
            <span className="text-xs font-semibold text-amber-700">
              🔄 Billed {BILLING_LABELS[membershipData.billing_period] || membershipData.billing_period}
            </span>
          </div>
        )}
        {membershipData.benefits && membershipData.benefits.length > 0 && (
          <div className="space-y-2">
            {membershipData.benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: accentColor }} />
                <span className="text-sm text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TemplateSection({ templateFiles, accentColor }: { templateFiles: TemplateFile[]; accentColor: string }) {
  const categories = [...new Set(templateFiles.filter((t) => t.category).map((t) => t.category!))]

  return (
    <div className="px-4 pb-4">
      <div className="border-t border-gray-100 pt-5">
        <h2 className="text-base font-bold text-[#0F172A] mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4" style={{ color: accentColor }} />
          Template Library
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-indigo-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-indigo-700">{templateFiles.length}</div>
            <div className="text-xs text-indigo-600 mt-0.5">Templates</div>
          </div>
          <div className="bg-indigo-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-indigo-700">{categories.length || 1}</div>
            <div className="text-xs text-indigo-600 mt-0.5">Categories</div>
          </div>
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {categories.map((cat) => (
              <span key={cat} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100">
                {cat}
              </span>
            ))}
          </div>
        )}
        <div className="space-y-2">
          {templateFiles.slice(0, 5).map((tmpl) => (
            <div key={tmpl.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              {tmpl.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tmpl.thumbnail_url} alt={tmpl.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-indigo-400" />
                </div>
              )}
              <span className="text-sm text-gray-700 flex-1 line-clamp-1">{tmpl.name}</span>
              {tmpl.category && <span className="text-xs text-gray-400 flex-shrink-0">{tmpl.category}</span>}
            </div>
          ))}
          {templateFiles.length > 5 && (
            <p className="text-xs text-center text-gray-400 py-1">
              +{templateFiles.length - 5} more templates included
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function LeadMagnetSection() {
  return (
    <div className="px-4 pb-4">
      <div className="bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-100 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-2xl flex-shrink-0">
            🧲
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">100% Free Download</p>
            <p className="text-xs text-gray-500 mt-0.5">Enter your details to get instant access — no payment required</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
          <span className="text-xs text-gray-600">Instant access after claiming</span>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
          <span className="text-xs text-gray-600">No credit card needed</span>
        </div>
      </div>
    </div>
  )
}

const SUBTYPE_BADGE: Record<string, { label: string; emoji: string; bg: string; text: string }> = {
  download: { label: 'Digital Download', emoji: '📥', bg: 'bg-blue-50', text: 'text-blue-700' },
  course: { label: 'Online Course', emoji: '🎓', bg: 'bg-purple-50', text: 'text-purple-700' },
  coaching: { label: '1-on-1 Coaching', emoji: '💬', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  calendar: { label: 'Calendar Booking', emoji: '📅', bg: 'bg-orange-50', text: 'text-orange-700' },
  lead_magnet: { label: 'Free Download', emoji: '🧲', bg: 'bg-pink-50', text: 'text-pink-700' },
  membership: { label: 'Membership', emoji: '⭐', bg: 'bg-amber-50', text: 'text-amber-700' },
  webinar: { label: 'Live Webinar', emoji: '🎥', bg: 'bg-red-50', text: 'text-red-700' },
  template_library: { label: 'Template Library', emoji: '🎨', bg: 'bg-indigo-50', text: 'text-indigo-700' },
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; productId: string }>
}) {
  const { slug, productId } = await params

  if (RESERVED_SLUGS.includes(slug)) notFound()

  const data = await getProductData(slug, productId)

  if (!data) notFound()

  const { creator, product, settings, reviews } = data
  const storefrontTheme = settings?.theme || 'default'
  const accentColor = settings?.accent_color || '#E8651A'
  const productUrl = `https://linkmystore.in/${creator.store_slug}/${product.id}`
  const variants = (product.variants || []) as Variant[]

  const hasLowStock = product.stock !== null && product.stock !== undefined && product.stock > 0 && product.stock <= 5
  const isOutOfStock = product.stock !== null && product.stock !== undefined && product.stock === 0
  const avgRating = product.avg_rating || 0
  const reviewCount = product.review_count || reviews.length

  const digitalSubtype = product.digital_subtype as DigitalSubtype | undefined
  const isLeadMagnet = !!(product.is_lead_magnet || digitalSubtype === 'lead_magnet')
  const isAffiliate = Boolean(product.is_affiliate)
  const isCreatorDeal = product.type === 'physical' && product.physical_subtype === 'creator_deal'
  const affiliatePlatform = (product.affiliate_platform as string | undefined) || null
  const affiliateTaggedUrl = (product.affiliate_tagged_url as string | undefined) || null
  const affiliateDisplayData = getAffiliateDisplayData(product.affiliate_product_data)
  const dealData = (product.deal_data as {
    external_url?: string
    coupon_code?: string
    coupon_note?: string
    deal_label?: string
  } | null) || null
  const creatorDealLabel = dealData?.deal_label || 'Must-Buy'
  const creatorDealCoupon = dealData?.coupon_code || null
  const creatorDealCouponNote = dealData?.coupon_note || null
  const creatorDealExternalUrl = dealData?.external_url || null
  const subtypeBadge = digitalSubtype ? SUBTYPE_BADGE[digitalSubtype] : null

  const courseData = product.course_data as CourseData | null
  const coachingData = product.coaching_data as CoachingData | null
  const calendarData = product.calendar_data as CalendarData | null
  const membershipData = product.membership_data as MembershipData | null
  const templateFiles = (product.template_files || []) as TemplateFile[]

  return (
    <div className="max-w-lg mx-auto bg-white min-h-screen">
      <EventTracker
        creatorId={creator.id}
        eventType="product_view"
        productId={product.id}
        metadata={{ slug: creator.store_slug }}
      />

      {/* Navigation */}
      <ProductNav
        slug={creator.store_slug}
        storeName={creator.store_name}
        productTitle={product.title}
        productUrl={productUrl}
        theme={storefrontTheme}
      />

      {/* Image Gallery */}
      <ImageGallery images={product.images || []} theme={storefrontTheme} />

      {/* Product Info */}
      <div className="px-4 pt-4 pb-4">
        {/* Digital subtype badge */}
        {subtypeBadge && (
          <div className={`inline-flex items-center gap-1.5 ${subtypeBadge.bg} ${subtypeBadge.text} text-xs font-semibold px-2.5 py-1 rounded-full mb-2`}>
            <span>{subtypeBadge.emoji}</span>
            <span>{subtypeBadge.label}</span>
          </div>
        )}

        {/* Title */}
        <h1 className="text-xl font-bold text-[#0F172A] leading-tight">{product.title}</h1>

        {/* Ratings summary */}
        {reviewCount > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <StarRating rating={avgRating} />
            <span className="text-sm font-semibold text-gray-700">{avgRating.toFixed(1)}</span>
            <span className="text-sm text-gray-400">({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
          </div>
        )}

        {/* Price Area */}
        <div className="flex items-center gap-3 mt-2">
          {isLeadMagnet ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-green-600">FREE</span>
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">No payment needed</span>
            </div>
          ) : (
            <>
              <span className="text-2xl font-bold" style={{ color: accentColor }}>
                {formatPrice(product.price)}
              </span>
              {product.compare_price && product.compare_price > product.price && (
                <>
                  <span className="text-base text-gray-400 line-through">{formatPrice(product.compare_price)}</span>
                  <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    Save {Math.round((1 - product.price / product.compare_price) * 100)}%
                  </span>
                </>
              )}
            </>
          )}
        </div>
        {isAffiliate && (
          <>
            <p className="text-xs text-gray-500 mt-1">
              This is an affiliate listing. You will be redirected to {affiliatePlatform || 'partner platform'} for purchase.
            </p>
            {affiliateDisplayData.promoLabel && (
              <span className="inline-flex mt-2 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                {affiliateDisplayData.promoLabel}
              </span>
            )}
            {affiliateDisplayData.couponCode && (
              <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Use Code</p>
                <p className="text-sm font-bold text-emerald-900">{affiliateDisplayData.couponCode}</p>
                {affiliateDisplayData.couponNote && (
                  <p className="mt-0.5 text-xs text-emerald-700">{affiliateDisplayData.couponNote}</p>
                )}
              </div>
            )}
          </>
        )}
        {isCreatorDeal && (
          <>
            <span className="inline-flex mt-2 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
              {creatorDealLabel}
            </span>
            {creatorDealCoupon && (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">Use Code</p>
                <p className="text-sm font-bold text-amber-950">{creatorDealCoupon}</p>
                {creatorDealCouponNote && (
                  <p className="mt-0.5 text-xs text-amber-700">{creatorDealCouponNote}</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Stock alerts (only for physical / non-digital) */}
        {hasLowStock && (
          <div className="flex items-center gap-1.5 mt-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-red-600 animate-pulse">
              🔥 Only {product.stock} left in stock!
            </span>
          </div>
        )}
        {isOutOfStock && (
          <div className="flex items-center gap-1.5 mt-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <span className="text-sm font-semibold text-gray-500">😔 Out of stock</span>
          </div>
        )}

        {/* Product Type Indicator — only when no digital subtype badge */}
        {!digitalSubtype && (
          <div className="flex items-center gap-1.5 mt-2">
            {isCreatorDeal ? (
              <>
                <Truck className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500">External deal purchase with coupon support</span>
              </>
            ) : product.type === 'physical' ? (
              <>
                <Truck className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500">Physical Product — Shipping required</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500">Digital Product — Instant delivery</span>
              </>
            )}
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div className="mt-4">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Description</label>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{product.description}</p>
          </div>
        )}
      </div>

      {/* ── Digital Subtype Feature Sections ── */}

      {/* Lead Magnet Banner */}
      {isLeadMagnet && <LeadMagnetSection />}

      {/* Course Details */}
      {digitalSubtype === 'course' && courseData && (
        <CourseSection courseData={courseData} accentColor={accentColor} />
      )}

      {/* Coaching Session Details */}
      {digitalSubtype === 'coaching' && coachingData && (
        <CoachingSection coachingData={coachingData} accentColor={accentColor} productPrice={product.price} />
      )}

      {/* Calendar Booking Details */}
      {digitalSubtype === 'calendar' && calendarData && (
        <CalendarSection calendarData={calendarData} accentColor={accentColor} />
      )}

      {/* Membership Benefits */}
      {digitalSubtype === 'membership' && membershipData && (
        <MembershipSection membershipData={membershipData} accentColor={accentColor} />
      )}

      {/* Template Library Preview */}
      {digitalSubtype === 'template_library' && templateFiles.length > 0 && (
        <TemplateSection templateFiles={templateFiles} accentColor={accentColor} />
      )}

      {/* ── Variant Selector + CTA Button (client) ── */}
      <ProductDetailClient
        variants={variants}
        accentColor={accentColor}
        basePrice={product.price}
        slug={creator.store_slug}
        productId={product.id}
        isOutOfStock={isOutOfStock}
        digitalSubtype={digitalSubtype}
        isLeadMagnet={isLeadMagnet}
        isAffiliate={isAffiliate}
        affiliatePlatform={affiliatePlatform}
        affiliateTaggedUrl={affiliateTaggedUrl}
        isCreatorDeal={isCreatorDeal}
        dealExternalUrl={creatorDealExternalUrl}
        dealLabel={creatorDealLabel}
        theme={storefrontTheme}
      />

      {/* ── Customer Reviews ── */}
      {reviews.length > 0 && (
        <div className="px-4 pt-2 pb-8">
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">Customer Reviews</h2>
                {reviewCount > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating rating={avgRating} size="sm" />
                    <span className="text-sm text-gray-500">{avgRating.toFixed(1)} out of 5</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#0F172A]">{avgRating.toFixed(1)}</div>
                <div className="text-xs text-gray-400">{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</div>
              </div>
            </div>

            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #3D2176 100%)` }}
                      >
                        {review.buyer_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{review.buyer_name}</p>
                        <StarRating rating={review.rating} size="sm" />
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(review.created_at)}</span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-600 mt-3 leading-relaxed">{review.comment}</p>
                  )}
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs text-green-600 font-medium">✓ Verified Purchase</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
