'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GOAL_LABELS } from '@/lib/goals'
import { GoalType } from '@/lib/types'

const GOALS = Object.entries(GOAL_LABELS) as [GoalType, string][]
const FREQUENCIES = ['1x / week', '2x / week', '3x / week', '4x / week', '5+ / week', 'Daily']

type Step = 'profile' | 'goals' | 'details'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('profile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gymLocation, setGymLocation] = useState('')
  const [selectedGoals, setSelectedGoals] = useState<GoalType[]>([])
  const [primaryGoal, setPrimaryGoal] = useState<GoalType | null>(null)
  const [frequency, setFrequency] = useState('')
  const [injuries, setInjuries] = useState('')

  function toggleGoal(goal: GoalType) {
    setSelectedGoals((prev) => {
      if (prev.includes(goal)) {
        const next = prev.filter((g) => g !== goal)
        if (primaryGoal === goal) setPrimaryGoal(next[0] ?? null)
        return next
      }
      const next = [...prev, goal]
      if (!primaryGoal) setPrimaryGoal(goal)
      return next
    })
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      gym_location: gymLocation || null,
      training_frequency: frequency,
      injuries: injuries || null,
      coach_sharing_enabled: false,
    })
    if (profileError) { setError(profileError.message); setLoading(false); return }

    const goalRows = selectedGoals.map((g) => ({
      user_id: user.id,
      goal: g,
      is_primary: g === primaryGoal,
    }))
    await supabase.from('user_goals').delete().eq('user_id', user.id)
    const { error: goalError } = await supabase.from('user_goals').insert(goalRows)
    if (goalError) { setError(goalError.message); setLoading(false); return }

    router.push('/today')
  }

  const stepIndex = ['profile', 'goals', 'details'].indexOf(step)

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-zinc-200">
        <div
          className="h-1 bg-emerald-500 transition-all duration-300"
          style={{ width: `${((stepIndex + 1) / 3) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col px-6 py-8 max-w-sm mx-auto w-full">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--signal)' }}>
            <span className="text-lg font-black text-white text-[13px]">S</span>
          </div>
          <span className="font-bold" style={{ color: 'var(--fg)' }}>SOMA</span>
        </div>

        {step === 'profile' && (
          <div className="flex flex-col gap-5 flex-1">
            <div>
              <h1 className="text-2xl font-bold mb-1">Welcome! Let&apos;s set you up</h1>
              <p className="text-zinc-500 text-sm">This takes about 1 minute.</p>
            </div>
            <Input id="firstName" label="First name" placeholder="Avery" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input id="lastName" label="Last name" placeholder="Chen" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <Input id="gym" label="Gym location (optional)" placeholder="e.g. Gold's Gym, LA" value={gymLocation} onChange={(e) => setGymLocation(e.target.value)} />
            <div className="flex-1" />
            <Button
              size="lg"
              disabled={!firstName || !lastName}
              onClick={() => setStep('goals')}
            >
              Next
            </Button>
          </div>
        )}

        {step === 'goals' && (
          <div className="flex flex-col gap-5 flex-1">
            <div>
              <h1 className="text-2xl font-bold mb-1">What are your goals?</h1>
              <p className="text-zinc-500 text-sm">Select all that apply. Tap one to make it primary.</p>
            </div>
            <div className="flex flex-col gap-2">
              {GOALS.map(([key, label]) => {
                const selected = selectedGoals.includes(key)
                const isPrimary = primaryGoal === key
                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (selected) toggleGoal(key)
                      else { toggleGoal(key); setPrimaryGoal(key) }
                    }}
                    className={`w-full text-left px-4 py-3 rounded-2xl border-2 transition-all flex items-center justify-between ${
                      selected
                        ? 'border-[var(--vital-border)] bg-[var(--vital-fill)]'
                        : 'border-zinc-200 bg-white'
                    }`}
                  >
                    <span className={`font-medium text-sm ${selected ? 'text-[var(--button-secondary-fg)]' : 'text-zinc-700'}`}>
                      {label}
                    </span>
                    {isPrimary && selected && (
                      <span className="text-xs bg-[var(--button-primary-bg)] text-white px-2 py-0.5 rounded-full shadow-[var(--button-primary-shadow)]">Primary</span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="flex-1" />
            <div className="flex gap-3">
              <Button variant="secondary" size="md" onClick={() => setStep('profile')} className="flex-1">Back</Button>
              <Button size="md" disabled={selectedGoals.length === 0} onClick={() => setStep('details')} className="flex-1">Next</Button>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="flex flex-col gap-5 flex-1">
            <div>
              <h1 className="text-2xl font-bold mb-1">A few more details</h1>
              <p className="text-zinc-500 text-sm">Help us personalize your journal.</p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700">Training frequency</label>
              <div className="grid grid-cols-2 gap-2">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFrequency(f)}
                    className={`px-4 py-3 rounded-2xl border-2 text-sm font-medium transition-all ${
                      frequency === f
                        ? 'border-[var(--vital-border)] bg-[var(--vital-fill)] text-[var(--button-secondary-fg)]'
                        : 'border-zinc-200 bg-white text-zinc-600'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Current injuries or pain <span className="text-zinc-400 font-normal">(optional)</span></label>
              <textarea
                placeholder="e.g. Left knee pain, lower back tightness"
                value={injuries}
                onChange={(e) => setInjuries(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-900 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
              />
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">{error}</p>}
            <div className="flex-1" />
            <div className="flex gap-3">
              <Button variant="secondary" size="md" onClick={() => setStep('goals')} className="flex-1">Back</Button>
              <Button size="md" disabled={!frequency} loading={loading} onClick={handleSubmit} className="flex-1">
                Let&apos;s go ðŸŽ‰
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

