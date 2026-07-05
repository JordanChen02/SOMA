import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeOuraCode, fetchOuraPersonalInfo, isOuraConfigured, upsertOuraConnection, verifyOuraStateCookie } from '@/lib/integrations/oura'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = url.origin
  const code = url.searchParams.get('code')
  const returnedState = url.searchParams.get('state')
  const denied = url.searchParams.get('error')

  const redirect = (reason: string) => {
    const destination = reason === 'sign_in_required'
      ? `${origin}/login?error=oura_sign_in_required`
      : `${origin}/today?oura=${encodeURIComponent(reason)}`
    const response = NextResponse.redirect(destination)
    response.cookies.delete('oura_oauth_state')
    return response
  }

  if (!isOuraConfigured()) return redirect('setup_required')
  if (denied) return redirect(denied === 'access_denied' ? 'consent_denied' : 'oauth_error')
  if (!code) return redirect('missing_code')

  const cookieHeader = request.headers.get('cookie') ?? ''
  const stateCookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('oura_oauth_state='))
    ?.slice('oura_oauth_state='.length)

  const verifiedState = verifyOuraStateCookie(stateCookie, returnedState)
  if (!verifiedState) return redirect('invalid_state')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('sign_in_required')
  if (user.id !== verifiedState.userId) return redirect('invalid_session')

  try {
    const token = await exchangeOuraCode(code)
    const personalInfo = await fetchOuraPersonalInfo(token.access_token)
    await upsertOuraConnection(user.id, token, personalInfo.id ?? null)
    return redirect('connected')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'connection_failed'
    return redirect(message.toLowerCase().includes('membership') ? 'no_oura_data' : 'connection_failed')
  }
}
