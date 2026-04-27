"use client"

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/terms', label: 'Terms' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="nav-glass sticky top-0 z-50">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 select-none">
          <Image src="/logo.png" alt="LinkMyStore" width={48} height={48} className="h-12 w-12 object-contain" />
          <span className="block text-[1.35rem] font-bold leading-none tracking-tight text-[#111a38]">LinkMyStore</span>
        </Link>

        <div className="hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-[#49567a] transition hover:text-[#4f7cff]"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-[#49567a] transition hover:bg-white/70 hover:text-[#4f7cff]"
          >
            Login
          </Link>
          <Link href="/login" className="btn-primary px-5 py-2.5 text-sm">
            Start free
          </Link>
        </div>

        <button
          className="rounded-xl p-2 text-[#49567a] transition hover:bg-white/70 sm:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-[#dde6fb] bg-[rgba(255,255,255,0.94)] px-4 pb-4 backdrop-blur-xl sm:hidden">
          <div className="flex flex-col gap-2 pt-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#49567a] transition hover:bg-[#eef3ff] hover:text-[#4f7cff]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#49567a] transition hover:bg-[#eef3ff] hover:text-[#4f7cff]"
            >
              Login
            </Link>
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="btn-primary mt-1 px-4 py-2.5 text-center text-sm"
            >
              Start free
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
