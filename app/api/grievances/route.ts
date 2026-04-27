import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_TYPES = new Set(['general', 'abuse', 'fraud', 'ip', 'privacy'])

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : ''
    const description = typeof body?.description === 'string' ? body.description.trim() : ''
    const typeCandidate = typeof body?.type === 'string' ? body.type.trim().toLowerCase() : 'general'
    const type = ALLOWED_TYPES.has(typeCandidate) ? typeCandidate : 'general'

    if (!name || !email || !subject || !description) {
      return NextResponse.json(
        { error: 'name, email, subject, and description are required' },
        { status: 400 }
      )
    }

    const now = new Date()
    const ackDeadline = new Date(now)
    ackDeadline.setHours(ackDeadline.getHours() + 72)
    const resolutionDeadline = new Date(now)
    resolutionDeadline.setDate(resolutionDeadline.getDate() + 15)

    const admin = createAdminClient()
    const { data: ticket, error } = await admin
      .from('grievance_tickets')
      .insert({
        creator_id: typeof body?.creator_id === 'string' ? body.creator_id : null,
        type,
        name,
        email,
        phone: typeof body?.phone === 'string' ? body.phone.trim() : null,
        subject,
        description,
        related_url: typeof body?.related_url === 'string' ? body.related_url.trim() : null,
        acknowledgement_deadline: ackDeadline.toISOString(),
        resolution_deadline: resolutionDeadline.toISOString(),
      })
      .select('id, created_at, acknowledgement_deadline, resolution_deadline')
      .single()

    if (error || !ticket) {
      return NextResponse.json({ error: error?.message || 'Failed to create grievance ticket' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      ticket_id: ticket.id,
      created_at: ticket.created_at,
      acknowledgement_deadline: ticket.acknowledgement_deadline,
      resolution_deadline: ticket.resolution_deadline,
      message: 'Grievance submitted successfully',
    })
  } catch (error) {
    console.error('Grievance submission error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit grievance' },
      { status: 500 }
    )
  }
}

