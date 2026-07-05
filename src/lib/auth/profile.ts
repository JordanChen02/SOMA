import type { SupabaseClient, User } from '@supabase/supabase-js'

function namePartsFromUser(user: User) {
  const metadataName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : ''
  const fallbackName = user.email?.split('@')[0] ?? 'User'
  const parts = (metadataName || fallbackName).trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] ?? 'User',
    lastName: parts.slice(1).join(' '),
  }
}

export function displayNameFromUser(user: User) {
  const { firstName, lastName } = namePartsFromUser(user)
  return [firstName, lastName].filter(Boolean).join(' ')
}

export function initialsFromUser(user: User) {
  return displayNameFromUser(user)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U'
}

export async function ensureUserProfile(supabase: SupabaseClient, user: User) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (existing) return

  const { firstName, lastName } = namePartsFromUser(user)
  await supabase.from('profiles').insert({
    id: user.id,
    first_name: firstName,
    last_name: lastName,
    training_frequency: '',
  })
}
