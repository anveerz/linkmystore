'use client'

import { useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Download, Loader2, XCircle } from 'lucide-react'

interface ClaimedFile {
  name: string
  url: string
}

type ClaimState = 'ready' | 'claiming' | 'claimed' | 'error'

export default function DownloadOrderPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params.id as string
  const token = searchParams.get('token') || ''

  const [state, setState] = useState<ClaimState>('ready')
  const [message, setMessage] = useState(
    'This is a single-use download link. Click below when you are ready to access your files.'
  )
  const [productTitle, setProductTitle] = useState('Your purchase')
  const [files, setFiles] = useState<ClaimedFile[]>([])

  const handleClaimDownload = async () => {
    if (!token) {
      setState('error')
      setMessage('This download link is missing its token.')
      return
    }

    setState('claiming')
    setMessage('Preparing your files...')

    try {
      const response = await fetch(`/api/orders/${orderId}/claim-digital-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const body = await response.json()
      if (!response.ok) {
        throw new Error(body.error || 'Could not prepare your files')
      }

      setFiles(body.files || [])
      setProductTitle(body.product_title || 'Your purchase')
      setState('claimed')
      setMessage('Your files are ready. These signed links stay active for 30 minutes.')
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Could not prepare your files')
    }
  }

  return (
    <div className="min-h-screen bg-white px-4 py-16">
      <div className="mx-auto max-w-lg rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="text-center">
          {state === 'claimed' ? (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          ) : state === 'error' ? (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          ) : (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E8651A]/10">
              {state === 'claiming' ? (
                <Loader2 className="h-8 w-8 animate-spin text-[#E8651A]" />
              ) : (
                <Download className="h-8 w-8 text-[#E8651A]" />
              )}
            </div>
          )}

          <h1 className="mt-5 text-2xl font-bold text-[#111827]">
            {state === 'claimed'
              ? 'Download Ready'
              : state === 'error'
                ? 'Download Unavailable'
                : 'Access Your Files'}
          </h1>
          <p className="mt-2 text-sm font-medium text-[#111827]">{productTitle}</p>
          <p className="mt-3 text-sm text-gray-500">{message}</p>
        </div>

        {state === 'ready' && (
          <button
            type="button"
            onClick={() => { void handleClaimDownload() }}
            className="btn-primary mt-8 w-full"
          >
            Access My Download
          </button>
        )}

        {state === 'claiming' && (
          <div className="mt-8 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
            Please keep this page open while we prepare your files.
          </div>
        )}

        {state === 'claimed' && (
          <div className="mt-8 space-y-3">
            {files.map((file) => (
              <a
                key={`${file.name}-${file.url}`}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111827] px-5 py-4 text-center text-sm font-semibold text-white transition hover:bg-[#1f2937]"
              >
                <Download className="h-4 w-4" />
                {file.name}
              </a>
            ))}
            <p className="pt-1 text-center text-xs text-gray-400">
              This page cannot be used again after this first access.
            </p>
          </div>
        )}

        <div className="mt-8">
          <Link href="/" className="btn-secondary block w-full text-center">
            Back to LinkMyStore
          </Link>
        </div>
      </div>
    </div>
  )
}
