'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { DEFAULT_CATEGORIES } from '@/types'
import type { Product, StoreSettings, Creator, StoreStats } from '@/types'
import { AnnouncementBanner } from './AnnouncementBanner'
import { StorefrontHeader } from './StorefrontHeader'
import { CategoryTabs } from './CategoryTabs'
import { ProductGrid } from './ProductGrid'
import { getCategoryCounts } from '@/lib/store-stats'
import { getStorefrontTheme } from '@/lib/storefront-theme'

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
  const themeStyles = getStorefrontTheme(settings.theme)

  return (
    <div className={`min-h-screen ${themeStyles.page}`}>
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
        theme={settings.theme}
      />

      {categories.length > 1 && (
        <CategoryTabs
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          accentColor={accentColor}
          theme={settings.theme}
        />
      )}

      <main className="px-4 pb-8 pt-4">
        <div className="mx-auto max-w-7xl">
          {products.length === 0 ? (
            <div className={`rounded-2xl px-6 py-16 text-center ${themeStyles.emptyState}`}>
              <p className={`text-lg font-semibold ${themeStyles.cardTitle}`}>Coming Soon!</p>
              <p className={`mt-2 text-sm ${themeStyles.mutedText}`}>
                This store is setting up. Check back later for products.
              </p>
            </div>
          ) : (
            <ProductGrid
              products={products}
              storeSlug={creator.store_slug}
              accentColor={accentColor}
              activeCategory={activeCategory}
              theme={settings.theme}
            />
          )}
        </div>
      </main>

      <footer className={`${themeStyles.footer} px-4 py-5 text-center`}>
        {(settings.show_branding !== false) && (
          <a
            href="https://linkmystore.in"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] transition-colors ${themeStyles.poweredBy}`}
          >
            Powered by
            <Image
              src="/logo-v2.png"
              alt="LinkMyStore"
              height={14}
              width={14}
              className="h-3.5 w-3.5 opacity-60"
            />
          </a>
        )}
        <div className={`flex items-center justify-center gap-3 text-[11px] ${settings.show_branding !== false ? 'mt-3' : ''}`}>
          <Link
            href={`/report-store?store=${creator.store_slug}`}
            className="hover:underline"
            style={{ color: accentColor }}
          >
            Report this Store
          </Link>
          <Link href="/grievance" className={`${themeStyles.footerMuted} hover:opacity-80`}>
            Grievance
          </Link>
          <Link href="/terms" className={`${themeStyles.footerMuted} hover:opacity-80`}>
            Terms
          </Link>
        </div>
      </footer>
    </div>
  )
}
