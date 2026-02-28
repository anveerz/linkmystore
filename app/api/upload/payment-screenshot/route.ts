import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function getExtension(fileName: string, mimeType: string) {
  const byMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }

  if (byMime[mimeType]) {
    return byMime[mimeType]
  }

  const ext = fileName.split('.').pop()
  return ext ? ext.toLowerCase() : 'jpg'
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Screenshot file is required' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Only JPG, PNG, and WebP are allowed' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Screenshot must be 5MB or less' }, { status: 400 })
    }

    const ext = getExtension(file.name, file.type)
    const filePath = `screenshots/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`
    const arrayBuffer = await file.arrayBuffer()

    const admin = createAdminClient()
    const { error: uploadError } = await admin.storage
      .from('payment-screenshots')
      .upload(filePath, Buffer.from(arrayBuffer), {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message || 'Unable to upload screenshot' },
        { status: 500 }
      )
    }

    const { data: publicUrlData } = admin.storage
      .from('payment-screenshots')
      .getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      path: filePath,
      url: publicUrlData.publicUrl,
    })
  } catch (error) {
    console.error('Upload payment screenshot error:', error)
    return NextResponse.json({ error: 'Failed to upload screenshot' }, { status: 500 })
  }
}
