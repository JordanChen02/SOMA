'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isToday, isSameDay, isSameMonth
} from 'date-fns'

interface CalendarEvent {
  id: string
  event_date: string
  event_type: string
  title: string
  status: string
}

const EVENT_COLORS: Record<string, { bg: string; color: string }> = {
  workout:     { bg: 'var(--signal-fill)',  color: 'var(--signal)' },
  rest:        { bg: 'var(--surface-3)',  color: 'var(--fg-3)' },
  assessment:  { bg: 'var(--vital-fill)', color: 'var(--vital)' },
  measurement: { bg: 'var(--ember-fill)', color: 'var(--ember)' },
  cardio:      { bg: 'var(--vital-fill)',   color: 'var(--vital)' },
  custom:      { bg: 'var(--signal-fill)',  color: 'var(--signal)' },
}

const STATUS_DOT: Record<string, string> = {
  scheduled:  'var(--signal)',
  completed:  'var(--vital)',
  missed:     'var(--neg)',
  rest:       'var(--fg-3)',
  assessment: 'var(--vital)',
}

const EVENT_TYPES = ['workout', 'rest', 'assessment', 'measurement', 'cardio', 'custom']
const WORKOUT_TITLES = ['Back Day', 'Leg Day', 'Chest Day', 'Arms Day', 'Cardio Day', 'Mobility Day', 'Full Body', 'Upper Body', 'Lower Body', 'Kickboxing']

