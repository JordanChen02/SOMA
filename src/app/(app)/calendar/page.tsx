export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { DEMO_MODE_COOKIE } from '@/lib/auth/demo'
import { createClient } from '@/lib/supabase/server'
import { CalendarClient } from './CalendarClient'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cookieStore = await cookies()
  const demoMode = cookieStore.get(DEMO_MODE_COOKIE)?.value === '1'
  if (!user && demoMode) return <CalendarClient entries={[]} />
  if (!user) redirect('/login')

  // Fetch last 90 days of entries
  const since = new Date()
  since.setDate(since.getDate() - 90)

  const { data: entries } = await supabase
    .from('journal_entries')
    .select('entry_date, completion_status, goal, answers')
    .eq('user_id', user.id)
    .gte('entry_date', since.toISOString().slice(0, 10))
    .order('entry_date', { ascending: false })

  return <CalendarClient entries={entries ?? []} />
}

