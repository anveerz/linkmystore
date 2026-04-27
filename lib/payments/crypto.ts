import crypto from 'crypto'

function getEncryptionKey(): Buffer | null {
  const raw = process.env.PAYMENT_ACCOUNT_ENCRYPTION_KEY?.trim()
  if (!raw) return null
  return crypto.createHash('sha256').update(raw).digest()
}

export function encryptSecret(value: string): string {
  const plain = value.trim()
  if (!plain) return ''

  const key = getEncryptionKey()
  if (!key) {
    return `plain:${plain}`
  }

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptSecret(value: string | null | undefined): string {
  if (!value) return ''
  if (value.startsWith('plain:')) return value.slice(6)

  const key = getEncryptionKey()
  if (!key) {
    throw new Error('PAYMENT_ACCOUNT_ENCRYPTION_KEY is required to decrypt payment secrets')
  }

  const [ivHex, tagHex, dataHex] = value.split(':')
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Invalid encrypted payment secret format')
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}

