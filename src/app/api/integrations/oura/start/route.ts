import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOuraStateCookie, getOuraConfig, isOuraConfigured, OURA_AUTHORIZE_URL, OURA_SCOPES } from '@/lib/integrations/oura'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)

  if (!isOuraConfigured()) {
    return NextResponse.redirect(`${origin}/today?oura=setup_required`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=oura_sign_in_required`)
  }

  const config = getOuraConfig()
  const { state, payload } = createOuraStateCookie(user.id)
  const authorizeUrl = new URL(OURA_AUTHORIZE_URL)
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('client_id', config.clientId)
  authorizeUrl.searchParams.set('redirect_uri', config.redirectUri)
  authorizeUrl.searchParams.set('scope', OURA_SCOPES.join(' '))
  authorizeUrl.searchParams.set('state', state)

  const response = NextResponse.redirect(authorizeUrl)
  response.cookies.set('oura_oauth_state', payload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  })
  return response
}
