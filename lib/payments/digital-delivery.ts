import { createAdminClient } from '@/lib/supabase/admin'
import {
  createBuyerDigitalDeliveryToken,
  getAppBaseUrl,
} from '@/lib/payments/order-action-tokens'

interface DeliveryTemplateFile {
  name?: string | null
  file_url?: string | null
}

interface DeliveryMembershipData {
  content_file_urls?: string[] | null
}

interface DigitalDeliveryOrderLike {
  id: string
  buyer_email: string | null
  digital_download_url: string | null
}

interface DigitalDeliveryProductLike {
  title: string
  type: 'physical' | 'digital'
  digital_file_url: string | null
  digital_file_urls: string[] | null
  template_files?: DeliveryTemplateFile[] | null
  membership_data?: DeliveryMembershipData | null
}

export interface DigitalDeliveryLink {
  name: string
  url: string
}

interface DigitalDeliveryAsset {
  name: string
  path: string
}

function normalizeStoragePath(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized : null
}

function inferFileName(path: string, fallback: string) {
  const candidate = decodeURIComponent(path.split('/').pop() || '').trim()
  return candidate || fallback
}

export function collectDigitalDeliveryAssets(product: DigitalDeliveryProductLike): DigitalDeliveryAsset[] {
  if (product.type !== 'digital') return []

  const assets: DigitalDeliveryAsset[] = []
  const seen = new Set<string>()

  const pushAsset = (pathValue: unknown, fallbackName: string) => {
    const path = normalizeStoragePath(pathValue)
    if (!path || seen.has(path)) return

    seen.add(path)
    assets.push({
      path,
      name: inferFileName(path, fallbackName),
    })
  }

  for (const path of product.digital_file_urls || []) {
    pushAsset(path, `${product.title} download`)
  }

  pushAsset(product.digital_file_url, `${product.title} download`)

  for (const template of product.template_files || []) {
    const templateName = template?.name?.trim() || `${product.title} template`
    pushAsset(template?.file_url, templateName)
  }

  for (const path of product.membership_data?.content_file_urls || []) {
    pushAsset(path, `${product.title} file`)
  }

  return assets
}

export function isInstantDigitalDeliveryProduct(product: DigitalDeliveryProductLike) {
  return product.type === 'digital' && collectDigitalDeliveryAssets(product).length > 0
}

export function buildBuyerDigitalDeliveryAccessUrl(order: DigitalDeliveryOrderLike) {
  const buyerEmail = order.buyer_email?.trim().toLowerCase()
  if (!buyerEmail) return order.digital_download_url || null

  const token = createBuyerDigitalDeliveryToken({
    orderId: order.id,
    buyerEmail,
  })

  return `${getAppBaseUrl()}/orders/download/${order.id}?token=${encodeURIComponent(token)}`
}

export async function createClaimedDigitalDeliveryLinks(product: DigitalDeliveryProductLike) {
  const assets = collectDigitalDeliveryAssets(product)
  if (assets.length === 0) {
    return []
  }

  const admin = createAdminClient()
  const links: DigitalDeliveryLink[] = []

  for (const asset of assets) {
    const { data } = await admin.storage
      .from('digital-files')
      .createSignedUrl(asset.path, 60 * 30)

    if (data?.signedUrl) {
      links.push({
        name: asset.name,
        url: data.signedUrl,
      })
    }
  }

  return links
}
