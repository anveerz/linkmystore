'use client'

import { motion } from 'framer-motion'
import { Package } from 'lucide-react'
import { isValidProduct } from '@/lib/storefront-utils'
import { staggerContainerVariant, staggerItemVariant, getAccessibleVariant } from '@/lib/animations'
import { ProductCard } from './ProductCard'
import type { ProductGridProps } from '@/types'

export function ProductGrid({
  products,
  storeSlug,
  accentColor,
  activeCategory,
}: ProductGridProps) {
  const filteredProducts = products.filter((product) => {
    if (!isValidProduct(product)) {
      console.error('Invalid product data:', product)
      return false
    }

    if (activeCategory === 'all') return true

    if (activeCategory === 'physical' || activeCategory === 'digital') {
      return product.type === activeCategory
    }

    return product.category === activeCategory
  })

  if (filteredProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-white px-6 py-16 text-center shadow-sm">
        <Package className="h-12 w-12 text-gray-300" aria-hidden="true" />
        <p className="mt-4 text-lg font-semibold text-gray-900">No products found</p>
        <p className="mt-2 text-sm text-gray-500">
          Try viewing &quot;All Products&quot; to see the full catalog
        </p>
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={getAccessibleVariant(staggerContainerVariant)}
      className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 md:gap-4 lg:gap-5"
    >
      {filteredProducts.map((product, index) => (
        <motion.div key={product.id} variants={getAccessibleVariant(staggerItemVariant)}>
          <ProductCard
            product={product}
            storeSlug={storeSlug}
            accentColor={accentColor}
            priority={index < 4}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}
