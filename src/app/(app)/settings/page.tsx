export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: goals } = await supabase
    .from('user_goals')
    .select('goal, is_primary')
    .eq('user_id', user.id)

  return (
    <SettingsClient
      profile={profile}
      userGoals={goals ?? []}
      email={user.email ?? ''}
    />
  )
}

