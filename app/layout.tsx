import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, DM_Serif_Display } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import AuthHashRecovery from '@/components/auth/AuthHashRecovery'

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
  metadataBase: new URL('https://linkmystore.in'),
  title: 'LinkMyStore - Storefront SaaS for Independent Sellers',
  description:
    'Create a seller storefront, take manual UPI orders directly, and manage fulfilment with LinkMyStore.',
  keywords: 'storefront saas, sell online india, manual upi checkout, seller storefront, creator store',
  openGraph: {
    type: 'website',
    url: 'https://linkmystore.in/',
    siteName: 'LinkMyStore',
    title: 'LinkMyStore - Storefront SaaS for Independent Sellers',
    description:
      'Create a seller storefront, take manual UPI orders directly, and manage fulfilment with LinkMyStore.',
    images: [
      {
        url: '/logo-v2.png',
        width: 1024,
        height: 1024,
        type: 'image/png',
        alt: 'LinkMyStore',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LinkMyStore - Storefront SaaS for Independent Sellers',
    description:
      'Create a seller storefront, take manual UPI orders directly, and manage fulfilment with LinkMyStore.',
    images: [
      {
        url: '/logo-v2.png',
        width: 1024,
        height: 1024,
        alt: 'LinkMyStore',
      },
    ],
  },
  referrer: 'strict-origin-when-cross-origin',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${jakarta.variable} ${dmSerif.variable}`}>
      <body className={jakarta.className}>
        <AuthHashRecovery />
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
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 12px 24px rgba(0, 0, 0, 0.28)',
            },
            success: {
              iconTheme: { primary: '#22C55E', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#DC2626', secondary: '#fff' },
            },
          }}
        />
      </body>
    </html>
  )
}

