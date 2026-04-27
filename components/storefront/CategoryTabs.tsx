'use client'

import { motion } from 'framer-motion'
import type { CategoryTabsProps } from '@/types'
import { getStorefrontTheme } from '@/lib/storefront-theme'

export function CategoryTabs({
  categories,
  activeCategory,
  onCategoryChange,
  accentColor,
  theme,
}: CategoryTabsProps) {
  const themeStyles = getStorefrontTheme(theme)

  return (
    <nav
      className="scrollbar-hide overflow-x-auto scroll-smooth"
      style={{ scrollPadding: '16px' }}
      role="navigation"
      aria-label="Product categories"
    >
      <div className="flex gap-2 px-4 py-3">
        {categories.map((category) => {
          const isActive = activeCategory === category.id

          return (
            <motion.button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isActive
                  ? 'text-white'
                  : `${themeStyles.tabInactive} ${themeStyles.tabInactiveHover}`
              }`}
              style={
                isActive
                  ? { backgroundColor: accentColor, outlineColor: accentColor }
                  : { outlineColor: accentColor }
              }
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.1 }}
              aria-label={`Filter by ${category.name}, ${category.count} products`}
              aria-current={isActive ? 'true' : 'false'}
            >
              <span className="flex items-center gap-1.5">
                {category.icon && (
                  <span aria-hidden="true">{category.icon}</span>
                )}
                <span>{category.name}</span>
                <span className={isActive ? 'opacity-90' : 'opacity-60'}>
                  ({category.count})
                </span>
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* ARIA live region for category changes */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {`Showing ${categories.find((c) => c.id === activeCategory)?.name || 'all'} products`}
      </div>
    </nav>
  )
}
