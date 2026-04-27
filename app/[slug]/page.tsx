import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCreatorPlanSnapshot } from '@/lib/plan-gate'
import { calculateStoreStats } from '@/lib/store-stats'
import EventTracker from '@/components/analytics/EventTracker'
import { StorefrontClient } from '@/components/storefront/StorefrontClient'
import type { Product, StoreSettings } from '@/types'

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

export const revalidate = 60

async function getStoreData(slug: string) {
  const supabase = createAdminClient()

  const { data: creator, error: creatorError } = await supabase
    .from('creators')
    .select('*')
    .eq('store_slug', slug)
    .eq('is_active', true)
    .single()

  if (creatorError || !creator) return null

  const planSnapshot = await getCreatorPlanSnapshot(creator.id)
  const effectiveCreator = {
    ...creator,
    plan: planSnapshot.effectivePlan,
  }

  const [productsResult, settingsResult, stats] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('creator_id', creator.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }),
    supabase
      .from('store_settings')
      .select('*')
      .eq('creator_id', creator.id)
      .single(),
    calculateStoreStats(creator.id),
  ])

  const rawSettings = (settingsResult.data || {
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
        seo_enabled: false,
        show_branding: true,
      }

  return {
    creator: effectiveCreator,
    products: (productsResult.data || []) as Product[],
    settings: normalizedSettings,
    stats,
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getStoreData(slug)

  if (!data) return { title: 'Store Not Found' }

  const seoEnabled = data.creator.plan === 'pro' && data.settings?.seo_enabled === true
  if (!seoEnabled) {
    return {
      title: `${data.creator.store_name} | LinkMyStore`,
      description: `Store by ${data.creator.store_name} on LinkMyStore`,
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  return {
    title: `${data.creator.store_name} - LinkMyStore`,
    description: data.creator.bio || `Shop from ${data.creator.store_name} on LinkMyStore`,
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: data.creator.store_name,
      description: data.creator.bio || `Shop from ${data.creator.store_name}`,
      images: data.creator.profile_image_url ? [data.creator.profile_image_url] : [],
      type: 'website',
    },
  }
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  if (RESERVED_SLUGS.includes(slug)) {
    notFound()
  }

  const data = await getStoreData(slug)

  if (!data) notFound()

  const { creator, products, settings, stats } = data

  return (
    <div className="min-h-screen">
      <EventTracker
        creatorId={creator.id}
        eventType="store_view"
        metadata={{ slug: creator.store_slug }}
      />

      <StorefrontClient
        creator={creator}
        products={products}
        settings={settings}
        stats={stats}
      />
    </div>
  )
}
