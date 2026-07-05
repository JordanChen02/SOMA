import { NextResponse } from 'next/server'
import {
  fetchOuraDailyActivity,
  fetchOuraDailyReadiness,
  fetchOuraDailySleep,
  fetchOuraSleepSessions,
  getOuraAccount,
  getValidOuraAccessToken,
  isOuraConfigured,
  pickMainSleepSession,
  recordOuraError,
  updateLastSyncedAt,
} from '@/lib/integrations/oura'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function dateRange(days: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - (days - 1))
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

export async function POST() {
  if (!isOuraConfigured()) {
    return NextResponse.json({ ok: false, error: 'setup_required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'sign_in_required' }, { status: 401 })
  }

  try {
    const accessToken = await getValidOuraAccessToken(user.id)
    const account = await getOuraAccount(user.id)
    const ouraUserId = account?.oura_user_id ?? null

    const { startDate, endDate } = dateRange(7)

    const [readinessItems, sleepItems, activityItems, sleepSessions] = await Promise.all([
      fetchOuraDailyReadiness(accessToken, startDate, endDate),
      fetchOuraDailySleep(accessToken, startDate, endDate),
      fetchOuraDailyActivity(accessToken, startDate, endDate),
      fetchOuraSleepSessions(accessToken, startDate, endDate),
    ])
    const byDate: Record<string, {
      raw_readiness_json?: Record<string, unknown>
      raw_sleep_json?: Record<string, unknown>
      raw_activity_json?: Record<string, unknown>
      main_sleep_session?: Record<string, unknown> | null
    }> = {}

    for (const item of readinessItems) {
      const day = item.day as string
      if (!byDate[day]) byDate[day] = {}
      byDate[day].raw_readiness_json = item
    }
    for (const item of sleepItems) {
      const day = item.day as string
      if (!byDate[day]) byDate[day] = {}
      byDate[day].raw_sleep_json = item
    }
    for (const item of activityItems) {
      const day = item.day as string
      if (!byDate[day]) byDate[day] = {}
      byDate[day].raw_activity_json = item
    }
    // Attach the main sleep session (longest/long_sleep type) for each day
    const allDays = new Set([...Object.keys(byDate), ...sleepSessions.map((s) => s.day as string)])
    for (const day of allDays) {
      if (!byDate[day]) byDate[day] = {}
      byDate[day].main_sleep_session = pickMainSleepSession(sleepSessions, day)
    }

    const syncedAt = new Date().toISOString()
    const rows = Object.entries(byDate).map(([day, data]) => {
      const session = data.main_sleep_session ?? null
      return {
        user_id: user.id,
        oura_user_id: ouraUserId,
        day,
        readiness_score: typeof data.raw_readiness_json?.score === 'number' ? data.raw_readiness_json.score as number : null,
        sleep_score: typeof data.raw_sleep_json?.score === 'number' ? data.raw_sleep_json.score as number : null,
        activity_score: typeof data.raw_activity_json?.score === 'number' ? data.raw_activity_json.score as number : null,
        steps: typeof data.raw_activity_json?.steps === 'number' ? data.raw_activity_json.steps as number : null,
        resting_heart_rate: typeof session?.lowest_heart_rate === 'number' ? session.lowest_heart_rate as number : null,
        average_hrv: typeof session?.average_hrv === 'number' ? session.average_hrv as number : null,
        raw_readiness_json: data.raw_readiness_json ?? null,
        raw_sleep_json: data.raw_sleep_json ?? null,
        raw_activity_json: data.raw_activity_json ?? null,
        synced_at: syncedAt,
        updated_at: syncedAt,
      }
    })

    if (rows.length > 0) {
      const admin = createAdminClient()
      const { error } = await admin
        .from('oura_daily_data')
        .upsert(rows, { onConflict: 'user_id,day' })
      if (error) {
        throw new Error(`db_upsert_failed: ${error.code} — ${error.message}`)
      }
    }

    await updateLastSyncedAt(user.id)

    const sorted = [...rows].sort((a, b) => b.day.localeCompare(a.day))
    const latest = sorted[0] ?? null

    return NextResponse.json({
      ok: true,
      startDate,
      endDate,
      daysCount: rows.length,
      latest: latest
        ? {
            date: latest.day,
            readiness_score: latest.readiness_score,
            sleep_score: latest.sleep_score,
            activity_score: latest.activity_score,
            steps: latest.steps,
            resting_heart_rate: latest.resting_heart_rate,
            average_hrv: latest.average_hrv,
          }
        : null,
    })
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'unknown'
    await recordOuraError(user.id, rawMessage).catch(() => {})
    return NextResponse.json({ ok: false, error: 'Unable to sync Oura data' }, { status: 500 })
  }
}
