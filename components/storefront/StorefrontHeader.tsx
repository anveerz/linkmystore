'use client'

import Image from 'next/image'
import { Instagram, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { fadeInVariant, getAccessibleVariant } from '@/lib/animations'
import { TrustBadges } from './TrustBadges'
import type { StorefrontHeaderProps } from '@/types'

export function StorefrontHeader({ creator, settings, stats }: StorefrontHeaderProps) {
  const { store_name, bio, profile_image_url, instagram_handle } = creator
  const { accent_color, social_links } = settings

  return (
    <motion.header
      initial="hidden"
      animate="visible"
      variants={getAccessibleVariant(fadeInVariant)}
      className="bg-white px-4 pb-6 pt-8"
    >
      <div className="mx-auto max-w-lg">
        <div className="flex flex-col items-center text-center">
          {/* Profile Image */}
          {profile_image_url ? (
            <div
              className="relative h-24 w-24 overflow-hidden rounded-full shadow-lg ring-4 ring-white"
              style={{
                background: `linear-gradient(135deg, ${accent_color}20, ${accent_color}40)`,
              }}
            >
              <Image
                src={profile_image_url}
                alt={store_name}
                fill
                className="object-cover"
                sizes="96px"
                priority
              />
            </div>
          ) : (
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white shadow-lg"
              style={{ backgroundColor: accent_color }}
            >
              {store_name.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Store Name */}
          <h1 className="mt-4 text-2xl font-bold leading-tight text-gray-900">{store_name}</h1>

          {/* Bio */}
          {bio && (
            <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-600">{bio}</p>
          )}

          {/* Social Links */}
          {(instagram_handle || social_links?.instagram || social_links?.website) && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {(instagram_handle || social_links?.instagram) && (
                <a
                  href={`https://instagram.com/${(instagram_handle || social_links?.instagram || '').replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ outlineColor: accent_color }}
                  aria-label={`Visit Instagram profile ${instagram_handle || social_links?.instagram}`}
                >
                  <Instagram className="h-3.5 w-3.5" aria-hidden="true" />
                  {instagram_handle || social_links?.instagram}
                </a>
              )}

              {social_links?.website && (
                <a
                  href={social_links.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ outlineColor: accent_color }}
                  aria-label="Visit website"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  Website
                </a>
              )}
            </div>
          )}

          {/* Trust Badges */}
          {(stats.total_orders > 0 || stats.average_rating > 0) && (
            <div className="mt-4">
              <TrustBadges stats={stats} />
            </div>
          )}
        </div>
      </div>
    </motion.header>
  )
}
