'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, ChevronRight, LogOut, Sun, Moon } from 'lucide-react'
import { format } from 'date-fns'

type ClientStatus = 'active' | 'renew_soon' | 'out_of_sessions' | 'inactive'

interface ClientRow {
  id: string
  client_id: string
  sessions_remaining: number
  renewal_date: string | null
  resubscription_date: string | null
  last_session_date: string | null
  status: ClientStatus
  client: {
    id: string
    first_name: string
    last_name: string
    email: string
    gym_location: string | null
  }
}

const STATUS_STYLES: Record<ClientStatus, { label: string; bg: string; color: string }> = {
  active: { label: 'Active', bg: 'var(--vital-fill)', color: 'var(--badge-green)' },
  renew_soon: { label: 'Renew Soon', bg: 'var(--ember-fill)', color: 'var(--ember)' },
  out_of_sessions: { label: 'Out of Sessions', bg: 'var(--ember-fill)', color: 'var(--neg)' },
  inactive: { label: 'Inactive', bg: 'var(--surface-3)', color: 'var(--fg-3)' },
}

function AddClientModal({ trainerId, onClose, onAdded }: {
  trainerId: string; onClose: () => void; onAdded: () => void
}) {
  const [email, setEmail] = useState('')
  const [sessionsRemaining, setSessionsRemaining] = useState('10')
  const [renewalDate, setRenewalDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    // Find client by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (!profile) {
      setError('No account found with that email. Ask your client to sign up first.')
      setLoading(false)
      return
    }

    // Link client
    const { error: linkErr } = await supabase.from('coach_links').upsert({
      client_id: profile.id,
      coach_id: trainerId,
      is_active: true,
    })
    if (linkErr) { setError(linkErr.message); setLoading(false); return }

    // Create client_info
    const { error: infoErr } = await supabase.from('client_info').upsert({
      client_id: profile.id,
      trainer_id: trainerId,
      sessions_remaining: parseInt(sessionsRemaining),
      renewal_date: renewalDate || null,
      status: 'active',
    })
    if (infoErr) { setError(infoErr.message); setLoading(false); return }

    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-lg rounded-t-[24px] p-6" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
        <h2 className="text-[18px] font-bold mb-4" style={{ color: 'var(--fg)' }}>Add Client</h2>
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <Field label="Client email" value={email} onChange={setEmail} type="email" placeholder="client@example.com" required />
          <Field label="Sessions remaining" value={sessionsRemaining} onChange={setSessionsRemaining} type="number" placeholder="10" />
          <Field label="Renewal date (optional)" value={renewalDate} onChange={setRenewalDate} type="date" placeholder="" />
          {error && <p className="text-[12px] px-3 py-2 rounded-[9px]" style={{ background: 'var(--ember-fill)', color: 'var(--neg)' }}>{error}</p>}
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 h-[46px] rounded-[12px] font-semibold text-[14px]" style={{ background: 'var(--surface-2)', color: 'var(--fg-2)' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 h-[46px] rounded-[12px] font-semibold text-[14px] text-white disabled:opacity-50" style={{ background: 'var(--button-primary-bg)', boxShadow: 'var(--button-primary-shadow)' }}>
              {loading ? 'Adding…' : 'Add client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder: string; required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-medium" style={{ color: 'var(--fg-2)' }}>{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className="h-[44px] px-4 rounded-[11px] text-[14px] outline-none"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--fg)' }}
      />
    </div>
  )
}

export function TrainerDashboard({ trainerName, clients, trainerId }: {
  trainerName: string; clients: ClientRow[]; trainerId: string
}) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [theme, setTheme] = useState('dark')

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--fg)' }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--fg-3)' }}>Trainer</p>
            <h1 className="text-[22px] font-black" style={{ letterSpacing: '-0.02em' }}>Coach {trainerName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              {theme === 'dark' ? <Sun size={14} style={{ color: 'var(--fg-2)' }} /> : <Moon size={14} style={{ color: 'var(--fg-2)' }} />}
            </button>
            <button onClick={handleLogout} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <LogOut size={14} style={{ color: 'var(--fg-2)' }} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total clients', value: clients.length },
            { label: 'Active', value: clients.filter((c) => c.status === 'active').length },
            { label: 'Need attention', value: clients.filter((c) => c.status !== 'active').length },
          ].map((s) => (
            <div key={s.label} className="rounded-[14px] p-4 text-center" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <p className="mono text-[24px] font-bold" style={{ color: 'var(--fg)' }}>{s.value}</p>
              <p className="text-[11px]" style={{ color: 'var(--fg-3)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Client list header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.13em]" style={{ color: 'var(--fg-3)' }}>
            <Users size={12} className="inline mr-1" />
            Clients ({clients.length})
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full"
            style={{ background: 'var(--vital-fill)', color: 'var(--vital)' }}
          >
            <Plus size={13} /> Add client
          </button>
        </div>

        {/* Client cards */}
        {clients.length === 0 ? (
          <div className="rounded-[14px] p-8 text-center" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <p className="text-3xl mb-3">👥</p>
            <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--fg)' }}>No clients yet</p>
            <p className="text-[13px]" style={{ color: 'var(--fg-3)' }}>Add your first client to get started</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {clients.map((row) => {
              const s = STATUS_STYLES[row.status]
              return (
                <button
                  key={row.id}
                  onClick={() => router.push(`/trainer/client/${row.client_id}`)}
                  className="w-full text-left rounded-[14px] p-4 transition-all active:opacity-80"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[14px] flex-shrink-0"
                        style={{ background: 'var(--button-primary-bg)', boxShadow: 'var(--button-primary-shadow)' }}
                      >
                        {row.client.first_name[0]}{row.client.last_name[0]}
                      </div>
                      <div>
                        <p className="text-[15px] font-semibold" style={{ color: 'var(--fg)' }}>
                          {row.client.first_name} {row.client.last_name}
                        </p>
                        <p className="text-[12px]" style={{ color: 'var(--fg-3)' }}>{row.client.email}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: s.bg, color: s.color }}>
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <div>
                      <p className="mono text-[16px] font-bold" style={{ color: 'var(--fg)' }}>{row.sessions_remaining}</p>
                      <p className="text-[11px]" style={{ color: 'var(--fg-3)' }}>sessions left</p>
                    </div>
                    {row.renewal_date && (
                      <div>
                        <p className="mono text-[13px] font-semibold" style={{ color: 'var(--fg-2)' }}>
                          {format(new Date(row.renewal_date), 'MMM d')}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--fg-3)' }}>renewal</p>
                      </div>
                    )}
                    {row.last_session_date && (
                      <div>
                        <p className="mono text-[13px] font-semibold" style={{ color: 'var(--fg-2)' }}>
                          {format(new Date(row.last_session_date), 'MMM d')}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--fg-3)' }}>last session</p>
                      </div>
                    )}
                    <ChevronRight size={16} className="ml-auto" style={{ color: 'var(--fg-3)' }} />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <AddClientModal
          trainerId={trainerId}
          onClose={() => setShowAdd(false)}
          onAdded={() => router.refresh()}
        />
      )}
    </div>
  )
}
