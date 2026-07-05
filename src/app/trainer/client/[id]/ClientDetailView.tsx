'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronDown, ChevronUp, Plus, Save, Zap, CalendarDays } from 'lucide-react'
import { format } from 'date-fns'

const MEASUREMENT_FIELDS = [
  { key: 'neck', label: 'Neck' },
  { key: 'chest', label: 'Chest' },
  { key: 'left_bicep', label: 'Left bicep' },
  { key: 'right_bicep', label: 'Right bicep' },
  { key: 'left_forearm', label: 'Left forearm' },
  { key: 'right_forearm', label: 'Right forearm' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'left_thigh', label: 'Left thigh' },
  { key: 'right_thigh', label: 'Right thigh' },
  { key: 'left_calf', label: 'Left calf' },
  { key: 'right_calf', label: 'Right calf' },
  { key: 'body_weight', label: 'Body weight' },
  { key: 'body_fat_pct', label: 'Body fat %' },
]

const OHS_COMPENSATIONS = [
  'Feet turn out', 'Feet flatten / arches collapse', 'Knees move inward',
  'Knees move outward', 'Excessive forward lean', 'Low back arches',
  'Low back rounds', 'Arms fall forward', 'Shoulders elevate / shrug',
  'Head moves forward', 'Hip shift left', 'Hip shift right', 'Heels rise',
]

