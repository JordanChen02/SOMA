'use client'

// ─── Launch-only client persistence ─────────────────────────────────────────
//
// Simple user-id-scoped localStorage wrapper used to make user-entered data
// survive refresh/login before dedicated Supabase tables exist for every area.
//
// Keys are always scoped by the Supabase user id so two accounts on the same
// device never see each other's data: `soma:<userId>:<area>`.
//
// TODO(supabase): each area below should migrate to a real table post-launch:
//   - 'activities'       → user_activities (selected + custom activities)
//   - 'measurements'     → user_measurement_prefs (which metrics show on Progress)
//   - 'focusGoals'       → ordering belongs on user_goals (add a sort/rank column)
//   - 'habitRows'        → user_habits (the set of habits a user tracks)
//   - 'customTags'       → user_note_tags
//   - 'calendarEntries'  → workout_logs / notes / weight_logs / measurements / photo_meta
//   - 'measurementLogs'  → measurement_logs (dated body-measurement check-ins)
//   - 'templates'        → workout_templates
//   - 'profilePhoto'     → profiles.avatar_url (Supabase Storage)
//   - 'theme' / 'units'  → profiles preferences columns
//   - 'onboardingCompleted' → profiles.onboarding_completed (boolean column)
//   - 'trackStrengthWeights' → profiles preferences column (boolean)
//
// Until then, treat this as a prototype layer — it is per-device, not synced.

const PREFIX = 'soma'

export type PersistArea =
  | 'theme'
  | 'units'
  | 'activities'
  | 'measurements'
  | 'focusGoals'
  | 'habitRows'
  | 'customTags'
  | 'calendarEntries'
  | 'measurementLogs'
  | 'templates'
  | 'profilePhoto'
  | 'profileName'
  | 'todayWorkoutState'
  | 'workoutSession'
  | 'onboardingCompleted'
  | 'trackStrengthWeights'
  | 'timelineFilter'
  | 'timelineFilterSub'

function storageKey(userId: string, area: PersistArea) {
  return `${PREFIX}:${userId}:${area}`
}

export function loadPersisted<T>(userId: string, area: PersistArea, fallback: T): T {
  if (typeof window === 'undefined' || !userId) return fallback
  try {
    const raw = window.localStorage.getItem(storageKey(userId, area))
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function savePersisted<T>(userId: string, area: PersistArea, value: T): void {
  if (typeof window === 'undefined' || !userId) return
  try {
    window.localStorage.setItem(storageKey(userId, area), JSON.stringify(value))
  } catch {
    // Quota exceeded or storage unavailable — fail silently; this is a prototype layer.
  }
}

export function hasPersisted(userId: string, area: PersistArea): boolean {
  if (typeof window === 'undefined' || !userId) return false
  try {
    return window.localStorage.getItem(storageKey(userId, area)) !== null
  } catch {
    return false
  }
}
