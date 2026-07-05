import { NextResponse } from 'next/server'
import { getOuraAccount, getOuraMissingEnv, isOuraConfigured } from '@/lib/integrations/oura'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  if (!isOuraConfigured()) {
    return NextResponse.json({
      status: 'setup_required',
      connected: false,
      message: 'Oura setup required',
      missing: getOuraMissingEnv(),
    })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({
      status: 'sign_in_required',
      connected: false,
      message: 'Sign in required to connect Oura',
    })
  }

  try {
    const account = await getOuraAccount(user.id)
    console.log('[oura/status] account lookup result:', account ? `connected=${account.connected}, last_error=${JSON.stringify(account.last_error)}` : 'null')
    if (!account?.connected) {
      return NextResponse.json({ status: 'not_connected', connected: false })
    }

    const admin = createAdminClient()
    const { data: latestData, error: dailyDataError } = await admin
      .from('oura_daily_data')
      .select('day, readiness_score, sleep_score, activity_score, steps, resting_heart_rate, average_hrv')
      .eq('user_id', user.id)
      .order('day', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (dailyDataError) console.error('[oura/status] oura_daily_data query error — code:', dailyDataError.code, '| message:', dailyDataError.message)

    return NextResponse.json({
      status: account.last_error ? 'error' : 'connected',
      connected: true,
      scopes: account.scopes,
      expiresAt: account.expires_at,
      lastSyncedAt: account.last_synced_at,
      lastError: account.last_error,
      latestData: latestData ?? null,
    })
  } catch {
    return NextResponse.json({
      status: 'error',
      connected: false,
      message: 'Unable to read Oura connection status',
    }, { status: 500 })
  }
}
