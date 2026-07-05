export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientDetailView } from './ClientDetailView'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: client }, { data: clientInfo }, { data: measurements }, { data: assessments }, { data: workoutLogs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase.from('client_info').select('*').eq('client_id', id).eq('trainer_id', user.id).single(),
    supabase.from('measurements').select('*').eq('client_id', id).order('measured_at', { ascending: false }),
    supabase.from('assessments').select('*').eq('client_id', id).order('assessed_at', { ascending: false }),
    supabase.from('workout_logs').select('*').eq('client_id', id).order('logged_at', { ascending: false }).limit(20),
  ])

  if (!client) redirect('/trainer')

  return (
    <ClientDetailView
      client={client}
      clientInfo={clientInfo}
      measurements={measurements ?? []}
      assessments={assessments ?? []}
      workoutLogs={workoutLogs ?? []}
      trainerId={user.id}
    />
  )
}
