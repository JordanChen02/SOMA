'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateWorkout, GeneratedWorkout } from '@/lib/workoutGenerator'
import { ChevronLeft, Zap, RefreshCw, Save, Check } from 'lucide-react'
import { format } from 'date-fns'

const MUSCLE_GROUPS = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core']

const EQUIPMENT_OPTIONS = [
  { id: 'barbell', label: 'Barbell' },
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'cable', label: 'Cable Machine' },
  { id: 'machine', label: 'Machines' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'bench', label: 'Bench' },
  { id: 'rack', label: 'Squat Rack' },
  { id: 'pullup_bar', label: 'Pull-up Bar' },
  { id: 'resistance_band', label: 'Resistance Band' },
  { id: 'rower', label: 'Rower' },
]

function ScaleInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const colors = ['var(--neg)', '#E07B3B', 'var(--ember)', '#8FBF6A', 'var(--vital)']
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-semibold" style={{ color: 'var(--fg-2)' }}>{label}</span>
        <span className="text-[13px] font-bold" style={{ color: colors[value - 1] }}>{value}/5</span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n} onClick={() => onChange(n)}
            className="flex-1 h-9 rounded-[9px] font-semibold text-[13px] transition-all"
            style={{
              background: value === n ? colors[n - 1] : 'var(--surface-2)',
              color: value === n ? 'white' : 'var(--fg-3)',
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

function ChipToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
      style={{
        background: active ? 'var(--button-primary-bg)' : 'var(--surface-2)',
        boxShadow: active ? 'var(--button-primary-shadow)' : 'none',
        color: active ? 'white' : 'var(--fg-3)',
      }}
    >
      {label}
    </button>
  )
}

