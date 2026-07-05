'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { GOAL_LABELS } from '@/lib/goals'
import { GoalType, Profile } from '@/lib/types'

const ALL_GOALS = Object.entries(GOAL_LABELS) as [GoalType, string][]
const FREQUENCIES = ['1x / week', '2x / week', '3x / week', '4x / week', '5+ / week', 'Daily']

interface Props {
  profile: Profile | null
  userGoals: { goal: GoalType; is_primary: boolean }[]
  email: string
}

export function SettingsClient({ profile, userGoals, email }: Props) {
  const router = useRouter()
  const [firstName, setFirstName] = useState(profile?.first_name ?? '')
  const [lastName, setLastName] = useState(profile?.last_name ?? '')
  const [gymLocation, setGymLocation] = useState(profile?.gym_location ?? '')
  const [frequency, setFrequency] = useState(profile?.training_frequency ?? '')
  const [injuries, setInjuries] = useState(profile?.injuries ?? '')
  const [coachSharing, setCoachSharing] = useState(profile?.coach_sharing_enabled ?? false)
  const [selectedGoals, setSelectedGoals] = useState<GoalType[]>(userGoals.map((g) => g.goal))
  const [primaryGoal, setPrimaryGoal] = useState<GoalType | null>(userGoals.find((g) => g.is_primary)?.goal ?? null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')

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

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: pe } = await supabase.from('profiles').upsert({
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      gym_location: gymLocation || null,
      training_frequency: frequency,
      injuries: injuries || null,
      coach_sharing_enabled: coachSharing,
    })
    if (pe) { setError(pe.message); setSaving(false); return }

    await supabase.from('user_goals').delete().eq('user_id', user.id)
    await supabase.from('user_goals').insert(
      selectedGoals.map((g) => ({ user_id: user.id, goal: g, is_primary: g === primaryGoal }))
    )

    setSaving(false)
    setSaved(true)
    router.refresh()
  }

  async function handlePasswordChange() {
    if (!newPassword) return
    setPwSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwMsg(error ? error.message : 'Password updated!')
    setPwSaving(false)
    setNewPassword('')
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>

      {/* Profile */}
      <Card>
        <h2 className="font-semibold text-zinc-800 mb-4 text-sm">Profile</h2>
        <div className="flex flex-col gap-4">
          <Input id="firstName" label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input id="lastName" label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <Input id="gym" label="Gym location (optional)" value={gymLocation} onChange={(e) => setGymLocation(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">Injuries / pain (optional)</label>
            <textarea
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            />
          </div>
          <p className="text-xs text-zinc-400">Signed in as {email}</p>
        </div>
      </Card>

      {/* Goals */}
      <Card>
        <h2 className="font-semibold text-zinc-800 mb-4 text-sm">Goals</h2>
        <div className="flex flex-col gap-2">
          {ALL_GOALS.map(([key, label]) => {
            const selected = selectedGoals.includes(key)
            const isPrimary = primaryGoal === key
            return (
              <button
                key={key}
                onClick={() => { toggleGoal(key); if (!selectedGoals.includes(key)) setPrimaryGoal(key) }}
                className={`w-full text-left px-4 py-3 rounded-2xl border-2 transition-all flex items-center justify-between ${
                  selected ? 'border-[var(--vital-border)] bg-[var(--vital-fill)]' : 'border-zinc-200 bg-white'
                }`}
              >
                <span className={`font-medium text-sm ${selected ? 'text-[var(--button-secondary-fg)]' : 'text-zinc-700'}`}>{label}</span>
                {isPrimary && selected && (
                  <span className="text-xs bg-[var(--button-primary-bg)] text-white px-2 py-0.5 rounded-full shadow-[var(--button-primary-shadow)]">Primary</span>
                )}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Training frequency */}
      <Card>
        <h2 className="font-semibold text-zinc-800 mb-3 text-sm">Training frequency</h2>
        <div className="grid grid-cols-2 gap-2">
          {FREQUENCIES.map((f) => (
            <button
              key={f}
              onClick={() => setFrequency(f)}
              className={`px-4 py-2.5 rounded-2xl border-2 text-sm font-medium transition-all ${
                frequency === f ? 'border-[var(--vital-border)] bg-[var(--vital-fill)] text-[var(--button-secondary-fg)]' : 'border-zinc-200 bg-white text-zinc-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </Card>

      {/* Coach sharing */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-zinc-800 text-sm">Share with coach</p>
            <p className="text-xs text-zinc-500 mt-0.5">Allow your coach to view your journal</p>
          </div>
          <button
            onClick={() => setCoachSharing((v) => !v)}
            className={`w-12 h-6 rounded-full transition-all relative ${coachSharing ? 'bg-[var(--button-primary-bg)] shadow-[var(--button-primary-shadow)]' : 'bg-zinc-300'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${coachSharing ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>
      </Card>

      {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">{error}</p>}
      {saved && <p className="text-sm text-emerald-600 bg-emerald-50 rounded-xl px-4 py-2">Settings saved!</p>}

      <Button size="lg" loading={saving} onClick={handleSave}>Save changes</Button>

      {/* Password */}
      <Card>
        <h2 className="font-semibold text-zinc-800 mb-4 text-sm">Change password</h2>
        <div className="flex flex-col gap-3">
          <Input
            id="newPassword"
            type="password"
            label="New password"
            placeholder="Min 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          {pwMsg && <p className={`text-xs px-3 py-2 rounded-xl ${pwMsg.includes('updated') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>{pwMsg}</p>}
          <Button variant="secondary" size="md" loading={pwSaving} onClick={handlePasswordChange}>Update password</Button>
        </div>
      </Card>

      {/* Logout */}
      <Button variant="danger" size="lg" onClick={handleLogout}>Log out</Button>
      <div className="h-4" />
    </div>
  )
}
