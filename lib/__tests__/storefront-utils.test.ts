/**
 * Tests for lib/storefront-utils.ts
 * Covers: formatPrice, formatNumber, isValidHexColor, isValidImageUrl,
 *         sanitizeContent, clampRating, roundRating, isValidProduct
 */

import {
  formatPrice,
  formatNumber,
  isValidHexColor,
  isValidImageUrl,
  sanitizeContent,
  clampRating,
  roundRating,
  isValidProduct,
} from '@/lib/storefront-utils'

// ─── formatPrice ────────────────────────────────────────────────────────────

describe('formatPrice', () => {
  it('formats 100 paisa as ₹1', () => {
    expect(formatPrice(100)).toMatch(/₹\s*1/)
  })

  it('formats 100000 paisa as ₹1,000', () => {
    expect(formatPrice(100000)).toMatch(/₹\s*1,000/)
  })

  it('formats 50 paisa as a decimal rupee value', () => {
    // Intl.NumberFormat trims trailing zeros: 0.50 → "0.5"
    expect(formatPrice(50)).toMatch(/₹\s*0\.5/)
  })

  it('formats 0 paisa as ₹0 (free products)', () => {
    expect(formatPrice(0)).toMatch(/₹\s*0/)
  })

  it('formats large value 10000000 paisa as ₹1,00,000 (Indian numbering)', () => {
    const result = formatPrice(10000000)
    expect(result).toContain('1,00,000')
  })

  it('throws for negative price', () => {
    expect(() => formatPrice(-1)).toThrow('Price must be a non-negative integer')
  })

  it('formats price with decimals correctly', () => {
    expect(formatPrice(99900)).toMatch(/999/)
  })
})

// ─── formatNumber ───────────────────────────────────────────────────────────

describe('formatNumber', () => {
  it('returns number as string when less than 1000', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(1)).toBe('1')
    expect(formatNumber(999)).toBe('999')
  })

  it('returns "1K+" for exactly 1000', () => {
    expect(formatNumber(1000)).toBe('1K+')
  })

  it('returns "1K+" for 1500 (floors, not rounds)', () => {
    expect(formatNumber(1500)).toBe('1K+')
  })

  it('returns "1K+" for 1999', () => {
    expect(formatNumber(1999)).toBe('1K+')
  })

  it('returns "2K+" for 2000', () => {
    expect(formatNumber(2000)).toBe('2K+')
  })

  it('returns "10K+" for 10000', () => {
    expect(formatNumber(10000)).toBe('10K+')
  })

  it('returns "999" for 999', () => {
    expect(formatNumber(999)).toBe('999')
  })
})

// ─── isValidHexColor ────────────────────────────────────────────────────────

describe('isValidHexColor', () => {
  it('accepts valid 6-digit hex', () => {
    expect(isValidHexColor('#FF6B35')).toBe(true)
    expect(isValidHexColor('#000000')).toBe(true)
    expect(isValidHexColor('#FFFFFF')).toBe(true)
    expect(isValidHexColor('#3D2176')).toBe(true)
  })

  it('accepts valid 3-digit hex', () => {
    expect(isValidHexColor('#FFF')).toBe(true)
    expect(isValidHexColor('#000')).toBe(true)
    expect(isValidHexColor('#abc')).toBe(true)
  })

  it('accepts lowercase hex', () => {
    expect(isValidHexColor('#ff6b35')).toBe(true)
    expect(isValidHexColor('#aabbcc')).toBe(true)
  })

  it('rejects hex without #', () => {
    expect(isValidHexColor('FF6B35')).toBe(false)
    expect(isValidHexColor('FFF')).toBe(false)
  })

  it('rejects invalid characters', () => {
    expect(isValidHexColor('#GGGGGG')).toBe(false)
    expect(isValidHexColor('#12345Z')).toBe(false)
  })

  it('rejects wrong length', () => {
    expect(isValidHexColor('#FFFF')).toBe(false)   // 4 digits
    expect(isValidHexColor('#FFFFF')).toBe(false)  // 5 digits
    expect(isValidHexColor('#FFFFFFF')).toBe(false) // 7 digits
  })

  it('rejects empty string', () => {
    expect(isValidHexColor('')).toBe(false)
  })

  it('rejects named colors', () => {
    expect(isValidHexColor('red')).toBe(false)
    expect(isValidHexColor('transparent')).toBe(false)
  })
})

