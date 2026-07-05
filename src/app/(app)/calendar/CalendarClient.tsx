'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, isSameDay } from 'date-fns'
import { CompletionStatus, GoalType } from '@/lib/types'
import { GOAL_LABELS, GOAL_QUESTIONS } from '@/lib/goals'
import { Card } from '@/components/ui/Card'

interface Entry {
  entry_date: string
  completion_status: CompletionStatus
  goal: GoalType
  answers: Record<string, string | number | boolean>
}

interface Props {
  entries: Entry[]
}

const STATUS_COLOR: Record<CompletionStatus, string> = {
  complete: 'bg-emerald-400',
  partial: 'bg-amber-400',
  missed: 'bg-red-400',
}

const STATUS_LABEL: Record<CompletionStatus, string> = {
  complete: 'Complete',
  partial: 'Partial',
  missed: 'Missed',
}

function getDayStatus(date: Date, entries: Entry[]): CompletionStatus | null {
  const dateStr = format(date, 'yyyy-MM-dd')
  const dayEntries = entries.filter((e) => e.entry_date === dateStr)
  if (dayEntries.length === 0) return null
  if (dayEntries.every((e) => e.completion_status === 'complete')) return 'complete'
  if (dayEntries.some((e) => e.completion_status === 'complete' || e.completion_status === 'partial')) return 'partial'
  return 'missed'
}

export function CalendarClient({ entries }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = getDay(monthStart) // 0=Sun

  const selectedEntries = selectedDate
    ? entries.filter((e) => e.entry_date === format(selectedDate, 'yyyy-MM-dd'))
    : []

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <h1 className="text-2xl font-bold text-zinc-900">Calendar</h1>

      {/* Month nav */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-zinc-100 text-zinc-600"
          >
            ‹
          </button>
          <span className="font-semibold text-zinc-800">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-zinc-100 text-zinc-600"
          >
            ›
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-zinc-400 py-1">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map((day) => {
            const status = getDayStatus(day, entries)
            const selected = selectedDate && isSameDay(day, selectedDate)
            const today = isToday(day)
            const inMonth = isSameMonth(day, currentMonth)

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(isSameDay(day, selectedDate ?? new Date(0)) ? null : day)}
                className={`relative flex flex-col items-center justify-center h-10 rounded-xl border transition-all ${
                  selected ? 'border-[var(--button-secondary-fg)] bg-transparent' : today ? 'border-transparent bg-zinc-100' : 'border-transparent hover:bg-zinc-50'
                } ${!inMonth ? 'opacity-30' : ''}`}
              >
                <span className={`text-sm font-medium ${selected ? 'text-[var(--button-secondary-fg)]' : today ? 'text-zinc-900' : 'text-zinc-700'}`}>
                  {format(day, 'd')}
                </span>
                {status && (
                  <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${STATUS_COLOR[status]}`} />
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 justify-center">
          {(Object.entries(STATUS_COLOR) as [CompletionStatus, string][]).map(([s, cls]) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${cls}`} />
              <span className="text-xs text-zinc-500">{STATUS_LABEL[s]}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Selected day detail */}
      {selectedDate && (
        <div>
          <h2 className="font-semibold text-zinc-700 mb-3 text-sm">
            {format(selectedDate, 'EEEE, MMMM d')}
          </h2>
          {selectedEntries.length === 0 ? (
            <Card className="text-center py-6">
              <p className="text-zinc-400 text-sm">No journal entry for this day.</p>
            </Card>
          ) : (
            selectedEntries.map((entry, i) => (
              <Card key={i} className="mb-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-zinc-800">{GOAL_LABELS[entry.goal]}</h3>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    entry.completion_status === 'complete' ? 'bg-emerald-100 text-emerald-700' :
                    entry.completion_status === 'partial' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {STATUS_LABEL[entry.completion_status]}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {GOAL_QUESTIONS[entry.goal].map((q) => {
                    const val = entry.answers[q.key]
                    if (val === undefined || val === '') return null
                    return (
                      <div key={q.key} className="flex justify-between text-sm">
                        <span className="text-zinc-500">{q.label}</span>
                        <span className="font-medium text-zinc-800">
                          {typeof val === 'boolean' ? (val ? '✓ Yes' : '✗ No') : String(val)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
