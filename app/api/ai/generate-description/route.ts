import { NextResponse } from 'next/server'

const PHYSICAL_CATEGORIES = [
  'Jewellery & Accessories',
  'Clothing & Fashion',
  'Home Decor & Furnishing',
  'Art & Craft',
  'Food & Beverages',
  'Beauty & Skincare',
  'Books & Stationery',
  'Toys & Games',
  'Electronics & Gadgets',
  'Sports & Fitness',
  'Baby & Kids',
  'Pet Supplies',
  'Plants & Gardening',
  'Health & Wellness',
  'Gift Hampers',
  'Handmade & Artisan',
]

const DIGITAL_CATEGORIES = [
  'E-books & Guides',
  'Templates & Presets',
  'Online Course',
  'Photography Presets',
  'Social Media Templates',
  'Planners & Journals',
  'Design Assets',
  'Music & Audio',
  'Videos & Tutorials',
  'Coaching & Consulting',
  'Financial Tools',
]

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { imageBase64, imageMimeType, title, type } = body

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }

    const categoryList = type === 'digital' ? DIGITAL_CATEGORIES : PHYSICAL_CATEGORIES

    // Build the Gemini prompt
    const textPrompt = `You are a product listing expert for an Indian e-commerce platform called LinkMyStore.

Product title: "${title}"
Product type: ${type}

${imageBase64 ? 'Based on the product image and title provided:' : 'Based on the product title:'}

1. Write a compelling, honest product description in 3-4 sentences.
   - Use simple, conversational English (Indian audience)
   - Highlight key features and benefits
   - Do NOT include pricing or shipping info
   - Keep it under 150 words

2. Suggest the best matching category from this list:
${categoryList.map((c, i) => `   ${i + 1}. ${c}`).join('\n')}

Respond in this exact JSON format (no markdown, no code blocks):
{"description": "your description here", "category": "exact category name from the list"}`

    // Build request parts
    const parts: object[] = []
    if (imageBase64 && imageMimeType) {
      parts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: imageBase64,
        },
      })
    }
    parts.push({ text: textPrompt })

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512,
          },
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errData = await geminiResponse.json()
      console.error('Gemini API error:', errData)
      return NextResponse.json(
        { error: 'AI generation failed. Please try again.' },
        { status: 500 }
      )
    }

    const geminiData = await geminiResponse.json()
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Parse JSON from response
    let description = ''
    let category = ''
    try {
      // Strip any potential markdown code fences
      const cleaned = rawText.replace(/```json?\n?/gi, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      description = parsed.description || ''
      category = parsed.category || ''
    } catch {
      // Fallback: try to extract with regex
      const descMatch = rawText.match(/"description"\s*:\s*"([^"]+)"/)
      const catMatch = rawText.match(/"category"\s*:\s*"([^"]+)"/)
      description = descMatch?.[1] || ''
      category = catMatch?.[1] || ''
    }

    if (!description) {
      return NextResponse.json(
        { error: 'Could not generate description. Please write it manually.' },
        { status: 422 }
      )
    }

    return NextResponse.json({ description, category })
  } catch (error) {
    console.error('AI generate-description error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