function Section({ title, children, defaultOpen = false }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-[14px] overflow-hidden mb-3" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5"
      >
        <span className="text-[14px] font-semibold" style={{ color: 'var(--fg)' }}>{title}</span>
        {open ? <ChevronUp size={16} style={{ color: 'var(--fg-3)' }} /> : <ChevronDown size={16} style={{ color: 'var(--fg-3)' }} />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

function InputField({ label, value, onChange, type = 'text', placeholder }: {
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

export function ClientDetailView({ client, clientInfo, measurements, assessments, workoutLogs, trainerId }: {
  client: Record<string, string>
  clientInfo: Record<string, string | number> | null
  measurements: Record<string, string | number>[]
  assessments: Record<string, unknown>[]
  workoutLogs: Record<string, unknown>[]
  trainerId: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Measurements form
  const [measDate, setMeasDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [measValues, setMeasValues] = useState<Record<string, string>>({})
  const [measNotes, setMeasNotes] = useState('')

  // Assessment form
  const [assDate, setAssDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selected, setSelected] = useState<string[]>([])
  const [assNotes, setAssNotes] = useState('')
  const [followUp, setFollowUp] = useState('')

  // Client info form
  const [sessions, setSessions] = useState(String(clientInfo?.sessions_remaining ?? 0))
  const [renewal, setRenewal] = useState(clientInfo?.renewal_date as string ?? '')
  const [resub, setResub] = useState(clientInfo?.resubscription_date as string ?? '')
  const [status, setStatus] = useState(clientInfo?.status as string ?? 'active')

  async function saveMeasurements() {
    setSaving(true)
    const supabase = createClient()
    const payload: Record<string, string | number | null> = {
      client_id: client.id,
      trainer_id: trainerId,
      measured_at: measDate,
      notes: measNotes || null,
    }
    MEASUREMENT_FIELDS.forEach(({ key }) => {
      payload[key] = measValues[key] ? parseFloat(measValues[key]) : null
    })
    const { error } = await supabase.from('measurements').insert(payload)
    setSaving(false)
    setMsg(error ? error.message : 'Measurements saved!')
    if (!error) { setMeasValues({}); setMeasNotes(''); router.refresh() }
  }

  async function saveAssessment() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('assessments').insert({
      client_id: client.id,
      trainer_id: trainerId,
      assessed_at: assDate,
      compensations: selected,
      trainer_notes: assNotes || null,
      follow_up: followUp || null,
    })
    setSaving(false)
    setMsg(error ? error.message : 'Assessment saved!')
    if (!error) { setSelected([]); setAssNotes(''); setFollowUp(''); router.refresh() }
  }

  async function saveClientInfo() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('client_info').upsert({
      client_id: client.id,
      trainer_id: trainerId,
      sessions_remaining: parseInt(sessions),
      renewal_date: renewal || null,
      resubscription_date: resub || null,
      status,
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    setMsg(error ? error.message : 'Client info saved!')
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--fg)' }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Back */}
        <button onClick={() => router.push('/trainer')} className="flex items-center gap-1 text-[14px] font-semibold mb-5" style={{ color: 'var(--button-secondary-fg)' }}>
          <ChevronLeft size={18} /> All clients
        </button>

        {/* Client header */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-[18px] flex-shrink-0"
            style={{ background: 'var(--button-primary-bg)', boxShadow: 'var(--button-primary-shadow)' }}
          >
            {client.first_name?.[0]}{client.last_name?.[0]}
          </div>
          <div>
            <h1 className="text-[22px] font-black" style={{ letterSpacing: '-0.02em' }}>
              {client.first_name} {client.last_name}
            </h1>
            <p className="text-[13px]" style={{ color: 'var(--fg-3)' }}>{client.email}</p>
            {client.gym_location && <p className="text-[12px]" style={{ color: 'var(--fg-3)' }}>{client.gym_location}</p>}
          </div>
        </div>

        {msg && (
          <p className="text-[12px] px-3 py-2 rounded-[9px] mb-4" style={{ background: 'var(--pos-fill)', color: 'var(--badge-green)' }}>{msg}</p>
        )}

        {/* Client info */}
        <Section title="Client Info" defaultOpen>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <InputField label="Sessions remaining" value={sessions} onChange={setSessions} type="number" />
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium" style={{ color: 'var(--fg-3)' }}>Status</label>
              <select
                value={status} onChange={(e) => setStatus(e.target.value)}
                className="h-[40px] px-3 rounded-[10px] text-[13px] outline-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--fg)' }}
              >
                <option value="active">Active</option>
                <option value="renew_soon">Renew Soon</option>
                <option value="out_of_sessions">Out of Sessions</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <InputField label="Renewal date" value={renewal} onChange={setRenewal} type="date" />
            <InputField label="Resubscription date" value={resub} onChange={setResub} type="date" />
          </div>
          <button
            onClick={saveClientInfo} disabled={saving}
            className="flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-[10px]"
            style={{ background: 'var(--vital-fill)', color: 'var(--vital)' }}
          >
            <Save size={13} /> Save info
          </button>
        </Section>

        {/* Measurements */}
        <Section title={`Measurements (${measurements.length})`}>
          {/* History */}
          {measurements.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--fg-3)' }}>History</p>
              {measurements.slice(0, 3).map((m, i) => (
                <div key={i} className="rounded-[10px] p-3 mb-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                  <p className="mono text-[12px] font-semibold mb-2" style={{ color: 'var(--fg-2)' }}>
                    {format(new Date(m.measured_at as string), 'MMM d, yyyy')}
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {MEASUREMENT_FIELDS.filter(({ key }) => m[key] != null).map(({ key, label }) => (
                      <div key={key} className="flex justify-between text-[12px]">
                        <span style={{ color: 'var(--fg-3)' }}>{label}</span>
                        <span className="mono font-medium" style={{ color: 'var(--fg)' }}>{m[key]}"</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New measurement form */}
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--fg-3)' }}>
            <Plus size={11} className="inline mr-1" />New measurement
          </p>
          <InputField label="Date" value={measDate} onChange={setMeasDate} type="date" />
          <div className="grid grid-cols-2 gap-3 mt-3">
            {MEASUREMENT_FIELDS.map(({ key, label }) => (
              <InputField key={key} label={label} type="number" value={measValues[key] ?? ''} onChange={(v) => setMeasValues((p) => ({ ...p, [key]: v }))} placeholder="—" />
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium" style={{ color: 'var(--fg-3)' }}>Notes</label>
            <textarea
              value={measNotes} onChange={(e) => setMeasNotes(e.target.value)}
              rows={2} placeholder="Optional notes…"
              className="px-3 py-2 rounded-[10px] text-[13px] outline-none resize-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--fg)' }}
            />
          </div>
          <button
            onClick={saveMeasurements} disabled={saving}
            className="mt-3 flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-[10px]"
            style={{ background: 'var(--vital-fill)', color: 'var(--vital)' }}
          >
            <Save size={13} /> Save measurements
          </button>
        </Section>

        {/* Assessments */}
        <Section title={`Assessments (${assessments.length})`}>
          {assessments.slice(0, 2).map((a: Record<string, unknown>, i) => (
            <div key={i} className="rounded-[10px] p-3 mb-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
              <p className="mono text-[12px] font-semibold mb-2" style={{ color: 'var(--fg-2)' }}>
                OHS · {format(new Date(a.assessed_at as string), 'MMM d, yyyy')}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(a.compensations as string[]).map((c) => (
                  <span key={c} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--ember-fill)', color: 'var(--neg)' }}>{c}</span>
                ))}
              </div>
              {a.trainer_notes ? <p className="text-[12px]" style={{ color: 'var(--fg-2)' }}>{String(a.trainer_notes)}</p> : null}
            </div>
          ))}

          <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--fg-3)' }}>
            <Plus size={11} className="inline mr-1" />Overhead Squat Assessment
          </p>
          <InputField label="Date" value={assDate} onChange={setAssDate} type="date" />
          <p className="text-[12px] font-medium mt-3 mb-2" style={{ color: 'var(--fg-2)' }}>Compensations observed:</p>
          <div className="flex flex-col gap-2">
            {OHS_COMPENSATIONS.map((c) => (
              <label key={c} className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setSelected((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c])}
                  className="w-5 h-5 rounded-[5px] border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: selected.includes(c) ? 'var(--button-primary-bg)' : 'var(--border-strong)',
                    background: selected.includes(c) ? 'var(--button-primary-bg)' : 'transparent',
                    boxShadow: selected.includes(c) ? 'var(--button-primary-shadow)' : 'none',
                  }}
                >
                  {selected.includes(c) && <span className="text-white text-[10px] font-bold">✓</span>}
                </div>
                <span className="text-[13px]" style={{ color: 'var(--fg-1)' }}>{c}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium" style={{ color: 'var(--fg-3)' }}>Trainer notes</label>
              <textarea value={assNotes} onChange={(e) => setAssNotes(e.target.value)} rows={2}
                className="px-3 py-2 rounded-[10px] text-[13px] outline-none resize-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--fg)' }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium" style={{ color: 'var(--fg-3)' }}>Follow-up recommendations</label>
              <textarea value={followUp} onChange={(e) => setFollowUp(e.target.value)} rows={2}
                className="px-3 py-2 rounded-[10px] text-[13px] outline-none resize-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--fg)' }}
              />
            </div>
          </div>
          <button
            onClick={saveAssessment} disabled={saving}
            className="mt-3 flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-[10px]"
            style={{ background: 'var(--vital-fill)', color: 'var(--vital)' }}
          >
            <Save size={13} /> Save assessment
          </button>
        </Section>

        {/* Workout history */}
        <Section title={`Workout Logs (${workoutLogs.length})`}>
          {workoutLogs.length === 0 ? (
            <p className="text-[13px] py-2" style={{ color: 'var(--fg-3)' }}>No workouts logged yet.</p>
          ) : (
            workoutLogs.slice(0, 5).map((w: Record<string, unknown>, i) => (
              <div key={i} className="rounded-[10px] p-3 mb-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--fg)' }}>{w.title as string}</p>
                <p className="mono text-[11px]" style={{ color: 'var(--fg-3)' }}>
                  {format(new Date(w.logged_at as string), 'MMM d, yyyy')} · {w.completed ? '✓ Completed' : 'Pending'}
                </p>
              </div>
            ))
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              onClick={() => router.push(`/trainer/client/${client.id}/log-workout`)}
              className="flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-[10px]"
              style={{ background: 'var(--vital-fill)', color: 'var(--vital)' }}
            >
              <Plus size={13} /> Log workout
            </button>
            <button
              onClick={() => router.push(`/trainer/client/${client.id}/generate-workout`)}
              className="flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-[10px]"
              style={{ background: 'var(--vital-fill)', color: 'var(--vital)' }}
            >
              <Zap size={13} /> Generate
            </button>
          </div>
        </Section>

        {/* Calendar shortcut */}
        <button
          onClick={() => router.push(`/trainer/client/${client.id}/calendar`)}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-[14px] mb-3"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
        >
          <span className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: 'var(--fg)' }}>
            <CalendarDays size={16} style={{ color: 'var(--vital)' }} /> View Calendar
          </span>
          <ChevronDown size={16} style={{ color: 'var(--fg-3)', transform: 'rotate(-90deg)' }} />
        </button>
      </div>
    </div>
  )
}
