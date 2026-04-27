import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isInternalAdminEmail } from '@/lib/internal-admin'
import InternalOutreachClient from './InternalOutreachClient'

export default async function InternalOutreachPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  if (!isInternalAdminEmail(user.email)) {
    notFound()
  }

  return <InternalOutreachClient />
}
