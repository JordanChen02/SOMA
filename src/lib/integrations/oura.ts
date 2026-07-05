import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export const OURA_AUTHORIZE_URL = 'https://cloud.ouraring.com/oauth/authorize'
export const OURA_TOKEN_URL = 'https://api.ouraring.com/oauth/token'
export const OURA_REVOKE_URL = 'https://api.ouraring.com/oauth/revoke'
export const OURA_PERSONAL_INFO_URL = 'https://api.ouraring.com/v2/usercollection/personal_info'
export const OURA_SCOPES = ['email', 'personal', 'daily', 'heartrate', 'workout'] as const

export type OuraConnectionStatus =
  | 'setup_required'
  | 'sign_in_required'
  | 'not_connected'
  | 'connected'
  | 'error'

type OuraTokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
  scope?: string
  token_type?: string
}

type OuraAccountRow = {
  user_id: string
  oura_user_id: string | null
  connected: boolean
  scopes: string[]
  access_token_encrypted: string
  refresh_token_encrypted: string
  expires_at: string
  last_synced_at: string | null
  last_error: string | null
}

export function getOuraMissingEnv() {
  return [
    'OURA_CLIENT_ID',
    'OURA_CLIENT_SECRET',
    'OURA_REDIRECT_URI',
    'OURA_TOKEN_ENCRYPTION_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
  ].filter((key) => !process.env[key])
}

export function isOuraConfigured() {
  return getOuraMissingEnv().length === 0
}

export function getOuraConfig() {
  const missing = getOuraMissingEnv()
  if (missing.length) {
    throw new Error(`Oura setup required: missing ${missing.join(', ')}`)
  }
  return {
    clientId: process.env.OURA_CLIENT_ID!,
    clientSecret: process.env.OURA_CLIENT_SECRET!,
    redirectUri: process.env.OURA_REDIRECT_URI!,
  }
}

function getEncryptionKey() {
  const value = process.env.OURA_TOKEN_ENCRYPTION_KEY
  if (!value) throw new Error('Missing Oura token encryption key')

  if (/^[a-f0-9]{64}$/i.test(value)) return Buffer.from(value, 'hex')

  const base64 = Buffer.from(value, 'base64')
  if (base64.length === 32) return base64

  const utf8 = Buffer.from(value, 'utf8')
  if (utf8.length === 32) return utf8

  throw new Error('OURA_TOKEN_ENCRYPTION_KEY must be 32 bytes, base64 encoded 32 bytes, or 64 hex characters')
}

