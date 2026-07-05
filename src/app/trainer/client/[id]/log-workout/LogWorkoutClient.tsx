'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Plus, Trash2, Save } from 'lucide-react'
import { format } from 'date-fns'

interface Set {
  reps: string
  weight: string
  rpe: string
}

interface Exercise {
  name: string
  notes: string
  sets: Set[]
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium" style={{ color: 'var(--fg-3)' }}>{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? ''}
        className="h-[40px] px-3 rounded-[10px] text-[13px] outline-none"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--fg)' }}
      />
    </div>
  )
}

export function LogWorkoutClient({ client, trainerId }: {
  client: { id: string; first_name: string; last_name: string }
  trainerId: string
}) {
  const router = useRouter()
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [title, setTitle] = useState('')
  const [coachNote, setCoachNote] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: '', notes: '', sets: [{ reps: '', weight: '', rpe: '' }] }
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addExercise() {
    setExercises((p) => [...p, { name: '', notes: '', sets: [{ reps: '', weight: '', rpe: '' }] }])
  }

  function removeExercise(i: number) {
    setExercises((p) => p.filter((_, idx) => idx !== i))
  }

  function updateExercise(i: number, field: keyof Exercise, value: string) {
    setExercises((p) => p.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex))
  }

  function addSet(i: number) {
    setExercises((p) => p.map((ex, idx) => idx === i
      ? { ...ex, sets: [...ex.sets, { reps: '', weight: '', rpe: '' }] }
      : ex
    ))
  }

  function updateSet(exIdx: number, setIdx: number, field: keyof Set, value: string) {
    setExercises((p) => p.map((ex, idx) => idx === exIdx
      ? { ...ex, sets: ex.sets.map((s, si) => si === setIdx ? { ...s, [field]: value } : s) }
      : ex
    ))
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExercises((p) => p.map((ex, idx) => idx === exIdx
      ? { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) }
      : ex
    ))
  }

  async function handleSave() {
    if (!title.trim()) { setError('Please add a workout title'); return }
    setSaving(true)
    setError('')
    const supabase = createClient()

    const { error: err } = await supabase.from('workout_logs').insert({
      client_id: client.id,
      trainer_id: trainerId || null,
      logged_at: date,
      title,
      exercises: exercises.filter((e) => e.name.trim()),
      coach_note: coachNote || null,
      completed: false,
    })

    setSaving(false)
    if (err) { setError(err.message); return }
    router.push(`/trainer/client/${client.id}`)
    router.refresh()
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--fg)' }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-[14px] font-semibold mb-5" style={{ color: 'var(--button-secondary-fg)' }}>
          <ChevronLeft size={18} /> Back
        </button>

        <h1 className="text-[22px] font-black mb-1" style={{ letterSpacing: '-0.02em' }}>Log Workout</h1>
        <p className="text-[13px] mb-6" style={{ color: 'var(--fg-3)' }}>
          {client.first_name} {client.last_name}
        </p>

        {/* Date + Title */}
        <div className="rounded-[14px] p-4 mb-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Date" value={date} onChange={setDate} type="date" />
            <Field label="Workout title" value={title} onChange={setTitle} placeholder="e.g. Upper Body Push" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium" style={{ color: 'var(--fg-3)' }}>Coach note (optional)</label>
            <textarea
              value={coachNote} onChange={(e) => setCoachNote(e.target.value)}
              rows={2} placeholder="Notes for the client…"
              className="px-3 py-2 rounded-[10px] text-[13px] outline-none resize-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--fg)' }}
            />
          </div>
        </div>

        {/* Exercises */}
        <p className="text-[11px] font-bold uppercase tracking-[0.13em] mb-3" style={{ color: 'var(--fg-3)' }}>Exercises</p>

        {exercises.map((ex, i) => (
          <div key={i} className="rounded-[14px] p-4 mb-3" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <input
                value={ex.name} onChange={(e) => updateExercise(i, 'name', e.target.value)}
                placeholder="Exercise name"
                className="flex-1 h-[40px] px-3 rounded-[10px] text-[14px] font-semibold outline-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--fg)' }}
              />
              <button onClick={() => removeExercise(i)} className="w-9 h-9 rounded-[9px] flex items-center justify-center" style={{ background: 'var(--ember-fill)' }}>
                <Trash2 size={14} style={{ color: 'var(--neg)' }} />
              </button>
            </div>

            {/* Sets table */}
            <div className="mb-3">
              <div className="grid grid-cols-4 gap-2 mb-1.5">
                {['Set', 'Reps', 'Weight', 'RPE'].map((h) => (
                  <p key={h} className="text-[10px] font-bold uppercase tracking-wide text-center" style={{ color: 'var(--fg-3)' }}>{h}</p>
                ))}
              </div>
              {ex.sets.map((s, si) => (
                <div key={si} className="grid grid-cols-4 gap-2 mb-2 items-center">
                  <div className="flex items-center justify-center h-[36px] rounded-[8px] text-[13px] font-semibold" style={{ background: 'var(--surface-3)', color: 'var(--fg-2)' }}>
                    {si + 1}
                  </div>
                  {(['reps', 'weight', 'rpe'] as const).map((f) => (
                    <input
                      key={f} type="number" value={s[f]}
                      onChange={(e) => updateSet(i, si, f, e.target.value)}
                      placeholder="—"
                      className="h-[36px] px-2 rounded-[8px] text-[13px] text-center outline-none"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--fg)' }}
                    />
                  ))}
                </div>
              ))}
              <div className="flex gap-2">
                <button onClick={() => addSet(i)} className="text-[12px] font-semibold px-3 py-1.5 rounded-full" style={{ background: 'var(--vital-fill)', color: 'var(--button-secondary-fg)' }}>
                  + Add set
                </button>
                {ex.sets.length > 1 && (
                  <button onClick={() => removeSet(i, ex.sets.length - 1)} className="text-[12px] font-semibold px-3 py-1.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--fg-3)' }}>
                    Remove set
                  </button>
                )}
              </div>
            </div>

            <input
              value={ex.notes} onChange={(e) => updateExercise(i, 'notes', e.target.value)}
              placeholder="Exercise notes (optional)"
              className="w-full h-[36px] px-3 rounded-[10px] text-[12px] outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--fg-2)' }}
            />
          </div>
        ))}

        <button onClick={addExercise} className="w-full h-[44px] rounded-[12px] flex items-center justify-center gap-2 text-[13px] font-semibold mb-6" style={{ background: 'var(--surface-1)', border: `1px dashed var(--border-strong)`, color: 'var(--fg-2)' }}>
          <Plus size={15} /> Add exercise
        </button>

        {error && <p className="text-[12px] px-3 py-2 rounded-[9px] mb-4" style={{ background: 'var(--ember-fill)', color: 'var(--neg)' }}>{error}</p>}

        <button
          onClick={handleSave} disabled={saving}
          className="w-full h-[50px] rounded-[13px] flex items-center justify-center gap-2 font-semibold text-[15px] text-white disabled:opacity-50"
          style={{ background: 'var(--button-primary-bg)', boxShadow: 'var(--button-primary-shadow)' }}
        >
          <Save size={16} /> {saving ? 'Saving…' : 'Save workout'}
        </button>
      </div>
    </div>
  )
}
