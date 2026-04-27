interface RawCustomizationOption {
  id: string
  label: string
  price_delta: number
}

interface RawCustomizationGroup {
  id: string
  name: string
  required: boolean
  options: RawCustomizationOption[]
}

interface RawCustomizationConfig {
  require_image_upload?: boolean
  notes_enabled?: boolean
  option_groups?: RawCustomizationGroup[]
}

interface RawSelection {
  group_id: string
  option_id: string
}

interface RawCustomizationRequest {
  uploaded_image_url?: string | null
  selected_options?: RawSelection[]
  note?: string | null
}

export interface ComputedCustomizationData {
  uploaded_image_url: string
  selected_options: Array<{
    group_id: string
    option_id: string
    label: string
    price_delta: number
  }>
  note?: string
  computed_price: number
}

export function computeServerAmountWithCustomization(
  baseAmount: number,
  customizationConfig: unknown,
  customizationRequest: unknown
):
  | { ok: true; finalAmount: number; customizationData: ComputedCustomizationData | null }
  | { ok: false; error: string } {
  const config = (customizationConfig || null) as RawCustomizationConfig | null
  if (!config || !Array.isArray(config.option_groups) || config.option_groups.length === 0) {
    return { ok: true, finalAmount: baseAmount, customizationData: null }
  }

  const request = (customizationRequest || {}) as RawCustomizationRequest
  const selected = Array.isArray(request.selected_options) ? request.selected_options : []
  const uploadedImageUrl = typeof request.uploaded_image_url === 'string' ? request.uploaded_image_url.trim() : ''
  const note = typeof request.note === 'string' ? request.note.trim().slice(0, 1000) : ''

  if (config.require_image_upload && !uploadedImageUrl) {
    return { ok: false, error: 'Product customization image is required' }
  }

  let total = baseAmount
  const selectedOptions: ComputedCustomizationData['selected_options'] = []

  for (const group of config.option_groups) {
    const selection = selected.find((item) => item.group_id === group.id)
    if (!selection) {
      if (group.required) {
        return { ok: false, error: `Missing required option for ${group.name}` }
      }
      continue
    }

    const option = group.options.find((item) => item.id === selection.option_id)
    if (!option) {
      return { ok: false, error: `Invalid option selected for ${group.name}` }
    }

    const delta = Number(option.price_delta) || 0
    total += delta
    selectedOptions.push({
      group_id: group.id,
      option_id: option.id,
      label: option.label,
      price_delta: delta,
    })
  }

  return {
    ok: true,
    finalAmount: Math.max(0, total),
    customizationData: {
      uploaded_image_url: uploadedImageUrl,
      selected_options: selectedOptions,
      note: note || undefined,
      computed_price: Math.max(0, total),
    },
  }
}
