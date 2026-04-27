import type { StoreSettings } from '@/types'

export type StorefrontThemeName = NonNullable<StoreSettings['theme']>

export interface StorefrontThemeStyles {
  page: string
  header: string
  headerTitle: string
  headerBio: string
  chip: string
  chipHover: string
  chipText: string
  tabInactive: string
  tabInactiveHover: string
  card: string
  cardTitle: string
  cardBody: string
  mutedText: string
  emptyState: string
  footer: string
  footerMuted: string
  poweredBy: string
  productImageBg: string
  nav: string
  sticky: string
  dotActive: string
  dotInactive: string
}

const STOREFRONT_THEMES: Record<StorefrontThemeName, StorefrontThemeStyles> = {
  default: {
    page: 'bg-gray-50',
    header: 'bg-white',
    headerTitle: 'text-gray-900',
    headerBio: 'text-gray-600',
    chip: 'bg-gray-100',
    chipHover: 'hover:bg-gray-200',
    chipText: 'text-gray-700',
    tabInactive: 'bg-gray-100 text-gray-700',
    tabInactiveHover: 'hover:bg-gray-200',
    card: 'bg-white border border-gray-100 shadow-sm',
    cardTitle: 'text-gray-900',
    cardBody: 'text-gray-600',
    mutedText: 'text-gray-500',
    emptyState: 'bg-white border border-gray-100',
    footer: 'bg-white border-t border-gray-100',
    footerMuted: 'text-gray-500',
    poweredBy: 'border border-gray-100 bg-white/80 text-gray-500 hover:text-gray-700',
    productImageBg: 'bg-gray-100',
    nav: 'bg-white/80 border-b border-gray-100',
    sticky: 'bg-white border-t border-gray-100',
    dotActive: 'bg-[#0F172A]',
    dotInactive: 'bg-gray-300',
  },
  minimal: {
    page: 'bg-white',
    header: 'bg-white',
    headerTitle: 'text-gray-900',
    headerBio: 'text-gray-500',
    chip: 'bg-white border border-gray-200',
    chipHover: 'hover:bg-gray-50',
    chipText: 'text-gray-700',
    tabInactive: 'bg-white border border-gray-200 text-gray-700',
    tabInactiveHover: 'hover:bg-gray-50',
    card: 'bg-white border border-gray-200 shadow-none',
    cardTitle: 'text-gray-900',
    cardBody: 'text-gray-600',
    mutedText: 'text-gray-500',
    emptyState: 'bg-white border border-gray-200',
    footer: 'bg-white border-t border-gray-200',
    footerMuted: 'text-gray-600',
    poweredBy: 'border border-gray-200 bg-white text-gray-600 hover:text-gray-900',
    productImageBg: 'bg-gray-50',
    nav: 'bg-white border-b border-gray-200',
    sticky: 'bg-white border-t border-gray-200',
    dotActive: 'bg-gray-900',
    dotInactive: 'bg-gray-300',
  },
  bold: {
    page: 'bg-[#111827]',
    header: 'bg-gradient-to-b from-[#1f2937] to-[#111827]',
    headerTitle: 'text-white',
    headerBio: 'text-gray-300',
    chip: 'bg-white/10 border border-white/15',
    chipHover: 'hover:bg-white/20',
    chipText: 'text-gray-100',
    tabInactive: 'bg-white/10 border border-white/15 text-gray-100',
    tabInactiveHover: 'hover:bg-white/20',
    card: 'bg-[#1f2937] border border-[#374151] shadow-lg shadow-black/20',
    cardTitle: 'text-white',
    cardBody: 'text-gray-300',
    mutedText: 'text-gray-400',
    emptyState: 'bg-[#1f2937] border border-[#374151]',
    footer: 'bg-[#111827] border-t border-[#374151]',
    footerMuted: 'text-gray-300',
    poweredBy: 'border border-[#374151] bg-[#1f2937]/80 text-gray-300 hover:text-white',
    productImageBg: 'bg-[#111827]',
    nav: 'bg-[#111827]/90 border-b border-[#374151]',
    sticky: 'bg-[#111827] border-t border-[#374151]',
    dotActive: 'bg-white',
    dotInactive: 'bg-gray-600',
  },
  elegant: {
    page: 'bg-[#f8f4ea]',
    header: 'bg-[#fdf8ef]',
    headerTitle: 'text-[#2c2418]',
    headerBio: 'text-[#625240]',
    chip: 'bg-[#f6ecdc] border border-[#e8d7b8]',
    chipHover: 'hover:bg-[#f3e4cc]',
    chipText: 'text-[#5d4a36]',
    tabInactive: 'bg-[#f6ecdc] border border-[#e8d7b8] text-[#5d4a36]',
    tabInactiveHover: 'hover:bg-[#f3e4cc]',
    card: 'bg-[#fffdf8] border border-[#eadfc8] shadow-sm',
    cardTitle: 'text-[#2c2418]',
    cardBody: 'text-[#625240]',
    mutedText: 'text-[#7b6a57]',
    emptyState: 'bg-[#fffdf8] border border-[#eadfc8]',
    footer: 'bg-[#fdf8ef] border-t border-[#eadfc8]',
    footerMuted: 'text-[#6d5b47]',
    poweredBy: 'border border-[#eadfc8] bg-[#fff9ef] text-[#6d5b47] hover:text-[#2c2418]',
    productImageBg: 'bg-[#f3eadc]',
    nav: 'bg-[#fdf8ef]/95 border-b border-[#eadfc8]',
    sticky: 'bg-[#fdf8ef] border-t border-[#eadfc8]',
    dotActive: 'bg-[#5d4a36]',
    dotInactive: 'bg-[#cbb79b]',
  },
  dark: {
    page: 'bg-[#0b1220]',
    header: 'bg-[#111827]',
    headerTitle: 'text-gray-100',
    headerBio: 'text-gray-300',
    chip: 'bg-[#1f2937] border border-[#374151]',
    chipHover: 'hover:bg-[#2a3648]',
    chipText: 'text-gray-100',
    tabInactive: 'bg-[#1f2937] border border-[#374151] text-gray-100',
    tabInactiveHover: 'hover:bg-[#2a3648]',
    card: 'bg-[#111827] border border-[#374151] shadow-lg shadow-black/30',
    cardTitle: 'text-gray-100',
    cardBody: 'text-gray-300',
    mutedText: 'text-gray-400',
    emptyState: 'bg-[#111827] border border-[#374151]',
    footer: 'bg-[#0b1220] border-t border-[#374151]',
    footerMuted: 'text-gray-300',
    poweredBy: 'border border-[#374151] bg-[#111827]/80 text-gray-300 hover:text-white',
    productImageBg: 'bg-[#0b1220]',
    nav: 'bg-[#0b1220]/90 border-b border-[#374151]',
    sticky: 'bg-[#0b1220] border-t border-[#374151]',
    dotActive: 'bg-white',
    dotInactive: 'bg-gray-600',
  },
}

export function getStorefrontTheme(theme?: StoreSettings['theme'] | null): StorefrontThemeStyles {
  const key = (theme || 'default') as StorefrontThemeName
  return STOREFRONT_THEMES[key] || STOREFRONT_THEMES.default
}

