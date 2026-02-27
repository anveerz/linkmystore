'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { slideDownVariant, getAccessibleVariant } from '@/lib/animations'
import type { AnnouncementBannerProps } from '@/types'

export function AnnouncementBanner({
  text,
  accentColor,
  dismissible = true,
  onDismiss,
}: AnnouncementBannerProps) {
  const storageKey = `announcement-dismissed-${text.substring(0, 20)}`
  const [isVisible, setIsVisible] = useState(() => {
    if (!dismissible || typeof window === 'undefined') {
      return true
    }
    return localStorage.getItem(storageKey) !== 'true'
  })

  const handleDismiss = () => {
    setIsVisible(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'true')
    }
    onDismiss?.()
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={getAccessibleVariant(slideDownVariant)}
        className="relative w-full px-4 py-2.5 text-center"
        style={{ backgroundColor: accentColor }}
        role="banner"
        aria-label={`Announcement: ${text}`}
      >
        <p className="text-sm font-medium text-white">{text}</p>

        {dismissible && (
          <button
            onClick={handleDismiss}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
            style={{ outlineColor: accentColor }}
            aria-label="Dismiss announcement"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
