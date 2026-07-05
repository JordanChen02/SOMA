export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GenerateWorkoutClient } from './GenerateWorkoutClient'

export default async function GenerateWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: client } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, injuries, training_frequency')
    .eq('id', id)
    .single()

  if (!client) redirect('/trainer')

  const { data: clientInfo } = user ? await supabase
    .from('client_info')
    .select('sessions_remaining')
    .eq('client_id', id)
    .single() : { data: null }

  const { data: goals } = await supabase
    .from('user_goals')
    .select('goal, is_primary')
    .eq('user_id', id)

  return (
    <GenerateWorkoutClient
      client={client}
      trainerId={user?.id ?? ''}
      goals={goals ?? []}
      sessionsRemaining={clientInfo?.sessions_remaining ?? 0}
    />
  )
}
