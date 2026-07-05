import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeCompletionStatus } from '@/lib/goals'
import type { GoalType } from '@/lib/types'

export const runtime = 'nodejs'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

async function getPrimaryGoal(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<GoalType | null> {
  const { data } = await supabase
    .from('user_goals')
    .select('goal')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .maybeSingle()
  return (data?.goal as GoalType) ?? null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ entry: null, goal: null })

  const primaryGoal = await getPrimaryGoal(supabase, user.id)
  if (!primaryGoal) return NextResponse.json({ entry: null, goal: null })

  const { data: entry } = await supabase
    .from('journal_entries')
    .select('id, answers')
    .eq('user_id', user.id)
    .eq('entry_date', todayISO())
    .eq('goal', primaryGoal)
    .maybeSingle()

  return NextResponse.json({ entry, goal: primaryGoal })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as { key?: string; value?: unknown } | null
  if (!body || typeof body.key !== 'string') {
    return NextResponse.json({ error: 'Missing key' }, { status: 400 })
  }

  const primaryGoal = await getPrimaryGoal(supabase, user.id)
  if (!primaryGoal) return NextResponse.json({ error: 'No primary goal' }, { status: 400 })

  const today = todayISO()

  const { data: existing } = await supabase
    .from('journal_entries')
    .select('id, answers')
    .eq('user_id', user.id)
    .eq('entry_date', today)
    .eq('goal', primaryGoal)
    .maybeSingle()

  const currentAnswers = (existing?.answers ?? {}) as Record<string, string | number | boolean>
  const updatedAnswers: Record<string, string | number | boolean> = {
    ...currentAnswers,
    [body.key]: body.value as string | number | boolean,
  }
  const completionStatus = computeCompletionStatus(primaryGoal, updatedAnswers)

  if (existing?.id) {
    await supabase
      .from('journal_entries')
      .update({ answers: updatedAnswers, completion_status: completionStatus })
      .eq('id', existing.id)
  } else {
    await supabase.from('journal_entries').insert({
      user_id: user.id,
      entry_date: today,
      goal: primaryGoal,
      answers: updatedAnswers,
      completion_status: completionStatus,
    })
  }

  return NextResponse.json({ ok: true })
}
