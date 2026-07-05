export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogWorkoutClient } from './LogWorkoutClient'

export default async function LogWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: client } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('id', id)
    .single()

  if (!client) redirect('/trainer')

  return <LogWorkoutClient client={client} trainerId={user?.id ?? ''} />
}
