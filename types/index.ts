export interface Creator {
  id: string;
  user_id: string;
  phone: string;
  email?: string;
  full_name?: string;
  mobile_number?: string;
  store_slug: string;
  store_name: string;
  bio?: string;
  profile_image_url?: string;
  instagram_handle?: string;
  bank_account?: BankAccount;
  is_active: boolean;
  created_at: string;
}

export interface BankAccount {
  account_number?: string;
  ifsc?: string;
  account_name?: string;
  upi_id?: string;
}

export type DigitalSubtype =
  | 'download'         // PDF, templates, presets, etc.
  | 'course'           // Online course with modules
  | 'coaching'         // 1-on-1 coaching / counselling
  | 'calendar'         // Calendar booking / invite
  | 'membership'       // Subscription / membership
  | 'lead_magnet'      // Free download for email capture
  | 'webinar'          // Live webinar
  | 'template_library' // Social media template library

export interface Product {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  price: number;              // In paisa
  compare_price?: number;     // In paisa
  type: 'physical' | 'digital';
  digital_subtype?: DigitalSubtype;
  images: string[];
  variants: Variant[];
  digital_file_url?: string;
  digital_file_urls?: string[];     // Multiple files for downloads/templates
  category?: string;
  stock?: number | null;      // null = unlimited, 0 = out of stock
  is_active: boolean;
  is_lead_magnet?: boolean;         // Marks free lead magnets
  sort_order: number;
  created_at: string;
  avg_rating?: number;
  average_rating?: number;          // Phase 5: from product_reviews trigger
  review_count?: number;
  total_sales?: number;             // Phase 5: incremented on paid orders

  // Digital subtype-specific data (stored as JSONB)
  course_data?: CourseData;
  coaching_data?: CoachingData;
  calendar_data?: CalendarData;
  membership_data?: MembershipData;
  template_files?: TemplateFile[];
}

export interface Variant {
  name: string;               // "Red / M" or "Large"
  price?: number;             // Override price in paisa (null = use product price)
  stock?: number;             // null = unlimited
}

// ─── Course Types ──────────────────────────────────────────────

export interface CourseData {
  modules: CourseModule[];
  drip_enabled: boolean;
  drip_interval_days?: number;
  total_lessons: number;
  total_duration_minutes?: number;
}

export interface CourseModule {
  id: string;
  title: string;
  sort_order: number;
  lessons: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  title: string;
  content_type: 'video' | 'text' | 'file';
  video_url?: string;
  text_content?: string;
  file_url?: string;
  duration_minutes?: number;
  sort_order: number;
  is_preview?: boolean;   // Free preview lesson
}

// ─── Coaching Types ────────────────────────────────────────────

export interface CoachingData {
  duration_minutes: number;
  session_type: '1on1' | 'group';
  max_participants?: number;
  meeting_platform: MeetingPlatform;
  meeting_link?: string;
  availability: AvailabilitySlot[];
  buffer_minutes: number;
  advance_booking_days: number;
  min_notice_hours: number;
}

export type MeetingPlatform = 'google_meet' | 'zoom' | 'whatsapp_call' | 'phone';

// ─── Calendar Types ────────────────────────────────────────────

export interface CalendarData {
  duration_minutes: number;
  meeting_platform: MeetingPlatform;
  meeting_link?: string;
  availability: AvailabilitySlot[];
  buffer_minutes: number;
  advance_booking_days: number;
  min_notice_hours: number;
}

export interface AvailabilitySlot {
  day_of_week: number;   // 0=Sunday, 6=Saturday
  start_time: string;    // "09:00"
  end_time: string;      // "17:00"
}

// ─── Membership Types ──────────────────────────────────────────

export interface MembershipData {
  billing_period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  benefits: string[];
  content_file_urls?: string[];
}

// ─── Template Library Types ────────────────────────────────────

export interface TemplateFile {
  id: string;
  name: string;
  file_url: string;
  thumbnail_url?: string;
  category?: string;
}

// ─── Booking Types ─────────────────────────────────────────────

export interface Booking {
  id: string;
  product_id: string;
  creator_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  booking_date: string;     // "2026-03-01"
  booking_time: string;     // "14:00"
  duration_minutes: number;
  status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  meeting_link?: string;
  order_id?: string;
  notes?: string;
  created_at: string;
}

// ─── Lead Capture Types ────────────────────────────────────────

export interface LeadCapture {
  id: string;
  creator_id: string;
  product_id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
}

// ─── Course Enrollment Types ───────────────────────────────────

export interface CourseEnrollment {
  id: string;
  product_id: string;
  order_id: string;
  buyer_email: string;
  buyer_phone: string;
  enrolled_at: string;
  lessons_completed: string[];  // Array of lesson IDs
}

// ─── Existing Types (Order, Review, etc.) ──────────────────────

export interface Review {
  id: string;
  product_id: string;
  order_id: string;
  buyer_name: string;
  buyer_phone: string;
  rating: number;             // 1-5
  comment?: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  creator_id: string;
  product_id: string;
  variant?: Variant;
  quantity: number;
  buyer_name: string;
  buyer_phone: string;
  buyer_email?: string;
  shipping_address?: ShippingAddress;
  amount: number;             // In paisa
  platform_fee: number;      // In paisa
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  status: 'new' | 'shipped' | 'delivered' | 'cancelled';
  tracking_number?: string;
  tracking_url?: string;
  digital_download_url?: string;
  digital_downloaded: boolean;
  created_at: string;
}