export function TrainerCalendarClient({ client, events, trainerId }: {
  client: { id: string; first_name: string; last_name: string }
  events: CalendarEvent[]
  trainerId: string
}) {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newType, setNewType] = useState('workout')
  const [newTitle, setNewTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = getDay(monthStart)

  function getEventsForDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return events.filter((e) => e.event_date === dateStr)
  }

  function getDotColor(date: Date) {
    const dayEvents = getEventsForDay(date)
    if (dayEvents.length === 0) return null
    if (dayEvents.some((e) => e.status === 'completed')) return 'var(--vital)'
    if (dayEvents.some((e) => e.status === 'missed')) return 'var(--neg)'
    if (dayEvents.some((e) => e.status === 'scheduled')) return 'var(--signal)'
    return 'var(--fg-3)'
  }

  async function addEvent() {
    if (!selectedDate || !newTitle.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('calendar_events').insert({
      client_id: client.id,
      trainer_id: trainerId || null,
      event_date: format(selectedDate, 'yyyy-MM-dd'),
      event_type: newType,
      title: newTitle,
      status: newType === 'rest' ? 'rest' : 'scheduled',
    })
    setSaving(false)
    setShowAdd(false)
    setNewTitle('')
    router.refresh()
  }

  const selectedEvents = selectedDate ? getEventsForDay(selectedDate) : []

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--fg)' }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-[14px] font-semibold mb-5" style={{ color: 'var(--button-secondary-fg)' }}>
          <ChevronLeft size={18} /> Back
        </button>

        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[22px] font-black" style={{ letterSpacing: '-0.02em' }}>Calendar</h1>
            <p className="text-[13px]" style={{ color: 'var(--fg-3)' }}>{client.first_name} {client.last_name}</p>
          </div>
          {selectedDate && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-full"
              style={{ background: 'var(--vital-fill)', color: 'var(--vital)' }}
            >
              <Plus size={13} /> Add event
            </button>
          )}
        </div>

        {/* Calendar */}
        <div className="rounded-[14px] p-4 mb-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
              <ChevronLeft size={16} style={{ color: 'var(--fg-2)' }} />
            </button>
            <span className="font-semibold text-[14px]">{format(currentMonth, 'MMMM yyyy')}</span>
            <button onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
              <ChevronRight size={16} style={{ color: 'var(--fg-2)' }} />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="text-center text-[11px] font-medium py-1" style={{ color: 'var(--fg-3)' }}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({ length: startPad }).map((_, i) => <div key={`p${i}`} />)}
            {days.map((day) => {
              const dot = getDotColor(day)
              const selected = selectedDate && isSameDay(day, selectedDate)
              const today = isToday(day)
              const inMonth = isSameMonth(day, currentMonth)
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(isSameDay(day, selectedDate ?? new Date(0)) ? null : day)}
                  className="flex flex-col items-center justify-center h-10 rounded-xl border transition-all"
                  style={{
                    background: today && !selected ? 'var(--surface-2)' : 'transparent',
                    borderColor: selected ? 'var(--vital)' : 'transparent',
                    opacity: inMonth ? 1 : 0.3,
                  }}
                >
                  <span className="text-[13px] font-medium" style={{ color: selected ? 'var(--vital)' : 'var(--fg)' }}>
                    {format(day, 'd')}
                  </span>
                  {dot && <span className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: dot }} />}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {[['scheduled', 'Scheduled'], ['completed', 'Completed'], ['missed', 'Missed'], ['rest', 'Rest']].map(([s, l]) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: STATUS_DOT[s] }} />
                <span className="text-[11px]" style={{ color: 'var(--fg-3)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected day events */}
        {selectedDate && (
          <div>
            <p className="text-[12px] font-semibold mb-3" style={{ color: 'var(--fg-2)' }}>
              {format(selectedDate, 'EEEE, MMMM d')}
            </p>
            {selectedEvents.length === 0 ? (
              <div className="rounded-[14px] p-6 text-center" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <p className="text-[13px]" style={{ color: 'var(--fg-3)' }}>No events. Tap &quot;Add event&quot; to schedule.</p>
              </div>
            ) : (
              selectedEvents.map((ev) => {
                const c = EVENT_COLORS[ev.event_type] ?? EVENT_COLORS.custom
                return (
                  <div key={ev.id} className="rounded-[14px] p-4 mb-2 flex items-center justify-between" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-[9px] flex items-center justify-center" style={{ background: c.bg }}>
                        <span className="text-[14px]">
                          {ev.event_type === 'workout' ? '🏋️' : ev.event_type === 'rest' ? '😴' : ev.event_type === 'cardio' ? '🏃' : ev.event_type === 'assessment' ? '📋' : ev.event_type === 'measurement' ? '📏' : '📅'}
                        </span>
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold" style={{ color: 'var(--fg)' }}>{ev.title}</p>
                        <p className="text-[11px] capitalize" style={{ color: c.color }}>{ev.status}</p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Add event modal */}
      {showAdd && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-lg rounded-t-[24px] p-6" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold">{format(selectedDate, 'MMM d')}</h2>
              <button onClick={() => setShowAdd(false)}><X size={18} style={{ color: 'var(--fg-3)' }} /></button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium" style={{ color: 'var(--fg-3)' }}>Event type</label>
                <div className="grid grid-cols-3 gap-2">
                  {EVENT_TYPES.map((t) => (
                    <button
                      key={t} onClick={() => setNewType(t)}
                      className="py-2 rounded-[10px] text-[12px] font-semibold capitalize"
                      style={{
                        background: newType === t ? 'var(--button-primary-bg)' : 'var(--surface-2)',
                        boxShadow: newType === t ? 'var(--button-primary-shadow)' : 'none',
                        color: newType === t ? 'white' : 'var(--fg-2)',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium" style={{ color: 'var(--fg-3)' }}>Title</label>
                {newType === 'workout' ? (
                  <div className="grid grid-cols-2 gap-2">
                    {WORKOUT_TITLES.map((t) => (
                      <button
                        key={t} onClick={() => setNewTitle(t)}
                        className="py-2 px-3 rounded-[10px] text-[12px] font-medium text-left"
                        style={{
                          background: newTitle === t ? 'var(--signal-fill)' : 'var(--surface-2)',
                          color: newTitle === t ? 'var(--vital)' : 'var(--fg-2)',
                          border: newTitle === t ? '1px solid var(--vital-border)' : '1px solid transparent',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={newType === 'rest' ? 'Rest Day' : 'Event title'}
                    className="h-[44px] px-3 rounded-[11px] text-[14px] outline-none"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--fg)' }}
                  />
                )}
              </div>

              <button
                onClick={addEvent} disabled={saving || !newTitle.trim()}
                className="h-[48px] rounded-[12px] font-semibold text-[14px] text-white mt-1 disabled:opacity-50"
                style={{ background: 'var(--button-primary-bg)', boxShadow: 'var(--button-primary-shadow)' }}
              >
                {saving ? 'Saving…' : 'Add to calendar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
