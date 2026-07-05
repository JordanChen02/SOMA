import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { GoalType } from '@/lib/types'

// Data loaded server-side and handed to AppShell so real signed-in users start
// from their saved Supabase state instead of falling back to demo defaults.
//
// Backed by tables: profiles, user_goals, journal_entries (always existed) plus
// workout_templates, measurement_logs, calendar_entries, user_journal_preferences
// (added by migration 20260628000001_supabase_persistence).
export type AppShellInitialData = {
  profile: { first_name: string; last_name: string } | null
  goals: GoalType[]
  primaryGoal: GoalType | null
  journalEntry: { id: string; answers: Record<string, string | number | boolean> } | null

  // ── Supabase-backed persistence areas ──────────────────────────────────────
  // Empty arrays / null when the tables don't exist yet or the user has no rows.
  // AppShell treats a non-empty result as authoritative and skips localStorage.

  /** Raw rows from workout_templates. AppShell converts to WorkoutTemplate[]. */
  templates: Array<{
    id: string
    name: string
    goal_tags: string[]
    notes: string
    favorite: boolean
    last_used: string | null
    times_used: number
    activities: unknown
    default_duration_minutes: number | null
    exercises: unknown
    activity_details: unknown
  }>

  /** Raw rows from measurement_logs ordered by logged_date DESC. */
  measurementLogs: Array<{
    id: string
    logged_date: string  // ISO date string, e.g. '2026-06-28'
    values: unknown      // Record<string, string> e.g. { 'Body weight': '148.5 lb' }
  }>

  /** Raw rows from calendar_entries for the last 90 days, ordered by entry_date DESC. */
  calendarRows: Array<{
    id: string
    entry_date: string   // ISO date string
    entry_type: string
    payload: unknown     // Full CalendarEntry serialised as JSON
  }>

  /** Single row from user_journal_preferences, or null if not yet created. */
  preferences: {
    tracked_activities: string[]
    visible_measurements: string[]
    habit_rows: unknown       // HabitDef[] without icon (icon is re-attached client-side)
    custom_tags: string[]
    track_strength_weights: boolean
  } | null
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export async function loadAppShellInitialData(
  supabase: SupabaseClient,
  user: User,
): Promise<AppShellInitialData> {
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const cutoff = ninetyDaysAgo.toISOString().slice(0, 10)

  const [
    { data: profile },
    { data: goalRows },
    { data: templateRows },
    { data: measurementLogRows },
    { data: calendarRows },
    { data: prefsRow },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .maybeSingle(),

    supabase
      .from('user_goals')
      .select('goal, is_primary')
      .eq('user_id', user.id),

    supabase
      .from('workout_templates')
      .select('id, name, goal_tags, notes, favorite, last_used, times_used, activities, default_duration_minutes, exercises, activity_details')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),

    supabase
      .from('measurement_logs')
      .select('id, logged_date, values')
      .eq('user_id', user.id)
      .order('logged_date', { ascending: false }),

    supabase
      .from('calendar_entries')
      .select('id, entry_date, entry_type, payload')
      .eq('user_id', user.id)
      .gte('entry_date', cutoff)
      .order('entry_date', { ascending: false }),

    supabase
      .from('user_journal_preferences')
      .select('tracked_activities, visible_measurements, habit_rows, custom_tags, track_strength_weights')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const goals = (goalRows ?? []).map((row) => row.goal as GoalType)
  const primaryGoal = ((goalRows ?? []).find((row) => row.is_primary)?.goal as GoalType) ?? null

  let journalEntry: AppShellInitialData['journalEntry'] = null
  if (primaryGoal) {
    const { data: entry } = await supabase
      .from('journal_entries')
      .select('id, answers')
      .eq('user_id', user.id)
      .eq('entry_date', todayISO())
      .eq('goal', primaryGoal)
      .maybeSingle()
    journalEntry = entry
      ? { id: entry.id, answers: (entry.answers ?? {}) as Record<string, string | number | boolean> }
      : null
  }

  return {
    profile: profile ? { first_name: profile.first_name ?? '', last_name: profile.last_name ?? '' } : null,
    goals,
    primaryGoal,
    journalEntry,
    templates: (templateRows ?? []) as AppShellInitialData['templates'],
    measurementLogs: (measurementLogRows ?? []) as AppShellInitialData['measurementLogs'],
    calendarRows: (calendarRows ?? []) as AppShellInitialData['calendarRows'],
    preferences: prefsRow as AppShellInitialData['preferences'] ?? null,
  }
}
