import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateStoreStats } from '@/lib/store-stats'
import EventTracker from '@/components/analytics/EventTracker'
import { StorefrontClient } from '@/components/storefront/StorefrontClient'
import type { Product, StoreSettings } from '@/types'

const RESERVED_SLUGS = ['login', 'dashboard', 'onboarding', 'auth', 'api', 'checkout', '_next', 'favicon.ico']

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

  return {
    creator,
    products: (productsResult.data || []) as Product[],
    settings: (settingsResult.data || {
      theme: 'default',
      accent_color: '#E8651A',
      social_links: {},
      announcement_text: null,
    }) as StoreSettings,
    stats,
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getStoreData(slug)

  if (!data) return { title: 'Store Not Found' }

  return {
    title: `${data.creator.store_name} — LinkMyStore`,
    description: data.creator.bio || `Shop from ${data.creator.store_name} on LinkMyStore`,
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

  if (!data) {
    return (
      <div className="max-w-lg mx-auto min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-[#0F172A] mb-2">Store not found</h1>
          <p className="text-gray-500 text-sm mb-6">
            This store doesn&apos;t exist or has been deactivated
          </p>
          <Link href="/login" className="btn-primary">
            Create your own store
          </Link>
        </div>
      </div>
    )
  }

  const { creator, products, settings, stats } = data

  return (
    <div className="min-h-screen bg-gray-50">
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

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-4 py-4 text-center">
        <a
          href="https://linkmystore.in"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-gray-500 transition-colors bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-100"
        >
          Powered by
          <Image src="/logo.png" alt="LinkMyStore" height={14} width={56} className="h-3.5 w-auto opacity-50" />
        </a>
      </footer>
    </div>
  )
}
