export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { DEMO_MODE_COOKIE } from '@/lib/auth/demo'
import { createClient } from '@/lib/supabase/server'
import { ProgressClient } from './ProgressClient'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cookieStore = await cookies()
  const demoMode = cookieStore.get(DEMO_MODE_COOKIE)?.value === '1'
  if (!user && demoMode) return <ProgressClient entries={[]} userGoals={[]} />
  if (!user) redirect('/login')

  const since = new Date()
  since.setDate(since.getDate() - 30)

  const { data: entries } = await supabase
    .from('journal_entries')
    .select('entry_date, completion_status, goal, answers')
    .eq('user_id', user.id)
    .gte('entry_date', since.toISOString().slice(0, 10))
    .order('entry_date', { ascending: true })

  const { data: goals } = await supabase
    .from('user_goals')
    .select('goal')
    .eq('user_id', user.id)

  return <ProgressClient entries={entries ?? []} userGoals={(goals ?? []).map((g) => g.goal)} />
}

