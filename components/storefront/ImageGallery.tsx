'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Package } from 'lucide-react'

interface ImageGalleryProps {
  images: string[]
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

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
      <div className="w-full aspect-square bg-gray-50 flex items-center justify-center">
        <Package className="w-16 h-16 text-gray-300" />
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
              index === activeIndex ? 'bg-[#0F172A]' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
