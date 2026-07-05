import { AppShell } from '@/components/app/AppShell'
import { DEMO_MODE_COOKIE, demoUser } from '@/lib/auth/demo'
import { ensureUserProfile } from '@/lib/auth/profile'
import { loadAppShellInitialData } from '@/lib/auth/initialData'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function TodayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cookieStore = await cookies()
  const demoMode = cookieStore.get(DEMO_MODE_COOKIE)?.value === '1'

  if (!user && demoMode) return <AppShell user={demoUser} demoMode />
  if (!user) redirect('/login')

  await ensureUserProfile(supabase, user)

  const initialData = await loadAppShellInitialData(supabase, user)

  return <AppShell user={user} initialData={initialData} />
}
