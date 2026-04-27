'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { ComponentType, MouseEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Wallet,
  Settings,
  Menu,
  X,
  ExternalLink,
  LogOut,
  CalendarCheck,
  Users,
  Ticket,
  Bot,
  Crown,
  Link2,
  Lock,
  PencilLine,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Creator } from '@/types'

interface NavItem {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  proOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/products', label: 'Products', icon: Package },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/dashboard/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/dashboard/leads', label: 'Leads', icon: Users },
  { href: '/dashboard/coupons', label: 'Coupons', icon: Ticket },
  { href: '/dashboard/automations', label: 'Automations', icon: Bot, proOnly: true },
  { href: '/dashboard/payments', label: 'Payments', icon: Wallet },
  { href: '/dashboard/trust', label: 'Trust & Safety', icon: ShieldCheck },
  { href: '/dashboard/affiliate', label: 'Affiliate', icon: Link2 },
  { href: '/dashboard/plan', label: 'Plan & Billing', icon: Crown },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

interface SidebarContentProps {
  creator: Creator | null
  isActive: (href: string) => boolean
  getInitials: (name: string) => string
  handleLogout: () => Promise<void>
  handleNavItemClick: (item: NavItem, event: MouseEvent<HTMLAnchorElement>) => void
}

function SidebarContent({
  creator,
  isActive,
  getInitials,
  handleLogout,
  handleNavItemClick,
}: SidebarContentProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Brand */}
      <div className="p-5">
        <Link href="/" className="flex items-center gap-3.5">
          <Image
            src="/logo.png"
            alt="LinkMyStore"
            width={220}
            height={66}
            className="h-14 w-auto flex-shrink-0 object-contain"
          />
          <span className="font-bold text-base text-white tracking-tight">LinkMyStore</span>
        </Link>
        {creator && (
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-slate-300 truncate">
              {creator.store_name}
            </p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
              creator.plan === 'pro'
                ? 'bg-[#5f6eff] text-white'
                : 'bg-white/10 text-slate-300'
            }`}>
              {creator.plan === 'pro' ? 'PRO' : 'FREE'}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="mt-8 px-3 flex-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={(event) => handleNavItemClick(item, event)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 mb-1 ${isActive(item.href)
              ? 'bg-white/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
              }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="flex-1">{item.label}</span>
            {item.proOnly && creator?.plan !== 'pro' && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white/15 text-white">
                <Lock className="w-2.5 h-2.5" />
                PRO
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-5 border-t border-[#2e3f95]">
        {creator && (
          <a
            href={`https://linkmystore.in/${creator.store_slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-[#a9bbff] mb-3 hover:text-white transition-colors"
          >
            Visit Store <ExternalLink className="w-4 h-4" />
          </a>
        )}

        <div className="h-px bg-[#2e3f95] my-3" />

        {/* User Info */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-[linear-gradient(125deg,#4f7cff_0%,#7a5dff_100%)] shadow-lg"
          >
            {creator ? getInitials(creator.store_name) : 'U'}
          </div>
          <span className="text-sm text-slate-300 truncate flex-1">
            {creator?.email || 'user@example.com'}
          </span>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-300 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [creator, setCreator] = useState<Creator | null>(null)
  const [loading, setLoading] = useState(true)
  const [isStoreNameModalOpen, setIsStoreNameModalOpen] = useState(false)
  const [storeNameDraft, setStoreNameDraft] = useState('')
  const [savingStoreName, setSavingStoreName] = useState(false)

  useEffect(() => {
    const fetchCreator = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: creatorData } = await supabase
        .from('creators')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!creatorData) {
        router.push('/onboarding')
        return
      }

      setCreator(creatorData)
      setStoreNameDraft(creatorData.store_name || '')
      setLoading(false)
    }

    fetchCreator()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleNavItemClick = (item: NavItem, event: MouseEvent<HTMLAnchorElement>) => {
    if (item.proOnly && creator?.plan !== 'pro') {
      event.preventDefault()
      setSidebarOpen(false)
      toast.error(`${item.label} is a Pro feature. Upgrade to unlock.`)
      router.push('/dashboard/plan')
      return
    }

    setSidebarOpen(false)
  }

  const openStoreNameModal = () => {
    setStoreNameDraft(creator?.store_name || '')
    setIsStoreNameModalOpen(true)
  }

  const saveStoreName = async () => {
    if (!creator) return
    const trimmed = storeNameDraft.trim()
    if (!trimmed) {
      toast.error('Store name is required')
      return
    }

    setSavingStoreName(true)
    const { error } = await supabase
      .from('creators')
      .update({
        store_name: trimmed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', creator.id)

    if (error) {
      toast.error(error.message || 'Could not update store name')
      setSavingStoreName(false)
      return
    }

    setCreator((prev) => (prev ? { ...prev, store_name: trimmed } : prev))
    setIsStoreNameModalOpen(false)
    setSavingStoreName(false)
    toast.success('Store name updated')
  }

  if (loading) {
    return (
      <div className="page-shell min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5f6eff]" />
      </div>
    )
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard'
    if (pathname.startsWith('/dashboard/products')) return 'Products'
    if (pathname.startsWith('/dashboard/orders')) return 'Orders'
    if (pathname.startsWith('/dashboard/bookings')) return 'Bookings'
    if (pathname.startsWith('/dashboard/leads')) return 'Leads'
    if (pathname.startsWith('/dashboard/coupons')) return 'Coupons'
    if (pathname.startsWith('/dashboard/automations')) return 'Automations'
    if (pathname.startsWith('/dashboard/payments')) return 'Payments'
    if (pathname.startsWith('/dashboard/trust')) return 'Trust & Safety'
    if (pathname.startsWith('/dashboard/affiliate')) return 'Affiliate'
    if (pathname.startsWith('/dashboard/plan')) return 'Plan & Billing'
    if (pathname.startsWith('/dashboard/settings')) return 'Settings'
    return 'Dashboard'
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="page-shell min-h-screen">
      {isStoreNameModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#09112e]/55 px-4 backdrop-blur-sm">
          <div className="surface-panel w-full max-w-md p-5">
            <h2 className="text-lg font-semibold text-[#111a38]">Edit Your Store Name</h2>
            <p className="mt-1 text-xs text-gray-500">
              This changes storefront title only. Your slug stays as <span className="font-semibold">/{creator?.store_slug}</span>.
            </p>

            <input
              type="text"
              value={storeNameDraft}
              onChange={(event) => setStoreNameDraft(event.target.value)}
              className="input-field mt-4"
              placeholder="e.g. Bhairav's Collections"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsStoreNameModalOpen(false)}
                className="btn-secondary"
                disabled={savingStoreName}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveStoreName}
                disabled={savingStoreName}
                className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
              >
                {savingStoreName ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {savingStoreName ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-[#09112e]/65 backdrop-blur-[2px] z-40 lg:hidden animate-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[260px] border-r border-white/10 bg-[linear-gradient(180deg,#0f1530_0%,#131d44_45%,#202a61_100%)] transform transition-transform duration-300 lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-5 right-5 p-1 text-slate-300 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent
          creator={creator}
          isActive={isActive}
          getInitials={getInitials}
          handleLogout={handleLogout}
          handleNavItemClick={handleNavItemClick}
        />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-[260px] border-r border-white/10 bg-[linear-gradient(180deg,#0f1530_0%,#131d44_45%,#202a61_100%)]">
        <SidebarContent
          creator={creator}
          isActive={isActive}
          getInitials={getInitials}
          handleLogout={handleLogout}
          handleNavItemClick={handleNavItemClick}
        />
      </div>

      {/* Top Bar (Mobile) */}
      <div className="lg:hidden h-16 nav-glass flex items-center px-4 sticky top-0 z-30">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-[#49567a] hover:bg-[#eaf0ff] rounded-xl"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="ml-3 flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="LinkMyStore"
            width={176}
            height={54}
            className="h-11 w-auto flex-shrink-0 object-contain"
          />
          <span className="font-bold text-sm text-[#0f1530] tracking-tight">LinkMyStore</span>
        </div>
        {creator?.plan !== 'pro' && (
          <Link
            href="/dashboard/plan"
            className="ml-auto mr-2 inline-flex items-center gap-1 rounded-full bg-[linear-gradient(125deg,#4f7cff_0%,#7a5dff_100%)] px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg"
          >
            <Crown className="w-3 h-3" />
            Upgrade
          </Link>
        )}
        <button
          type="button"
          onClick={openStoreNameModal}
          className="mr-2 inline-flex items-center gap-1 rounded-lg border border-[#d2dcf8] bg-white/70 px-2 py-1 text-[11px] font-medium text-[#49567a]"
        >
          <PencilLine className="h-3 w-3" />
          Edit Store
        </button>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-[linear-gradient(125deg,#4f7cff_0%,#7a5dff_100%)] shadow-lg"
        >
          {creator ? getInitials(creator.store_name) : 'U'}
        </div>
      </div>

      {/* Top Bar (Desktop) */}
      <div className="hidden lg:flex h-16 nav-glass items-center justify-between px-8 ml-[260px]">
        <h1 className="text-xl font-bold text-[#111a38]">{getPageTitle()}</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openStoreNameModal}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#d2dcf8] bg-white/75 px-3 py-1.5 text-xs font-semibold text-[#111a38] hover:bg-white"
          >
            <PencilLine className="h-3.5 w-3.5" />
            Edit your store name
          </button>
          {creator?.plan === 'pro' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#5f6eff]/10 px-3 py-1 text-xs font-semibold text-[#5f6eff]">
              <Crown className="w-3.5 h-3.5" />
              Pro Active
            </span>
          ) : (
            <Link
              href="/dashboard/plan"
              className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(125deg,#4f7cff_0%,#7a5dff_100%)] px-3 py-1.5 text-xs font-semibold text-white shadow-lg"
            >
              <Crown className="w-3.5 h-3.5" />
              Upgrade to Pro
            </Link>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-[260px] pt-4 lg:pt-6 p-4 lg:p-8">
        <div className="animate-in">
          {children}
        </div>
      </div>
    </div>
  )
}

