function parseAllowlist(value: string | undefined) {
  return (value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

export function getInternalAdminEmailAllowlist() {
  return Array.from(
    new Set([
      ...parseAllowlist(process.env.INTERNAL_ADMIN_EMAILS),
      ...parseAllowlist(process.env.INTERNAL_ADMIN_EMAIL),
    ])
  )
}

export function isInternalAdminEmail(email: string | null | undefined) {
  if (!email) return false
  return getInternalAdminEmailAllowlist().includes(email.trim().toLowerCase())
}
