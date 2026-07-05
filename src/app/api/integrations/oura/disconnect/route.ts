import { NextResponse } from 'next/server'
import { disconnectOura, isOuraConfigured } from '@/lib/integrations/oura'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST() {
  if (!isOuraConfigured()) {
    return NextResponse.json({ status: 'setup_required', connected: false, message: 'Oura setup required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ status: 'sign_in_required', connected: false, message: 'Sign in required' }, { status: 401 })
  }

  try {
    const { revoked } = await disconnectOura(user.id)
    return NextResponse.json({ status: 'not_connected', connected: false, revoked })
  } catch {
    return NextResponse.json({ status: 'error', connected: false, message: 'Unable to disconnect Oura' }, { status: 500 })
  }
}
