'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { GOAL_LABELS, GOAL_QUESTIONS } from '@/lib/goals'
import { GoalType } from '@/lib/types'
import { format } from 'date-fns'

interface Client {
  id: string
  first_name: string
  last_name: string
}

interface Entry {
  id: string
  entry_date: string
  goal: GoalType
  completion_status: string
  answers: Record<string, string | number | boolean>
  coach_notes?: { id: string; note: string; created_at: string }[]
}

interface Props {
  clients: Client[]
  coachId: string
}

const STATUS_COLOR: Record<string, string> = {
  complete: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  missed: 'bg-red-100 text-red-600',
}

export function AdminClient({ clients, coachId }: Props) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [noteText, setNoteText] = useState<Record<string, string>>({})
  const [savingNote, setSavingNote] = useState<string | null>(null)

  async function loadClientEntries(client: Client) {
    setSelectedClient(client)
    setLoadingEntries(true)
    const supabase = createClient()
    const since = new Date()
    since.setDate(since.getDate() - 30)

    const { data } = await supabase
      .from('journal_entries')
      .select('id, entry_date, goal, completion_status, answers, coach_notes(id, note, created_at)')
      .eq('user_id', client.id)
      .gte('entry_date', since.toISOString().slice(0, 10))
      .order('entry_date', { ascending: false })

    setEntries((data as Entry[]) ?? [])
    setLoadingEntries(false)
  }

  async function saveNote(entryId: string) {
    const note = noteText[entryId]
    if (!note?.trim()) return
    setSavingNote(entryId)
    const supabase = createClient()
    await supabase.from('coach_notes').insert({ entry_id: entryId, coach_id: coachId, note })
    setNoteText((prev) => ({ ...prev, [entryId]: '' }))
    // Reload entry notes
    await loadClientEntries(selectedClient!)
    setSavingNote(null)
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 mb-6">Coach Dashboard</h1>

        {clients.length === 0 ? (
          <Card className="text-center py-10">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-zinc-500">No linked clients yet.</p>
            <p className="text-zinc-400 text-sm mt-1">Clients can enable coach sharing in their settings.</p>
          </Card>
        ) : (
          <div className="flex gap-4">
            {/* Client list */}
            <div className="w-48 flex-shrink-0">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Clients</h2>
              <div className="flex flex-col gap-2">
                {clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => loadClientEntries(c)}
                    className={`w-full text-left px-4 py-3 rounded-2xl border-2 transition-all ${
                      selectedClient?.id === c.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-zinc-200 bg-white'
                    }`}
                  >
                    <p className={`font-medium text-sm ${selectedClient?.id === c.id ? 'text-emerald-700' : 'text-zinc-700'}`}>
                      {c.first_name} {c.last_name}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Entries */}
            <div className="flex-1">
              {!selectedClient ? (
                <Card className="text-center py-10">
                  <p className="text-zinc-400 text-sm">Select a client to view their journal.</p>
                </Card>
              ) : loadingEntries ? (
                <Card className="text-center py-10">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </Card>
              ) : entries.length === 0 ? (
                <Card className="text-center py-10">
                  <p className="text-zinc-400 text-sm">No entries in the last 30 days.</p>
                </Card>
              ) : (
                <div className="flex flex-col gap-4">
                  <h2 className="font-semibold text-zinc-700 text-sm">
                    {selectedClient.first_name}&apos;s last 30 days
                  </h2>
                  {entries.map((entry) => (
                    <Card key={entry.id}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-zinc-800 text-sm">{GOAL_LABELS[entry.goal]}</p>
                          <p className="text-xs text-zinc-400">{format(new Date(entry.entry_date + 'T00:00:00'), 'EEEE, MMM d')}</p>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_COLOR[entry.completion_status] ?? ''}`}>
                          {entry.completion_status}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5 mb-4">
                        {GOAL_QUESTIONS[entry.goal].map((q) => {
                          const val = entry.answers[q.key]
                          if (val === undefined || val === '') return null
                          return (
                            <div key={q.key} className="flex justify-between text-xs">
                              <span className="text-zinc-500">{q.label}</span>
                              <span className="font-medium text-zinc-700">
                                {typeof val === 'boolean' ? (val ? '✓ Yes' : '✗ No') : String(val)}
                              </span>
                            </div>
                          )
                        })}
                      </div>

                      {/* Coach notes */}
                      {(entry.coach_notes ?? []).length > 0 && (
                        <div className="bg-zinc-50 rounded-xl px-3 py-2 mb-3">
                          {entry.coach_notes!.map((n) => (
                            <div key={n.id} className="text-xs">
                              <p className="text-zinc-800">{n.note}</p>
                              <p className="text-zinc-400 mt-0.5">{format(new Date(n.created_at), 'MMM d, h:mm a')}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Leave a note..."
                          value={noteText[entry.id] ?? ''}
                          onChange={(e) => setNoteText((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                          className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                        <Button
                          size="sm"
                          loading={savingNote === entry.id}
                          onClick={() => saveNote(entry.id)}
                          disabled={!noteText[entry.id]?.trim()}
                        >
                          Post
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