export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Payout {
  id: string;
  creator_id: string;
  amount: number;
  period_start: string;
  period_end: string;
  order_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface StoreSettings {
  id: string;
  creator_id: string;
  theme: 'default' | 'minimal' | 'bold' | 'elegant' | 'dark';
  accent_color: string;
  social_links: {
    instagram?: string;
    youtube?: string;
    whatsapp?: string;
    website?: string;
  };
  announcement_text?: string;
}

export interface DashboardStats {
  total_sales: number;        // In paisa
  total_orders: number;
  total_earnings: number;    // After platform fee, in paisa
  pending_payout: number;     // In paisa
  this_month_sales: number;
  this_month_orders: number;
  this_week_sales: number;
  this_week_orders: number;
  top_products: { id: string; title: string; orders: number; revenue: number }[];
  conversion_rate: number;
}

export type AnalyticsEventType =
  | 'store_view'
  | 'product_view'
  | 'checkout_start'
  | 'purchase'

export interface AnalyticsEvent {
  id: string
  creator_id: string
  event_type: AnalyticsEventType
  product_id?: string | null
  order_id?: string | null
  visitor_id?: string | null
  session_id?: string | null
  source?: string | null
  medium?: string | null
  campaign?: string | null
  referrer?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

export interface Coupon {
  id: string
  creator_id: string
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  max_discount_amount?: number | null
  min_order_amount?: number | null
  usage_limit?: number | null
  used_count: number
  is_active: boolean
  starts_at?: string | null
  ends_at?: string | null
  applicable_product_ids?: string[] | null
  created_at: string
  updated_at: string
}

export interface CouponRedemption {
  id: string
  coupon_id: string
  creator_id: string
  order_id: string
  product_id?: string | null
  code: string
  discount_amount: number
  created_at: string
}

export interface InstagramAutomationSettings {
  id: string
  creator_id: string
  enabled: boolean
  ig_business_account_id?: string | null
  page_access_token?: string | null
  trigger_keywords: string[]
  dm_template: string
  default_product_id?: string | null
  created_at: string
  updated_at: string
}

export interface InstagramDmLog {
  id: string
  creator_id: string
  ig_business_account_id?: string | null
  recipient_id?: string | null
  trigger_text?: string | null
  sent_message?: string | null
  status: 'sent' | 'failed' | 'skipped'
  error_message?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

// ─── Helper constants for digital subtypes ─────────────────────

export const DIGITAL_SUBTYPE_CONFIG: Record<DigitalSubtype, {
  label: string;
  emoji: string;
  description: string;
  color: string;
  bgColor: string;
}> = {
  download: {
    label: 'Digital Download',
    emoji: '📥',
    description: 'Sell PDFs, e-books, presets, templates & more',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  course: {
    label: 'Online Course',
    emoji: '🎓',
    description: 'Build courses with modules, lessons & videos',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  coaching: {
    label: '1-on-1 Coaching',
    emoji: '💬',
    description: 'Private counselling & coaching sessions',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  calendar: {
    label: 'Calendar Booking',
    emoji: '📅',
    description: 'Let clients book time slots with you',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  lead_magnet: {
    label: 'Lead Magnet',
    emoji: '🧲',
    description: 'Free download to capture emails & grow audience',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  membership: {
    label: 'Membership',
    emoji: '⭐',
    description: 'Recurring subscriptions for exclusive content',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  webinar: {
    label: 'Webinar',
    emoji: '🎥',
    description: 'Host live or recorded webinar sessions',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  template_library: {
    label: 'Template Library',
    emoji: '🎨',
    description: 'Collection of design & social media templates',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
}

// ─── Phase 5: Storefront Premium Types ─────────────────────────────────────

export interface StoreStats {
  total_orders: number;
  average_rating: number;
  review_count: number;
  response_time?: string;
  verified?: boolean;
  member_since?: string;
}

export interface Category {
  id: string;
  name: string;
  count: number;
  icon?: string;
}

export interface AnimationConfig {
  pageTransition: { duration: number; easing: string };
  fadeIn: { duration: number; delay: number; easing: string };
  staggerChildren: { delayBetween: number; duration: number };
  cardHover: { scale: number; duration: number; easing: string };
  imageHover: { scale: number; duration: number; easing: string };
  tabSlide: { duration: number; easing: string };
}

export interface AnnouncementBannerProps {
  text: string;
  accentColor: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  accentColor: string;
}

export interface ProductBadgeProps {
  type: 'physical' | 'digital';
}

export interface ProductCardProps {
  product: Product;
  storeSlug: string;
  accentColor: string;
  priority?: boolean;
}

export interface ProductGridProps {
  products: Product[];
  storeSlug: string;
  accentColor: string;
  activeCategory: string;
}

export interface StorefrontHeaderProps {
  creator: {
    store_name: string;
    bio?: string;
    profile_image_url?: string;
    instagram_handle?: string;
  };
  settings: {
    accent_color: string;
    social_links: {
      instagram?: string;
      website?: string;
    };
  };
  stats: StoreStats;
}

export interface TrustBadgesProps {
  stats: StoreStats;
}

export interface ReviewStarsProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  count?: number;
  color?: string;
}

/** Default category tabs shown on every storefront */
export const DEFAULT_CATEGORIES: Omit<Category, 'count'>[] = [
  { id: 'all', name: 'All Products' },
  { id: 'digital', name: 'Digital', icon: '💻' },
  { id: 'physical', name: 'Physical', icon: '📦' },
]
