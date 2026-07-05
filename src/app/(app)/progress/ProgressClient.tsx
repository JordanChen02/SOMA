'use client'

import { Card } from '@/components/ui/Card'
import { GoalType } from '@/lib/types'
import { format, eachDayOfInterval, subDays } from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

interface Entry {
  entry_date: string
  completion_status: string
  goal: GoalType
  answers: Record<string, string | number | boolean>
}

interface Props {
  entries: Entry[]
  userGoals: GoalType[]
}

export function ProgressClient({ entries, userGoals }: Props) {
  const last30 = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() })

  // Habit completion % last 30 days
  const daysWithEntry = new Set(entries.filter((e) => e.completion_status !== 'missed').map((e) => e.entry_date))
  const completionPct = Math.round((daysWithEntry.size / 30) * 100)

  const completedDays = entries.filter((e) => e.completion_status === 'complete').length
  const partialDays = entries.filter((e) => e.completion_status === 'partial').length
  const missedDays = 30 - daysWithEntry.size

  // Pain trend (if applicable)
  const hasPain = userGoals.includes('pain_mobility') || userGoals.includes('return_from_injury')
  const painData = hasPain
    ? entries
        .filter((e) => (e.goal === 'pain_mobility' || e.goal === 'return_from_injury') && e.answers.pain_level !== undefined)
        .map((e) => ({
          date: format(new Date(e.entry_date + 'T00:00:00'), 'M/d'),
          pain: Number(e.answers.pain_level),
        }))
    : []

  // Workout consistency chart
  const workoutData = last30.map((d) => {
    const dateStr = format(d, 'yyyy-MM-dd')
    const dayEntries = entries.filter((e) => e.entry_date === dateStr)
    const worked = dayEntries.some((e) => e.answers.workout === true || e.answers.trained === true || e.answers.activity === true || e.answers.rehab_done === true)
    return { date: format(d, 'M/d'), value: worked ? 1 : 0 }
  })
  const workoutDays = workoutData.filter((d) => d.value === 1).length

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <h1 className="text-2xl font-bold text-zinc-900">Progress</h1>
      <p className="text-sm text-zinc-400 -mt-3">Last 30 days</p>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center py-5 px-2">
          <p className="text-3xl font-bold text-emerald-500">{completionPct}%</p>
          <p className="text-xs text-zinc-500 mt-1">Consistency</p>
        </Card>
        <Card className="text-center py-5 px-2">
          <p className="text-3xl font-bold text-zinc-800">{workoutDays}</p>
          <p className="text-xs text-zinc-500 mt-1">Workout days</p>
        </Card>
        <Card className="text-center py-5 px-2">
          <p className="text-3xl font-bold text-amber-500">{completedDays + partialDays}</p>
          <p className="text-xs text-zinc-500 mt-1">Entries logged</p>
        </Card>
      </div>

      {/* Completion breakdown */}
      <Card>
        <h2 className="font-semibold text-zinc-800 mb-4 text-sm">Completion breakdown</h2>
        <div className="flex flex-col gap-3">
          {[
            { label: 'Complete', value: completedDays, color: 'bg-emerald-400' },
            { label: 'Partial', value: partialDays, color: 'bg-amber-400' },
            { label: 'Missed', value: missedDays, color: 'bg-red-300' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>{label}</span>
                <span className="font-medium text-zinc-700">{value} days</span>
              </div>
              <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full ${color}`}
                  style={{ width: `${(value / 30) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Pain trend */}
      {hasPain && painData.length > 1 && (
        <Card>
          <h2 className="font-semibold text-zinc-800 mb-4 text-sm">Pain trend (0 = no pain)</h2>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={painData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
              <Line type="monotone" dataKey="pain" stroke="#f87171" strokeWidth={2} dot={{ r: 3, fill: '#f87171' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {entries.length === 0 && (
        <Card className="text-center py-10">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-zinc-500 text-sm">Complete a few journal entries to see your progress here.</p>
        </Card>
      )}
    </div>
  )
}
