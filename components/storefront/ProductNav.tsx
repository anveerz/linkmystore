'use client'

import Link from 'next/link'
import { ChevronLeft, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProductNavProps {
  slug: string
  storeName: string
  productTitle: string
  productUrl: string
}

export default function ProductNav({ slug, storeName, productTitle, productUrl }: ProductNavProps) {
  const handleShare = async () => {
    const shareData = {
      title: productTitle,
      text: `Check out ${productTitle} on ${storeName}`,
      url: productUrl,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled or error
        console.log('Share cancelled')
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(productUrl)
        toast.success('Link copied!')
      } catch {
        toast.error('Failed to copy link')
      }
    }
  }

  return (
    <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="px-4 h-12 flex items-center justify-between max-w-lg mx-auto">
        <Link 
          href={`/${slug}`}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to store</span>
        </Link>
        
        <button
          onClick={handleShare}
          className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Share"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
