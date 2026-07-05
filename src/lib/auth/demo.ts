import type { User as SupabaseUser } from '@supabase/supabase-js'

export const DEMO_MODE_COOKIE = 'soma_demo_mode'

export const demoUser: SupabaseUser = {
  id: 'demo-local-user',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'demo@soma.local',
  app_metadata: { provider: 'demo', providers: ['demo'] },
  user_metadata: { full_name: 'Avery Stone' },
  created_at: '2026-06-20T00:00:00.000Z',
  updated_at: '2026-06-20T00:00:00.000Z',
}
