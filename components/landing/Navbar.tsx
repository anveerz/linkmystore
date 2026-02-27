"use client"
import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 select-none">
          <div className="h-8 w-8 rounded-lg bg-[#E8651A]" />
          <span className="text-lg font-bold text-gray-900">LinkMyStore</span>
        </Link>

        {/* Desktop buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Login
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-[#E8651A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#C75516]"
          >
            Get Started Free
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white px-4 pb-4">
          <div className="flex flex-col gap-2 pt-3">
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="rounded-xl bg-[#E8651A] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[#C75516]"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
