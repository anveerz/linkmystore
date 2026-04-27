import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

const ASSET_ROOT = path.resolve(process.cwd(), 'jawari', 'assets')

const CONTENT_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

function getContentType(filePath: string) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params

    if (!pathSegments.length) {
      return NextResponse.json({ error: 'Asset path is required' }, { status: 400 })
    }

    const assetPath = path.resolve(ASSET_ROOT, ...pathSegments)

    if (!assetPath.startsWith(ASSET_ROOT + path.sep) && assetPath !== ASSET_ROOT) {
      return NextResponse.json({ error: 'Invalid asset path' }, { status: 400 })
    }

    const asset = await readFile(assetPath)

    return new Response(asset, {
      headers: {
        'content-type': getContentType(assetPath),
        'cache-control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Failed to load PureJawari asset:', error)
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
  }
}
