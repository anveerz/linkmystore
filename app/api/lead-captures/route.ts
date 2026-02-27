import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const creatorId = searchParams.get('creator_id')

        if (!creatorId) {
            return NextResponse.json({ error: 'creator_id is required' }, { status: 400 })
        }

        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('lead_captures')
            .select('*')
            .eq('creator_id', creatorId)
            .order('created_at', { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ leads: data })
    } catch {
        return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { product_id, creator_id, name, email, phone } = body

        if (!product_id || !creator_id || !name || !email) {
            return NextResponse.json({ error: 'Missing required fields (name, email)' }, { status: 400 })
        }

        const supabase = createAdminClient()

        // Save lead
        const { data, error } = await supabase
            .from('lead_captures')
            .insert({
                product_id,
                creator_id,
                name,
                email,
                phone: phone || null,
            })
            .select('id')
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Get the product's digital file URL to deliver
        const { data: product } = await supabase
            .from('products')
            .select('digital_file_url, digital_file_urls, title')
            .eq('id', product_id)
            .single()

        const downloadUrls: string[] = []
        if (product) {
            const fileUrls = product.digital_file_urls || (product.digital_file_url ? [product.digital_file_url] : [])
            for (const fileUrl of fileUrls) {
                const { data: signedUrl } = await supabase.storage
                    .from('digital-files')
                    .createSignedUrl(fileUrl, 60 * 60 * 24 * 7) // 7 days
                if (signedUrl?.signedUrl) downloadUrls.push(signedUrl.signedUrl)
            }
        }

        return NextResponse.json({
            success: true,
            lead_id: data.id,
            download_urls: downloadUrls,
        })
    } catch (error: unknown) {
        console.error('Lead capture error:', error)
        return NextResponse.json({ error: 'Failed to capture lead' }, { status: 500 })
    }
}