// ─── isValidImageUrl ────────────────────────────────────────────────────────

describe('isValidImageUrl', () => {
  it('accepts Supabase storage URLs', () => {
    expect(isValidImageUrl('https://smmcudfvkjieawoawdmx.supabase.co/storage/v1/object/public/product-images/test.png')).toBe(true)
    expect(isValidImageUrl('https://project123.supabase.co/storage/v1/object/public/avatars/pic.jpg')).toBe(true)
  })

  it('accepts any URL containing "supabase" in hostname', () => {
    expect(isValidImageUrl('https://my-supabase-project.example.com/image.png')).toBe(true)
  })

  it('rejects non-Supabase URLs', () => {
    expect(isValidImageUrl('https://example.com/image.png')).toBe(false)
    expect(isValidImageUrl('https://cloudinary.com/image.png')).toBe(false)
    expect(isValidImageUrl('https://s3.amazonaws.com/bucket/image.png')).toBe(false)
  })

  it('rejects malformed URLs', () => {
    expect(isValidImageUrl('not-a-url')).toBe(false)
    expect(isValidImageUrl('')).toBe(false)
    expect(isValidImageUrl('just-a-filename.png')).toBe(false)
  })
})

// ─── sanitizeContent ────────────────────────────────────────────────────────

describe('sanitizeContent', () => {
  it('escapes ampersand', () => {
    expect(sanitizeContent('Tom & Jerry')).toBe('Tom &amp; Jerry')
  })

  it('escapes less-than and greater-than', () => {
    expect(sanitizeContent('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes double quotes', () => {
    expect(sanitizeContent('"hello"')).toBe('&quot;hello&quot;')
  })

  it('escapes single quotes', () => {
    expect(sanitizeContent("it's")).toBe('it&#x27;s')
  })

  it('escapes forward slash', () => {
    expect(sanitizeContent('a/b')).toBe('a&#x2F;b')
  })

  it('escapes a full XSS attack string', () => {
    const xss = '<script>alert("xss")</script>'
    const result = sanitizeContent(xss)
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
    expect(result).not.toContain('"')
    expect(result).toContain('&lt;script&gt;')
    expect(result).toContain('alert')
  })

  it('leaves safe characters untouched', () => {
    expect(sanitizeContent('Hello World 123!')).toBe('Hello World 123!')
  })

  it('handles empty string', () => {
    expect(sanitizeContent('')).toBe('')
  })

  it('handles multiple replacements in one string', () => {
    const result = sanitizeContent('a & b < c > d')
    expect(result).toBe('a &amp; b &lt; c &gt; d')
  })
})

// ─── clampRating ────────────────────────────────────────────────────────────

describe('clampRating', () => {
  it('returns value unchanged when within 0-5', () => {
    expect(clampRating(0)).toBe(0)
    expect(clampRating(2.5)).toBe(2.5)
    expect(clampRating(5)).toBe(5)
  })

  it('clamps negative values to 0', () => {
    expect(clampRating(-1)).toBe(0)
    expect(clampRating(-100)).toBe(0)
  })

  it('clamps values above 5 to 5', () => {
    expect(clampRating(6)).toBe(5)
    expect(clampRating(100)).toBe(5)
  })

  it('handles edge values exactly', () => {
    expect(clampRating(0)).toBe(0)
    expect(clampRating(5)).toBe(5)
  })
})

// ─── roundRating ────────────────────────────────────────────────────────────

describe('roundRating', () => {
  it('rounds to 1 decimal place', () => {
    expect(roundRating(4.25)).toBe(4.3)
    expect(roundRating(4.24)).toBe(4.2)
  })

  it('leaves whole numbers unchanged', () => {
    expect(roundRating(4)).toBe(4)
    expect(roundRating(0)).toBe(0)
    expect(roundRating(5)).toBe(5)
  })

  it('rounds .05 correctly', () => {
    expect(roundRating(4.05)).toBe(4.1)
  })

  it('rounds .15 correctly', () => {
    expect(roundRating(3.15)).toBe(3.2)
  })

  it('handles 1-decimal inputs unchanged', () => {
    expect(roundRating(3.5)).toBe(3.5)
    expect(roundRating(4.7)).toBe(4.7)
  })
})

// ─── isValidProduct ─────────────────────────────────────────────────────────

describe('isValidProduct', () => {
  const validProduct = {
    title: 'My Product',
    price: 9900,
    images: ['https://example.supabase.co/image.png'],
  }

  it('returns true for a valid product', () => {
    expect(isValidProduct(validProduct)).toBe(true)
  })

  it('returns true for a free product (price = 0)', () => {
    expect(isValidProduct({ ...validProduct, price: 0 })).toBe(true)
  })

  it('returns false for null / undefined', () => {
    expect(isValidProduct(null as unknown as Parameters<typeof isValidProduct>[0])).toBe(false)
    expect(isValidProduct(undefined as unknown as Parameters<typeof isValidProduct>[0])).toBe(false)
  })

  it('returns false when title is missing', () => {
    expect(isValidProduct({ ...validProduct, title: '' })).toBe(false)
    expect(isValidProduct({ ...validProduct, title: undefined as unknown as string })).toBe(false)
  })

  it('returns false when title is too long (>100 chars)', () => {
    expect(isValidProduct({ ...validProduct, title: 'a'.repeat(101) })).toBe(false)
  })

  it('returns true for title of exactly 100 chars', () => {
    expect(isValidProduct({ ...validProduct, title: 'a'.repeat(100) })).toBe(true)
  })

  it('returns false for negative price', () => {
    expect(isValidProduct({ ...validProduct, price: -1 })).toBe(false)
  })

  it('returns false when price is not a number', () => {
    expect(isValidProduct({ ...validProduct, price: '100' as unknown as number })).toBe(false)
    expect(isValidProduct({ ...validProduct, price: null as unknown as number })).toBe(false)
  })

  it('returns true when images array is empty (uses UI fallback image)', () => {
    expect(isValidProduct({ ...validProduct, images: [] })).toBe(true)
  })

  it('returns true when images is omitted (legacy products)', () => {
    const { images, ...productWithoutImages } = validProduct
    expect(images).toBeDefined()
    expect(isValidProduct(productWithoutImages as Parameters<typeof isValidProduct>[0])).toBe(true)
  })

  it('returns true when images is null (legacy products)', () => {
    expect(isValidProduct({ ...validProduct, images: null as unknown as string[] })).toBe(true)
  })

  it('returns false when images is not an array', () => {
    expect(isValidProduct({ ...validProduct, images: 'url' as unknown as string[] })).toBe(false)
  })

  it('returns false when category is too long (>50 chars)', () => {
    expect(isValidProduct({ ...validProduct, category: 'a'.repeat(51) })).toBe(false)
  })

  it('returns true when category is exactly 50 chars', () => {
    expect(isValidProduct({ ...validProduct, category: 'a'.repeat(50) })).toBe(true)
  })

  it('returns false when average_rating is out of range', () => {
    expect(isValidProduct({ ...validProduct, average_rating: -0.1 })).toBe(false)
    expect(isValidProduct({ ...validProduct, average_rating: 5.1 })).toBe(false)
  })

  it('returns true when average_rating is within 0-5', () => {
    expect(isValidProduct({ ...validProduct, average_rating: 0 })).toBe(true)
    expect(isValidProduct({ ...validProduct, average_rating: 4.5 })).toBe(true)
    expect(isValidProduct({ ...validProduct, average_rating: 5 })).toBe(true)
  })

  it('returns false when review_count is negative', () => {
    expect(isValidProduct({ ...validProduct, review_count: -1 })).toBe(false)
  })

  it('returns true when review_count is 0 or positive', () => {
    expect(isValidProduct({ ...validProduct, review_count: 0 })).toBe(true)
    expect(isValidProduct({ ...validProduct, review_count: 42 })).toBe(true)
  })

  it('returns true for product with valid optional fields', () => {
    expect(isValidProduct({
      ...validProduct,
      category: 'digital',
      average_rating: 4.5,
      review_count: 10,
    })).toBe(true)
  })
})
