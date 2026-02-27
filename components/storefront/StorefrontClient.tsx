'use client'

import { useState, useMemo } from 'react'
import { DEFAULT_CATEGORIES } from '@/types'
import type { Product, StoreSettings, Creator, StoreStats } from '@/types'
import { AnnouncementBanner } from './AnnouncementBanner'
import { StorefrontHeader } from './StorefrontHeader'
import { CategoryTabs } from './CategoryTabs'
import { ProductGrid } from './ProductGrid'
import { getCategoryCounts } from '@/lib/store-stats'

interface StorefrontClientProps {
  creator: Pick<Creator, 'store_slug' | 'store_name' | 'bio' | 'profile_image_url' | 'instagram_handle'>
  products: Product[]
  settings: StoreSettings
  stats: StoreStats
}

export function StorefrontClient({ creator, products, settings, stats }: StorefrontClientProps) {
  const [activeCategory, setActiveCategory] = useState('all')

  const categoryCounts = useMemo(() => getCategoryCounts(products), [products])

  const categories = useMemo(() => {
    return DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      count: categoryCounts[cat.id] || 0,
    })).filter((cat) => cat.count > 0 || cat.id === 'all')
  }, [categoryCounts])

  const accentColor = settings.accent_color || '#E8651A'

  return (
    <>
      {settings.announcement_text && (
        <AnnouncementBanner
          text={settings.announcement_text}
          accentColor={accentColor}
          dismissible={true}
        />
      )}

      <StorefrontHeader
        creator={{
          store_name: creator.store_name,
          bio: creator.bio,
          profile_image_url: creator.profile_image_url,
          instagram_handle: creator.instagram_handle,
        }}
        settings={{
          accent_color: accentColor,
          social_links: settings.social_links || {},
        }}
        stats={stats}
      />

      {categories.length > 1 && (
        <CategoryTabs
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          accentColor={accentColor}
        />
      )}

      <main className="px-4 pb-8 pt-4">
        <div className="mx-auto max-w-7xl">
          {products.length === 0 ? (
            <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm">
              <p className="text-lg font-semibold text-gray-900">Coming Soon!</p>
              <p className="mt-2 text-sm text-gray-500">
                This store is setting up. Check back later for products.
              </p>
            </div>
          ) : (
            <ProductGrid
              products={products}
              storeSlug={creator.store_slug}
              accentColor={accentColor}
              activeCategory={activeCategory}
            />
          )}
        </div>
      </main>
    </>
  )
}
