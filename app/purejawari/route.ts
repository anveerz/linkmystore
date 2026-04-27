import { readFile } from 'node:fs/promises'
import path from 'node:path'

const PURE_JAWARI_HTML_PATH = path.join(process.cwd(), 'jawari', 'purejawari.html')
const BASE_TAG = '<base href="/purejawari/">'

function injectBaseHref(html: string) {
  if (html.includes(BASE_TAG) || html.includes('<base ')) {
    return html
  }

  return html.replace('</head>', `  ${BASE_TAG}\n</head>`)
}

export async function GET() {
  try {
    const html = await readFile(PURE_JAWARI_HTML_PATH, 'utf8')
    const storefront = injectBaseHref(html)

    return new Response(storefront, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=0, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Failed to load PureJawari storefront:', error)

    return new Response('PureJawari storefront is unavailable right now.', {
      status: 500,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
      },
    })
  }
}
