import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, DM_Serif_Display } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { SpeedInsights } from '@vercel/speed-insights/next'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
})

const dmSerif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'LinkMyStore — Your Instagram Store in 2 Minutes',
  description: 'The simplest way for Indian Instagram sellers to build a storefront and get paid via UPI. Create your free store now.',
  keywords: 'instagram store, sell on instagram, UPI payments, creator store, link in bio shop, india',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${jakarta.variable} ${dmSerif.variable}`}>
      <body className={jakarta.className}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '12px',
              background: '#1A1A2E',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '500',
              padding: '12px 20px',
            },
            success: {
              iconTheme: { primary: '#16A34A', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#DC2626', secondary: '#fff' },
            },
          }}
        />
        <SpeedInsights />
      </body>
    </html>
  )
}
