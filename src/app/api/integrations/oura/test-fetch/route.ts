import { NextResponse } from 'next/server'
import { fetchOuraPersonalInfo, getValidOuraAccessToken, isOuraConfigured, recordOuraError } from '@/lib/integrations/oura'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  if (!isOuraConfigured()) {
    return NextResponse.json({ status: 'setup_required', ok: false, message: 'Oura setup required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ status: 'sign_in_required', ok: false, message: 'Sign in required' }, { status: 401 })
  }

  try {
    const accessToken = await getValidOuraAccessToken(user.id)
    const personalInfo = await fetchOuraPersonalInfo(accessToken)
    return NextResponse.json({
      status: 'connected',
      ok: true,
      profile: {
        id: personalInfo.id ?? null,
        email: personalInfo.email ?? null,
      },
    })
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'unknown'
    await recordOuraError(user.id, rawMessage)
    return NextResponse.json({ status: 'error', ok: false, message: 'Connection verification failed' }, { status: 500 })
  }
}
