'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Package } from 'lucide-react'
import type { StoreSettings } from '@/types'
import { getStorefrontTheme } from '@/lib/storefront-theme'

interface ImageGalleryProps {
  images: string[]
  theme?: StoreSettings['theme']
}

export default function ImageGallery({ images, theme }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const themeStyles = getStorefrontTheme(theme)

  useEffect(() => {
    const container = containerRef.current
    if (!container || images.length <= 1) return

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft
      const width = container.offsetWidth
      const newIndex = Math.round(scrollLeft / width)
      setActiveIndex(newIndex)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [images.length])

  if (images.length === 0) {
    return (
      <div className={`w-full aspect-square flex items-center justify-center ${themeStyles.productImageBg}`}>
        <Package className={`w-16 h-16 ${themeStyles.mutedText}`} />
      </div>
    )
  }

  if (images.length === 1) {
    return (
      <Image
        src={images[0]}
        alt="Product"
        width={800}
        height={800}
        priority
        loading="eager"
        unoptimized
        className="w-full aspect-square object-cover"
      />
    )
  }

  return (
    <div>
      <div
        ref={containerRef}
        className="w-full overflow-x-auto snap-x snap-mandatory flex scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {images.map((image, index) => (
          <Image
            key={index}
            src={image}
            alt={`Product ${index + 1}`}
            width={800}
            height={800}
            priority={index === 0}
            loading={index === 0 ? 'eager' : 'lazy'}
            unoptimized
            className="w-full flex-shrink-0 snap-center aspect-square object-cover"
          />
        ))}
      </div>
      
      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 py-3">
        {images.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === activeIndex ? themeStyles.dotActive : themeStyles.dotInactive
            }`}
          />
        ))}
      </div>
    </div>
  )
}
