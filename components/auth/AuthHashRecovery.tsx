'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthHashRecovery() {
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || !hash.includes('access_token=')) {
      return
    }

    const params = new URLSearchParams(hash.slice(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    // Always remove auth fragments from URL immediately.
    window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`)

    if (!accessToken || !refreshToken) {
      window.location.assign('/login?error=auth_failed')
      return
    }

    const recover = async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (error) {
        window.location.assign('/login?error=auth_failed')
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.assign('/login?error=auth_failed')
        return
      }

      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .single()

      window.location.assign(creator ? '/dashboard' : '/onboarding')
    }

    void recover()
  }, [])

  return null
}