export function GenerateWorkoutClient({ client, trainerId, goals, sessionsRemaining }: {
  client: { id: string; first_name: string; last_name: string; injuries?: string; training_frequency?: string }
  trainerId: string
  goals: { goal: string; is_primary: boolean }[]
  sessionsRemaining: number
}) {
  const router = useRouter()
  const [energy, setEnergy] = useState(3)
  const [sleep, setSleep] = useState(3)
  const [soreness, setSoreness] = useState<string[]>([])
  const [time, setTime] = useState(60)
  const [equipment, setEquipment] = useState<string[]>(['barbell', 'dumbbells', 'cable', 'machine', 'bench', 'rack', 'pullup_bar'])
  const [generated, setGenerated] = useState<GeneratedWorkout | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const goalList = goals.map((g) => g.goal)

  function toggleSoreness(m: string) {
    setSoreness((p) => p.includes(m) ? p.filter((x) => x !== m) : [...p, m])
  }

  function toggleEquipment(e: string) {
    setEquipment((p) => p.includes(e) ? p.filter((x) => x !== e) : [...p, e])
  }

  function generate() {
    const result = generateWorkout({
      energy, sleep, soreness, timeAvailable: time, equipment,
      goals: goalList, injuries: client.injuries ?? '',
    })
    setGenerated(result)
    setSaved(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveWorkout() {
    if (!generated) return
    setSaving(true)
    const supabase = createClient()

    const exercises = generated.exercises.map((ex) => ({
      name: ex.name,
      notes: ex.notes ?? '',
      sets: Array.from({ length: ex.sets }, () => ({
        reps: ex.repsRange.split('-')[0],
        weight: '',
        rpe: String(ex.rpe),
      })),
    }))

    await supabase.from('workout_logs').insert({
      client_id: client.id,
      trainer_id: trainerId || null,
      logged_at: format(new Date(), 'yyyy-MM-dd'),
      title: generated.title,
      exercises,
      coach_note: generated.coachNote,
      completed: false,
    })

    setSaving(false)
    setSaved(true)
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--fg)' }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-[14px] font-semibold mb-5" style={{ color: 'var(--button-secondary-fg)' }}>
          <ChevronLeft size={18} /> Back
        </button>

        <div className="mb-6">
          <h1 className="text-[22px] font-black" style={{ letterSpacing: '-0.02em' }}>Workout Generator</h1>
          <p className="text-[13px]" style={{ color: 'var(--fg-3)' }}>{client.first_name} {client.last_name}</p>
          {goalList.length > 0 && (
            <p className="text-[12px] mt-1" style={{ color: 'var(--signal)' }}>
              Goals: {goalList.map((g) => g.replace(/_/g, ' ')).join(', ')}
            </p>
          )}
        </div>

        {/* Generated result */}
        {generated && (
          <div className="rounded-[16px] p-5 mb-5" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-[18px] font-black" style={{ letterSpacing: '-0.02em' }}>{generated.title}</h2>
                <p className="text-[12px]" style={{ color: 'var(--fg-3)' }}>{generated.focus}</p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--signal-fill)', color: 'var(--signal)' }}>
                ~{generated.estimatedTime} min
              </span>
            </div>

            <div className="h-px my-3" style={{ background: 'var(--border)' }} />

            <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: 'var(--fg-3)' }}>Warmup</p>
            {generated.warmup.slice(0, 3).map((w, i) => (
              <p key={i} className="text-[12px] mb-1" style={{ color: 'var(--fg-2)' }}>• {w}</p>
            ))}

            <div className="h-px my-3" style={{ background: 'var(--border)' }} />

            <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--fg-3)' }}>Exercises</p>
            {generated.exercises.map((ex, i) => (
              <div key={i} className="flex items-center justify-between py-2.5" style={{ borderBottom: i < generated.exercises.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <div>
                  <p className="text-[14px] font-semibold">{ex.name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--fg-3)' }}>{ex.sets} sets × {ex.repsRange} reps</p>
                </div>
                <span className="text-[12px] font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--fg-2)' }}>
                  RPE {ex.rpe}
                </span>
              </div>
            ))}

            <div className="h-px my-3" style={{ background: 'var(--border)' }} />

            <div className="rounded-[10px] p-3 mb-4" style={{ background: 'var(--surface-2)' }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: 'var(--fg-3)' }}>Coach Note</p>
              <p className="text-[12px]" style={{ color: 'var(--fg-2)' }}>{generated.coachNote}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={generate}
                className="flex-1 h-[44px] rounded-[11px] flex items-center justify-center gap-2 text-[13px] font-semibold"
                style={{ background: 'var(--surface-2)', color: 'var(--fg-2)' }}
              >
                <RefreshCw size={14} /> Regenerate
              </button>
              <button
                onClick={saveWorkout}
                disabled={saving || saved}
                className="flex-1 h-[44px] rounded-[11px] flex items-center justify-center gap-2 text-[13px] font-semibold text-white disabled:opacity-70"
                style={{ background: 'var(--button-primary-bg)', boxShadow: 'var(--button-primary-shadow)' }}
              >
                {saved ? <><Check size={14} /> Saved!</> : saving ? 'Saving…' : <><Save size={14} /> Save Workout</>}
              </button>
            </div>
          </div>
        )}

        {/* Inputs */}
        <div className="rounded-[14px] p-4 mb-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-4" style={{ color: 'var(--fg-3)' }}>Today's Check-In</p>
          <div className="flex flex-col gap-4">
            <ScaleInput label="Energy level" value={energy} onChange={setEnergy} />
            <ScaleInput label="Sleep quality" value={sleep} onChange={setSleep} />
          </div>
        </div>

        <div className="rounded-[14px] p-4 mb-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--fg-3)' }}>Muscle Soreness</p>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map((m) => (
              <ChipToggle key={m} label={m} active={soreness.includes(m)} onClick={() => toggleSoreness(m)} />
            ))}
          </div>
          {soreness.length > 0 && (
            <p className="text-[11px] mt-2" style={{ color: 'var(--fg-3)' }}>These muscles will be avoided in the workout.</p>
          )}
        </div>

        <div className="rounded-[14px] p-4 mb-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--fg-3)' }}>Time Available</p>
            <span className="text-[14px] font-bold" style={{ color: 'var(--signal)' }}>{time} min</span>
          </div>
          <div className="flex gap-2">
            {[20, 30, 45, 60, 75, 90].map((t) => (
              <button
                key={t} onClick={() => setTime(t)}
                className="flex-1 py-2 rounded-[9px] text-[12px] font-semibold"
                style={{ background: time === t ? 'var(--button-primary-bg)' : 'var(--surface-2)', color: time === t ? 'white' : 'var(--fg-3)', boxShadow: time === t ? 'var(--button-primary-shadow)' : 'none' }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[14px] p-4 mb-6" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--fg-3)' }}>Available Equipment</p>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((eq) => (
              <ChipToggle key={eq.id} label={eq.label} active={equipment.includes(eq.id)} onClick={() => toggleEquipment(eq.id)} />
            ))}
          </div>
        </div>

        <button
          onClick={generate}
          className="w-full h-[52px] rounded-[14px] flex items-center justify-center gap-2 font-bold text-[16px] text-white"
          style={{ background: 'var(--button-primary-bg)', boxShadow: 'var(--button-primary-shadow)' }}
        >
          <Zap size={18} fill="white" /> Generate Workout
        </button>
      </div>
    </div>
  )
}