export function encryptToken(token: string) {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`
}

export function decryptToken(encryptedToken: string) {
  const [version, ivValue, tagValue, encryptedValue] = encryptedToken.split(':')
  if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) {
    throw new Error('Invalid encrypted Oura token format')
  }
  const key = getEncryptionKey()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

function signState(userId: string, state: string) {
  return crypto
    .createHmac('sha256', getEncryptionKey())
    .update(`${userId}.${state}`)
    .digest('base64url')
}

export function createOuraStateCookie(userId: string) {
  const state = crypto.randomBytes(32).toString('base64url')
  const signature = signState(userId, state)
  const payload = Buffer.from(JSON.stringify({ userId, state, signature }), 'utf8').toString('base64url')
  return { state, payload }
}

export function verifyOuraStateCookie(payload: string | undefined, returnedState: string | null) {
  if (!payload || !returnedState) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { userId?: string; state?: string; signature?: string }
    if (!parsed.userId || !parsed.state || !parsed.signature) return null
    if (parsed.state !== returnedState) return null
    const expected = signState(parsed.userId, parsed.state)
    const expectedBuffer = Buffer.from(expected)
    const signatureBuffer = Buffer.from(parsed.signature)
    if (expectedBuffer.length !== signatureBuffer.length) return null
    if (!crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) return null
    return { userId: parsed.userId, state: parsed.state }
  } catch {
    return null
  }
}

function tokenExpiry(expiresInSeconds: number) {
  return new Date(Date.now() + Math.max(expiresInSeconds, 0) * 1000)
}

function parseScopes(scope?: string) {
  const scopes = scope?.trim() ? scope.trim().split(/\s+/) : [...OURA_SCOPES]
  return Array.from(new Set(scopes))
}

async function requestOuraToken(body: Record<string, string>) {
  const config = getOuraConfig()
  const form = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    ...body,
  })
  const response = await fetch(OURA_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form,
    cache: 'no-store',
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof data?.error_description === 'string' ? data.error_description : 'Oura token request failed')
  }
  if (!data.access_token || !data.refresh_token || typeof data.expires_in !== 'number') {
    throw new Error('Oura token response was missing required token fields')
  }
  return data as OuraTokenResponse
}

export async function exchangeOuraCode(code: string) {
  const config = getOuraConfig()
  return requestOuraToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
  })
}

export async function refreshOuraToken(refreshToken: string) {
  return requestOuraToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
}

export async function fetchOuraPersonalInfo(accessToken: string) {
  const response = await fetch(OURA_PERSONAL_INFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof data?.detail === 'string' ? data.detail : 'Unable to fetch Oura profile')
  }
  return data as { id?: string; email?: string; age?: number; biological_sex?: string }
}

export async function upsertOuraConnection(userId: string, token: OuraTokenResponse, ouraUserId?: string | null) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('connected_oura_accounts').upsert({
    user_id: userId,
    oura_user_id: ouraUserId ?? null,
    connected: true,
    scopes: parseScopes(token.scope),
    access_token_encrypted: encryptToken(token.access_token),
    refresh_token_encrypted: encryptToken(token.refresh_token),
    expires_at: tokenExpiry(token.expires_in).toISOString(),
    last_synced_at: new Date().toISOString(),
    last_error: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (error) throw new Error(error.message)
}

export async function getOuraAccount(userId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('connected_oura_accounts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as OuraAccountRow | null
}

export async function getValidOuraAccessToken(userId: string) {
  const account = await getOuraAccount(userId)
  if (!account?.connected) throw new Error('Oura is not connected')

  const expiresAt = new Date(account.expires_at).getTime()
  const shouldRefresh = expiresAt <= Date.now() + 60_000
  if (!shouldRefresh) return decryptToken(account.access_token_encrypted)

  const refreshed = await refreshOuraToken(decryptToken(account.refresh_token_encrypted))
  await upsertOuraConnection(userId, refreshed, account.oura_user_id)
  return refreshed.access_token
}

export async function disconnectOura(userId: string) {
  const account = await getOuraAccount(userId)
  let revoked = false

  if (account?.access_token_encrypted) {
    const accessToken = decryptToken(account.access_token_encrypted)
    const response = await fetch(`${OURA_REVOKE_URL}?access_token=${encodeURIComponent(accessToken)}`, {
      method: 'GET',
      cache: 'no-store',
    }).catch(() => null)
    revoked = Boolean(response?.ok)
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('connected_oura_accounts')
    .delete()
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  return { revoked }
}

const OURA_DAILY_BASE = 'https://api.ouraring.com/v2/usercollection'

async function fetchOuraDailyCollection(accessToken: string, collection: string, startDate: string, endDate: string) {
  const url = `${OURA_DAILY_BASE}/${collection}?start_date=${startDate}&end_date=${endDate}`
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof data?.detail === 'string' ? data.detail : `Unable to fetch Oura ${collection}`)
  }
  return (data.data ?? []) as Record<string, unknown>[]
}

export function fetchOuraDailyReadiness(accessToken: string, startDate: string, endDate: string) {
  return fetchOuraDailyCollection(accessToken, 'daily_readiness', startDate, endDate)
}

export function fetchOuraDailySleep(accessToken: string, startDate: string, endDate: string) {
  return fetchOuraDailyCollection(accessToken, 'daily_sleep', startDate, endDate)
}

export function fetchOuraSleepSessions(accessToken: string, startDate: string, endDate: string) {
  return fetchOuraDailyCollection(accessToken, 'sleep', startDate, endDate)
}

export function fetchOuraDailyActivity(accessToken: string, startDate: string, endDate: string) {
  return fetchOuraDailyCollection(accessToken, 'daily_activity', startDate, endDate)
}

// Returns the main sleep session for a given day: prefers type='long_sleep', falls back to longest total_sleep_duration.
export function pickMainSleepSession(sessions: Record<string, unknown>[], day: string) {
  const forDay = sessions.filter((s) => s.day === day)
  if (!forDay.length) return null
  const longSleep = forDay.find((s) => s.type === 'long_sleep')
  if (longSleep) return longSleep
  return forDay.reduce((best, s) => {
    const bestDur = typeof best.total_sleep_duration === 'number' ? best.total_sleep_duration : 0
    const sDur = typeof s.total_sleep_duration === 'number' ? s.total_sleep_duration : 0
    return sDur > bestDur ? s : best
  })
}

export async function updateLastSyncedAt(userId: string) {
  const supabase = createAdminClient()
  await supabase
    .from('connected_oura_accounts')
    .update({ last_synced_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
}

export async function recordOuraError(userId: string, message: string) {
  const supabase = createAdminClient()
  await supabase
    .from('connected_oura_accounts')
    .update({ last_error: message, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
}
