'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GOAL_LABELS, GOAL_QUESTIONS, computeCompletionStatus } from '@/lib/goals'
import { GoalType, JournalEntry } from '@/lib/types'
import { QuestionField } from '@/components/journal/QuestionField'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { format } from 'date-fns'

interface Props {
  firstName: string
  userGoals: { goal: GoalType; is_primary: boolean }[]
  existingEntries: JournalEntry[]
  today: string
}

export function TodayClient({ firstName, userGoals, existingEntries, today }: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<GoalType, Record<string, string | number | boolean>>>(() => {
    const init: Record<string, Record<string, string | number | boolean>> = {}
    for (const { goal } of userGoals) {
      const existing = existingEntries.find((e) => e.goal === goal)
      init[goal] = existing?.answers ?? {}
    }
    return init as Record<GoalType, Record<string, string | number | boolean>>
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(existingEntries.length > 0)

  function setAnswer(goal: GoalType, key: string, value: string | number | boolean) {
    setAnswers((prev) => ({ ...prev, [goal]: { ...prev[goal], [key]: value } }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    for (const { goal } of userGoals) {
      const status = computeCompletionStatus(goal, answers[goal] ?? {})
      await supabase.from('journal_entries').upsert(
        {
          user_id: user.id,
          entry_date: today,
          goal,
          answers: answers[goal] ?? {},
          completion_status: status,
        },
        { onConflict: 'user_id,entry_date,goal' }
      )
    }

    setSaving(false)
    setSaved(true)
    router.refresh()
  }

  const dayLabel = format(new Date(today + 'T00:00:00'), 'EEEE, MMMM d')
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      {/* Header */}
      <div>
        <p className="text-xs text-zinc-400 uppercase tracking-widest font-medium">{dayLabel}</p>
        <h1 className="text-2xl font-bold text-zinc-900 mt-0.5">
          {greeting}, {firstName} 👋
        </h1>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-emerald-500 text-lg">✓</span>
          <p className="text-sm text-emerald-700 font-medium">Today&apos;s journal saved!</p>
        </div>
      )}

      {userGoals.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-zinc-500 mb-4">No goals set yet.</p>
          <Button variant="secondary" size="sm" onClick={() => router.push('/settings')}>Set goals</Button>
        </Card>
      ) : (
        userGoals.map(({ goal }) => {
          const questions = GOAL_QUESTIONS[goal]
          return (
            <Card key={goal}>
              <h2 className="font-bold text-zinc-800 mb-4 flex items-center gap-2">
                <span className="text-base">{GOAL_LABELS[goal]}</span>
              </h2>
              <div className="flex flex-col gap-5">
                {questions.map((q) => (
                  <QuestionField
                    key={q.key}
                    question={q}
                    value={answers[goal]?.[q.key]}
                    onChange={(key, val) => setAnswer(goal, key, val)}
                  />
                ))}
              </div>
            </Card>
          )
        })
      )}

      {userGoals.length > 0 && (
        <Button size="lg" loading={saving} onClick={handleSave} className="sticky bottom-24 shadow-lg shadow-[rgba(34,211,166,0.20)]">
          {saved ? '✓ Saved' : 'Save journal'}
        </Button>
      )}
    </div>
  )
}
