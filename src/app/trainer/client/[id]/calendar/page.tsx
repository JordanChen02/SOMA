export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TrainerCalendarClient } from './TrainerCalendarClient'

export default async function TrainerCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: client } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('id', id)
    .single()

  if (!client) redirect('/trainer')

  const since = new Date()
  since.setDate(since.getDate() - 30)
  const until = new Date()
  until.setDate(until.getDate() + 60)

  const { data: events } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('client_id', id)
    .gte('event_date', since.toISOString().slice(0, 10))
    .lte('event_date', until.toISOString().slice(0, 10))
    .order('event_date')

  return (
    <TrainerCalendarClient
      client={client}
      events={events ?? []}
      trainerId={user?.id ?? ''}
    />
  )
}
