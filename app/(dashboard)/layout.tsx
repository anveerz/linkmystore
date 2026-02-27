'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Wallet,
  Settings,
  Landmark,
  Menu,
  X,
  ExternalLink,
  LogOut,
  CalendarCheck,
  Users,
  Ticket,
  Bot,
} from 'lucide-react'
import type { Creator } from '@/types'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/products', label: 'Products', icon: Package },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/dashboard/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/dashboard/leads', label: 'Leads', icon: Users },
  { href: '/dashboard/coupons', label: 'Coupons', icon: Ticket },
  { href: '/dashboard/automations', label: 'Automations', icon: Bot },
  { href: '/dashboard/payouts', label: 'Payouts', icon: Wallet },
  { href: '/dashboard/bank', label: 'Bank & Payments', icon: Landmark },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

interface SidebarContentProps {
  creator: Creator | null
  isActive: (href: string) => boolean
  setSidebarOpen: (open: boolean) => void
  getInitials: (name: string) => string
  handleLogout: () => Promise<void>
}

function SidebarContent({
  creator,
  isActive,
  setSidebarOpen,
  getInitials,
  handleLogout,
}: SidebarContentProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Brand */}
      <div className="p-5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 overflow-hidden rounded-xl flex-shrink-0">
            <Image src="/logo.png" alt="LinkMyStore" fill style={{ objectFit: 'cover', objectPosition: 'top center', filter: 'brightness(0) invert(1)' }} />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">LinkMyStore</span>
        </Link>
        {creator && (
          <p className="text-sm text-[#C4B5E0] truncate mt-1">
            {creator.store_name}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="mt-8 px-3 flex-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 mb-1 ${isActive(item.href)
              ? 'bg-[#E8651A]/15 text-[#E8651A]'
              : 'text-[#C4B5E0] hover:text-white hover:bg-white/[0.06]'
              }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-5 border-t border-[#3D2176]">
        {creator && (
          <a
            href={`https://linkmystore.in/${creator.store_slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-[#E8651A] mb-3 hover:opacity-80 transition-opacity"
          >
            Visit Store <ExternalLink className="w-4 h-4" />
          </a>
        )}

        <div className="h-px bg-[#3D2176] my-3" />

        {/* User Info */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-[#E8651A]"
          >
            {creator ? getInitials(creator.store_name) : 'U'}
          </div>
          <span className="text-sm text-[#C4B5E0] truncate flex-1">
            {creator?.email || 'user@example.com'}
          </span>
          <button
            onClick={handleLogout}
            className="p-1.5 text-[#C4B5E0] hover:text-white transition-colors"
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
      setLoading(false)
    }

    fetchCreator()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8651A]" />
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
    if (pathname.startsWith('/dashboard/payouts')) return 'Payouts'
    if (pathname.startsWith('/dashboard/bank')) return 'Bank & Payments'
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
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden animate-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-[#2A1755] transform transition-transform duration-300 lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-5 right-5 p-1 text-[#C4B5E0] hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent
          creator={creator}
          isActive={isActive}
          setSidebarOpen={setSidebarOpen}
          getInitials={getInitials}
          handleLogout={handleLogout}
        />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-[260px] bg-[#2A1755]">
        <SidebarContent
          creator={creator}
          isActive={isActive}
          setSidebarOpen={setSidebarOpen}
          getInitials={getInitials}
          handleLogout={handleLogout}
        />
      </div>

      {/* Top Bar (Mobile) */}
      <div className="lg:hidden h-16 bg-white border-b border-[#E5E5EC] flex items-center px-4 sticky top-0 z-30">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-[#555567] hover:bg-[#F0ECF7] rounded-xl"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="ml-3 flex items-center gap-2">
          <div className="relative w-8 h-8 overflow-hidden rounded-lg flex-shrink-0">
            <Image src="/logo.png" alt="LinkMyStore" fill style={{ objectFit: 'cover', objectPosition: 'top center' }} />
          </div>
          <span className="font-bold text-base text-[#2A1755] tracking-tight">LinkMyStore</span>
        </div>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-[#E8651A] ml-auto"
        >
          {creator ? getInitials(creator.store_name) : 'U'}
        </div>
      </div>

      {/* Top Bar (Desktop) */}
      <div className="hidden lg:flex h-16 bg-white items-center px-8 ml-[260px] border-b border-[#E5E5EC]">
        <h1 className="text-xl font-bold text-[#1A1A2E]">{getPageTitle()}</h1>
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
