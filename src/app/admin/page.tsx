export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminClient } from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch clients linked to this coach
  const { data: links } = await supabase
    .from('coach_links')
    .select('client_id, is_active')
    .eq('coach_id', user.id)
    .eq('is_active', true)

  const clientIds = (links ?? []).map((l) => l.client_id)

  let clients: { id: string; first_name: string; last_name: string }[] = []
  if (clientIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', clientIds)
    clients = data ?? []
  }

  return <AdminClient clients={clients} coachId={user.id} />
}

