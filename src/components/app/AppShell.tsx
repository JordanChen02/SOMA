'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { DEMO_MODE_COOKIE } from '@/lib/auth/demo'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import { displayNameFromUser, initialsFromUser } from '@/lib/auth/profile'
import { GOAL_QUESTIONS } from '@/lib/goals'
import type { GoalType } from '@/lib/types'
import type { AppShellInitialData } from '@/lib/auth/initialData'
import { loadPersisted, savePersisted } from '@/lib/persistence'
import {
  Activity, Apple, Ban, Bell, CalendarDays, Camera, Check, ChevronDown, ChevronLeft, ChevronRight,
  ChevronUp, ClipboardList, Clock, Copy, Droplet, Dumbbell, Edit3, Heart, Home, LineChart, LogOut,
  Minus, Moon, PersonStanding, Plus, Ruler, Scale, Search, Settings, Shield, Square, Sun, Target,
  Trash2, TrendingUp, Trophy, User, Users, Video, Watch, X, Zap, Star, Flame, Grid2X2,
} from 'lucide-react'

type Role = 'client' | 'trainer'
type Tab = 'today' | 'workouts' | 'timeline' | 'progress' | 'calendar' | 'insights' | 'more' | 'workout' | 'askCoach' | 'milestones'
type TrainerTab = 'clients' | 'activity' | 'build' | 'profile' | 'clientDetail'
type ProfileSub = '' | 'account' | 'goals' | 'activities' | 'measurements' | 'templates' | 'apps' | 'coach' | 'preferences' | 'privacy' | 'connect' | 'templateDetail'
type Sheet = '' | 'meal' | 'workoutLog' | 'createWorkout' | 'createTemplate' | 'saveTemplate' | 'weight' | 'measure' | 'progressPhoto' | 'scheduleWorkout' | 'calendarEvent' | 'habits' | 'note' | 'reflection'
type Goal = 'Weight Loss' | 'Muscle Gain' | 'Strength' | 'Endurance' | 'Mobility' | 'General Health' | 'Recovery' | 'Performance'
type HabitKey = string
type HabitDef = { key: HabitKey; label: string; icon: React.ComponentType<any>; tone?: string }
type TargetDef = { label: string; value: string }
type WorkoutTemplate = { id: string; name: string; tags: Goal[]; activities: string[]; notes: string; favorite: boolean; lastUsed: string; timesUsed: number; defaultDurationMinutes?: number; exercises?: WorkoutExerciseBlock[]; activityDetails?: ActivityDetail[] }
// A workout's exercise breakdown. Only populated when the workout came from a
// built-in/saved template that actually has exercises — manual logs leave it
// empty so the detail view shows what the user entered, not fabricated rows.
type WorkoutExerciseBlock = { title: string; sub?: string; items: { name: string; detail: string }[] }
// Structured, per-activity data captured by the activity builders. One entry per
// chosen activity. Only the fields relevant to an activity kind are populated.
type StrengthSet = { reps: string; weight: string }
type StrengthExercise = { id: string; name: string; sets: StrengthSet[] }
type ActivityDetail = {
  activity: string
  // Strength Training
  trackWeights?: boolean
  exercises?: StrengthExercise[]
  // Combat (BJJ/Kickboxing/Muay Thai), Swimming, Cardio, Custom
  intensity?: string
  format?: string        // Rounds | Time | Laps | Distance | Custom
  amount?: string        // numeric value for the chosen format
  cardioType?: string    // Walk | Run | Bike | ...
  focus?: string[]       // combat / mobility focus chips
  customName?: string    // Custom Activity name
  notes?: string
}
type ScheduledWorkout = { id: string; label: string; sub: string; activities: string[]; sourceTemplateId?: string; exercises?: WorkoutExerciseBlock[]; activityDetails?: ActivityDetail[]; notes?: string; durationMinutes?: number; time?: string; status?: WorkoutStatus }
type CopyWorkoutDate = { day: number; month: number; year: number; label: string }
type InsightCategory = 'Sleep' | 'Recovery' | 'Training' | 'Bodyweight'
type InsightConfidence = 'High' | 'Medium' | 'Low'
type InsightStatus = 'new' | 'saved' | 'archived'
type InsightMetric = { label: string; value: string; direction: 'up' | 'down'; valence: 'positive' | 'negative' | 'neutral' }
type Insight = {
  id: string
  activity: string
  category: InsightCategory
  title: string
  summary: string
  metricComparison: string
  confidence: InsightConfidence
  sampleSize: string
  relatedActivities: string[]
  dateRange: string
  status: InsightStatus
  impactMetrics: InsightMetric[]
}
type CalendarEntry = { id?: string; type: string; label: string; sub?: string; activity?: string; durationMinutes?: number; editable?: boolean; workout?: ScheduledWorkout; originWorkoutId?: string; recurrence?: 'weekly'; scheduledDate?: CopyWorkoutDate; note?: string; measurementValues?: Record<string, string>; measurementLogId?: string; photoKind?: PhotoKind; photoLabel?: string; healthScore?: number; workoutMedia?: WorkoutMedia[] }
type WorkoutMedia = { id: string; kind: 'photo' | 'video'; fileName: string; addedAt: string; dataUrl?: string }
type PhotoKind = 'Meal' | 'Progress'
type MealPhotoType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
type ProgressPhotoType = 'Front' | 'Side' | 'Back'
type WorkoutStatus = 'planned' | 'none' | 'done'
type Milestone = { id: string; title: string; description: string; category: string; progress: string; complete: boolean; earnedDate?: string }
// A dated body-measurement check-in. `values` maps a measurement label
// (e.g. 'Body weight') to a display string with unit (e.g. '148.2 lb').
type MeasurementLog = { id: string; date: string; values: Record<string, string> }
type SheetSaveOptions = {
  photoKind?: PhotoKind
  photoLabel?: MealPhotoType | ProgressPhotoType
  templateTags?: Goal[]
  templateName?: string
  templateActivities?: string[]
  favoriteTemplate?: boolean
  workoutName?: string
  workoutActivities?: string[]
  activityDetails?: ActivityDetail[]
  workoutNotes?: string
  workoutDurationMinutes?: number
  workoutTime?: string
  overrideDate?: string   // ISO date YYYY-MM-DD for the entry; defaults to today
  measurementValues?: Record<string, string>
  note?: string
  weightValue?: string
  healthScore?: number
}

const goals: Goal[] = ['Weight Loss', 'Muscle Gain', 'Strength', 'Endurance', 'Mobility', 'General Health', 'Recovery', 'Performance']
const defaultSelectedGoals: Goal[] = ['Weight Loss', 'Strength', 'Performance']
const defaultActivities = ['BJJ', 'Kickboxing', 'Weightlifting']
const allActivities = ['Weightlifting', 'Running', 'Swimming', 'Hiking', 'Boxing', 'Kickboxing', 'Muay Thai', 'BJJ', 'Cycling', 'Walking', 'Mobility']
const defaultShownMeasurements = ['Body weight', 'Body fat', 'Waist', 'Hips']
const allMeasurements = ['Body weight', 'Body fat', 'Waist', 'Hips', 'Neck', 'Chest', 'Left bicep', 'Right bicep', 'Left forearm', 'Right forearm', 'Left thigh', 'Right thigh', 'Left calf', 'Right calf']
const measurementData: Record<string, { value: string; unit: string; delta: string }> = {
  'Body weight': { value: '148.2', unit: 'lb', delta: '▼2.1' },
  'Body fat': { value: '19.4', unit: '%', delta: '▼1.1' },
  Waist: { value: '33.0', unit: 'in', delta: '▼1.4' },
  Hips: { value: '39.5', unit: 'in', delta: '▼0.8' },
  Chest: { value: '36.5', unit: 'in', delta: '▲0.4' },
  Neck: { value: '13.8', unit: 'in', delta: '▼0.2' },
  'Biceps L': { value: '11.7', unit: 'in', delta: '▲0.3' },
  'Biceps R': { value: '11.8', unit: 'in', delta: '▲0.3' },
  'Forearm L': { value: '9.4', unit: 'in', delta: '▲0.1' },
  'Forearm R': { value: '9.5', unit: 'in', delta: '▲0.1' },
  'Thigh L': { value: '21.4', unit: 'in', delta: '▼0.5' },
  'Thigh R': { value: '21.5', unit: 'in', delta: '▼0.4' },
  'Calf L': { value: '14.2', unit: 'in', delta: '0.0' },
  'Calf R': { value: '14.3', unit: 'in', delta: '0.0' },
  'Left bicep': { value: '11.7', unit: 'in', delta: 'â–²0.3' },
  'Right bicep': { value: '11.8', unit: 'in', delta: 'â–²0.3' },
  'Left forearm': { value: '9.4', unit: 'in', delta: 'â–²0.1' },
  'Right forearm': { value: '9.5', unit: 'in', delta: 'â–²0.1' },
  'Left thigh': { value: '21.4', unit: 'in', delta: 'â–¼0.5' },
  'Right thigh': { value: '21.5', unit: 'in', delta: 'â–¼0.4' },
  'Left calf': { value: '14.2', unit: 'in', delta: '0.0' },
  'Right calf': { value: '14.3', unit: 'in', delta: '0.0' },
}
const defaultHabitRows: HabitDef[] = [
  { key: 'protein', label: 'Hit protein goal', icon: Scale },
  { key: 'water', label: 'Drink 3L water', icon: Droplet },
  { key: 'workout', label: 'Workout completed', icon: Dumbbell },
  { key: 'mobility', label: 'Mobility completed', icon: PersonStanding },
  { key: 'sleep', label: 'Sleep goal met', icon: Moon },
  { key: 'sugar', label: 'No sugary drinks', icon: Ban },
]
const defaultTargets: TargetDef[] = [
  { label: 'Goal weight', value: '145 lb' },
  { label: 'Active Days / Week', value: '4x' },
  { label: 'Daily protein target', value: '130 g' },
  { label: 'Water target', value: '3 L' },
  { label: 'Step target', value: '8,000' },
]
// ─── Built-in default workout templates (data-driven) ───────────────────────
// These are SEPARATE from user-created `templates`: they're a fixed, expandable
// catalog. A concrete workout is generated at open time from three inputs —
// the chosen variation, the selected duration, and the user's primary goal —
// so we never hardcode every duration×goal combination.
type DefaultCategory = 'Push' | 'Pull' | 'Legs' | 'Arms' | 'Abs' | 'Shoulders'
type TrainingIntent = 'strength' | 'hypertrophy' | 'endurance'
type DefaultExercise = { name: string; role: 'primary' | 'accessory' }
type WarmUpExercise = { name: string; sets: number; reps: string }
type DefaultTemplateVariation = { id: string; category: DefaultCategory; focus: string; warmUp: WarmUpExercise[]; exercises: DefaultExercise[] }

const DEFAULT_CATEGORIES: DefaultCategory[] = ['Push', 'Pull', 'Legs', 'Arms', 'Abs', 'Shoulders']
const DEFAULT_WORKOUT_DURATIONS = [30, 45, 60, 90] as const
// Longer workouts include more exercises (primaries first, then accessory volume).
const DURATION_EXERCISE_COUNT: Record<number, number> = { 30: 3, 45: 4, 60: 5, 90: 7 }

// Map each goal to a training intent. New goals slot in here without touching
// the schemes or templates.
const GOAL_TO_INTENT: Record<Goal, TrainingIntent> = {
  Strength: 'strength',
  'Muscle Gain': 'hypertrophy',
  'General Health': 'hypertrophy',
  Performance: 'hypertrophy',
  Mobility: 'hypertrophy',
  Recovery: 'hypertrophy',
  'Weight Loss': 'endurance',
  Endurance: 'endurance',
}
// Sets/reps per intent, split by exercise role. Compounds (primary) carry the
// heavier scheme; accessories get a bit more volume.
const INTENT_SCHEME: Record<TrainingIntent, { primary: { sets: number; reps: string }; accessory: { sets: number; reps: string } }> = {
  strength: { primary: { sets: 4, reps: '6-8' }, accessory: { sets: 3, reps: '8-10' } },
  hypertrophy: { primary: { sets: 4, reps: '8-12' }, accessory: { sets: 3, reps: '10-12' } },
  endurance: { primary: { sets: 3, reps: '12-15' }, accessory: { sets: 3, reps: '15-20' } },
}
const INTENT_LABEL: Record<TrainingIntent, string> = {
  strength: 'Strength',
  hypertrophy: 'Hypertrophy',
  endurance: 'Fat loss / endurance',
}

// Two variations per category so users don't always get the same workout.
// Exercises are ordered primary-first so shorter durations keep the key
// compounds and longer ones add accessory volume.
const DEFAULT_TEMPLATE_VARIATIONS: DefaultTemplateVariation[] = [
  { id: 'push-a', category: 'Push', focus: 'Chest focus',
    warmUp: [{ name: 'Band Pull-Aparts', sets: 1, reps: '15' }, { name: 'Shoulder External Rotation', sets: 1, reps: '10' }, { name: 'Push-Up (light)', sets: 1, reps: '10' }],
    exercises: [
      { name: 'Barbell Bench Press', role: 'primary' }, { name: 'Incline DB Press', role: 'primary' }, { name: 'Weighted Dip', role: 'primary' },
      { name: 'Cable Fly', role: 'accessory' }, { name: 'Overhead Triceps Extension', role: 'accessory' }, { name: 'Lateral Raise', role: 'accessory' }, { name: 'Triceps Pushdown', role: 'accessory' } ] },
  { id: 'push-b', category: 'Push', focus: 'Shoulder focus',
    warmUp: [{ name: 'Band Pull-Aparts', sets: 1, reps: '15' }, { name: 'Arm Circles', sets: 1, reps: '20' }, { name: 'Shoulder External Rotation', sets: 1, reps: '10' }],
    exercises: [
      { name: 'Overhead Press', role: 'primary' }, { name: 'Incline Bench Press', role: 'primary' }, { name: 'Arnold Press', role: 'primary' },
      { name: 'Lateral Raise', role: 'accessory' }, { name: 'Cable Fly', role: 'accessory' }, { name: 'Triceps Pushdown', role: 'accessory' }, { name: 'Front Raise', role: 'accessory' } ] },
  { id: 'pull-a', category: 'Pull', focus: 'Back width',
    warmUp: [{ name: 'Band Pull-Aparts', sets: 1, reps: '15' }, { name: 'Dead Hang', sets: 1, reps: '20s' }, { name: 'Face Pull (light)', sets: 1, reps: '15' }],
    exercises: [
      { name: 'Pull-Up', role: 'primary' }, { name: 'Lat Pulldown', role: 'primary' }, { name: 'Chest-Supported Row', role: 'primary' },
      { name: 'Straight-Arm Pulldown', role: 'accessory' }, { name: 'Face Pull', role: 'accessory' }, { name: 'Hammer Curl', role: 'accessory' }, { name: 'Rear Delt Fly', role: 'accessory' } ] },
  { id: 'pull-b', category: 'Pull', focus: 'Back thickness',
    warmUp: [{ name: 'Band Pull-Aparts', sets: 1, reps: '15' }, { name: 'Cat-Cow', sets: 1, reps: '10' }, { name: 'Dead Hang', sets: 1, reps: '20s' }],
    exercises: [
      { name: 'Barbell Row', role: 'primary' }, { name: 'Deadlift', role: 'primary' }, { name: 'Seated Cable Row', role: 'primary' },
      { name: 'Lat Pulldown', role: 'accessory' }, { name: 'Face Pull', role: 'accessory' }, { name: 'Barbell Curl', role: 'accessory' }, { name: 'Shrug', role: 'accessory' } ] },
  { id: 'legs-a', category: 'Legs', focus: 'Quad focus',
    warmUp: [{ name: 'Hip Circles', sets: 1, reps: '10 ea.' }, { name: 'Bodyweight Squat', sets: 1, reps: '15' }, { name: 'Leg Swing', sets: 1, reps: '10 ea.' }],
    exercises: [
      { name: 'Back Squat', role: 'primary' }, { name: 'Leg Press', role: 'primary' }, { name: 'Bulgarian Split Squat', role: 'primary' },
      { name: 'Leg Extension', role: 'accessory' }, { name: 'Walking Lunge', role: 'accessory' }, { name: 'Standing Calf Raise', role: 'accessory' }, { name: 'Hanging Leg Raise', role: 'accessory' } ] },
  { id: 'legs-b', category: 'Legs', focus: 'Posterior chain',
    warmUp: [{ name: 'Hip Circles', sets: 1, reps: '10 ea.' }, { name: 'Glute Bridge', sets: 1, reps: '15' }, { name: 'Leg Swing', sets: 1, reps: '10 ea.' }],
    exercises: [
      { name: 'Romanian Deadlift', role: 'primary' }, { name: 'Hip Thrust', role: 'primary' }, { name: 'Front Squat', role: 'primary' },
      { name: 'Leg Curl', role: 'accessory' }, { name: 'Back Extension', role: 'accessory' }, { name: 'Seated Calf Raise', role: 'accessory' }, { name: 'Glute Kickback', role: 'accessory' } ] },
  { id: 'arms-a', category: 'Arms', focus: 'Mass',
    warmUp: [{ name: 'Band Curl', sets: 1, reps: '15' }, { name: 'Triceps Stretch', sets: 1, reps: '30s ea.' }, { name: 'Wrist Circles', sets: 1, reps: '15' }],
    exercises: [
      { name: 'Close-Grip Bench Press', role: 'primary' }, { name: 'Barbell Curl', role: 'primary' }, { name: 'Weighted Dip', role: 'primary' },
      { name: 'Incline DB Curl', role: 'accessory' }, { name: 'Overhead Triceps Extension', role: 'accessory' }, { name: 'Hammer Curl', role: 'accessory' }, { name: 'Triceps Pushdown', role: 'accessory' } ] },
  { id: 'arms-b', category: 'Arms', focus: 'Pump',
    warmUp: [{ name: 'Band Curl', sets: 1, reps: '15' }, { name: 'Wrist Circles', sets: 1, reps: '15' }, { name: 'Overhead Triceps Stretch', sets: 1, reps: '30s ea.' }],
    exercises: [
      { name: 'EZ-Bar Curl', role: 'primary' }, { name: 'Triceps Pushdown', role: 'primary' }, { name: 'Preacher Curl', role: 'primary' },
      { name: 'Cable Curl', role: 'accessory' }, { name: 'Overhead Cable Extension', role: 'accessory' }, { name: 'Concentration Curl', role: 'accessory' }, { name: 'Rope Pushdown', role: 'accessory' } ] },
  { id: 'abs-a', category: 'Abs', focus: 'Core strength',
    warmUp: [{ name: 'Dead Bug', sets: 1, reps: '8 ea.' }, { name: 'Cat-Cow', sets: 1, reps: '10' }, { name: 'Bird Dog', sets: 1, reps: '8 ea.' }],
    exercises: [
      { name: 'Hanging Leg Raise', role: 'primary' }, { name: 'Cable Crunch', role: 'primary' }, { name: 'Weighted Plank', role: 'primary' },
      { name: 'Ab Wheel Rollout', role: 'accessory' }, { name: 'Russian Twist', role: 'accessory' }, { name: 'Bicycle Crunch', role: 'accessory' }, { name: 'Dead Bug', role: 'accessory' } ] },
  { id: 'abs-b', category: 'Abs', focus: 'Circuit',
    warmUp: [{ name: 'Cat-Cow', sets: 1, reps: '10' }, { name: 'Bird Dog', sets: 1, reps: '8 ea.' }, { name: 'Hip March', sets: 1, reps: '10 ea.' }],
    exercises: [
      { name: 'Plank', role: 'primary' }, { name: 'Mountain Climbers', role: 'primary' }, { name: 'Bicycle Crunch', role: 'primary' },
      { name: 'Leg Raise', role: 'accessory' }, { name: 'Russian Twist', role: 'accessory' }, { name: 'Flutter Kicks', role: 'accessory' }, { name: 'V-Up', role: 'accessory' } ] },
  { id: 'shoulders-a', category: 'Shoulders', focus: 'Press focus',
    warmUp: [{ name: 'Band Pull-Aparts', sets: 1, reps: '15' }, { name: 'Shoulder External Rotation', sets: 1, reps: '10' }, { name: 'Arm Circles', sets: 1, reps: '20' }],
    exercises: [
      { name: 'Overhead Press', role: 'primary' }, { name: 'Seated DB Press', role: 'primary' }, { name: 'Arnold Press', role: 'primary' },
      { name: 'Lateral Raise', role: 'accessory' }, { name: 'Rear Delt Fly', role: 'accessory' }, { name: 'Front Raise', role: 'accessory' }, { name: 'Upright Row', role: 'accessory' } ] },
  { id: 'shoulders-b', category: 'Shoulders', focus: 'Delt detail',
    warmUp: [{ name: 'Arm Circles', sets: 1, reps: '20' }, { name: 'Band Pull-Aparts', sets: 1, reps: '15' }, { name: 'Shoulder External Rotation', sets: 1, reps: '10' }],
    exercises: [
      { name: 'Lateral Raise', role: 'primary' }, { name: 'Cable Lateral Raise', role: 'primary' }, { name: 'Reverse Pec Deck', role: 'primary' },
      { name: 'Face Pull', role: 'accessory' }, { name: 'Front Raise', role: 'accessory' }, { name: 'Shrug', role: 'accessory' }, { name: 'Upright Row', role: 'accessory' } ] },
]

function trainingIntentForGoal(goal?: Goal): TrainingIntent {
  return goal ? GOAL_TO_INTENT[goal] ?? 'hypertrophy' : 'hypertrophy'
}

type GeneratedExercise = { name: string; sets: number; reps: string; role: 'primary' | 'accessory' }
type WorkoutPlan = { warmUp: Array<{ name: string; sets: number; reps: string }>; workout: GeneratedExercise[] }
function buildDefaultWorkout(variation: DefaultTemplateVariation, durationMin: number, intent: TrainingIntent): WorkoutPlan {
  const count = DURATION_EXERCISE_COUNT[durationMin] ?? 5
  const scheme = INTENT_SCHEME[intent]
  const workout = variation.exercises.slice(0, count).map((exercise) => {
    const s = exercise.role === 'primary' ? scheme.primary : scheme.accessory
    return { name: exercise.name, sets: s.sets, reps: s.reps, role: exercise.role }
  })
  return { warmUp: variation.warmUp.map(ex => ({ name: ex.name, sets: ex.sets, reps: ex.reps })), workout }
}

const habitIconChoices = [
  { name: 'Fire', icon: Flame },
  { name: 'Water', icon: Droplet },
  { name: 'Workout', icon: Dumbbell },
  { name: 'Mobility', icon: PersonStanding },
  { name: 'Sleep', icon: Moon },
  { name: 'Avoid', icon: Ban },
  { name: 'Activity', icon: Activity },
  { name: 'Heart', icon: Heart },
  { name: 'Nutrition', icon: Apple },
  { name: 'Energy', icon: Sun },
  { name: 'Journal', icon: Square },
  { name: 'Balance', icon: Scale },
  { name: 'Steps', icon: User },
] as const

const progressHistory = [
  { date: 'Jun 12, 2026', weight: '148.2', bodyFat: '19.4%' },
  { date: 'May 28, 2026', weight: '150.3', bodyFat: '20.5%' },
  { date: 'May 14, 2026', weight: '152.8', bodyFat: '21.2%' },
  { date: 'Apr 30, 2026', weight: '155.1', bodyFat: '21.8%' },
]
const measurementHistory: { date: string; values: Record<string, string> }[] = [
  { date: 'Jun 12, 2026', values: { 'Body weight': '148.2 lb', 'Body fat': '19.4%', Waist: '33.0 in', Hips: '39.5 in', Neck: '13.8 in', Chest: '36.5 in', 'Left bicep': '11.7 in', 'Right bicep': '11.8 in' } },
  { date: 'May 28, 2026', values: { 'Body weight': '150.3 lb', 'Body fat': '20.5%', Waist: '33.5 in', Hips: '39.9 in', Neck: '14.0 in', Chest: '36.2 in', 'Left bicep': '11.5 in', 'Right bicep': '11.6 in' } },
  { date: 'May 14, 2026', values: { 'Body weight': '152.8 lb', 'Body fat': '21.2%', Waist: '34.2 in', Hips: '40.2 in', Neck: '14.0 in', Chest: '36.1 in', 'Left thigh': '21.9 in', 'Right thigh': '21.9 in' } },
]
// Display unit for a measurement label (used when capturing a new log).
function measurementUnit(label: string): string {
  return label === 'Body weight' ? 'lb' : label === 'Body fat' ? '%' : 'in'
}
// Format a raw numeric input into the stored display string, e.g. '148.2 lb',
// '19.4%', '33.0 in'. Returns '' for blank input.
function formatMeasurementValue(label: string, raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  return label === 'Body fat' ? `${value}%` : `${value} ${measurementUnit(label)}`
}
// Demo-only measurement check-ins, shaped as real MeasurementLog entries.
const DEMO_MEASUREMENT_LOGS: MeasurementLog[] = measurementHistory.map((entry, i) => ({
  id: `demo-measure-${i}`,
  date: entry.date,
  values: entry.values,
}))
const progressMetricData: Record<string, { label: string; unit: string; value: string; delta: string; tone: string; history: { date: string; value: string }[] }> = {
  'Body weight': { label: 'Body weight', unit: 'lb', value: '148.2', delta: '▼ 9.8 lb - 10 wks', tone: 'vital', history: [{ date: 'Jun 12, 2026', value: '148.2' }, { date: 'May 28, 2026', value: '150.3' }, { date: 'May 14, 2026', value: '152.8' }, { date: 'Apr 30, 2026', value: '155.1' }] },
  Waist: { label: 'Waist', unit: 'in', value: '33.0', delta: '▼ 1.4 in', tone: 'vital', history: [{ date: 'Jun 12, 2026', value: '33.0' }, { date: 'May 28, 2026', value: '33.5' }, { date: 'May 14, 2026', value: '34.2' }, { date: 'Apr 30, 2026', value: '34.4' }] },
  'Body fat': { label: 'Body fat', unit: '%', value: '19.4', delta: '▼ 1.1%', tone: 'vital', history: [{ date: 'Jun 12, 2026', value: '19.4' }, { date: 'May 28, 2026', value: '20.5' }, { date: 'May 14, 2026', value: '21.2' }, { date: 'Apr 30, 2026', value: '21.8' }] },
  Hips: { label: 'Hips', unit: 'in', value: '39.5', delta: '▼ 0.8 in', tone: 'vital', history: [{ date: 'Jun 12, 2026', value: '39.5' }, { date: 'May 28, 2026', value: '39.9' }, { date: 'May 14, 2026', value: '40.2' }, { date: 'Apr 30, 2026', value: '40.3' }] },
  'Strength sessions': { label: 'Strength sessions', unit: '', value: '12', delta: '+3 vs last month', tone: 'signal', history: [{ date: 'Jun 12, 2026', value: '12' }, { date: 'May 28, 2026', value: '9' }, { date: 'May 14, 2026', value: '8' }, { date: 'Apr 30, 2026', value: '7' }] },
  'Total training time': { label: 'Total training time', unit: 'min', value: '1,220', delta: '+180 min', tone: 'signal', history: [{ date: 'Jun 12, 2026', value: '1,220' }, { date: 'May 28, 2026', value: '1,040' }, { date: 'May 14, 2026', value: '930' }, { date: 'Apr 30, 2026', value: '870' }] },
  'BJJ sessions': { label: 'BJJ sessions', unit: '', value: '8', delta: '+2 this month', tone: 'signal', history: [{ date: 'Jun 12, 2026', value: '8' }, { date: 'May 28, 2026', value: '6' }, { date: 'May 14, 2026', value: '5' }, { date: 'Apr 30, 2026', value: '4' }] },
  'Kickboxing sessions': { label: 'Kickboxing sessions', unit: '', value: '4', delta: '+1 this month', tone: 'signal', history: [{ date: 'Jun 12, 2026', value: '4' }, { date: 'May 28, 2026', value: '3' }, { date: 'May 14, 2026', value: '3' }, { date: 'Apr 30, 2026', value: '2' }] },
  'Mobility minutes': { label: 'Mobility minutes', unit: 'min', value: '180', delta: '+45 min', tone: 'pulse', history: [{ date: 'Jun 12, 2026', value: '180' }, { date: 'May 28, 2026', value: '135' }, { date: 'May 14, 2026', value: '120' }, { date: 'Apr 30, 2026', value: '90' }] },
  Consistency: { label: 'Consistency', unit: '%', value: '89', delta: '+6%', tone: 'vital', history: [{ date: 'Jun 12, 2026', value: '89' }, { date: 'May 28, 2026', value: '83' }, { date: 'May 14, 2026', value: '80' }, { date: 'Apr 30, 2026', value: '76' }] },
}
const activitySummary: Record<string, { sessions: number; minutes: number }> = {
  Weightlifting: { sessions: 12, minutes: 540 },
  BJJ: { sessions: 8, minutes: 480 },
  Kickboxing: { sessions: 4, minutes: 200 },
  Mobility: { sessions: 9, minutes: 180 },
  Running: { sessions: 5, minutes: 210 },
  Swimming: { sessions: 3, minutes: 150 },
  Walking: { sessions: 14, minutes: 420 },
}

const trainerClients = [
  { name: 'Maya Rivera', status: 'Active', sessions: 8, renewal: 'Jul 2', last: 'Jun 12', email: 'maya.r@email.com', connection: 'Connected User', goal: 'Fat loss', measurement: 'Jun 12', score: '82 / 100' },
  { name: 'Daniel Cho', status: 'Renew Soon', sessions: 2, renewal: 'Jun 18', last: 'Jun 11', email: 'dcho@email.com', connection: 'Trainer Managed', goal: 'Strength', measurement: 'May 24', score: '74 / 100' },
  { name: 'Priya Nair', status: 'Out of Sessions', sessions: 0, renewal: 'Overdue', last: 'Jun 5', email: 'priya.n@email.com', connection: 'Trainer Managed', goal: 'Mobility', measurement: 'May 9', score: '68 / 100' },
  { name: 'Elena Sokolova', status: 'Inactive', sessions: 11, renewal: 'Jul 20', last: 'Jun 1', email: 'elena.s@email.com', connection: 'Connected User', goal: 'Body recomp', measurement: 'Jun 1', score: '88 / 100' },
]

const workoutBlocks = [
  {
    title: 'Warm-up',
    sub: '10 min',
    icon: Moon,
    tone: 'signal',
    exercises: [
      ['Jump Rope', '3 min - easy'],
      ['Band Pull-aparts', '2 x 15'],
      ['Shadow Boxing', '2 min - light'],
    ],
  },
  {
    title: 'Strength',
    sub: '4 exercises',
    icon: Dumbbell,
    tone: 'signal',
    exercises: [
      ['Dumbbell Bench Press', '3 x 10 - 30-35 lb'],
      ['Seated Cable Row', '3 x 12 - 50 lb'],
      ['Overhead Press', '3 x 10 - 20 lb'],
      ['Lat Pulldown', '3 x 12 - 55 lb'],
    ],
  },
  {
    title: 'Bag Work',
    sub: 'Kickboxing - 4 rounds',
    icon: Zap,
    tone: 'signal',
    exercises: [
      ['Heavy Bag Rounds', '4 x 3 min - jab-cross-hook'],
      ['Teep + Roundhouse', '2 x 2 min each side'],
    ],
  },
  {
    title: 'Core & Cooldown',
    sub: '10 min',
    icon: User,
    tone: 'signal',
    exercises: [
      ['Plank', '3 x 45 sec'],
      ['Full Stretch', '5 min - guided'],
    ],
  },
]

// The exercise blocks that drive the detail checklist + Today's progress ring.
// Demo accounts see the rich sample blocks above; real users see only the
// exercises carried by the workout they actually loaded (a template/built-in).
// A manually logged workout has none, so the detail view renders a summary
// instead of a fabricated checklist.
function workoutExerciseBlocks(
  workout: ScheduledWorkout | null,
  demoMode: boolean,
): { title: string; sub?: string; icon?: React.ComponentType<any>; items: { name: string; detail: string }[] }[] {
  if (demoMode) {
    return workoutBlocks.map((block) => ({
      title: block.title,
      sub: block.sub,
      icon: block.icon,
      items: block.exercises.map(([name, detail]) => ({ name, detail })),
    }))
  }
  return (workout?.exercises ?? []).map((block) => ({ ...block, icon: Dumbbell }))
}

const COMBAT_ACTIVITIES = ['BJJ', 'Kickboxing', 'Muay Thai']

function emptyStrengthSet(): StrengthSet {
  return { reps: '', weight: '' }
}
function makeStrengthExercise(): StrengthExercise {
  return { id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: '', sets: [emptyStrengthSet(), emptyStrengthSet(), emptyStrengthSet()] }
}

// Seed a fresh ActivityDetail with sensible defaults for its activity kind.
// No fabricated values — strength starts with one empty exercise, everything
// else starts blank so only what the user enters is saved.
function makeActivityDetail(activity: string, defaultTrackWeights: boolean): ActivityDetail {
  if (activity === 'Strength Training') return { activity, trackWeights: defaultTrackWeights, exercises: [makeStrengthExercise()] }
  if (COMBAT_ACTIVITIES.includes(activity)) return { activity, intensity: 'Moderate', format: 'Rounds', amount: '', focus: [], notes: '' }
  if (activity === 'Swimming') return { activity, intensity: 'Moderate', format: 'Laps', amount: '', notes: '' }
  if (activity === 'Cardio') return { activity, intensity: 'Moderate', cardioType: 'Run', format: 'Time', amount: '', notes: '' }
  if (activity === 'Mobility') return { activity, amount: '', focus: [], notes: '' }
  if (activity === 'Custom Activity') return { activity, customName: '', format: 'Time', amount: '', notes: '' }
  return { activity }
}

// Build a one-line summary of a strength exercise's sets for read-only views.
// Collapses uniform sets ("3 × 12 @ 145 lb") and lists mixed sets otherwise.
function formatStrengthDetail(sets: StrengthSet[], trackWeights: boolean): string {
  const filled = sets.filter((s) => s.reps.trim() || s.weight.trim())
  if (!filled.length) return ''
  const reps = filled.map((s) => s.reps.trim())
  const allRepsEqual = reps.every((r) => r === reps[0]) && reps[0] !== ''
  if (trackWeights) {
    const weights = filled.map((s) => s.weight.trim())
    const allWeightsEqual = weights.every((w) => w === weights[0]) && weights[0] !== ''
    if (allRepsEqual && allWeightsEqual) return `${filled.length} × ${reps[0]} @ ${weights[0]} lb`
    return filled.map((s) => `${s.reps.trim() || '?'}${s.weight.trim() ? `×${s.weight.trim()}lb` : ''}`).join(', ')
  }
  if (allRepsEqual) return `${filled.length} × ${reps[0]}`
  return `${reps.join(', ')} reps`
}

// Derive the checklist-style exercise blocks (used by WorkoutDetail + Today's
// hero count) from structured strength activity data.
function activityDetailsToExerciseBlocks(details: ActivityDetail[]): WorkoutExerciseBlock[] {
  const blocks: WorkoutExerciseBlock[] = []
  for (const detail of details) {
    if (detail.activity === 'Strength Training' && detail.exercises?.length) {
      const items = detail.exercises
        .filter((ex) => ex.name.trim())
        .map((ex) => ({ name: ex.name.trim(), detail: formatStrengthDetail(ex.sets, detail.trackWeights ?? false) }))
      if (items.length) blocks.push({ title: 'Strength Training', items })
    }
  }
  return blocks
}

const upcoming = [
  { day: '18', dow: 'THU', title: 'Lower Body Strength', time: '6:00 PM', badge: 'Assessment', tone: 'pulse' },
  { day: '20', dow: 'SAT', title: 'Kickboxing + Conditioning', time: '10:00 AM', badge: 'Scheduled', tone: 'signal' },
  { day: '23', dow: 'TUE', title: 'Upper Body Strength', time: '6:00 PM', badge: 'Scheduled', tone: 'signal' },
]

// custom: user-created tags; structured for later Supabase persistence (user_note_tags table)
type TimelineTag = { activities: string[]; goals: string[]; custom: string[] }
type TimelineItem = {
  icon: React.ComponentType<{ size?: number }>
  title: string
  sub: string
  date: string
  time?: string
  month: string
  tone: string
  category: string
  favorite?: boolean
  // Detail content (mock; replace with real data later)
  detail?: string
  tags?: TimelineTag
  workoutActivities?: string[]
  workoutDuration?: string
  exercises?: string[]
  measurements?: { label: string; value: string }[]
  mealType?: string
  photoType?: string
  habitItems?: { label: string; done: boolean }[]
  milestoneProgress?: string
  weightValue?: string
  weightDelta?: string
  // Future action hooks — add onEdit, onDelete, onDuplicate, onFavorite, onShare callbacks here when V2 actions land
}

const timeline: TimelineItem[] = [
  {
    icon: Check, title: 'Habits completed', sub: '5 of 6 · 83% day score',
    date: 'Jun 15', month: 'June 2026', tone: 'vital', category: 'Habits',
    habitItems: [
      { label: 'Protein goal', done: true }, { label: 'Water intake', done: true },
      { label: 'Workout', done: true }, { label: 'Mobility', done: false },
      { label: 'Sleep 7h+', done: true }, { label: 'No sugar', done: true },
    ],
  },
  {
    icon: Trophy, title: '10-day streak reached', sub: 'Your longest streak yet',
    date: 'Jun 15', month: 'June 2026', tone: 'ember', category: 'Achievements',
    milestoneProgress: '10 / 10 days',
  },
  {
    icon: Edit3, title: 'Reflection added', sub: 'Felt strong on the bag today...',
    date: 'Jun 15', month: 'June 2026', tone: 'signal', favorite: true, category: 'Notes',
    detail: 'Felt strong on the bag today. Guard is staying tighter. Left hook timing is improving — managed to connect on the combo we drilled last week. Cardio held up better than usual. Probably because of the swim yesterday.',
    tags: { activities: ['Kickboxing', 'BJJ'], goals: ['Performance', 'Recovery'], custom: ['Coach Notes', 'Half Guard'] },
  },
  {
    icon: Clock, title: 'Weight logged', sub: '148.2 lb · ▼0.6',
    date: 'Jun 14', month: 'June 2026', tone: 'vital', category: 'Weights',
    weightValue: '148.2 lb', weightDelta: '▼ 0.6 lb from last entry',
  },
  {
    icon: Dumbbell, title: 'Upper Body + Bag Work', sub: 'Strength · Kickboxing · 60 min',
    date: 'Jun 12', time: '6:30 PM', month: 'June 2026', tone: 'signal', favorite: true, category: 'Workouts',
    workoutActivities: ['Strength', 'Kickboxing'], workoutDuration: '60 min',
    exercises: ['Lat Pulldown 4×10', 'Bench Press 4×8', 'Cable Row 3×12', 'Bag rounds 6×3 min'],
    detail: 'Felt really locked in today. Pull strength is up — got a clean 4×10 on the lat pulldown at a new weight. Bag rounds were solid, keeping hands up is becoming more automatic.',
  },
  {
    icon: Camera, title: 'Meal photo added', sub: 'Lunch',
    date: 'Jun 12', month: 'June 2026', tone: 'ember', category: 'Meals',
    mealType: 'Lunch',
  },
  {
    icon: GloveIcon, title: 'Kickboxing Technique', sub: 'Kickboxing · 45 min',
    date: 'Jun 5', time: '7:00 PM', month: 'June 2026', tone: 'signal', category: 'Workouts',
    workoutActivities: ['Kickboxing'], workoutDuration: '45 min',
    exercises: ['Jab-cross-hook combo', 'Teep kick drill', 'Pad work 5×3 min', 'Footwork patterns'],
  },
  {
    icon: Dumbbell, title: 'Intervals + Bag', sub: 'Kickboxing · Cardio · 50 min',
    date: 'May 29', time: '6:45 PM', month: 'May 2026', tone: 'signal', category: 'Workouts',
    workoutActivities: ['Kickboxing', 'Cardio'], workoutDuration: '50 min',
    exercises: ['Warm-up 5 min', 'Bag intervals 8×2 min', 'Jump rope 10 min', 'Cool-down'],
  },
  {
    icon: Clock, title: 'Weight logged', sub: '150.3 lb',
    date: 'May 28', month: 'May 2026', tone: 'vital', category: 'Weights',
    weightValue: '150.3 lb', weightDelta: 'No previous entry',
  },
  {
    icon: Ruler, title: 'Measurements logged', sub: '150.3 lb · waist 33.8"',
    date: 'May 28', month: 'May 2026', tone: 'pulse', category: 'Measurements',
    measurements: [
      { label: 'Weight', value: '150.3 lb' }, { label: 'Waist', value: '33.8"' },
      { label: 'Chest', value: '40.2"' }, { label: 'Hips', value: '38.5"' },
      { label: 'Thigh', value: '22.1"' }, { label: 'Bicep', value: '14.0"' },
    ],
  },
  {
    icon: Camera, title: 'Progress photo added', sub: 'Front and side check-in',
    date: 'May 26', month: 'May 2026', tone: 'pulse', category: 'Photos',
    photoType: 'Front + Side',
  },
]

const calendarDays = [
  [1, 'scheduled'], [2, 'completed'], [4, 'completed'], [6, 'rest'], [8, 'missed'],
  [9, 'completed'], [11, 'completed'], [13, 'completed'], [14, 'rest'], [15, 'scheduled'],
  [16, 'scheduled'], [18, 'assessment'], [20, 'scheduled'], [23, 'scheduled'], [25, 'scheduled'],
  [27, 'missed'], [30, 'scheduled'],
] as const

const milestones: Milestone[] = [
  { id: 'first-workout', title: 'First Workout', description: 'Logged your very first session', category: 'Workouts', progress: '1 / 1', complete: true, earnedDate: 'Jan 12, 2026' },
  { id: 'first-measurement', title: 'First Measurement Logged', description: 'Recorded your first body measurement', category: 'Measurements', progress: '1 / 1', complete: true, earnedDate: 'Jan 14, 2026' },
  { id: 'seven-day-streak', title: '7-Day Streak', description: 'Stayed active seven days in a row', category: 'Streaks', progress: '7 / 7', complete: true, earnedDate: 'Feb 3, 2026' },
  { id: 'twenty-five-workouts', title: '25 Workouts Logged', description: 'Reached 25 total workouts', category: 'Workouts', progress: '25 / 25', complete: true, earnedDate: 'Apr 22, 2026' },
  { id: 'goal-completed', title: 'Goal Completed', description: 'Hit a weekly goal target', category: 'Goal Completion', progress: '1 / 1', complete: true, earnedDate: 'May 9, 2026' },
  { id: 'ten-day-streak', title: '10-Day Streak', description: '1 more active day remaining', category: 'Streaks', progress: '9 / 10 days', complete: false },
  { id: 'fifty-workouts', title: '50 Workouts Logged', description: '13 workouts to go', category: 'Workouts', progress: '37 / 50', complete: false },
  { id: 'five-lbs-lost', title: '5 lbs Lost', description: '1.8 lb to your milestone', category: 'Weight Loss', progress: '3.2 / 5 lbs', complete: false },
]

const tones: Record<string, { bg: string; fg: string; border: string }> = {
  white: { bg: 'var(--surface-2)', fg: 'var(--fg)', border: 'var(--line)' },
  signal: { bg: 'var(--signal-fill)', fg: 'var(--signal)', border: 'var(--signal-border)' },
  vital: { bg: 'var(--vital-fill)', fg: 'var(--vital)', border: 'var(--vital-border)' },
  ember: { bg: 'var(--ember-fill)', fg: 'var(--ember)', border: 'var(--ember-border)' },
  amber: { bg: 'var(--amber-fill)', fg: 'var(--amber)', border: 'var(--amber-border)' },
  pulse: { bg: 'var(--pulse-fill)', fg: 'var(--pulse)', border: 'var(--pulse-border)' },
  slate: { bg: 'var(--surface-2)', fg: 'var(--text-soft)', border: 'var(--line)' },
  red: { bg: 'var(--danger-fill)', fg: 'var(--danger)', border: 'var(--danger-border)' },
}

// ── DB → UI mapping utilities ────────────────────────────────────────────────

const GOAL_TYPE_TO_UI: Record<GoalType, Goal> = {
  fat_loss: 'Weight Loss',
  muscle_gain: 'Muscle Gain',
  strength: 'Strength',
  pain_mobility: 'Mobility',
  kickboxing: 'Performance',
  general_health: 'General Health',
  return_from_injury: 'Recovery',
}

// Reverse map for syncing focus goals back to the user_goals table.
// 'Endurance' has no GoalType equivalent and is intentionally omitted — its
// selection/ordering is still preserved client-side via localStorage.
const GOAL_UI_TO_TYPE: Partial<Record<Goal, GoalType>> = {
  'Weight Loss': 'fat_loss',
  'Muscle Gain': 'muscle_gain',
  Strength: 'strength',
  Mobility: 'pain_mobility',
  Performance: 'kickboxing',
  'General Health': 'general_health',
  Recovery: 'return_from_injury',
}

const HABIT_ICON_MAP: Partial<Record<string, React.ComponentType<{ size?: number }>>> = {
  calorie_target: Scale,
  protein_target: Scale,
  calorie_surplus: Scale,
  workout: Dumbbell,
  trained: Dumbbell,
  rehab_done: PersonStanding,
  mobility_done: PersonStanding,
  steps: Activity,
  activity: Activity,
  sleep: Moon,
  water: Droplet,
  energy: Sun,
  stress: Sun,
  mood: Sun,
  pr_attempt: Trophy,
  pain_level: Heart,
}

function goalTypeToHabitRows(goalType: GoalType): HabitDef[] {
  return GOAL_QUESTIONS[goalType]
    .filter((q) => q.type === 'boolean' || q.type === 'scale' || q.type === 'number')
    .map((q) => ({
      key: q.key,
      label: q.label.replace(/\?$/, '').trim(),
      icon: HABIT_ICON_MAP[q.key] ?? Check,
    }))
}

function answersToHabits(
  answers: Record<string, string | number | boolean>,
  rows: HabitDef[],
): Record<HabitKey, boolean> {
  const result: Record<HabitKey, boolean> = {}
  for (const row of rows) {
    const val = answers[row.key]
    if (typeof val === 'boolean') result[row.key] = val
    else if (typeof val === 'number') result[row.key] = val >= 3
    else result[row.key] = false
  }
  return result
}

// ────────────────────────────────────────────────────────────────────────────

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh sm:py-2" style={{ background: 'var(--phone-canvas)', color: 'var(--fg)' }}>
      <div className="mx-auto min-h-dvh w-full max-w-[392px] overflow-hidden shadow-2xl sm:min-h-[812px] sm:rounded-[46px] sm:border-[10px]" style={{ background: 'var(--phone-frame)', borderColor: 'var(--phone-ring)' }}>
        <div className="relative min-h-dvh overflow-hidden bg-[var(--bg)] sm:min-h-[792px] sm:rounded-[36px]">
          {children}
        </div>
      </div>
    </div>
  )
}

function Page({ children, nav = true }: { children: React.ReactNode; nav?: boolean }) {
  return (
    <>
      <main className={`px-[22px] ${nav ? 'pb-28' : 'pb-8'}`} style={{ paddingTop: 'max(18px, env(safe-area-inset-top))' }}>{children}</main>
    </>
  )
}

function Card({ children, className = '', onClick, onTouchStart, onTouchEnd, style }: { children: React.ReactNode; className?: string; onClick?: () => void; onTouchStart?: (e: React.TouchEvent) => void; onTouchEnd?: (e: React.TouchEvent) => void; style?: React.CSSProperties }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className={`w-full rounded-[14px] border p-4 text-left ${className}`} style={{ background: 'var(--surface-1)', borderColor: 'var(--line)', ...style }}>
      {children}
    </Tag>
  )
}

function Section({ title, right }: { title: string; right?: string }) {
  return (
    <div className="mt-6 mb-3 flex items-center gap-3">
      <p className="shrink-0 text-[11px] font-black uppercase tracking-[0.20em]" style={{ color: 'var(--label)' }}>{title}</p>
      <div className="h-px flex-1" style={{ background: 'var(--line)' }} />
      {right && <span className="text-[11px] font-semibold" style={{ color: 'var(--label)' }}>{right}</span>}
    </div>
  )
}

function Pill({ children, tone = 'signal' }: { children: React.ReactNode; tone?: string }) {
  const t = tones[tone]
  return <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold" style={{ background: t.bg, color: t.fg, borderColor: t.border }}>{children}</span>
}

function goalTone(goal: string) {
  if (goal === 'Muscle Gain' || goal === 'Mobility' || goal === 'Performance') return 'pulse'
  if (goal === 'Recovery' || goal === 'Endurance' || goal === 'Weight Loss' || goal === 'General Health') return 'vital'
  if (goal === 'Strength') return 'signal'
  return 'signal'
}

function IconChip({ icon: Icon, tone = 'signal' }: { icon: React.ComponentType<any>; tone?: string }) {
  const t = tones[tone]
  return <span className="flex h-40px h-10 w-10 shrink-0 items-center justify-center rounded-[11px]" style={{ background: t.bg, color: t.fg }}><Icon size={18} /></span>
}

function GiIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4l5 4 5-4 3 5-3 2v9H7v-9L4 9l3-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 20l6-12M15 20L9 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function GloveIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Main glove body */}
      <path d="M7 4 C7 3 8 2 10 2 L14 2 C15.1 2 16 2.9 16 4 L16 11 C16 13.2 14.2 15 12 15 L10 15 C7.8 15 6 13.2 6 11 L6 7 C6 5.3 6.4 4.5 7 4 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {/* Thumb */}
      <path d="M6 8 L4.5 8 C3.7 8 3 8.9 3 10 C3 11.1 3.7 12 4.5 12 L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Wrist cuff */}
      <path d="M7 15 L7 19 C7 19.6 7.4 20 8 20 L14 20 C14.6 20 15 19.6 15 19 L15 15" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {/* Cuff strap */}
      <path d="M7.5 17.5 L14.5 17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Knuckle division */}
      <path d="M10.5 2 L10.5 8 M13.5 2 L13.5 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}

function SwimIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 8c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1M4 13c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1M4 18c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function activityVisual(activity: string): { icon: React.ComponentType<any>; tone: string } {
  if (activity === 'BJJ') return { icon: GiIcon, tone: 'pulse' }
  if (['Boxing', 'Kickboxing', 'Muay Thai'].includes(activity)) return { icon: GloveIcon, tone: activity === 'Muay Thai' ? 'ember' : 'signal' }
  if (activity === 'Swimming') return { icon: SwimIcon, tone: 'vital' }
  if (activity === 'Cardio' || ['Running', 'Cycling', 'Walking', 'Hiking'].includes(activity)) return { icon: Activity, tone: 'vital' }
  if (activity === 'Mobility') return { icon: PersonStanding, tone: 'pulse' }
  if (activity === 'Custom Activity' || activity === 'Custom') return { icon: Sun, tone: 'slate' }
  return { icon: Dumbbell, tone: 'signal' }
}

function goalVisual(goal: Goal): { icon: React.ComponentType<any>; tone: string } {
  if (goal === 'Weight Loss') return { icon: Target, tone: 'vital' }
  if (goal === 'Muscle Gain') return { icon: Dumbbell, tone: 'pulse' }
  if (goal === 'Strength') return { icon: Trophy, tone: 'signal' }
  if (goal === 'Endurance') return { icon: Activity, tone: 'vital' }
  if (goal === 'Mobility') return { icon: PersonStanding, tone: 'pulse' }
  if (goal === 'General Health') return { icon: Heart, tone: 'vital' }
  if (goal === 'Recovery') return { icon: Shield, tone: 'vital' }
  if (goal === 'Performance') return { icon: Zap, tone: 'pulse' }
  return { icon: Target, tone: 'signal' }
}

function ActivityIcon({ activity, size = 18 }: { activity: string; size?: number }) {
  const { icon: Icon } = activityVisual(activity)
  return <Icon size={size} />
}

function GoalIcon({ goal, size = 14 }: { goal: Goal; size?: number }) {
  const { icon: Icon } = goalVisual(goal)
  return <Icon size={size} />
}

function getLocalDateISO(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function getLocalTimeHHMM(date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// ─── Supabase row ↔ app type converters ──────────────────────────────────────
// Used in both the SSR hydration path (initialData → state) and the client-side
// upload path (localStorage → Supabase on first sign-in after migration).

type TemplateRow = AppShellInitialData['templates'][number]
type MeasurementLogRow = AppShellInitialData['measurementLogs'][number]
type CalendarRow = AppShellInitialData['calendarRows'][number]

function rowToTemplate(row: TemplateRow): WorkoutTemplate {
  return {
    id: row.id,
    name: row.name,
    tags: (row.goal_tags ?? []) as Goal[],
    activities: (row.activities as string[]) ?? [],
    notes: row.notes ?? '',
    favorite: row.favorite ?? false,
    lastUsed: row.last_used ?? '',
    timesUsed: row.times_used ?? 0,
    defaultDurationMinutes: row.default_duration_minutes ?? undefined,
    exercises: row.exercises ? (row.exercises as WorkoutExerciseBlock[]) : undefined,
    activityDetails: row.activity_details ? (row.activity_details as ActivityDetail[]) : undefined,
  }
}

function templateToRow(t: WorkoutTemplate, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    name: t.name,
    goal_tags: t.tags,
    notes: t.notes ?? '',
    favorite: t.favorite ?? false,
    last_used: t.lastUsed || null,
    times_used: t.timesUsed ?? 0,
    activities: t.activities ?? [],
    default_duration_minutes: t.defaultDurationMinutes ?? null,
    exercises: t.exercises ?? [],
    activity_details: t.activityDetails ?? [],
    updated_at: new Date().toISOString(),
  }
}

function rowToMeasurementLog(row: MeasurementLogRow): MeasurementLog {
  // DB stores ISO date; app displays "Jun 28, 2026"
  const d = new Date(row.logged_date + 'T12:00:00')
  return {
    id: row.id,
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    values: (row.values ?? {}) as Record<string, string>,
  }
}

function measurementLogToRow(log: MeasurementLog, userId: string) {
  // log.date is "Jun 28, 2026" — parse back to ISO for the DB date column
  const parsed = new Date(log.date + ' 12:00:00')
  const loggedDate = isNaN(parsed.getTime())
    ? getLocalDateISO()
    : getLocalDateISO(parsed)
  return {
    id: log.id,
    user_id: userId,
    logged_date: loggedDate,
    values: log.values,
    updated_at: new Date().toISOString(),
  }
}

function rowToCalendarEntry(row: CalendarRow): { dateISO: string; entry: CalendarEntry } {
  const payload = row.payload as CalendarEntry
  return { dateISO: row.entry_date, entry: { ...payload, id: payload.id ?? row.id } }
}

function calendarEntryToRow(entry: CalendarEntry, dateISO: string, userId: string) {
  return {
    id: entry.id!,
    user_id: userId,
    entry_date: dateISO,
    entry_type: entry.type,
    payload: entry,
    updated_at: new Date().toISOString(),
  }
}

function Ring({ pct }: { pct: number }) {
  const r = 32
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-[74px] w-[74px]">
      <svg width="74" height="74" className="-rotate-90">
        <defs>
          <linearGradient id="soma-ring" x1="5" y1="68" x2="68" y2="5" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--vital)" />
            <stop offset="0.52" stopColor="var(--signal)" />
            <stop offset="1" stopColor="var(--pulse)" />
          </linearGradient>
        </defs>
        <circle cx="37" cy="37" r={r} fill="none" stroke="var(--ring-track)" strokeWidth="6" />
        <circle cx="37" cy="37" r={r} fill="none" stroke="url(#soma-ring)" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[20px] font-black">{pct}%</span>
    </div>
  )
}

function focusMetrics(focusGoals: Goal[], pct: number) {
  const primary = focusGoals[0] ?? 'Weight Loss'
  if (primary === 'Weight Loss') {
    return [
      { value: '▼9.8', label: 'Lb - 10 wks', tone: 'vital' },
      { value: '▼1.4"', label: 'Waist', tone: 'vital' },
      { value: `${pct}%`, label: 'Habits', tone: 'signal' },
    ]
  }
  const byGoal: Record<string, { value: string; label: string; tone: string }> = {
    'Weight Loss': { value: '▼9.8', label: 'Lb - 10 wks', tone: 'vital' },
    'Muscle Gain': { value: '+2.4', label: 'Lean mass', tone: 'signal' },
    'Strength': { value: '3', label: 'PRs', tone: 'ember' },
    'General Health': { value: `${pct}%`, label: 'Habits', tone: 'signal' },
    'Endurance': { value: '+12%', label: 'Conditioning', tone: 'vital' },
    'Mobility': { value: '5', label: 'Mobility days', tone: 'pulse' },
    'Athletic Performance': { value: '82', label: 'Readiness', tone: 'signal' },
    'Habit Building': { value: `${pct}%`, label: 'Habits', tone: 'signal' },
    'Body Recomposition': { value: '▼2.6%', label: 'Body fat', tone: 'vital' },
    'Injury Recovery': { value: '0', label: 'Pain flags', tone: 'vital' },
    Recovery: { value: '0', label: 'Pain flags', tone: 'vital' },
    Performance: { value: '82', label: 'Readiness', tone: 'signal' },
  }
  return focusGoals.slice(0, 3).map((goal) => byGoal[goal])
}

function loggedFocusCards(focusGoals: Goal[], activities: string[], shownMeasurements: string[]) {
  const primary = focusGoals[0] ?? 'Weight Loss'
  const activityCards = activities.slice(0, 3).map((activity) => ({ value: String(activitySummary[activity]?.sessions ?? 0), label: `${activity} sessions`, tone: 'signal' }))
  const waistCard = shownMeasurements.includes('Waist') ? [{ value: '▼ 1.4 in', label: 'Waist change', tone: 'vital' }] : []
  const cards: Record<Goal, { value: string; label: string; tone: string }[]> = {
    'Weight Loss': [{ value: '145 lb', label: 'Goal weight', tone: 'white' }, { value: '148.2 lb', label: 'Current weight', tone: 'white' }, { value: '3.2 lb to goal', label: 'Remaining', tone: 'signal' }, ...waistCard],
    'Muscle Gain': [{ value: '148.2', label: 'Current lb', tone: 'white' }, { value: '9.8', label: 'Lb change', tone: 'vital' }, { value: '24', label: 'Activities logged', tone: 'signal' }],
    Strength: [{ value: '12', label: 'Strength sessions', tone: 'signal' }, { value: '42', label: 'Active days', tone: 'vital' }, { value: '24', label: 'Activities logged', tone: 'signal' }],
    Endurance: [{ value: '9', label: 'Endurance sessions', tone: 'signal' }, { value: '42', label: 'Active days', tone: 'vital' }, { value: '24', label: 'Activities logged', tone: 'signal' }],
    Mobility: [{ value: '9', label: 'Mobility sessions', tone: 'pulse' }, { value: '5', label: 'Mobility goals done', tone: 'vital' }],
    'General Health': [{ value: '42', label: 'Active days', tone: 'vital' }, { value: '24', label: 'Activities logged', tone: 'signal' }, { value: '8', label: 'Notes logged', tone: 'signal' }],
    Recovery: [{ value: '9', label: 'Mobility sessions', tone: 'pulse' }, { value: '42', label: 'Active days', tone: 'vital' }, { value: '8', label: 'Notes logged', tone: 'signal' }],
    Performance: activityCards.length ? activityCards : [{ value: '12', label: 'Strength sessions', tone: 'signal' }, { value: '8', label: 'BJJ sessions', tone: 'signal' }, { value: '4', label: 'Kickboxing sessions', tone: 'signal' }],
  }
  return cards[primary].slice(0, 4)
}

function FocusOutcomeCard({ metrics }: { primaryGoal: Goal; metrics: { value: string; label: string; tone: string }[] }) {
  const hasWeightGoal = metrics.some((metric) => metric.label === 'Goal weight')
  return (
    <Card className="p-0">
      {hasWeightGoal && (
        <div className="px-4 pb-3 pt-4">
          <div className="mb-2 flex items-center justify-between text-[13px]">
            <span className="font-medium" style={{ color: 'var(--text-soft)' }}>Weight Goal Progress</span>
            <span className="mono font-bold" style={{ color: 'var(--signal)' }}>75%</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: 'var(--progress-track)' }}><div className="h-2 w-3/4 rounded-full" style={{ background: 'var(--progress-fill)' }} /></div>
        </div>
      )}
      {metrics.map((metric, index) => (
        <div key={metric.label} className="flex min-h-[44px] items-center gap-3 px-4" style={{ borderTop: index || hasWeightGoal ? '1px solid var(--line)' : 'none' }}>
          <span className="flex-1 text-[13px]" style={{ color: 'var(--text-soft)' }}>{metric.label}</span>
          {(() => {
            const hasTrendGlyph = /^[^\d+.-]/.test(metric.value.trim())
            const valueText = metric.value.replace(/^[^\d+.-]+\s*/, '')
            return (
              <span className="mono flex items-center gap-1.5 font-bold" style={{ color: tones[metric.tone].fg }}>
                {hasTrendGlyph && <span className="text-[8px] leading-none">▼</span>}
                <span className="text-[14px] leading-none">{valueText}</span>
              </span>
            )
          })()}
        </div>
      ))}
    </Card>
  )
}

function EmptyState({ icon: Icon, title, body, cta, onCta, tone = 'signal' }: { icon: React.ComponentType<{ size?: number }>; title: string; body: string; cta?: string; onCta?: () => void; tone?: string }) {
  return (
    <Card className="flex flex-col items-center px-5 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-[14px]" style={{ background: tones[tone].bg, color: tones[tone].fg }}>
        <Icon size={22} />
      </span>
      <p className="mt-4 text-[15px] font-black">{title}</p>
      <p className="mt-1.5 max-w-[280px] text-[13px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>{body}</p>
      {cta && onCta && (
        <button type="button" onClick={onCta} className="mt-5 flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] px-5 text-[14px] font-bold" style={{ background: 'var(--button-primary-surface)', color: 'var(--on-accent)', boxShadow: 'var(--button-primary-shadow)' }}>
          {cta}
        </button>
      )}
    </Card>
  )
}

function focusSummaryMetrics(primaryGoal: Goal, pct: number, activities: string[]) {
  const sportSessions = activities.filter((activity) => ['BJJ', 'Kickboxing', 'Muay Thai', 'Boxing', 'Swimming'].includes(activity)).reduce((sum, activity) => sum + (activitySummary[activity]?.sessions ?? 0), 0)
  const data: Record<Goal, { value: string; label: string; tone: string }[]> = {
    'Weight Loss': [{ value: '75%', label: 'Goal progress', tone: 'signal' }, { value: '3.2 lb', label: 'To goal', tone: 'vital' }, { value: '-1.4 in', label: 'Waist change', tone: 'vital' }],
    'Muscle Gain': [{ value: '62%', label: 'Goal progress', tone: 'signal' }, { value: '+2.4 lb', label: 'Weight gained', tone: 'vital' }, { value: '12', label: 'Strength sessions', tone: 'signal' }],
    Strength: [{ value: '12', label: 'Strength workouts', tone: 'signal' }, { value: '9 days', label: 'Activity streak', tone: 'ember' }, { value: `${pct}%`, label: 'Goals complete', tone: 'vital' }],
    Performance: [{ value: '12', label: 'Strength sessions', tone: 'signal' }, { value: String(sportSessions || 12), label: 'Sport sessions', tone: 'ember' }, { value: '24', label: 'Total workouts', tone: 'vital' }],
    Endurance: [{ value: String(activitySummary.Running?.sessions ?? 5), label: 'Cardio sessions', tone: 'signal' }, { value: '1,220', label: 'Active minutes', tone: 'vital' }, { value: '9 days', label: 'Activity streak', tone: 'ember' }],
    Mobility: [{ value: String(activitySummary.Mobility?.sessions ?? 9), label: 'Mobility sessions', tone: 'pulse' }, { value: '9 days', label: 'Current streak', tone: 'ember' }, { value: `${pct}%`, label: 'Goals complete', tone: 'vital' }],
    'General Health': [{ value: `${pct}%`, label: 'Goals complete', tone: 'vital' }, { value: '9 days', label: 'Activity streak', tone: 'ember' }, { value: '24', label: 'Activities logged', tone: 'signal' }],
    Recovery: [{ value: `${pct}%`, label: 'Goals complete', tone: 'vital' }, { value: '9 days', label: 'Activity streak', tone: 'ember' }, { value: '24', label: 'Activities logged', tone: 'signal' }],
  }
  return data[primaryGoal]
}

function FocusSummary({ primaryGoal, pct, activities }: { primaryGoal: Goal; pct: number; activities: string[] }) {
  function splitValue(value: string) {
    const match = value.match(/^([+-]?\d[\d.,]*(?:\.\d+)?%?)(?:\s+(.+))?$/)
    return match ? { number: match[1], unit: match[2] ?? '' } : { number: value, unit: '' }
  }
  return (
    <div className="mt-6">
      <Section title={`Focus summary - ${primaryGoal}`} />
      <div className="grid grid-cols-3 gap-2">
        {focusSummaryMetrics(primaryGoal, pct, activities).map((metric) => {
          const value = splitValue(metric.value)
          return (
          <Card key={metric.label} className="min-h-[76px] overflow-hidden p-3">
            <p className="mono flex min-w-0 flex-wrap items-baseline gap-x-1 text-[18px] font-black leading-none" style={{ color: tones[metric.tone].fg }}>
              <span className="min-w-0 break-all">{value.number}</span>
              {value.unit && <span className="text-[12px] leading-none">{value.unit}</span>}
            </p>
            <p className="mt-1 text-[10px] font-bold leading-tight" style={{ color: 'var(--text-soft)' }}>{metric.label}</p>
          </Card>
        )})}
      </div>
    </div>
  )
}

function MilestoneCard({ onOpen }: { onOpen: () => void }) {
  return (
    <Card className="mt-4 flex min-h-[70px] items-center gap-3 p-3.5" onClick={onOpen} style={{ background: 'var(--surface-1)', borderColor: 'var(--line)' }}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: 'var(--amber-fill)', color: 'var(--amber)' }}>
        <Flame size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--label)' }}>Next Milestone</p>
        <p className="mt-0.5 truncate text-[15px] font-extrabold leading-tight">9 / 10 Day Activity Streak</p>
        <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-soft)' }}>1 more active day remaining</p>
      </div>
      <ChevronRight size={16} style={{ color: 'var(--label)' }} />
    </Card>
  )
}

function MilestonesLibrary({ demoMode, onBack }: { demoMode: boolean; onBack: () => void }) {
  const milestoneSource = demoMode ? milestones : []
  const inProgress = milestoneSource.filter((milestone) => !milestone.complete)
  const completed = milestoneSource.filter((milestone) => milestone.complete)
  function milestoneTone(category: string) {
    if (category === 'Streaks') return 'ember'
    if (category === 'Measurements') return 'pulse'
    if (category === 'Weight Loss') return 'vital'
    if (category === 'Goal Completion') return 'vital'
    return 'signal'
  }
  function milestoneIcon(category: string) {
    if (category === 'Streaks') return Flame
    if (category === 'Measurements') return Ruler
    if (category === 'Weight Loss') return Clock
    if (category === 'Goal Completion') return Check
    return Dumbbell
  }
  function progressPct(progress: string) {
    const [current, total] = progress.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [0, 1]
    return Math.min(100, Math.round((current / total) * 100))
  }
  function MilestoneRow({ milestone }: { milestone: Milestone }) {
    const tone = milestoneTone(milestone.category)
    const Icon = milestoneIcon(milestone.category)
    const pct = progressPct(milestone.progress)
    return (
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <IconChip icon={Icon} tone={tone} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 text-[16px] font-black leading-snug">{milestone.title}</p>
              <Pill tone={tone}>{milestone.category}</Pill>
              {milestone.complete && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--vital-fill)', color: 'var(--vital)' }}><Check size={16} strokeWidth={3} /></span>}
            </div>
            <p className="mt-1 text-[13px] leading-snug" style={{ color: 'var(--text-soft)' }}>{milestone.description}</p>
            {milestone.complete ? (
              <p className="mono mt-2 text-[12px]" style={{ color: 'var(--label)' }}>Earned {milestone.earnedDate}</p>
            ) : (
              <div className="mt-4 flex items-center gap-3">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--surface-3)' }}>
                  <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: tones[tone].fg }} />
                </span>
                <span className="mono text-[13px] font-black">{milestone.progress}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    )
  }
  return (
    <Page nav={false}>
      <BackLink label="Back" onClick={onBack} />
      <h1 className="mt-7 text-[24px] font-black">Milestones</h1>
      <p className="mt-2 text-[14px]" style={{ color: 'var(--text-soft)' }}>Goals you&apos;ve earned and what&apos;s next</p>
      {milestoneSource.length === 0 ? (
        <div className="mt-5">
          <EmptyState icon={Flame} title="No milestones yet" body="Keep logging workouts and habits — streaks and milestones unlock as you build consistency." />
        </div>
      ) : (
        <>
          <Section title={`In progress ${inProgress.length}`} />
          <div className="space-y-3">{inProgress.map((milestone) => <MilestoneRow key={milestone.id} milestone={milestone} />)}</div>
          <Section title={`Completed ${completed.length}`} />
          <div className="space-y-3">{completed.map((milestone) => <MilestoneRow key={milestone.id} milestone={milestone} />)}</div>
        </>
      )}
    </Page>
  )
}

function Today({ demoMode, habits, habitRows, focusGoals, activities, shownMeasurements, workoutStatus, todayWorkout, workoutCount, workoutIndex, onSelectWorkout, workoutProgress, dailyGoalsExpanded, profileName, profileInitials, profilePhoto, todayNote, onToggleDailyGoals, onHabit, onMilestones, onAvatar, onViewPlan, onAddTemplate, onClearWorkout, onGenerateWorkout, onManageGoals, onNote, onLogWorkout }: { demoMode: boolean; habits: Record<HabitKey, boolean>; habitRows: HabitDef[]; focusGoals: Goal[]; activities: string[]; shownMeasurements: string[]; workoutStatus: WorkoutStatus; todayWorkout: ScheduledWorkout | null; workoutCount: number; workoutIndex: number; onSelectWorkout: (index: number) => void; workoutProgress: { complete: number; total: number; pct: number }; dailyGoalsExpanded: boolean; profileName: string; profileInitials: string; profilePhoto: string | null; todayNote: string; onToggleDailyGoals: () => void; onHabit: (key: HabitKey) => void; onMilestones: () => void; onAvatar: () => void; onViewPlan: () => void; onAddTemplate: () => void; onClearWorkout: () => void; onGenerateWorkout: () => void; onManageGoals: () => void; onNote: () => void; onLogWorkout: () => void }) {
  const done = habitRows.filter((habit) => habits[habit.key]).length
  const pct = habitRows.length ? Math.round((done / habitRows.length) * 100) : 0
  const primaryGoal = focusGoals[0] ?? 'Weight Loss'
  const swipeStartX = useRef<number>(0)
  function onSwipeStart(e: React.TouchEvent) { swipeStartX.current = e.touches[0].clientX }
  function onSwipeEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - swipeStartX.current
    if (Math.abs(dx) < 44) return
    if (dx < 0 && workoutIndex < workoutCount - 1) onSelectWorkout(workoutIndex + 1)
    if (dx > 0 && workoutIndex > 0) onSelectWorkout(workoutIndex - 1)
  }
  const plannedWorkout = todayWorkout ?? { id: 'today-fallback', label: 'Upper Body + Bag Work', sub: 'Push - Pull - Conditioning - 60 min', activities: ['Strength', 'Kickboxing'] }
  const hasPlannedWorkout = Boolean(todayWorkout) || demoMode
  const effectiveWorkoutStatus: WorkoutStatus = workoutStatus === 'done' ? 'done' : 'planned'
  const workoutStarted = effectiveWorkoutStatus === 'planned' && workoutProgress.complete > 0
  const workoutBadge = workoutStarted ? `In Progress - ${workoutProgress.pct}%` : 'Scheduled'
  const workoutCta = workoutStarted ? 'Continue workout' : 'Start workout'
  const firstName = profileName.split(/\s+/).filter(Boolean)[0] ?? 'there'
  const now = new Date()
  const todayLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return (
    <Page>
      <div className="flex items-start justify-between pt-2">
        <div>
          <p className="text-[14px]" style={{ color: 'var(--text-soft)' }}>{todayLabel}</p>
          <h1 className="mt-1 text-[22px] font-black leading-tight">{greeting}, {firstName}</h1>
        </div>
        <button type="button" onClick={onAvatar} className="flex h-[46px] w-[46px] items-center justify-center overflow-hidden rounded-full text-[16px] font-black" style={{ background: 'var(--button-primary-bg)', color: 'var(--on-accent)', boxShadow: 'var(--button-primary-shadow)' }} aria-label="Open account menu">
          {profilePhoto ? <img src={profilePhoto} alt="" className="h-full w-full object-cover" /> : profileInitials}
        </button>
      </div>

      {demoMode && <FocusSummary primaryGoal={primaryGoal} pct={pct} activities={activities} />}
      {demoMode && <MilestoneCard onOpen={onMilestones} />}

      <Section title="Today's workout" />
      {effectiveWorkoutStatus === 'planned' && !hasPlannedWorkout && (
        <EmptyState icon={Dumbbell} title="No workout logged yet" body="Log your first workout to start building your history and tracking trends." cta="Log a workout" onCta={onLogWorkout} tone="signal" />
      )}
      {effectiveWorkoutStatus === 'planned' && hasPlannedWorkout && (
        <Card className="rounded-[15px] border p-5 shadow-[0_18px_40px_rgba(58,164,235,0.16)]" onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd} style={{
          background: 'var(--workout-hero-bg)',
          borderColor: 'var(--workout-hero-border)',
          color: 'var(--workout-hero-fg)',
          touchAction: 'pan-y',
        } as React.CSSProperties}>
          <div className="mb-4 flex items-center justify-between">
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold" style={{ background: workoutStarted ? 'var(--signal-fill)' : 'var(--vital-fill)', borderColor: workoutStarted ? 'var(--signal-border)' : 'var(--vital-border)', color: workoutStarted ? 'var(--signal)' : 'var(--vital)' }}><span className="mr-1.5 h-1.5 w-1.5 rounded-full" style={{ background: workoutStarted ? 'var(--signal)' : 'var(--vital)' }} />{workoutBadge}</span>
            <div className="flex items-center gap-2">
              {workoutCount > 1 && (
                <div className="flex items-center gap-1" style={{ color: 'var(--workout-hero-muted)' }}>
                  <button type="button" onClick={() => onSelectWorkout(Math.max(0, workoutIndex - 1))} disabled={workoutIndex === 0} className="flex h-7 w-7 items-center justify-center rounded-[8px] border disabled:opacity-40" style={{ borderColor: 'var(--workout-hero-border)' }} aria-label="Previous workout"><ChevronLeft size={15} /></button>
                  <span className="mono min-w-[34px] text-center text-[12px] font-bold">{workoutIndex + 1}/{workoutCount}</span>
                  <button type="button" onClick={() => onSelectWorkout(Math.min(workoutCount - 1, workoutIndex + 1))} disabled={workoutIndex === workoutCount - 1} className="flex h-7 w-7 items-center justify-center rounded-[8px] border disabled:opacity-40" style={{ borderColor: 'var(--workout-hero-border)' }} aria-label="Next workout"><ChevronRight size={15} /></button>
                </div>
              )}
              {workoutCount <= 1 && todayWorkout && todayWorkout.time && (
                <span className="mono flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: 'var(--workout-hero-muted)' }}><Clock size={14} />{todayWorkout.time}</span>
              )}
              {Boolean(todayWorkout) && (
                <button type="button" onClick={onClearWorkout} className="flex h-8 w-8 items-center justify-center rounded-[9px] border" style={{ borderColor: 'var(--workout-hero-border)', color: 'var(--workout-hero-muted)' }} aria-label="Clear today's workout">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
          <h2 className="text-[22px] font-extrabold">{plannedWorkout.label}</h2>
          <p className="mt-1 text-[13px] font-medium" style={{ color: 'var(--workout-hero-muted)' }}>{plannedWorkout.sub}</p>
          {workoutStarted && <p className="mt-3 text-[13px] font-semibold" style={{ color: 'var(--workout-hero-muted)' }}>{workoutProgress.complete} of {workoutProgress.total} exercises complete</p>}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {plannedWorkout.activities.slice(0, 2).map((activity) => (
              <span key={activity} className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: 'var(--signal-fill)', color: 'var(--signal)' }}>{activity}</span>
            ))}
          </div>
          <button onClick={onViewPlan} className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[13px] px-5 text-[15px] font-black transition-transform active:scale-[0.99]" style={{ background: 'var(--workout-cta-bg)', color: 'var(--workout-cta-fg)', boxShadow: 'var(--button-primary-shadow)' }}>{workoutCta} <ChevronRight size={17} /></button>
        </Card>
      )}
      {effectiveWorkoutStatus === 'done' && (
        <Card className="min-h-[116px] p-5" onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd} style={{ background: 'var(--vital-fill)', borderColor: 'var(--vital-border)', touchAction: 'pan-y' } as React.CSSProperties}>
          {(workoutCount > 1 || Boolean(todayWorkout)) && (
            <div className="mb-3 flex items-center justify-end gap-2">
              {workoutCount > 1 && (
                <div className="flex items-center gap-1" style={{ color: 'var(--text-soft)' }}>
                  <button type="button" onClick={() => onSelectWorkout(Math.max(0, workoutIndex - 1))} disabled={workoutIndex === 0} className="flex h-7 w-7 items-center justify-center rounded-[8px] border disabled:opacity-40" style={{ borderColor: 'var(--vital-border)' }} aria-label="Previous workout"><ChevronLeft size={15} /></button>
                  <span className="mono min-w-[34px] text-center text-[12px] font-bold">{workoutIndex + 1}/{workoutCount}</span>
                  <button type="button" onClick={() => onSelectWorkout(Math.min(workoutCount - 1, workoutIndex + 1))} disabled={workoutIndex === workoutCount - 1} className="flex h-7 w-7 items-center justify-center rounded-[8px] border disabled:opacity-40" style={{ borderColor: 'var(--vital-border)' }} aria-label="Next workout"><ChevronRight size={15} /></button>
                </div>
              )}
              {Boolean(todayWorkout) && (
                <button type="button" onClick={onClearWorkout} className="flex h-8 w-8 items-center justify-center rounded-[9px] border" style={{ borderColor: 'var(--vital-border)', color: 'var(--text-soft)' }} aria-label="Clear today's workout">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[13px]" style={{ background: 'var(--button-primary-bg)', color: 'var(--on-accent)', boxShadow: 'var(--button-primary-shadow)' }}><Check size={26} strokeWidth={3} /></span>
          <div className="min-w-0 flex-1">
            <span className="mb-2 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold" style={{ background: 'var(--vital-fill)', borderColor: 'var(--vital-border)', color: 'var(--vital)' }}>Completed</span>
            <p className="text-[17px] font-black">Workout complete</p>
            <p className="mt-1 text-[13px] leading-snug" style={{ color: 'var(--text-soft)' }}>{plannedWorkout.label} - logged to your timeline</p>
          </div>
          </div>
          <button onClick={onViewPlan} className="mt-4 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-[10px] text-[14px] font-bold" style={{ background: 'var(--button-primary-surface)', color: 'var(--on-accent)', boxShadow: 'var(--button-primary-shadow)' }}>View Plan <ChevronRight size={15} /></button>
        </Card>
      )}
      <div className="mt-6 mb-3 flex items-center gap-3">
        <p className="shrink-0 text-[11px] font-black uppercase tracking-[0.20em]" style={{ color: 'var(--label)' }}>Daily goals</p>
        <div className="h-px flex-1" style={{ background: 'var(--line)' }} />
        <button type="button" onClick={onManageGoals} className="flex min-h-[34px] items-center gap-1.5 rounded-[10px] border px-2.5 text-[11px] font-bold" style={{ borderColor: 'var(--line)', background: 'var(--surface-1)', color: 'var(--label)' }} aria-label="Manage daily goals">
          <Settings size={13} />
          Manage
        </button>
      </div>
      <Card className="p-4">
        <button type="button" onClick={onToggleDailyGoals} className={`flex w-full items-center gap-4 text-left ${dailyGoalsExpanded ? 'mb-4' : ''}`} aria-expanded={dailyGoalsExpanded}>
          <Ring pct={pct} />
          <div className="min-w-0 flex-1">
            <p className="text-[18px] font-black">{done} / {habitRows.length} goals done</p>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--text-soft)' }}>{pct}% daily score - tap to {dailyGoalsExpanded ? 'hide' : 'check off'}</p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ color: 'var(--label)' }}>
            <ChevronDown size={18} className={dailyGoalsExpanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </span>
        </button>
        {dailyGoalsExpanded && <div className="space-y-2">
          {habitRows.map(({ key, label, icon: Icon }) => {
            const complete = habits[key]
            return (
              <button
                key={key}
                onClick={() => onHabit(key)}
                className="flex min-h-[54px] w-full items-center gap-3 rounded-[10px] border px-3 text-left"
                style={{
                  background: complete ? 'var(--habit-done-bg)' : 'var(--habit-empty-bg)',
                  borderColor: complete ? 'var(--habit-done-border)' : 'var(--line)',
                }}
              >
                <IconChip icon={Icon} tone={complete ? 'vital' : 'slate'} />
                <span className="flex-1 text-[14px] font-semibold" style={{ color: complete ? 'var(--fg)' : 'var(--text-soft)' }}>{label}</span>
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-[8px] border"
                  style={{
                    background: complete ? 'var(--vital)' : 'transparent',
                    borderColor: complete ? 'var(--vital)' : 'var(--line)',
                    color: 'var(--on-accent)',
                  }}
                >
                  {complete && <Check size={15} strokeWidth={3} />}
                </span>
              </button>
            )
          })}
        </div>}
      </Card>

      <Section title="Today's note" />
      <Card className="p-4" onClick={onNote} style={{ background: 'var(--note-bg)' }}>
        <div className="mb-3 flex items-center gap-3">
          <IconChip icon={Edit3} tone="signal" />
          <span className="text-[14px] font-semibold">Reflection</span>
        </div>
        {todayNote
          ? <p className="text-[14px] leading-snug">{todayNote}</p>
          : <p className="text-[14px] leading-snug" style={{ color: 'var(--text-soft)' }}>Tap to add today&apos;s reflection...</p>
        }
      </Card>
    </Page>
  )
}

function Metric({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <Card className="p-3 text-center">
      <p className="mono text-[20px] font-black" style={{ color: tones[tone].fg }}>
        {value.startsWith('▼') ? <><span className="align-[3px] text-[11px]">▼</span>{value.slice(1)}</> : value}
      </p>
      <p className="text-[10px] font-bold" style={{ color: 'var(--text-soft)' }}>{label}</p>
    </Card>
  )
}

// ─── Timeline filter config ──────────────────────────────────────────────────

const TIMELINE_PRIMARY = ['All', 'Workouts', 'Progress', 'Meals', 'Notes'] as const
type TimelinePrimary = typeof TIMELINE_PRIMARY[number]

const TIMELINE_SUB: Record<Exclude<TimelinePrimary, 'Notes'>, string[]> = {
  All:      [],
  Workouts: ['All activities', 'Kickboxing', 'BJJ', 'Swimming', 'Weightlifting', 'Cardio'],
  Progress: ['Weight', 'Measurements', 'Photos', 'Habits', 'Milestones', 'Streaks'],
  Meals:    ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
}
// Notes sub-filters are computed dynamically from note entries + user's custom tags

function matchesPrimary(event: TimelineItem, primary: TimelinePrimary): boolean {
  if (primary === 'All') return true
  if (primary === 'Workouts') return event.category === 'Workouts'
  if (primary === 'Progress') return ['Weights', 'Measurements', 'Photos', 'Habits', 'Achievements'].includes(event.category)
  if (primary === 'Meals') return event.category === 'Meals'
  if (primary === 'Notes') return event.category === 'Notes'
  return false
}

function matchesSub(event: TimelineItem, primary: TimelinePrimary, sub: string): boolean {
  if (!sub || sub === 'All' || sub === 'All activities') return true
  if (primary === 'Workouts') return event.workoutActivities?.some((a) => a.toLowerCase() === sub.toLowerCase()) ?? false
  if (primary === 'Progress') {
    if (sub === 'Weight') return event.category === 'Weights'
    if (sub === 'Measurements') return event.category === 'Measurements'
    if (sub === 'Photos') return event.category === 'Photos'
    if (sub === 'Habits') return event.category === 'Habits'
    if (sub === 'Milestones' || sub === 'Streaks') return event.category === 'Achievements'
    return false
  }
  if (primary === 'Meals') return event.mealType?.toLowerCase() === sub.toLowerCase()
  if (primary === 'Notes') {
    if (sub === 'Favorites') return event.favorite === true
    const lsub = sub.toLowerCase()
    return (
      event.tags?.activities.some((a) => a.toLowerCase() === lsub) ||
      event.tags?.goals.some((g) => g.toLowerCase() === lsub) ||
      event.tags?.custom.some((c) => c.toLowerCase() === lsub) ||
      false
    )
  }
  return true
}

// ─── Timeline detail sheet ───────────────────────────────────────────────────

function TimelineDetailSheet({ entry, onClose, onOpenWorkout, showToast }: {
  entry: TimelineItem | null
  onClose: () => void
  onOpenWorkout: () => void
  showToast: (msg: string) => void
}) {
  if (!entry) return null
  const cat = entry.category

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center"
      style={{ background: 'var(--overlay)' }}
      onClick={onClose}
    >
      <div
        className="max-h-[85dvh] w-full max-w-[392px] animate-[slideUp_200ms_ease-out] overflow-y-auto rounded-t-[24px] border-t sm:max-w-[372px]"
        style={{ background: 'var(--surface-1)', borderColor: 'var(--line)', boxShadow: '0 -16px 48px rgba(0,0,0,0.44)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="pt-3 pb-1 flex justify-center">
          <div className="h-1 w-10 rounded-full" style={{ background: 'var(--surface-3)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pb-3 pt-1">
          <IconChip icon={entry.icon} tone={entry.tone} />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold leading-snug" style={{ color: 'var(--fg)' }}>
              {entry.title}
              {entry.favorite && <span className="ml-1.5" style={{ color: 'var(--ember)' }}>★</span>}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--label)' }}>
              {entry.date}{entry.time ? ` · ${entry.time}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
            style={{ background: 'var(--surface-2)' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px mx-4" style={{ background: 'var(--line)' }} />

        {/* Body */}
        <div className="px-4 py-4 space-y-4">

          {/* Workout */}
          {cat === 'Workouts' && (
            <>
              <div className="flex flex-wrap gap-2">
                {entry.workoutActivities?.map((a) => (
                  <span key={a} className="rounded-full border px-3 py-1 text-[11px] font-semibold" style={{ borderColor: 'var(--signal-border)', color: 'var(--signal)', background: 'var(--signal-fill)' }}>{a}</span>
                ))}
                {entry.workoutDuration && (
                  <span className="rounded-full border px-3 py-1 text-[11px] font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--label)', background: 'var(--surface-2)' }}>{entry.workoutDuration}</span>
                )}
              </div>
              {entry.exercises && (
                <div>
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>Exercises</p>
                  <div className="rounded-[12px] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                    {entry.exercises.map((ex, i) => (
                      <div key={ex} className="flex items-center px-3.5 py-2.5" style={{ background: 'var(--surface-2)', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                        <span className="text-[13px]" style={{ color: 'var(--fg)' }}>{ex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {entry.detail && (
                <div>
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>Notes</p>
                  <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>{entry.detail}</p>
                </div>
              )}
            </>
          )}

          {/* Weight */}
          {cat === 'Weights' && (
            <>
              <div className="rounded-[12px] p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                <p className="text-[28px] font-black" style={{ color: 'var(--fg)' }}>{entry.weightValue}</p>
                {entry.weightDelta && (
                  <p className="mt-1 text-[13px]" style={{ color: entry.weightDelta.startsWith('▼') ? 'var(--vital)' : 'var(--label)' }}>{entry.weightDelta}</p>
                )}
              </div>
              {entry.detail && (
                <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>{entry.detail}</p>
              )}
            </>
          )}

          {/* Measurements */}
          {cat === 'Measurements' && (
            <>
              {entry.measurements && (
                <div className="rounded-[12px] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                  {entry.measurements.map((m, i) => (
                    <div key={m.label} className="flex items-center justify-between px-3.5 py-2.5" style={{ background: 'var(--surface-2)', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                      <span className="text-[13px]" style={{ color: 'var(--text-soft)' }}>{m.label}</span>
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--fg)' }}>{m.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {entry.detail && (
                <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>{entry.detail}</p>
              )}
            </>
          )}

          {/* Meal photo */}
          {cat === 'Meals' && (
            <>
              {entry.mealType && <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--label)' }}>{entry.mealType}</p>}
              <div className="flex h-44 items-center justify-center rounded-[14px]" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                <div className="flex flex-col items-center gap-2" style={{ color: 'var(--label)' }}>
                  <Camera size={28} />
                  <span className="text-[12px]">Photo preview</span>
                </div>
              </div>
            </>
          )}

          {/* Progress photo */}
          {cat === 'Photos' && (
            <>
              {entry.photoType && <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--label)' }}>{entry.photoType}</p>}
              <div className="flex h-52 items-center justify-center rounded-[14px]" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                <div className="flex flex-col items-center gap-2" style={{ color: 'var(--label)' }}>
                  <Camera size={28} />
                  <span className="text-[12px]">Photo preview</span>
                </div>
              </div>
            </>
          )}

          {/* Note / Reflection */}
          {cat === 'Notes' && (
            <>
              {entry.detail && (
                <p className="text-[14px] leading-relaxed" style={{ color: 'var(--fg)' }}>{entry.detail}</p>
              )}
              {entry.tags && (entry.tags.activities.length > 0 || entry.tags.goals.length > 0 || entry.tags.custom.length > 0) && (
                <div className="space-y-2.5">
                  {entry.tags.activities.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>Activities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.tags.activities.map((tag) => (
                          <span key={tag} className="rounded-full border px-2.5 py-[3px] text-[11px] font-semibold" style={{ borderColor: 'var(--signal-border)', color: 'var(--signal)', background: 'var(--signal-fill)' }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {entry.tags.goals.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>Goals</p>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.tags.goals.map((tag) => (
                          <span key={tag} className="rounded-full border px-2.5 py-[3px] text-[11px] font-semibold" style={{ borderColor: 'var(--pulse-border)', color: 'var(--pulse)', background: 'var(--pulse-fill)' }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {entry.tags.custom.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.tags.custom.map((tag) => (
                          <span key={tag} className="rounded-full border px-2.5 py-[3px] text-[11px] font-semibold" style={{ borderColor: 'var(--amber-border)', color: 'var(--amber)', background: 'var(--amber-fill)' }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Habits */}
          {cat === 'Habits' && entry.habitItems && (
            <div className="rounded-[12px] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              {entry.habitItems.map((h, i) => (
                <div key={h.label} className="flex items-center justify-between px-3.5 py-2.5" style={{ background: 'var(--surface-2)', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                  <span className="text-[13px]" style={{ color: 'var(--fg)' }}>{h.label}</span>
                  {h.done
                    ? <Check size={14} style={{ color: 'var(--button-secondary-fg)' }} strokeWidth={3} />
                    : <span className="h-3.5 w-3.5 rounded-full" style={{ border: '1.5px solid var(--line)' }} />
                  }
                </div>
              ))}
            </div>
          )}

          {/* Achievement / streak */}
          {cat === 'Achievements' && (
            <div className="rounded-[12px] p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--ember-fill)' }}>
                  <Trophy size={18} style={{ color: 'var(--ember)' }} />
                </span>
                <div>
                  <p className="text-[14px] font-bold" style={{ color: 'var(--fg)' }}>{entry.title}</p>
                  <p className="text-[12px]" style={{ color: 'var(--label)' }}>{entry.milestoneProgress ?? entry.sub}</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer — V1: read-only, no actions. Future: add onEdit / onDelete / onDuplicate / onFavorite / onShare props and render action buttons here. */}
        <div className="pb-8" />
      </div>
    </div>
  )
}

// ─── Add tag sheet ────────────────────────────────────────────────────────────

function AddTagSheet({ open, existingTags, onAdd, onClose }: {
  open: boolean
  existingTags: string[]
  onAdd: (tag: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState('')
  const trimmed = value.trim()
  const isDuplicate = existingTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())
  const canAdd = trimmed.length > 0 && !isDuplicate

  function handleAdd() {
    if (!canAdd) return
    onAdd(trimmed)
    setValue('')
    onClose()
  }

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center"
      style={{ background: 'var(--overlay)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[392px] animate-[slideUp_180ms_ease-out] rounded-t-[24px] border-t px-4 pb-8 pt-3 sm:max-w-[372px]"
        style={{ background: 'var(--surface-1)', borderColor: 'var(--line)', boxShadow: '0 -16px 48px rgba(0,0,0,0.44)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: 'var(--surface-3)' }} />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-bold">New tag</h2>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: 'var(--surface-2)' }} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="flex items-center gap-2 rounded-[12px] border px-3.5 py-2.5" style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            placeholder="Tag name (e.g. Half Guard, Coach Notes)"
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
            style={{ color: 'var(--fg)' }}
            maxLength={32}
          />
          {value.length > 0 && (
            <button type="button" onClick={() => setValue('')} style={{ color: 'var(--label)' }} aria-label="Clear"><X size={14} /></button>
          )}
        </div>
        {isDuplicate && (
          <p className="mt-1.5 text-[11px]" style={{ color: 'var(--amber)' }}>That tag already exists.</p>
        )}
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="mt-4 w-full rounded-[12px] py-3 text-[14px] font-bold"
          style={{
            background: canAdd ? 'var(--vital-fill)' : 'var(--surface-2)',
            color: canAdd ? 'var(--button-secondary-fg)' : 'var(--label)',
            border: `1px solid ${canAdd ? 'var(--vital-border)' : 'var(--line)'}`,
          }}
        >
          Add tag
        </button>
      </div>
    </div>
  )
}

// ─── Timeline feed ────────────────────────────────────────────────────────────

function calendarEntriesToTimeline(entries: Record<string, CalendarEntry[]>): TimelineItem[] {
  const items: TimelineItem[] = []
  for (const [dateISO, dayEntries] of Object.entries(entries)) {
    const d = new Date(dateISO + 'T00:00:00')
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const month = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    for (const entry of dayEntries) {
      if (entry.type === 'Workout') {
        const actMeta = entry.activity ? activityVisual(entry.activity) : null
        const exercises: string[] = entry.workout?.exercises?.flatMap(b => b.items.map(i => `${i.name} · ${i.detail}`)) ?? []
        items.push({
          icon: actMeta?.icon ?? Dumbbell,
          title: entry.label,
          sub: [entry.activity, entry.durationMinutes ? `${entry.durationMinutes} min` : null].filter(Boolean).join(' · '),
          date, month,
          tone: actMeta?.tone ?? 'signal',
          category: 'Workouts',
          workoutActivities: entry.workout?.activities ?? (entry.activity ? [entry.activity] : []),
          workoutDuration: entry.durationMinutes ? `${entry.durationMinutes} min` : undefined,
          exercises: exercises.length ? exercises : undefined,
        })
      } else if (entry.type === 'Weight') {
        items.push({ icon: Clock, title: 'Weight logged', sub: entry.sub ?? '', date, month, tone: 'vital', category: 'Weights' })
      } else if (entry.type === 'Measurement') {
        items.push({ icon: Ruler, title: 'Measurements logged', sub: entry.sub ?? '', date, month, tone: 'pulse', category: 'Measurements' })
      } else if (entry.type === 'Photo') {
        items.push({ icon: Camera, title: entry.label, sub: entry.sub ?? '', date, month, tone: 'ember', category: 'Photos' })
      } else if (entry.type === 'Note' || entry.type === 'Reflection') {
        items.push({ icon: ClipboardList, title: entry.label, sub: entry.sub ?? '', date, month, tone: 'pulse', category: 'Notes', detail: entry.label })
      }
    }
  }
  return items.sort((a, b) => b.date.localeCompare(a.date))
}

function TimelineFeed({ demoMode, userId, calendarEntries, onOpenWorkout, showToast }: { demoMode: boolean; userId: string; calendarEntries: Record<string, CalendarEntry[]>; onOpenWorkout: () => void; showToast: (msg: string) => void }) {
  const [primary, setPrimary] = useState<TimelinePrimary>(() => loadPersisted<TimelinePrimary>(userId, 'timelineFilter', 'All'))
  const [sub, setSub] = useState<string>(() => loadPersisted<string>(userId, 'timelineFilterSub', ''))
  const [detailEntry, setDetailEntry] = useState<TimelineItem | null>(null)
  // Custom tags — persisted to localStorage per user.
  // TODO(supabase): migrate to a user_note_tags table.
  const [customTags, setCustomTags] = useState<string[]>(demoMode ? ['Coach Notes', 'Half Guard'] : [])
  const tagsHydrated = useRef(demoMode)
  const [addTagOpen, setAddTagOpen] = useState(false)
  // Real users start with an empty timeline; sample history is demo-only.
  const realEntries = useMemo(() => calendarEntriesToTimeline(calendarEntries), [calendarEntries])
  const timelineSource = demoMode ? timeline : realEntries

  useEffect(() => {
    if (demoMode) return
    setCustomTags(loadPersisted<string[]>(userId, 'customTags', []))
    tagsHydrated.current = true
  }, [demoMode, userId])

  useEffect(() => {
    if (!tagsHydrated.current || demoMode) return
    savePersisted(userId, 'customTags', customTags)
  }, [customTags, demoMode, userId])

  useEffect(() => { savePersisted(userId, 'timelineFilter', primary) }, [userId, primary])
  useEffect(() => { savePersisted(userId, 'timelineFilterSub', sub) }, [userId, sub])

  function handlePrimary(next: TimelinePrimary) {
    setPrimary(next)
    setSub('')
  }

  // Dynamic Notes sub-filter list: All + Favorites + tags present on notes + user custom tags
  const notesSubOptions = useMemo(() => {
    const fromEntries = new Set<string>()
    timelineSource.forEach((e) => {
      if (e.category !== 'Notes') return
      e.tags?.activities.forEach((t) => fromEntries.add(t))
      e.tags?.goals.forEach((t) => fromEntries.add(t))
      e.tags?.custom.forEach((t) => fromEntries.add(t))
    })
    customTags.forEach((t) => fromEntries.add(t))
    return ['All', 'Favorites', ...Array.from(fromEntries)]
  }, [customTags])

  const subOptions = primary === 'Notes' ? notesSubOptions : (TIMELINE_SUB[primary as Exclude<TimelinePrimary, 'Notes'>] ?? [])

  const visible = timelineSource.filter((event) => matchesPrimary(event, primary) && matchesSub(event, primary, sub))
  const grouped = visible.reduce<Record<string, TimelineItem[]>>((acc, event) => {
    acc[event.month] = [...(acc[event.month] ?? []), event]
    return acc
  }, {})

  const primaryChipStyle = (active: boolean): React.CSSProperties => active
    ? { background: 'var(--vital-fill)', borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)' }
    : { background: 'transparent', borderColor: 'var(--line)', color: 'var(--text-soft)' }

  const subChipStyle = (active: boolean): React.CSSProperties => active
    ? { background: 'var(--signal-fill)', borderColor: 'var(--signal-border)', color: 'var(--signal)' }
    : { background: 'transparent', borderColor: 'var(--line)', color: 'var(--label)' }

  const allTagsForSheet = useMemo(() => {
    const set = new Set<string>()
    timelineSource.forEach((e) => {
      e.tags?.activities.forEach((t) => set.add(t))
      e.tags?.goals.forEach((t) => set.add(t))
      e.tags?.custom.forEach((t) => set.add(t))
    })
    customTags.forEach((t) => set.add(t))
    return Array.from(set)
  }, [customTags])

  return (
    <>
      <p className="mt-5 text-[13px]" style={{ color: 'var(--text-soft)' }}>Everything you&apos;ve logged, newest first.</p>

      {/* Primary filters */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
        {TIMELINE_PRIMARY.map((item) => (
          <button
            key={item}
            onClick={() => handlePrimary(item)}
            className="shrink-0 min-h-[32px] rounded-full border px-4 text-[12px] font-semibold"
            style={primaryChipStyle(primary === item)}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Sub-filters */}
      {subOptions.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {subOptions.map((item) => (
            <button
              key={item}
              onClick={() => setSub(sub === item || item === 'All' ? '' : item)}
              className="shrink-0 min-h-[28px] rounded-full border px-3 text-[11px] font-semibold"
              style={subChipStyle(sub === item && item !== 'All')}
            >
              {item}
            </button>
          ))}
          {/* + Tag — only in Notes */}
          {primary === 'Notes' && (
            <button
              onClick={() => setAddTagOpen(true)}
              className="shrink-0 min-h-[28px] rounded-full border px-3 text-[11px] font-semibold"
              style={{ borderStyle: 'dashed', borderColor: 'var(--line)', color: 'var(--label)', background: 'transparent' }}
            >
              + Tag
            </button>
          )}
        </div>
      )}

      {/* Feed */}
      {visible.length ? Object.entries(grouped).map(([month, events]) => (
        <div key={month}>
          <p className="mt-7 mb-3 text-[11px] font-black uppercase tracking-[0.20em]" style={{ color: 'var(--label)' }}>{month}</p>
          <div className="space-y-2">
            {events.map((event, index) => {
              const previous = events[index - 1]
              const startsNewDay = index > 0 && previous.date !== event.date
              const hasTags = event.tags && (event.tags.activities.length > 0 || event.tags.goals.length > 0 || event.tags.custom.length > 0)
              return (
                <div key={`${event.title}-${event.date}-${index}`}>
                  {startsNewDay && <div className="my-3 h-px" style={{ background: 'var(--line)', opacity: 0.65 }} />}
                  <Card className="p-4 cursor-pointer" onClick={() => setDetailEntry(event)}>
                    <div className="flex min-h-[46px] items-center gap-3">
                      <IconChip icon={event.icon} tone={event.tone} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold" style={{ color: 'var(--fg)' }}>
                          {event.title}
                          {event.favorite && <span className="ml-1.5" style={{ color: 'var(--ember)' }}>★</span>}
                        </p>
                        <p className="truncate text-[13px]" style={{ color: 'var(--text-soft)' }}>{event.sub}</p>
                      </div>
                      <span className="mono shrink-0 text-[12px]" style={{ color: 'var(--label)' }}>{event.date}</span>
                      <ChevronRight size={15} style={{ color: 'var(--label)' }} />
                    </div>
                    {/* Note tags — shown inline on feed row */}
                    {hasTags && (
                      <div className="mt-2 flex flex-wrap gap-1.5 pl-[48px]">
                        {event.tags!.activities.map((tag) => (
                          <span key={tag} className="rounded-full border px-2 py-[2px] text-[10px] font-semibold" style={{ borderColor: 'var(--signal-border)', color: 'var(--signal)', background: 'var(--signal-fill)' }}>{tag}</span>
                        ))}
                        {event.tags!.goals.map((tag) => (
                          <span key={tag} className="rounded-full border px-2 py-[2px] text-[10px] font-semibold" style={{ borderColor: 'var(--pulse-border)', color: 'var(--pulse)', background: 'var(--pulse-fill)' }}>{tag}</span>
                        ))}
                        {event.tags!.custom.map((tag) => (
                          <span key={tag} className="rounded-full border px-2 py-[2px] text-[10px] font-semibold" style={{ borderColor: 'var(--amber-border)', color: 'var(--amber)', background: 'var(--amber-fill)' }}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      )) : timelineSource.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={ClipboardList} title="Your timeline is empty" body="Your logged workouts, notes, meals, and progress will appear here." />
        </div>
      ) : (
        <div className="mt-6 rounded-[14px] border px-4 py-8 text-center" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
          <p className="text-[14px] font-bold" style={{ color: 'var(--fg)' }}>Nothing here yet</p>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--text-soft)' }}>
            No {sub || primary.toLowerCase()} entries to show.
          </p>
        </div>
      )}

      <TimelineDetailSheet
        entry={detailEntry}
        onClose={() => setDetailEntry(null)}
        onOpenWorkout={onOpenWorkout}
        showToast={showToast}
      />

      <AddTagSheet
        open={addTagOpen}
        existingTags={allTagsForSheet}
        onAdd={(tag) => {
          setCustomTags((prev) => [...prev, tag])
          showToast(`Tag "${tag}" added`)
        }}
        onClose={() => setAddTagOpen(false)}
      />
    </>
  )
}

function Timeline({ demoMode, userId, calendarEntries, onOpenWorkout, showToast }: { demoMode: boolean; userId: string; calendarEntries: Record<string, CalendarEntry[]>; onOpenWorkout: () => void; showToast: (msg: string) => void }) {
  return (
    <Page>
      <div className="pt-7">
        <h1 className="text-[24px] font-black leading-tight">Timeline</h1>
        <p className="mt-3 text-[14px]" style={{ color: 'var(--text-soft)' }}>Everything you&apos;ve logged</p>
      </div>
      <TimelineFeed demoMode={demoMode} userId={userId} calendarEntries={calendarEntries} onOpenWorkout={onOpenWorkout} showToast={showToast} />
    </Page>
  )
}

// ─── Ranked Overview ────────────────────────────────────────────────────────
//
// Architecture:
//   GOAL_METRICS       — which metric keys matter for each goal
//   ACTIVITY_MOCK_DATA — mock metric observations per activity
//                        (swap individual values for real Supabase/Oura queries later)
//   rankActivities()   — pure scoring function; weights primary > secondary > tertiary
//
// To connect real data: replace ACTIVITY_MOCK_DATA[activity][metricKey].score with
// a value derived from oura_daily_data, workout logs, or bodyweight rows.

type MetricKey =
  | 'readiness' | 'hrv' | 'restingHR' | 'sleepDuration' | 'sleepQuality'
  | 'steps' | 'activityCalories' | 'activityConsistency'
  | 'strengthSessions' | 'mobilityFrequency' | 'trainingFrequency'
  | 'weightTrend'

// Which metric keys matter for each goal (ordered: most important first)
const GOAL_METRICS: Record<Goal, MetricKey[]> = {
  'Recovery':       ['readiness', 'hrv', 'restingHR', 'sleepDuration'],
  'General Health': ['steps', 'sleepDuration', 'restingHR', 'activityConsistency'],
  'Mobility':       ['readiness', 'hrv', 'mobilityFrequency'],
  'Weight Loss':    ['weightTrend', 'steps', 'activityCalories', 'sleepQuality'],
  'Strength':       ['strengthSessions', 'readiness', 'sleepDuration'],
  'Performance':    ['readiness', 'hrv', 'sleepQuality', 'trainingFrequency'],
  'Muscle Gain':    ['strengthSessions', 'sleepDuration', 'readiness'],
  'Endurance':      ['trainingFrequency', 'readiness', 'hrv', 'restingHR'],
}

type MetricObservation = {
  label: string           // display label
  value: string           // display value (mock or real)
  valence: 'positive' | 'negative' | 'neutral'
  score: number           // 0–100; used for ranking. Replace with real data later.
}

// Mock observations per activity per metric key.
// score represents how much this activity helps that metric (higher = better for goal).
// value/valence are display strings — update these when connecting real data.
const ACTIVITY_MOCK_DATA: Record<string, Partial<Record<MetricKey, MetricObservation>>> = {
  Swimming: {
    readiness:         { label: 'Readiness',       value: '+5 pts',   valence: 'positive', score: 80 },
    hrv:               { label: 'HRV',             value: '+12%',     valence: 'positive', score: 85 },
    restingHR:         { label: 'Resting HR',      value: '-2 bpm',   valence: 'positive', score: 75 },
    sleepDuration:     { label: 'Sleep duration',  value: '+1h 12m',  valence: 'positive', score: 90 },
    sleepQuality:      { label: 'Sleep quality',   value: 'Higher',   valence: 'positive', score: 80 },
    steps:             { label: 'Steps',            value: '+1.2k',   valence: 'positive', score: 50 },
    activityCalories:  { label: 'Active calories', value: '+320 avg', valence: 'positive', score: 75 },
    activityConsistency: { label: 'Consistency',   value: '2×/wk',   valence: 'positive', score: 70 },
    weightTrend:       { label: 'Weight trend',    value: '-1.1 lb/wk', valence: 'positive', score: 72 },
    trainingFrequency: { label: 'Training freq',   value: '2×/wk',   valence: 'positive', score: 65 },
  },
  Weightlifting: {
    strengthSessions:  { label: 'Strength sessions', value: '+12 this month', valence: 'positive', score: 95 },
    readiness:         { label: 'Readiness',          value: '-2 pts day 1',  valence: 'negative', score: 40 },
    sleepDuration:     { label: 'Sleep (back days)',  value: '+20 min',       valence: 'positive', score: 60 },
    hrv:               { label: 'HRV day 1',          value: '-8%',           valence: 'negative', score: 30 },
    restingHR:         { label: 'RHR after heavy',    value: '+3 bpm',        valence: 'negative', score: 30 },
    activityCalories:  { label: 'Active calories',    value: '+280 avg',      valence: 'positive', score: 65 },
    trainingFrequency: { label: 'Training freq',      value: '3×/wk',        valence: 'positive', score: 80 },
    weightTrend:       { label: 'Weight trend',       value: 'Stable',        valence: 'neutral',  score: 45 },
  },
  BJJ: {
    readiness:         { label: 'Readiness next day', value: '-4 pts',  valence: 'negative', score: 35 },
    hrv:               { label: 'HRV',                value: '-6%',     valence: 'negative', score: 30 },
    restingHR:         { label: 'Resting HR',         value: '+2 bpm',  valence: 'negative', score: 30 },
    sleepDuration:     { label: 'Deep sleep',         value: '+14%',    valence: 'positive', score: 75 },
    sleepQuality:      { label: 'Sleep quality',      value: 'Higher',  valence: 'positive', score: 70 },
    trainingFrequency: { label: 'Training freq',      value: '2×/wk',  valence: 'positive', score: 70 },
    activityCalories:  { label: 'Active calories',    value: '+380 avg', valence: 'positive', score: 72 },
    activityConsistency: { label: 'Consistency',      value: '2×/wk',  valence: 'positive', score: 65 },
  },
  Kickboxing: {
    sleepDuration:     { label: 'Sleep duration',  value: '+45 min',  valence: 'positive', score: 72 },
    hrv:               { label: 'HRV',             value: '+9%',      valence: 'positive', score: 75 },
    sleepQuality:      { label: 'Sleep onset',     value: 'Earlier',  valence: 'positive', score: 70 },
    readiness:         { label: 'Readiness',       value: '+3 pts',   valence: 'positive', score: 65 },
    restingHR:         { label: 'Resting HR',      value: '-2 bpm',   valence: 'positive', score: 68 },
    activityCalories:  { label: 'Active calories', value: '+410 avg', valence: 'positive', score: 80 },
    trainingFrequency: { label: 'Training freq',   value: '1–2×/wk', valence: 'positive', score: 60 },
    weightTrend:       { label: 'Weight trend',    value: '-0.8 lb/wk', valence: 'positive', score: 65 },
  },
  Running: {
    steps:             { label: 'Steps',            value: '+8k avg',   valence: 'positive', score: 90 },
    activityCalories:  { label: 'Active calories',  value: '+450 avg',  valence: 'positive', score: 85 },
    restingHR:         { label: 'Resting HR',       value: '-3 bpm',    valence: 'positive', score: 78 },
    weightTrend:       { label: 'Weight trend',     value: '-1.3 lb/wk', valence: 'positive', score: 78 },
    trainingFrequency: { label: 'Training freq',    value: '3×/wk',    valence: 'positive', score: 75 },
    sleepDuration:     { label: 'Sleep duration',   value: '+30 min',   valence: 'positive', score: 65 },
    hrv:               { label: 'HRV',              value: '+6%',       valence: 'positive', score: 68 },
    readiness:         { label: 'Readiness',        value: '+2 pts',    valence: 'positive', score: 60 },
  },
  Mobility: {
    readiness:         { label: 'Readiness',        value: '+8 pts',  valence: 'positive', score: 88 },
    hrv:               { label: 'HRV',              value: '+6%',     valence: 'positive', score: 72 },
    restingHR:         { label: 'Resting HR',       value: '-3 bpm',  valence: 'positive', score: 70 },
    mobilityFrequency: { label: 'Mobility sessions', value: '+4/mo', valence: 'positive', score: 95 },
    sleepQuality:      { label: 'Sleep quality',    value: 'Higher',  valence: 'positive', score: 65 },
    sleepDuration:     { label: 'Sleep duration',   value: '+15 min', valence: 'positive', score: 55 },
    activityConsistency: { label: 'Consistency',    value: '2×/wk',  valence: 'positive', score: 70 },
  },
  Walking: {
    steps:             { label: 'Steps',            value: '+6k avg',  valence: 'positive', score: 88 },
    weightTrend:       { label: 'Weight trend',     value: '-0.9 lb/wk', valence: 'positive', score: 65 },
    restingHR:         { label: 'Resting HR',       value: '-1 bpm',   valence: 'positive', score: 55 },
    activityCalories:  { label: 'Active calories',  value: '+180 avg', valence: 'positive', score: 60 },
    activityConsistency: { label: 'Consistency',    value: 'Daily',    valence: 'positive', score: 85 },
    sleepDuration:     { label: 'Sleep duration',   value: '+12 min',  valence: 'positive', score: 50 },
    sleepQuality:      { label: 'Sleep quality',    value: 'Slightly higher', valence: 'positive', score: 48 },
  },
}

// Goal weights: primary carries 3×, secondary 2×, tertiary 1×.
// Returns sorted list of { activity, totalScore, bestFor, topMetrics } for the given userActivities.
// Replace .score fields in ACTIVITY_MOCK_DATA to connect real data.
function rankActivities(
  userActivities: string[],
  focusGoals: Goal[],
): { activity: string; totalScore: number; bestFor: Goal[]; topMetrics: MetricObservation[] }[] {
  const weights = [3, 2, 1] as const
  const activeGoals = focusGoals.slice(0, 3)

  return userActivities
    .map((activity) => {
      const data = ACTIVITY_MOCK_DATA[activity] ?? {}
      let totalScore = 0
      const goalContributions: { goal: Goal; contribution: number }[] = []

      activeGoals.forEach((goal, i) => {
        const w = weights[i] ?? 1
        const keys = GOAL_METRICS[goal] ?? []
        const contribution = keys.reduce((sum, key) => sum + (data[key]?.score ?? 0), 0) * w
        goalContributions.push({ goal, contribution })
        totalScore += contribution
      })

      // bestFor: goals where this activity's weighted contribution is meaningfully high (>= 60 per key avg)
      const bestFor = goalContributions
        .filter(({ goal, contribution }) => {
          const keys = GOAL_METRICS[goal] ?? []
          return keys.length > 0 && contribution / (keys.length * (weights[activeGoals.indexOf(goal)] ?? 1)) >= 60
        })
        .map(({ goal }) => goal)

      // topMetrics: pick the 3 highest-scoring metric observations for display
      const topMetrics = Object.values(data)
        .filter((m): m is MetricObservation => m !== undefined)
        .sort((a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50)) // most impactful first
        .slice(0, 3)

      return { activity, totalScore, bestFor, topMetrics }
    })
    .sort((a, b) => b.totalScore - a.totalScore)
}

type RankedActivity = {
  rank: number
  activity: string
  bestFor: Goal[]
  metrics: MetricObservation[]
}

function RankedOverview({ focusGoals, activities }: { focusGoals: Goal[]; activities: string[] }) {
  const metricColor = (valence: MetricObservation['valence']) =>
    valence === 'positive' ? 'var(--button-secondary-fg)' : valence === 'negative' ? 'var(--amber)' : 'var(--label)'

  const ranked: RankedActivity[] = rankActivities(activities, focusGoals)
    .slice(0, 3)
    .map((r, i) => ({ rank: i + 1, activity: r.activity, bestFor: r.bestFor, metrics: r.topMetrics }))

  const goalLabel = focusGoals.slice(0, 3).join(' · ')

  if (ranked.length === 0) return null

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-[14px] font-bold" style={{ color: 'var(--fg)' }}>Ranked for your goals</p>
        <p className="shrink-0 text-[11px]" style={{ color: 'var(--label)' }}>{goalLabel}</p>
      </div>

      <div className="space-y-2">
        {ranked.map((item) => (
          <div
            key={item.activity}
            className="flex gap-3 rounded-[12px] px-3.5 py-3"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
          >
            {/* Rank badge */}
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black"
              style={{ background: 'var(--vital-fill)', color: 'var(--button-secondary-fg)', marginTop: '1px' }}
            >
              {item.rank}
            </span>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[13px] font-bold" style={{ color: 'var(--fg)' }}>{item.activity}</p>
                {item.bestFor.length > 0 && (
                  <p className="shrink-0 text-[11px]" style={{ color: 'var(--label)' }}>{item.bestFor.join(' + ')}</p>
                )}
              </div>
              <div className="mt-1.5 flex flex-col gap-1">
                {item.metrics.map((m) => (
                  <div key={m.label} className="flex items-baseline justify-between gap-2">
                    <span className="text-[11px]" style={{ color: 'var(--text-soft)' }}>{m.label}</span>
                    <span className="shrink-0 text-[11px] font-semibold" style={{ color: metricColor(m.valence) }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px]" style={{ color: 'var(--label)' }}>Based on your selected activities · last 10 weeks</p>
    </div>
  )
}

// ─── Detailed Insights ───────────────────────────────────────────────────────

const STATIC_INSIGHTS: Insight[] = [
  {
    id: 'swim-sleep',
    activity: 'Swimming',
    category: 'Sleep',
    title: 'Swimming days are associated with 1.2 more hours of sleep.',
    summary: 'On days with swimming logged, total sleep duration trends higher the following night.',
    metricComparison: 'Swim days 8h 12m vs non-swim days 7h 01m',
    confidence: 'Medium',
    sampleSize: '6 swim sessions',
    relatedActivities: ['Swimming'],
    dateRange: 'Last 10 weeks',
    status: 'new',
    impactMetrics: [
      { label: 'Sleep duration', value: '+1h 12m', direction: 'up',   valence: 'positive' },
      { label: 'HRV',            value: '+12%',    direction: 'up',   valence: 'positive' },
      { label: 'Readiness',      value: '+5 pts',  direction: 'up',   valence: 'positive' },
      { label: 'Resting HR',     value: '-2 bpm',  direction: 'down', valence: 'positive' },
    ],
  },
  {
    id: 'bjj-deep-sleep',
    activity: 'BJJ',
    category: 'Recovery',
    title: 'BJJ days may increase deep sleep.',
    summary: 'BJJ sessions appear to be followed by slightly higher deep sleep duration, but also higher next-day recovery demand.',
    metricComparison: 'Deep sleep +14% after BJJ days',
    confidence: 'Low',
    sampleSize: '8 BJJ sessions',
    relatedActivities: ['BJJ'],
    dateRange: 'Last 10 weeks',
    status: 'new',
    impactMetrics: [
      { label: 'Deep sleep',  value: '+14%',   direction: 'up',   valence: 'positive' },
      { label: 'Readiness',   value: '-4 pts', direction: 'down', valence: 'negative' },
      { label: 'Resting HR',  value: '+2 bpm', direction: 'up',   valence: 'negative' },
      { label: 'HRV',         value: '-6%',    direction: 'down', valence: 'negative' },
    ],
  },
  {
    id: 'steps-weight',
    activity: 'Walking',
    category: 'Bodyweight',
    title: 'Higher step weeks align with faster weight loss.',
    summary: 'Weeks averaging above 8,000 steps per day appear to align with stronger bodyweight drops.',
    metricComparison: '-1.4 lb / week vs -0.6 lb / week',
    confidence: 'Medium',
    sampleSize: '4 high-step weeks',
    relatedActivities: ['Walking', 'Daily activity'],
    dateRange: 'Last 10 weeks',
    status: 'new',
    impactMetrics: [
      { label: 'Weight loss rate', value: '-1.4 lb/wk', direction: 'down', valence: 'positive' },
      { label: 'Readiness',        value: '+3 pts',      direction: 'up',   valence: 'positive' },
      { label: 'Sleep duration',   value: '+22 min',     direction: 'up',   valence: 'positive' },
    ],
  },
  {
    id: 'mobility-readiness',
    activity: 'Mobility',
    category: 'Training',
    title: 'Mobility sessions correlate with higher readiness scores.',
    summary: 'Days following a mobility session show a consistent uptick in Oura readiness, suggesting lower systemic stress.',
    metricComparison: 'Readiness +8 pts after mobility days',
    confidence: 'Medium',
    sampleSize: '11 mobility sessions',
    relatedActivities: ['Mobility'],
    dateRange: 'Last 10 weeks',
    status: 'saved',
    impactMetrics: [
      { label: 'Readiness',   value: '+8 pts', direction: 'up',   valence: 'positive' },
      { label: 'HRV',         value: '+6%',    direction: 'up',   valence: 'positive' },
      { label: 'Resting HR',  value: '-3 bpm', direction: 'down', valence: 'positive' },
    ],
  },
  {
    id: 'kickboxing-sleep',
    activity: 'Kickboxing',
    category: 'Sleep',
    title: 'Kickboxing evenings are linked to earlier sleep onset.',
    summary: 'Sessions logged in the evening correlate with faster sleep onset the same night and slightly longer total sleep.',
    metricComparison: 'Sleep +45 min vs non-kickboxing nights',
    confidence: 'Low',
    sampleSize: '7 kickboxing sessions',
    relatedActivities: ['Kickboxing'],
    dateRange: 'Last 10 weeks',
    status: 'new',
    impactMetrics: [
      { label: 'Sleep duration', value: '+45 min', direction: 'up',   valence: 'positive' },
      { label: 'HRV',            value: '+9%',     direction: 'up',   valence: 'positive' },
      { label: 'Resting HR',     value: '-2 bpm',  direction: 'down', valence: 'positive' },
    ],
  },
  {
    id: 'weightlifting-recovery',
    activity: 'Weightlifting',
    category: 'Recovery',
    title: 'Heavy lifting days carry a next-day recovery cost.',
    summary: 'Strength sessions show a consistent next-day dip in HRV and readiness, with recovery returning to baseline by day two.',
    metricComparison: 'Readiness -6 pts the day after lifting',
    confidence: 'Medium',
    sampleSize: '14 lifting sessions',
    relatedActivities: ['Weightlifting'],
    dateRange: 'Last 10 weeks',
    status: 'saved',
    impactMetrics: [
      { label: 'Readiness (day 1)',  value: '-6 pts', direction: 'down', valence: 'negative' },
      { label: 'HRV (day 1)',        value: '-8%',    direction: 'down', valence: 'negative' },
      { label: 'Resting HR (day 1)', value: '+3 bpm', direction: 'up',   valence: 'negative' },
      { label: 'Readiness (day 2)',  value: '+4 pts', direction: 'up',   valence: 'positive' },
    ],
  },
]

const INSIGHT_CATEGORY_STYLE: Record<InsightCategory, { color: string; fill: string }> = {
  Sleep:      { color: 'var(--pulse)',  fill: 'var(--pulse-fill)'  },
  Recovery:   { color: 'var(--vital)',  fill: 'var(--vital-fill)'  },
  Training:   { color: 'var(--signal)', fill: 'var(--signal-fill)' },
  Bodyweight: { color: 'var(--amber)',  fill: 'var(--amber-fill)'  },
}

const INSIGHT_CONFIDENCE_STYLE: Record<InsightConfidence, { color: string; fill: string }> = {
  High:   { color: 'var(--vital)',  fill: 'var(--vital-fill)'  },
  Medium: { color: 'var(--signal)', fill: 'var(--signal-fill)' },
  Low:    { color: 'var(--amber)',  fill: 'var(--amber-fill)'  },
}

function InsightImpactProfile({ insight }: { insight: Insight }) {
  const metricColor = (valence: InsightMetric['valence']) =>
    valence === 'positive' ? 'var(--button-secondary-fg)' : valence === 'negative' ? 'var(--amber)' : 'var(--label)'

  return (
    <div>
      <p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>
        After {insight.relatedActivities[0]} sessions
      </p>
      <div className="rounded-[10px]" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
        {insight.impactMetrics.map((metric, i) => (
          <div
            key={metric.label}
            className="flex items-center justify-between px-3 py-2.5"
            style={{ borderTop: i ? '1px solid var(--line)' : 'none' }}
          >
            <span className="text-[13px]" style={{ color: 'var(--text-soft)' }}>{metric.label}</span>
            <span className="mono flex items-center gap-1 text-[13px] font-bold" style={{ color: metricColor(metric.valence) }}>
              <span className="text-[10px]">{metric.direction === 'up' ? '↑' : '↓'}</span>
              {metric.value}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[11px]" style={{ color: 'var(--label)' }}>
        {insight.sampleSize} · {insight.dateRange}
      </p>
    </div>
  )
}

const INSIGHT_ACTIVITIES = ['All', 'Swimming', 'BJJ', 'Weightlifting', 'Mobility', 'Kickboxing', 'Walking'] as const
type InsightActivityFilter = typeof INSIGHT_ACTIVITIES[number]

function Insights({ demoMode, focusGoals, activities }: { demoMode: boolean; focusGoals: Goal[]; activities: string[] }) {
  const [categoryFilter, setCategoryFilter] = useState<InsightCategory | 'All'>('All')
  const [activityFilter, setActivityFilter] = useState<InsightActivityFilter>('All')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const categories: (InsightCategory | 'All')[] = ['All', 'Sleep', 'Recovery', 'Training', 'Bodyweight']
  const newCount = STATIC_INSIGHTS.filter((i) => i.status === 'new').length

  const filtered = STATIC_INSIGHTS.filter((i) => {
    const catMatch = categoryFilter === 'All' || i.category === categoryFilter
    const actMatch = activityFilter === 'All' || i.activity === activityFilter
    return catMatch && actMatch
  })

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <Page>
      <Title title="Insights" sub="Patterns discovered from your workouts, recovery, and body metrics." />

      {!demoMode ? (
        <div className="mt-4">
          <EmptyState icon={TrendingUp} title="No insights yet" body="Insights appear after you log enough workouts and recovery data." tone="vital" />
        </div>
      ) : (
      <>
      {/* Summary banner */}
      <div className="mt-4 flex items-center gap-3 rounded-[12px] px-4 py-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]" style={{ background: 'var(--vital-fill)' }}>
          <TrendingUp size={16} style={{ color: 'var(--button-secondary-fg)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold" style={{ color: 'var(--button-secondary-fg)' }}>{newCount} new findings</p>
          <p className="text-[11px]" style={{ color: 'var(--label)' }}>Analysed across last 10 weeks · Jun 2026</p>
        </div>
      </div>

      <RankedOverview focusGoals={focusGoals} activities={activities} />

      {/* Divider */}
      <div className="mt-5 border-t" style={{ borderColor: 'var(--line)' }} />

      {/* Category filter */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
        {categories.map((cat) => {
          const isActive = categoryFilter === cat
          const s = cat !== 'All' ? INSIGHT_CATEGORY_STYLE[cat as InsightCategory] : null
          return (
            <button key={cat} type="button" onClick={() => setCategoryFilter(cat)}
              className="shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-bold"
              style={isActive
                ? { background: s?.fill ?? 'var(--vital-fill)', borderColor: s?.color ?? 'var(--button-secondary-fg)', color: s?.color ?? 'var(--button-secondary-fg)' }
                : { background: 'transparent', borderColor: 'var(--line)', color: 'var(--label)' }
              }>
              {cat}
            </button>
          )
        })}
      </div>

      {/* Activity filter */}
      <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
        {INSIGHT_ACTIVITIES.map((act) => {
          const isActive = activityFilter === act
          return (
            <button key={act} type="button" onClick={() => setActivityFilter(act)}
              className="shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-bold"
              style={isActive
                ? { background: 'var(--signal-fill)', borderColor: 'var(--signal)', color: 'var(--signal)' }
                : { background: 'transparent', borderColor: 'var(--line)', color: 'var(--label)' }
              }>
              {act}
            </button>
          )
        })}
      </div>

      {/* Insight cards */}
      <div className="mt-3 space-y-3 pb-2">
        {filtered.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-[13px]" style={{ color: 'var(--text-soft)' }}>
              No findings for {activityFilter !== 'All' ? activityFilter : categoryFilter} yet.
            </p>
          </Card>
        ) : filtered.map((insight) => {
          const cat = INSIGHT_CATEGORY_STYLE[insight.category]
          const conf = INSIGHT_CONFIDENCE_STYLE[insight.confidence]
          const expanded = expandedIds.has(insight.id)
          return (
            <Card key={insight.id} className="p-4">
              {/* Category pill + New badge */}
              <div className="flex items-center gap-2">
                <span className="rounded-full px-2.5 py-[3px] text-[10px] font-bold" style={{ background: cat.fill, color: cat.color }}>
                  {insight.category}
                </span>
                {insight.status === 'new' && (
                  <span className="rounded-full px-2 py-[2px] text-[9px] font-black uppercase tracking-wide" style={{ background: 'var(--vital-fill)', color: 'var(--button-secondary-fg)' }}>
                    New
                  </span>
                )}
              </div>

              {/* Title */}
              <p className="mt-3 text-[15px] font-semibold leading-snug" style={{ color: 'var(--fg)' }}>{insight.title}</p>

              {/* Summary */}
              <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>{insight.summary}</p>

              {/* Collapsed metadata */}
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className="rounded-full px-2.5 py-[3px] text-[10px] font-semibold" style={{ background: conf.fill, color: conf.color }}>
                  {insight.confidence} confidence
                </span>
                <span className="text-[11px]" style={{ color: 'var(--label)' }}>{insight.sampleSize}</span>
                <span aria-hidden className="text-[11px]" style={{ color: 'var(--line)' }}>·</span>
                <span className="text-[11px]" style={{ color: 'var(--label)' }}>{insight.relatedActivities.join(', ')}</span>
              </div>

              {/* View impact toggle */}
              <button
                type="button"
                onClick={() => toggleExpanded(insight.id)}
                className="mt-3 flex w-full items-center justify-between border-t pt-3 text-left"
                style={{ borderColor: 'var(--line)' }}
              >
                <span className="text-[12px] font-semibold" style={{ color: 'var(--label)' }}>
                  {expanded ? 'Hide impact' : 'View impact'}
                </span>
                <ChevronDown
                  size={14}
                  style={{
                    color: 'var(--label)',
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </button>

              {expanded && (
                <div className="mt-3">
                  <InsightImpactProfile insight={insight} />
                </div>
              )}
            </Card>
          )
        })}
      </div>
      </>
      )}
    </Page>
  )
}

function Progress({ shownMeasurements }: { shownMeasurements: string[] }) {
  return (
    <Page>
      <Title title="Progress" sub="Measurements & trends over time" />
      <Card className="grid grid-cols-3 gap-2 p-3 text-center">
        <MetricMini value="33" label="Workouts" tone="white" />
        <MetricMini value="▼9.8" label="Lb - 10 wks" tone="vital" />
        <MetricMini value="▼2.6%" label="Body fat" tone="vital" />
      </Card>
      <Card className="mt-4 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px]" style={{ color: 'var(--text-soft)' }}>Body weight</p>
            <p className="mono text-[30px] font-black">148.2 <span className="text-[13px] font-medium" style={{ color: 'var(--label)' }}>lb</span></p>
          </div>
          <Pill tone="vital">▼ 9.8 lb - 10 wks</Pill>
        </div>
        <svg viewBox="0 0 312 130" className="mt-3 h-[130px] w-full">
          <defs>
            <linearGradient id="somaProgressOverview" x1="8" y1="30" x2="304" y2="85" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="var(--vital)" />
              <stop offset="52%" stopColor="var(--signal)" />
              <stop offset="100%" stopColor="var(--pulse)" />
            </linearGradient>
          </defs>
          <path d="M8 30 L70 45 L105 51 L140 60 L175 68 L222 76 L304 85 L304 125 L8 125 Z" fill="url(#somaProgressOverview)" opacity="0.16" />
          <path d="M8 30 L70 45 L105 51 L140 60 L175 68 L222 76 L304 85" fill="none" stroke="url(#somaProgressOverview)" strokeWidth="2.5" />
          <text x="0" y="125" fill="var(--label)" fontSize="11">Apr 5</text>
          <text x="268" y="125" fill="var(--label)" fontSize="11">Jun 14</text>
        </svg>
      </Card>
      <Section title="Measurements" right="vs last" />
      <div className="grid grid-cols-2 gap-2">
        {shownMeasurements.map((label) => {
          const item = measurementData[label]
          return item ? <MeasureCard key={label} label={label} value={item.value} unit={item.unit} delta={item.delta} /> : null
        })}
      </div>
      <Section title="History" />
      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-[minmax(132px,1fr)_64px_60px] gap-3 px-5 pb-3 pt-4 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>
          <span>Date</span><span className="text-right">Weight</span><span className="text-right">Body fat</span>
        </div>
        {progressHistory.map((row, index) => (
          <div key={row.date} className="grid grid-cols-[minmax(132px,1fr)_64px_60px] gap-3 px-5 py-3.5 text-[13px] font-medium" style={{ borderTop: index ? '1px solid var(--line)' : 'none' }}>
            <span>{row.date}</span>
            <span className="mono text-right font-semibold">{row.weight}</span>
            <span className="mono text-right font-semibold">{row.bodyFat}</span>
          </div>
        ))}
      </Card>
    </Page>
  )
}

function InsightsPreviewCard({ onInsights }: { onInsights: () => void }) {
  return (
    <button
      type="button"
      onClick={onInsights}
      className="relative mt-4 w-full overflow-hidden rounded-[14px] border text-left"
      style={{ background: 'var(--surface-1)', borderColor: 'var(--signal-border)' }}
    >
      <div className="relative px-4 pb-4 pt-[15px]">
        {/* Header row */}
        <div className="flex items-baseline justify-between gap-2">
          {/* SOMA aurora gradient on the label text */}
          <span
            className="text-[10px] font-black uppercase tracking-[0.2em]"
            style={{
              background: 'var(--aurora)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Insights
          </span>
          {/* Discovery notification — teal accent */}
          <span className="text-[11px] font-bold" style={{ color: 'var(--button-secondary-fg)' }}>3 new findings</span>
        </div>

        {/* Featured finding with left accent line */}
        <div className="mt-3 flex items-start gap-3">
          <div
            aria-hidden
            className="mt-[3px] w-[3px] shrink-0 self-stretch rounded-full"
            style={{ background: 'var(--aurora)', minHeight: '40px' }}
          />
          <p className="text-[15px] font-semibold leading-snug" style={{ color: 'var(--fg)' }}>
            Swimming days are associated with 1.2 more hours of sleep.
          </p>
        </div>

        {/* Footer CTA */}
        <div className="mt-4 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--line)' }}>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--button-secondary-fg)' }}>View all insights</span>
          <ChevronRight size={14} style={{ color: 'var(--button-secondary-fg)' }} />
        </div>
      </div>
    </button>
  )
}

function ProgressPersonal({ demoMode, shownMeasurements, focusGoals, activities, calendarEntries, measurementLogs, onLogWeight, onAddMeasurement, onViewMeasurements, onInsights }: { demoMode: boolean; shownMeasurements: string[]; focusGoals: Goal[]; activities: string[]; calendarEntries: Record<string, CalendarEntry[]>; measurementLogs: MeasurementLog[]; onLogWeight: () => void; onAddMeasurement: () => void; onViewMeasurements: () => void; onInsights: () => void }) {
  const primaryGoal = focusGoals[0] ?? 'Weight Loss'
  const primaryActivityMetric = activities[0] && progressMetricData[`${activities[0]} sessions`] ? `${activities[0]} sessions` : 'Total training time'
  const defaultMetric = primaryGoal === 'Strength'
    ? 'Strength sessions'
    : primaryGoal === 'Mobility' || primaryGoal === 'Recovery'
      ? 'Mobility minutes'
      : primaryGoal === 'Performance' || primaryGoal === 'Endurance'
        ? primaryActivityMetric
        : primaryGoal === 'General Health'
          ? 'Consistency'
          : 'Body weight'
  const metricOptions = Array.from(new Set([
    defaultMetric,
    'Body weight',
    'Body fat',
    'Waist',
    'Hips',
    'Strength sessions',
    'Swimming sessions',
    'Kickboxing sessions',
    'BJJ sessions',
    'Mobility minutes',
    'Total training time',
    'Consistency',
  ].filter((metric) => progressMetricData[metric])))
  const [selectedMetric, setSelectedMetric] = useState(metricOptions.includes(defaultMetric) ? defaultMetric : metricOptions[0] ?? 'Body weight')
  const [metricMenuOpen, setMetricMenuOpen] = useState(false)
  useEffect(() => {
    setSelectedMetric(metricOptions.includes(defaultMetric) ? defaultMetric : metricOptions[0] ?? 'Body weight')
  }, [defaultMetric])
  const metric = progressMetricData[selectedMetric] ?? progressMetricData['Body weight']
  const metricDeltaGlyph = /^[^\d+.-]/.test(metric.delta.trim()) ? '▼' : ''
  const metricDeltaText = metric.delta.replace(/^[^\d+.-]+\s*/, '')
  const preferredActivities = primaryGoal === 'Weight Loss'
    ? ['Weightlifting', 'Swimming', 'Kickboxing', 'BJJ', 'Mobility']
    : primaryGoal === 'Strength'
      ? ['Weightlifting', 'BJJ', 'Kickboxing', 'Mobility']
      : primaryGoal === 'Mobility' || primaryGoal === 'Recovery'
        ? ['Mobility', 'Walking', 'Swimming', 'BJJ']
        : primaryGoal === 'Performance'
          ? activities
          : activities
  const monthActivities = Array.from(new Set([...preferredActivities, ...activities])).filter((activity) => activitySummary[activity]).slice(0, 5)
  const totalSessions = monthActivities.reduce((sum, activity) => sum + activitySummary[activity].sessions, 0)
  const consistency = primaryGoal === 'Weight Loss' ? '100%' : '89%'

  const thisMonthPrefix = useMemo(() => getLocalDateISO().slice(0, 7), [])
  const realActivityCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    Object.entries(calendarEntries).forEach(([dateKey, entries]) => {
      if (!dateKey.startsWith(thisMonthPrefix)) return
      entries.forEach(entry => {
        if (entry.type === 'Workout' && entry.activity) {
          counts[entry.activity] = (counts[entry.activity] ?? 0) + 1
        }
      })
    })
    return counts
  }, [calendarEntries, thisMonthPrefix])
  const realTotalSessions = useMemo(() => Object.values(realActivityCounts).reduce((s, n) => s + n, 0), [realActivityCounts])
  const realWeightHistory = useMemo(() => {
    return measurementLogs
      .filter(log => log.values['Body weight'])
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6)
  }, [measurementLogs])
  const latestMeasurements = useMemo(() => {
    const latest: Record<string, { value: string; unit: string }> = {}
    const sorted = [...measurementLogs].sort((a, b) => b.date.localeCompare(a.date))
    for (const log of sorted) {
      for (const [label, raw] of Object.entries(log.values)) {
        if (!latest[label]) {
          const m = raw.match(/^([\d.]+)\s*(.*)$/)
          latest[label] = { value: m?.[1] ?? raw, unit: m?.[2]?.trim() ?? '' }
        }
      }
    }
    return latest
  }, [measurementLogs])
  // All user-selected activities, ordered, plus any activity logged this month not in the list.
  const thisMonthRows = useMemo((): [string, number][] => {
    const extras = Object.keys(realActivityCounts).filter(a => !activities.includes(a))
    return [...activities, ...extras].map(a => [a, realActivityCounts[a] ?? 0])
  }, [activities, realActivityCounts])

  const insightText = useMemo(() => {
    const firstActivity = Object.keys(realActivityCounts)[0]
    const latestWeight = realWeightHistory[0]
      ? (() => { const m = (realWeightHistory[0].values['Body weight'] ?? '').match(/^([\d.]+)\s*(.*)$/); return m ? `${m[1]} ${m[2].trim()}`.trim() : '' })()
      : ''
    if (realTotalSessions === 0 && !latestWeight && Object.keys(latestMeasurements).length === 0)
      return 'Start logging workouts, weight, or measurements to unlock trends.'
    if (realTotalSessions === 1 && firstActivity)
      return `You logged your first ${firstActivity} session. Keep going.`
    if (realTotalSessions === 1)
      return 'You logged your first workout. Keep going.'
    if (realTotalSessions > 1 && latestWeight)
      return `Latest weight: ${latestWeight}. You've logged ${realTotalSessions} sessions this month.`
    if (realTotalSessions > 1)
      return `You've logged ${realTotalSessions} sessions this month. Keep it up.`
    if (latestWeight)
      return `Latest weight: ${latestWeight}. Log your first workout to start tracking activity trends.`
    return 'Log workouts and weight to start seeing trends.'
  }, [realTotalSessions, realActivityCounts, realWeightHistory, latestMeasurements])

  return (
    <Page>
      <Title title="Progress" sub="Am I improving?" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onLogWeight} className="flex min-h-[46px] items-center justify-center gap-2 rounded-[12px] text-[13px] font-bold" style={{ background: 'var(--button-primary-surface)', color: 'var(--on-accent)', boxShadow: 'var(--button-primary-shadow)' }}>
          <Scale size={16} /> Log Weight
        </button>
        <button type="button" onClick={onAddMeasurement} className="flex min-h-[46px] items-center justify-center gap-2 rounded-[12px] border text-[13px] font-bold" style={{ background: 'var(--button-secondary-surface)', borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)', boxShadow: 'var(--button-secondary-shadow)' }}>
          <Ruler size={16} /> Add Measurement
        </button>
        <button type="button" onClick={onViewMeasurements} className="col-span-2 flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] border text-[13px] font-semibold" style={{ background: 'var(--button-secondary-surface)', borderColor: 'var(--line)', color: 'var(--fg)', boxShadow: 'var(--button-secondary-shadow)' }}>
          <CalendarDays size={15} /> View Measurement History
        </button>
      </div>
      {demoMode ? (
      <>
      <InsightsPreviewCard onInsights={onInsights} />
      <Card className="mt-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="relative">
            <button type="button" onClick={() => setMetricMenuOpen((open) => !open)} className="flex h-7 items-center gap-1.5 rounded-[8px] border px-2.5 text-[12px] font-semibold" style={{ borderColor: 'var(--line)', background: 'var(--surface-1)', color: 'var(--fg)' }}>
              {metric.label}
              <ChevronRight size={8} className="rotate-90" style={{ color: 'var(--signal)' }} />
            </button>
            {metricMenuOpen && (
              <div className="absolute left-0 top-10 z-30 max-h-[258px] w-[224px] overflow-y-auto rounded-[12px] border p-2 shadow-2xl" style={{ background: 'var(--surface-1)', borderColor: 'var(--line)' }}>
                {metricOptions.map((option) => (
                  <button key={option} type="button" onClick={() => { setSelectedMetric(option); setMetricMenuOpen(false) }} className="flex min-h-[40px] w-full items-center rounded-[9px] px-3 text-left text-[13px] font-medium" style={{ background: option === selectedMetric ? 'var(--vital-fill)' : 'transparent', color: option === selectedMetric ? 'var(--button-secondary-fg)' : 'var(--fg)' }}>
                    <span className="flex-1">{progressMetricData[option].label}</span>
                    {option === selectedMetric && <Check size={15} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="mono flex items-center gap-1.5 font-semibold" style={{ color: tones[metric.tone].fg }}>
            {metricDeltaGlyph && <span className="text-[8px] leading-none">{metricDeltaGlyph}</span>}
            <span className="text-[12px] leading-none">{metricDeltaText}</span>
          </span>
        </div>
        <p className="mono mt-2 text-[29px] font-bold">{metric.value} <span className="text-[12px] font-medium" style={{ color: 'var(--label)' }}>{metric.unit}</span></p>
        <svg viewBox="0 0 312 116" className="mt-1 h-[116px] w-full">
          <defs>
            <linearGradient id="somaProgressPersonal" x1="8" y1="20" x2="304" y2="85" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="var(--vital)" />
              <stop offset="52%" stopColor="var(--signal)" />
              <stop offset="100%" stopColor="var(--pulse)" />
            </linearGradient>
          </defs>
          <path d="M8 20 L70 38 L105 44 L140 56 L175 65 L222 76 L304 85 L304 98 L8 98 Z" fill="url(#somaProgressPersonal)" opacity="0.16" />
          <path d="M8 20 L70 38 L105 44 L140 56 L175 65 L222 76 L304 85" fill="none" stroke="url(#somaProgressPersonal)" strokeWidth="2.35" />
          <text x="0" y="112" fill="var(--label)" fontSize="10">Apr 16, 2026</text>
          <text x="244" y="112" fill="var(--label)" fontSize="10">Jun 12, 2026</text>
        </svg>
      </Card>
      <Section title="This month" />
      <Card className="p-4">
        {monthActivities.map((activity, index) => (
          <div key={activity} className="flex min-h-[52px] items-center gap-3" style={{ borderTop: index ? '1px solid var(--line)' : 'none' }}>
            <IconChip icon={activityVisual(activity).icon} tone={activityVisual(activity).tone} />
            <span className="flex-1 font-semibold">{activity === 'Weightlifting' ? 'Strength' : activity}</span>
            <span className="mono text-[15px] font-semibold">{activitySummary[activity].sessions}</span>
            <span className="text-[12px]" style={{ color: 'var(--label)' }}>sessions</span>
          </div>
        ))}
        <div className="mt-3 grid grid-cols-2 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
          <div>
            <p className="mono text-[20px] font-bold">{totalSessions}</p>
            <p className="text-[11px]" style={{ color: 'var(--text-soft)' }}>Total Activities in the month</p>
          </div>
          <div className="text-right">
            <p className="mono text-[20px] font-bold" style={{ color: 'var(--vital)' }}>{consistency}</p>
            <p className="text-[11px]" style={{ color: 'var(--text-soft)' }}>Consistency</p>
          </div>
        </div>
      </Card>
      <Section title="Measurements" right="vs last" />
      <div className="grid grid-cols-2 gap-2">
        {shownMeasurements.map((label) => {
          const item = measurementData[label]
          return item ? <MeasureCard key={label} label={label} value={item.value} unit={item.unit} delta={item.delta} /> : null
        })}
      </div>
      <Section title="History" />
      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-[minmax(148px,1fr)_96px] gap-3 px-5 pb-3 pt-4 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>
          <span>Date</span><span className="text-right">{metric.label}</span>
        </div>
        {metric.history.map((row, index) => (
          <div key={row.date} className="grid grid-cols-[minmax(148px,1fr)_96px] gap-3 px-5 py-3.5 text-[13px] font-medium" style={{ borderTop: index ? '1px solid var(--line)' : 'none' }}>
            <span>{row.date}</span>
            <span className="mono text-right font-medium">{row.value}</span>
          </div>
        ))}
      </Card>
      </>
      ) : (
        <>
          {/* Insights — always visible, text derived from real data state */}
          <button type="button" onClick={onInsights} className="relative mt-4 w-full overflow-hidden rounded-[14px] border text-left" style={{ background: 'var(--surface-1)', borderColor: 'var(--signal-border)' }}>
            <div className="relative px-4 pb-4 pt-[15px]">
              <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ background: 'var(--aurora)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Insights</span>
              <div className="mt-3 flex items-start gap-3">
                <div aria-hidden className="mt-[3px] w-[3px] shrink-0 self-stretch rounded-full" style={{ background: 'var(--aurora)', minHeight: '40px' }} />
                <p className="text-[15px] font-semibold leading-snug" style={{ color: 'var(--fg)' }}>{insightText}</p>
              </div>
            </div>
          </button>

          {/* This Month — always visible, shows all user activities with real counts */}
          <Section title="This month" />
          <Card className="p-4">
            {thisMonthRows.length > 0 ? (
              <>
                {thisMonthRows.map(([activity, count], index) => (
                  <div key={activity} className="flex min-h-[52px] items-center gap-3" style={{ borderTop: index ? '1px solid var(--line)' : 'none' }}>
                    <IconChip icon={activityVisual(activity).icon} tone={activityVisual(activity).tone} />
                    <span className="flex-1 font-semibold">{activity === 'Weightlifting' ? 'Strength' : activity}</span>
                    <span className="mono text-[15px] font-semibold" style={{ color: count > 0 ? 'var(--fg)' : 'var(--label)' }}>{count}</span>
                    <span className="text-[12px]" style={{ color: 'var(--label)' }}>{count === 1 ? 'session' : 'sessions'}</span>
                  </div>
                ))}
                <div className="mt-3 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
                  <p className="mono text-[20px] font-bold">{realTotalSessions}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-soft)' }}>Total activities this month</p>
                </div>
              </>
            ) : (
              <p className="py-1 text-[13px]" style={{ color: 'var(--label)' }}>Add activities in Settings to track them here.</p>
            )}
          </Card>

          {/* Body Weight — always visible */}
          <Section title="Body weight" />
          {realWeightHistory.length === 0 ? (
            <Card className="p-4">
              <p className="text-[13px]" style={{ color: 'var(--label)' }}>No weight logged yet.</p>
              <button type="button" onClick={onLogWeight} className="mt-3 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-[10px] text-[13px] font-bold" style={{ background: 'var(--button-primary-surface)', color: 'var(--on-accent)', boxShadow: 'var(--button-primary-shadow)' }}>
                <Scale size={15} /> Log Weight
              </button>
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="grid grid-cols-[minmax(148px,1fr)_96px] gap-3 px-5 pb-3 pt-4 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>
                <span>Date</span><span className="text-right">Weight</span>
              </div>
              {realWeightHistory.map((log, index) => {
                const raw = log.values['Body weight'] ?? ''
                const m = raw.match(/^([\d.]+)\s*(.*)$/)
                const val = m?.[1] ?? raw
                const unit = m?.[2]?.trim() ?? ''
                const dateLabel = new Date(log.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                return (
                  <div key={log.id} className="grid grid-cols-[minmax(148px,1fr)_96px] gap-3 px-5 py-3.5 text-[13px] font-medium" style={{ borderTop: index ? '1px solid var(--line)' : 'none' }}>
                    <span>{dateLabel}</span>
                    <span className="mono text-right font-medium">{val} <span className="text-[11px]" style={{ color: 'var(--label)' }}>{unit}</span></span>
                  </div>
                )
              })}
            </Card>
          )}

          {/* Measurements — always visible */}
          <Section title="Measurements" />
          {shownMeasurements.some(label => latestMeasurements[label]) ? (
            <div className="grid grid-cols-2 gap-2">
              {shownMeasurements.map(label => {
                const item = latestMeasurements[label]
                return item ? <MeasureCard key={label} label={label} value={item.value} unit={item.unit} delta="" /> : null
              })}
            </div>
          ) : (
            <Card className="p-4">
              <p className="text-[13px]" style={{ color: 'var(--label)' }}>No measurements logged yet.</p>
              <button type="button" onClick={onAddMeasurement} className="mt-3 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-[10px] border text-[13px] font-bold" style={{ background: 'var(--button-secondary-surface)', borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)', boxShadow: 'var(--button-secondary-shadow)' }}>
                <Ruler size={15} /> Add Measurement
              </button>
            </Card>
          )}
        </>
      )}
    </Page>
  )
}

function MetricMini({ value, label, tone = 'signal' }: { value: string; label: string; tone?: string }) {
  const color = tone === 'white' ? 'var(--fg)' : tones[tone].fg
  return (
    <div>
      <p className="mono text-[18px] font-black" style={{ color }}>
        {value.startsWith('▼') ? <><span className="align-[2px] text-[11px]">▼</span>{value.slice(1)}</> : value}
      </p>
      <p className="text-[10px] font-bold" style={{ color: 'var(--text-soft)' }}>{label}</p>
    </div>
  )
}

function MeasureCard({ label, value, unit, delta }: { label: string; value: string; unit: string; delta: string }) {
  const trend = delta.startsWith('▼') ? 'down' : delta.startsWith('▲') ? 'up' : 'flat'
  const trendColor = trend === 'up' ? 'var(--signal)' : trend === 'down' ? 'var(--vital)' : 'var(--label)'
  const trendValue = trend === 'flat' ? delta : delta.slice(1)
  return (
    <Card className="p-3">
      <p className="text-[12px]" style={{ color: 'var(--text-soft)' }}>{label}</p>
      <div className="mt-1 flex items-end justify-between">
        <p className="mono text-[18px] font-bold">{value} <span className="text-[10px] font-medium" style={{ color: 'var(--label)' }}>{unit}</span></p>
        <span className="mono text-[10px] font-bold" style={{ color: trendColor }}>{trend !== 'flat' && <span className="align-[1px] text-[7px]">{trend === 'up' ? '▲' : '▼'}</span>}{trendValue}</span>
      </div>
    </Card>
  )
}

const CALENDAR_TYPE_ICONS: Record<string, React.ComponentType<{size?: number}>> = { Workout: Dumbbell, Weight: Clock, Measurement: Ruler, Goals: Check, Habits: Check, Note: ClipboardList, Reflection: ClipboardList, Photo: Camera }
const CALENDAR_TYPE_TONES: Record<string, string> = { Workout: 'signal', Weight: 'vital', Measurement: 'pulse', Goals: 'ember', Habits: 'ember', Note: 'pulse', Reflection: 'pulse', Photo: 'ember' }

function CalendarEntryDetailSheet({ entry, dateISO, onClose, onEdit, onDelete, onSaveAsTemplate, onUpdateEntry }: { entry: CalendarEntry | null; dateISO?: string; onClose: () => void; onEdit?: () => void; onDelete?: () => void; onSaveAsTemplate?: (entry: CalendarEntry) => void; onUpdateEntry?: (updated: CalendarEntry) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mediaView, setMediaView] = useState<'carousel' | 'list'>('carousel')
  const [mediaIndex, setMediaIndex] = useState(0)
  const [expandedMedia, setExpandedMedia] = useState<WorkoutMedia | null>(null)

  if (!entry) return null

  const isWorkout = entry.type === 'Workout'
  const Icon = isWorkout && entry.activity ? activityVisual(entry.activity)?.icon ?? Dumbbell : CALENDAR_TYPE_ICONS[entry.type] ?? ClipboardList
  const tone = isWorkout && entry.activity ? activityVisual(entry.activity)?.tone ?? 'signal' : CALENDAR_TYPE_TONES[entry.type] ?? 'signal'

  const workout = entry.workout
  const media = entry.workoutMedia ?? []
  const activities = workout?.activities ?? (entry.activity ? [entry.activity] : [])
  const activityDetails = workout?.activityDetails ?? []
  const status = workout?.status === 'done' ? 'Completed' : workout?.status === 'planned' ? 'Planned' : 'Logged'
  const statusColor = workout?.status === 'done' ? 'var(--signal)' : workout?.status === 'planned' ? 'var(--label)' : 'var(--vital)'
  const dateLabel = dateISO ? new Date(dateISO + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!entry) return
    const e0 = entry  // capture non-null for async closures
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    files.forEach(file => {
      const kind: WorkoutMedia['kind'] = file.type.startsWith('video/') ? 'video' : 'photo'
      const newId = `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      if (kind === 'video') {
        const m: WorkoutMedia = { id: newId, kind: 'video', fileName: file.name, addedAt: new Date().toISOString() }
        onUpdateEntry?.({ ...e0, workoutMedia: [...(e0.workoutMedia ?? []), m] })
      } else {
        const reader = new FileReader()
        reader.onload = ev => {
          const img = new Image()
          img.onload = () => {
            const MAX = 800
            const scale = img.width > MAX ? MAX / img.width : 1
            const canvas = document.createElement('canvas')
            canvas.width = Math.round(img.width * scale)
            canvas.height = Math.round(img.height * scale)
            const ctx = canvas.getContext('2d')
            if (!ctx) return
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            const m: WorkoutMedia = { id: newId, kind: 'photo', fileName: file.name, addedAt: new Date().toISOString(), dataUrl: canvas.toDataURL('image/jpeg', 0.72) }
            onUpdateEntry?.({ ...e0, workoutMedia: [...(e0.workoutMedia ?? []), m] })
          }
          img.src = ev.target?.result as string
        }
        reader.readAsDataURL(file)
      }
    })
  }

  function removeMedia(id: string) {
    if (!entry) return
    const next = (entry.workoutMedia ?? []).filter(m => m.id !== id)
    onUpdateEntry?.({ ...entry, workoutMedia: next })
    if (mediaIndex >= next.length) setMediaIndex(Math.max(0, next.length - 1))
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center" style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className={`w-full max-w-[392px] animate-[slideUp_200ms_ease-out] overflow-y-auto rounded-t-[24px] border-t sm:max-w-[372px] ${isWorkout ? 'max-h-[92dvh]' : 'max-h-[80dvh]'}`} style={{ background: 'var(--surface-1)', borderColor: 'var(--line)', boxShadow: '0 -16px 48px rgba(0,0,0,0.44)' }} onClick={e => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-10 rounded-full" style={{ background: 'var(--surface-3)' }} /></div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pb-3 pt-1">
          <IconChip icon={Icon} tone={tone} />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold leading-tight">{entry.label}</p>
            {isWorkout && dateLabel
              ? <p className="text-[12px]" style={{ color: 'var(--label)' }}>{dateLabel}</p>
              : entry.sub && <p className="text-[12px]" style={{ color: 'var(--label)' }}>{entry.sub}</p>}
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: 'var(--surface-2)' }} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="h-px mx-4" style={{ background: 'var(--line)' }} />

        <div className="px-4 py-4 space-y-4">
          {/* ── Workout detail ── */}
          {isWorkout && (
            <>
              {/* Meta chips: duration · time · status */}
              <div className="flex flex-wrap gap-2">
                {entry.durationMinutes && (
                  <span className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--fg)' }}>
                    <Clock size={12} /> {entry.durationMinutes} min
                  </span>
                )}
                {workout?.time && (
                  <span className="rounded-full border px-3 py-1 text-[12px] font-semibold" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--fg)' }}>{workout.time}</span>
                )}
                <span className="rounded-full border px-3 py-1 text-[12px] font-semibold" style={{ borderColor: statusColor, color: statusColor }}>{status}</span>
              </div>

              {/* Activities */}
              {activities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activities.map(a => (
                    <span key={a} className="rounded-full border px-3 py-1 text-[11px] font-semibold" style={{ borderColor: 'var(--signal-border)', color: 'var(--signal)', background: 'var(--signal-fill)' }}>{a}</span>
                  ))}
                </div>
              )}

              {/* Notes */}
              {workout?.notes && (
                <div>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>Notes</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>{workout.notes}</p>
                </div>
              )}

              {/* Structured activity details (BJJ, Strength, etc.) */}
              {activityDetails.length > 0 && (
                <div className="space-y-4">
                  {activityDetails.map((detail, i) => (
                    <div key={i}>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>{detail.activity}</p>
                      {detail.activity === 'Strength Training' && detail.exercises?.length ? (
                        <div className="overflow-hidden rounded-[12px]" style={{ border: '1px solid var(--line)' }}>
                          {detail.exercises.map((ex, j) => (
                            <div key={ex.id} style={{ borderTop: j ? '1px solid var(--line)' : 'none' }}>
                              <div className="flex items-center justify-between px-3 py-2.5" style={{ background: 'var(--surface-2)' }}>
                                <span className="text-[13px] font-semibold">{ex.name}</span>
                                <span className="text-[12px]" style={{ color: 'var(--label)' }}>{ex.sets.length} {ex.sets.length === 1 ? 'set' : 'sets'}</span>
                              </div>
                              {ex.sets.length > 0 && (
                                <div className="px-3 pb-2.5 pt-1" style={{ background: 'var(--surface-2)' }}>
                                  <div className="grid grid-cols-3 gap-0 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--label)' }}>
                                    <span>Set</span><span>Weight</span><span>Reps</span>
                                  </div>
                                  {ex.sets.map((set, k) => (
                                    <div key={k} className="grid grid-cols-3 gap-0 text-[13px]" style={{ borderTop: '1px solid var(--line)', marginTop: '4px', paddingTop: '4px' }}>
                                      <span style={{ color: 'var(--label)' }}>{k + 1}</span>
                                      <span className="font-semibold">{set.weight || '—'}</span>
                                      <span className="font-semibold">{set.reps || '—'}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2 rounded-[12px] border p-3" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
                          {detail.format && detail.amount && (
                            <div className="flex items-center justify-between">
                              <span className="text-[12px]" style={{ color: 'var(--label)' }}>{detail.format}</span>
                              <span className="text-[14px] font-bold">{detail.amount} {detail.format === 'Rounds' ? 'rounds' : detail.format === 'Time' ? 'min' : detail.format === 'Laps' ? 'laps' : ''}</span>
                            </div>
                          )}
                          {detail.intensity && (
                            <div className="flex items-center justify-between">
                              <span className="text-[12px]" style={{ color: 'var(--label)' }}>Intensity</span>
                              <span className="text-[13px] font-semibold">{detail.intensity}</span>
                            </div>
                          )}
                          {detail.cardioType && (
                            <div className="flex items-center justify-between">
                              <span className="text-[12px]" style={{ color: 'var(--label)' }}>Type</span>
                              <span className="text-[13px] font-semibold">{detail.cardioType}</span>
                            </div>
                          )}
                          {detail.focus && detail.focus.length > 0 && (
                            <div>
                              <p className="mb-1.5 text-[11px]" style={{ color: 'var(--label)' }}>Focus</p>
                              <div className="flex flex-wrap gap-1.5">
                                {detail.focus.map(f => (
                                  <span key={f} className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold" style={{ borderColor: 'var(--vital-border)', color: 'var(--vital)', background: 'var(--vital-fill)' }}>{f}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {detail.notes && <p className="text-[12px] leading-snug" style={{ color: 'var(--text-soft)' }}>{detail.notes}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Fallback: exercises blocks (workouts without activityDetails) */}
              {activityDetails.length === 0 && workout?.exercises?.map((block, i) => (
                <div key={i}>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>{block.title}</p>
                  <div className="overflow-hidden rounded-[10px]" style={{ border: '1px solid var(--line)' }}>
                    {block.items.map((ex, j) => (
                      <div key={j} className="flex items-center justify-between px-3 py-2" style={{ background: 'var(--surface-2)', borderTop: j ? '1px solid var(--line)' : 'none' }}>
                        <span className="text-[13px] font-semibold">{ex.name}</span>
                        <span className="text-[12px]" style={{ color: 'var(--text-soft)' }}>{ex.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Media section */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>Media</p>
                  {media.length > 1 && (
                    <div className="flex overflow-hidden rounded-[8px] border" style={{ borderColor: 'var(--line)' }}>
                      {(['carousel', 'list'] as const).map(v => (
                        <button key={v} type="button" onClick={() => setMediaView(v)} className="px-2.5 py-1 text-[11px] font-semibold capitalize" style={{ background: mediaView === v ? 'var(--vital-fill)' : 'transparent', color: mediaView === v ? 'var(--button-secondary-fg)' : 'var(--label)' }}>{v}</button>
                      ))}
                    </div>
                  )}
                </div>

                {media.length === 0 ? (
                  <div className="flex min-h-[72px] items-center justify-center rounded-[12px] border" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
                    <p className="text-[13px]" style={{ color: 'var(--label)' }}>No media attached yet</p>
                  </div>
                ) : mediaView === 'list' ? (
                  <div className="space-y-2">
                    {media.map((m, idx) => (
                      <div key={m.id} className="flex items-center gap-3 rounded-[10px] border p-2" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
                        {m.kind === 'photo' && m.dataUrl ? (
                          <button type="button" onClick={() => setExpandedMedia(m)} className="h-12 w-12 shrink-0 overflow-hidden rounded-[8px]">
                            <img src={m.dataUrl} alt={m.fileName} className="h-full w-full object-cover" />
                          </button>
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px]" style={{ background: 'var(--surface-3)', color: 'var(--label)' }}>
                            <Video size={18} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold">{m.fileName}</p>
                          <p className="text-[11px]" style={{ color: 'var(--label)' }}>{m.kind === 'photo' ? 'Photo' : 'Video (metadata only)'} · {new Date(m.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        </div>
                        <button type="button" onClick={() => removeMedia(m.id)} className="flex h-8 w-8 items-center justify-center rounded-[8px]" style={{ color: 'var(--danger)' }} aria-label="Remove"><Trash2 size={14} /></button>
                        {/* suppress unused idx warning */}
                        {void idx}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Carousel view */
                  <div>
                    <div className="relative overflow-hidden rounded-[12px]" style={{ background: 'var(--surface-2)', minHeight: '140px' }}>
                      {media[mediaIndex]?.kind === 'photo' && media[mediaIndex]?.dataUrl ? (
                        <button type="button" onClick={() => setExpandedMedia(media[mediaIndex])} className="w-full">
                          <img src={media[mediaIndex].dataUrl} alt={media[mediaIndex].fileName} className="w-full object-cover" style={{ maxHeight: '220px' }} />
                        </button>
                      ) : (
                        <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 px-4" style={{ color: 'var(--label)' }}>
                          <Video size={28} />
                          <p className="text-[12px] font-semibold">{media[mediaIndex]?.fileName}</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-soft)' }}>Video preview not available</p>
                        </div>
                      )}
                      {media.length > 1 && (
                        <>
                          {mediaIndex > 0 && (
                            <button type="button" onClick={e => { e.stopPropagation(); setMediaIndex(i => i - 1) }} className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}><ChevronLeft size={16} /></button>
                          )}
                          {mediaIndex < media.length - 1 && (
                            <button type="button" onClick={e => { e.stopPropagation(); setMediaIndex(i => i + 1) }} className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}><ChevronRight size={16} /></button>
                          )}
                        </>
                      )}
                      <button type="button" onClick={() => removeMedia(media[mediaIndex]?.id)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }} aria-label="Remove media"><Trash2 size={12} /></button>
                    </div>
                    {media.length > 1 && (
                      <div className="mt-2 flex items-center justify-center gap-1.5">
                        {media.map((_, i) => (
                          <button key={i} type="button" onClick={() => setMediaIndex(i)} className="h-1.5 rounded-full transition-all" style={{ width: i === mediaIndex ? '20px' : '6px', background: i === mediaIndex ? 'var(--vital)' : 'var(--surface-3)' }} />
                        ))}
                      </div>
                    )}
                    <p className="mt-1.5 text-center text-[11px]" style={{ color: 'var(--label)' }}>{mediaIndex + 1} / {media.length}</p>
                  </div>
                )}

                <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-[10px] border text-[13px] font-semibold" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--fg)' }}>
                  <Camera size={15} /> Add Photo / Video
                </button>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileChange} />
                <p className="mt-1 text-center text-[11px]" style={{ color: 'var(--label)' }}>Photos stored locally · Videos: metadata only</p>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pb-1">
                {onEdit && (
                  <button type="button" onClick={() => { onEdit(); onClose() }} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[12px] border text-[13px] font-semibold" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--fg)' }}>
                    <Edit3 size={15} /> Edit Workout
                  </button>
                )}
                {onSaveAsTemplate && (
                  <button type="button" onClick={() => { onSaveAsTemplate(entry); onClose() }} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[12px] border text-[13px] font-semibold" style={{ borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)', background: 'var(--vital-fill)' }}>
                    <ClipboardList size={15} /> Save as Template
                  </button>
                )}
                {onDelete && (
                  <button type="button" onClick={() => { onDelete(); onClose() }} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[12px] border text-[13px] font-semibold" style={{ borderColor: 'var(--danger-border)', background: 'var(--danger-fill)', color: 'var(--danger)' }}>
                    <Trash2 size={15} /> Delete Workout
                  </button>
                )}
              </div>
            </>
          )}

          {/* ── Non-workout entry types ── */}
          {!isWorkout && (
            <>
              {(entry.type === 'Note' || entry.type === 'Reflection') && (entry.note ?? entry.sub ?? entry.label) && (
                <p className="text-[14px] leading-relaxed">{entry.note ?? entry.sub ?? entry.label}</p>
              )}
              {entry.type === 'Weight' && entry.sub && (
                <p className="text-[20px] font-black">{entry.sub}</p>
              )}
              {entry.type === 'Measurement' && entry.sub && (
                <p className="text-[13px]" style={{ color: 'var(--text-soft)' }}>{entry.sub}</p>
              )}
              {entry.type === 'Photo' && (
                <p className="text-[13px]" style={{ color: 'var(--text-soft)' }}>{entry.sub ?? 'Photo logged'}</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Photo lightbox */}
      {expandedMedia && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.92)' }} onClick={() => setExpandedMedia(null)}>
          <img src={expandedMedia.dataUrl} alt={expandedMedia.fileName} className="max-h-[90dvh] max-w-full object-contain" />
          <button type="button" onClick={() => setExpandedMedia(null)} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }} aria-label="Close"><X size={20} /></button>
        </div>
      )}
    </div>
  )
}

function Calendar({ demoMode, userId, selectedDay, journalEntries, pendingTemplate, onSelectDay, onAction, onEditEntry, onDeleteEntry, onUpdateEntry, onOpenWorkout, onSaveEntryAsTemplate }: { demoMode: boolean; userId: string; selectedDay: number; journalEntries: Record<string, CalendarEntry[]>; pendingTemplate?: WorkoutTemplate | null; onSelectDay: (day: number, dateISO: string) => void; onAction: (sheet: Sheet, dateISO: string) => void; onEditEntry: (dateISO: string, entry: CalendarEntry) => void; onDeleteEntry: (dateISO: string, id: string) => void; onUpdateEntry: (dateISO: string, updated: CalendarEntry) => void; onOpenWorkout: () => void; onSaveEntryAsTemplate: (entry: CalendarEntry) => void }) {
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('calendar')
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date(2026, 5, 1))
  const [calendarDetailEntry, setCalendarDetailEntry] = useState<CalendarEntry | null>(null)
  const showingJune2026 = calendarViewDate.getMonth() === 5 && calendarViewDate.getFullYear() === 2026
  // Sample month history is demo-only; real users see only what they've logged.
  const selectedDateISO = getLocalDateISO(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), selectedDay))
  const journalDays = new Map<string, CalendarEntry[]>(demoMode && showingJune2026 ? [
    ['2026-06-05', [{ type: 'Workout', label: 'Workout logged' }]],
    ['2026-06-08', [{ type: 'Workout', label: 'Lower Body Strength', sub: '55 min' }, { type: 'Photo', label: 'Progress photo', sub: 'Front - week 10' }]],
    ['2026-06-12', [{ type: 'Workout', label: 'Upper Body + Bag Work', sub: 'Strength - Kickboxing - 60 min' }, { type: 'Photo', label: 'Meal photo', sub: 'Lunch' }, { type: 'Measurement', label: 'Measurements', sub: '148.2 lb - waist 33.0"' }]],
    ['2026-06-14', [{ type: 'Weight', label: 'Weight logged', sub: '148.2 lb' }]],
    ['2026-06-15', [{ type: 'Habits', label: 'Habits completed', sub: '5 of 6 done' }, { type: 'Note', label: 'Reflection', sub: 'Felt strong on the bag - guard stayed up.' }]],
    ['2026-06-20', [{ type: 'Workout', label: 'Workout logged' }]],
    ['2026-06-23', [{ type: 'Photo', label: 'Progress photo' }]],
    ['2026-06-25', [{ type: 'Photo', label: 'Meal photo' }]],
    ['2026-06-30', [{ type: 'Workout', label: 'Workout logged' }]],
  ] : [])
  Object.entries(journalEntries).forEach(([iso, isoEntries]) => {
    const d = new Date(iso + 'T12:00:00')
    if (d.getFullYear() === calendarViewDate.getFullYear() && d.getMonth() === calendarViewDate.getMonth()) {
      journalDays.set(iso, [...(journalDays.get(iso) ?? []), ...isoEntries])
    }
  })
  const entries = journalDays.get(selectedDateISO) ?? []
  const typeColors: Record<string, string> = {
    Workout: 'var(--signal)',
    Weight: 'var(--vital)',
    Photo: 'var(--ember)',
    Measurement: 'var(--pulse)',
    Goals: 'var(--vital)',
    Habits: 'var(--vital)',
    Note: 'var(--pulse)',
    Reflection: 'var(--pulse)',
  }
  const typeIcons: Record<string, React.ComponentType<any>> = { Workout: Dumbbell, Weight: Clock, Measurement: Ruler, Goals: Check, Habits: Check, Note: ClipboardList, Reflection: ClipboardList, Photo: Camera }
  const typeTones: Record<string, string> = {
    Workout: 'signal',
    Weight: 'vital',
    Photo: 'ember',
    Measurement: 'pulse',
    Goals: 'vital',
    Habits: 'vital',
    Note: 'pulse',
    Reflection: 'pulse',
  }
  const monthTitle = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(calendarViewDate)
  const selectedDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), selectedDay)
  const isFutureDate = selectedDate > new Date()
  const calendarActions: { label: string; sheet: Sheet }[] = isFutureDate ? [
    { label: 'Plan Workout', sheet: 'scheduleWorkout' },
    { label: 'Add Note', sheet: 'note' },
  ] : [
    { label: 'Log Workout', sheet: 'workoutLog' },
    { label: 'Log Weight', sheet: 'weight' },
    { label: 'Add Photo', sheet: 'meal' },
    { label: 'Add Note', sheet: 'note' },
  ]
  const primaryDayAction = calendarActions[0]
  const secondaryDayActions = calendarActions.slice(1)
  const selectedMeta = {
    dow: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(selectedDate),
    date: new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(selectedDate),
  }
  const daysInMonth = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 0).getDate()
  const leadingBlanks = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1).getDay()
  function changeMonth(offset: number) {
    setCalendarViewDate((current) => {
      const next = new Date(current.getFullYear(), current.getMonth() + offset, 1)
      const nextDays = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      if (selectedDay > nextDays) {
        const clampedISO = getLocalDateISO(new Date(next.getFullYear(), next.getMonth(), nextDays))
        onSelectDay(nextDays, clampedISO)
      }
      return next
    })
  }
  function openAction(event: React.MouseEvent<HTMLButtonElement>, sheet: Sheet) {
    event.preventDefault()
    event.stopPropagation()
    onAction(sheet, selectedDateISO)
  }
  return (
    <Page>
      <div className="pt-7">
        <h1 className="text-[24px] font-black leading-tight">Calendar</h1>
        <p className="mt-2 text-[14px]" style={{ color: 'var(--text-soft)' }}>Log History</p>
      </div>
      <div className="mt-5 grid grid-cols-2 rounded-[12px] border p-1" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
        {[
          ['calendar', 'Calendar'],
          ['timeline', 'Timeline'],
        ].map(([value, label]) => (
          <button key={value} type="button" onClick={() => setViewMode(value as 'calendar' | 'timeline')} className="min-h-[38px] rounded-[9px] text-[13px] font-bold" style={{ background: viewMode === value ? 'var(--button-secondary-surface)' : 'transparent', color: viewMode === value ? 'var(--fg)' : 'var(--label)', boxShadow: viewMode === value ? 'var(--button-secondary-shadow)' : 'none' }}>{label}</button>
        ))}
      </div>
      {pendingTemplate && (
        <div className="mt-4 rounded-[12px] border px-3 py-2 text-[12px]" style={{ background: 'var(--signal-fill)', borderColor: 'var(--signal-border)', color: 'var(--text-soft)' }}>
          Choose a date for <span className="font-semibold" style={{ color: 'var(--fg)' }}>{pendingTemplate.name}</span>
        </div>
      )}
      {viewMode === 'timeline' ? (
        <TimelineFeed demoMode={demoMode} userId={userId} calendarEntries={journalEntries} onOpenWorkout={onOpenWorkout} showToast={() => {}} />
      ) : (
      <>
      <div className="mt-5 flex items-center justify-between">
        <button type="button" onClick={() => changeMonth(-1)} className="flex h-11 w-11 items-center justify-center rounded-[12px] border" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--fg)' }} aria-label="Previous month"><ChevronLeft size={18} /></button>
        <button type="button" className="rounded-[10px] px-3 py-2 text-[16px] font-black" style={{ color: 'var(--fg)' }}>{monthTitle}</button>
        <button type="button" onClick={() => changeMonth(1)} className="flex h-11 w-11 items-center justify-center rounded-[12px] border" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--fg)' }} aria-label="Next month"><ChevronRight size={18} /></button>
      </div>
      <Card className="mt-5 p-5">
        <div className="mb-4 grid grid-cols-7 text-center text-[11px] font-black" style={{ color: 'var(--label)' }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={`${d}-${i}`}>{d}</span>)}</div>
        <div className="grid grid-cols-7 gap-y-2 text-center">
          {Array.from({ length: leadingBlanks }, (_, index) => <span key={`blank-${index}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayISO = getLocalDateISO(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day))
            const dayEntries = journalDays.get(dayISO) ?? []
            const active = day === selectedDay
            return (
              <button
                key={day}
                onClick={() => onSelectDay(day, dayISO)}
                className="mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-[9px] text-[14px] font-semibold"
                style={{
                  background: active ? 'var(--vital-fill)' : 'transparent',
                  border: active ? '2px solid var(--vital)' : '2px solid transparent',
                  color: active ? 'var(--vital)' : 'var(--fg)',
                  boxShadow: 'none',
                }}
              >
                {day}
                {dayEntries.length > 0 && (
                  <span className="mt-1 flex max-w-[28px] gap-[2px]">
                    {dayEntries.slice(0, 4).map((entry, index) => <span key={`${entry.type}-${index}`} className="h-1.5 w-1.5 rounded-full" style={{ background: typeColors[entry.type] }} />)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </Card>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-3 text-[12px]" style={{ color: 'var(--text-soft)' }}>
        {['Workout', 'Weight', 'Photo', 'Measurement', 'Goals'].map((type) => <span key={type} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: typeColors[type] }} />{type}</span>)}
      </div>
      <Card className="mt-4 p-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[17px] font-black">{selectedMeta.dow}</p>
          <span className="mono text-[12px]" style={{ color: 'var(--text-soft)' }}>{selectedMeta.date}</span>
        </div>
        {primaryDayAction && (
          <button type="button" onClick={(event) => openAction(event, primaryDayAction.sheet)} className="mb-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[13px] text-[14px] font-black" style={{ background: 'var(--button-primary-surface)', color: 'var(--on-accent)', boxShadow: 'var(--button-primary-shadow)' }}>
            <Plus size={17} /> {primaryDayAction.label}
          </button>
        )}
        {entries.length ? <div className="space-y-3">{entries.map((entry, index) => {
          const activityMeta = entry.type === 'Workout' && entry.activity ? activityVisual(entry.activity) : null
          const Icon = activityMeta?.icon ?? typeIcons[entry.type] ?? ClipboardList
          const editable = Boolean(entry.editable && entry.id)
          return (
            <div key={entry.id ?? `${entry.label}-${index}`} className="grid min-h-[52px] grid-cols-[40px_1fr_auto] items-start gap-3 rounded-[12px] py-1">
              <button type="button" className="contents" onClick={() => setCalendarDetailEntry(entry)}>
                <IconChip icon={Icon} tone={activityMeta?.tone ?? typeTones[entry.type] ?? 'signal'} />
                <div className="min-w-0 pt-0.5 text-left">
                  <p className="font-semibold">{entry.label}</p>
                  {entry.type === 'Workout' ? (
                    <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-soft)' }}>
                      {entry.durationMinutes ? `${entry.durationMinutes} min` : 'Duration not set'}
                      {entry.sub ? ` · ${entry.sub}` : ''}
                    </p>
                  ) : (
                    entry.sub && <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-soft)' }}>{entry.sub}</p>
                  )}
                </div>
              </button>
              {editable && (
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => onEditEntry(selectedDateISO, entry)} className="flex h-9 w-9 items-center justify-center rounded-[10px] border" style={{ background: 'var(--surface-2)', borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)' }} aria-label={`Edit ${entry.label}`}>
                    <Edit3 size={14} />
                  </button>
                  <button type="button" onClick={() => entry.id && onDeleteEntry(selectedDateISO, entry.id)} className="flex h-9 w-9 items-center justify-center rounded-[10px] border" style={{ background: 'var(--danger-fill)', borderColor: 'var(--danger-border)', color: 'var(--danger)' }} aria-label={`Delete ${entry.label}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          )
        })}</div> : <p className="text-[13px]" style={{ color: 'var(--text-soft)' }}>No entries yet.</p>}
        <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--line)' }}>
          <div className="grid grid-cols-2 gap-2">
            {secondaryDayActions.map((action) => (
              <button type="button" key={action.label} onClick={(event) => openAction(event, action.sheet)} className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-[12px] border text-[13px] font-semibold" style={{ background: 'var(--surface-1)', borderColor: 'var(--line)', color: 'var(--fg)', boxShadow: 'var(--button-secondary-shadow)' }}>
                <span className="text-[18px] leading-none" style={{ color: 'var(--signal)' }}>+</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>
      </>)}
      <CalendarEntryDetailSheet
        entry={calendarDetailEntry}
        dateISO={selectedDateISO}
        onClose={() => setCalendarDetailEntry(null)}
        onEdit={calendarDetailEntry?.editable ? () => { onEditEntry(selectedDateISO, calendarDetailEntry!); setCalendarDetailEntry(null) } : undefined}
        onDelete={calendarDetailEntry?.editable && calendarDetailEntry?.id ? () => { onDeleteEntry(selectedDateISO, calendarDetailEntry!.id!); setCalendarDetailEntry(null) } : undefined}
        onSaveAsTemplate={calendarDetailEntry?.type === 'Workout' ? onSaveEntryAsTemplate : undefined}
        onUpdateEntry={updated => { setCalendarDetailEntry(updated); onUpdateEntry(selectedDateISO, updated) }}
      />
    </Page>
  )
}

function WorkoutDetail({ workout, demoMode, checked, deletedExercises, onToggleExercise, onDeleteExercise, onBack, onComplete, onCopyToDate, onSaveTemplate }: { workout: ScheduledWorkout | null; demoMode: boolean; checked: Set<string>; deletedExercises: Set<string>; onToggleExercise: (key: string) => void; onDeleteExercise: (key: string) => void; onBack: () => void; onComplete: () => void; onCopyToDate: () => void; onSaveTemplate: () => void }) {
  // Checklist keys are scoped to this workout's id so two workouts logged on the
  // same day keep independent progress (#4).
  const keyPrefix = workout?.id ?? 'demo'
  const visibleBlocks = workoutExerciseBlocks(workout, demoMode).map((block) => ({
    ...block,
    items: block.items.filter((ex) => !deletedExercises.has(`${keyPrefix}::${block.title}-${ex.name}`)),
  })).filter((block) => block.items.length)
  const total = visibleBlocks.reduce((sum, block) => sum + block.items.length, 0)
  const checkedVisible = Array.from(checked).filter((key) => !deletedExercises.has(key)).length
  const pct = total ? Math.round((checkedVisible / total) * 100) : 0
  // Manual logs have no exercise checklist, so completion can't be gated on
  // checking off rows — let the user mark it done directly.
  const canComplete = total === 0 ? true : checkedVisible === total
  const plan = workout ?? { label: 'Upper Body + Bag Work', sub: 'Today - Jun 15 - 60 min', activities: [] as string[], notes: undefined as string | undefined }
  const subLine = workout?.sub ?? '60 min'

  return (
    <Page nav={false}>
      <BackLink label="Back" onClick={onBack} />
      <div className="mt-6 flex items-center gap-4">
        <div className="scale-[0.82]"><Ring pct={pct} /></div>
        <div>
          <h1 className="text-[22px] font-black leading-tight">{plan.label}</h1>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--text-soft)' }}>{subLine}</p>
          {total > 0 && <p className="mt-1 text-[13px]" style={{ color: 'var(--label)' }}>{checkedVisible} of {total} exercises done</p>}
        </div>
      </div>

      {/* Structured per-activity detail for non-strength activities (strength
          shows below as a checklist). Rendered from saved data, not demo rows. */}
      {(() => {
        const nonStrength = (workout?.activityDetails ?? []).filter((d) => d.activity !== 'Strength Training')
        if (nonStrength.length === 0) return null
        return (
          <div className="mt-6 space-y-3">
            {nonStrength.map((detail, i) => <ActivityDetailView key={i} detail={detail} />)}
          </div>
        )
      })()}

      {/* Fallback for a bare log with no structured data at all. */}
      {total === 0 && (workout?.activityDetails?.length ?? 0) === 0 && (
        <div className="mt-6">
          {(workout?.activities?.length ?? 0) > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {workout!.activities.map((activity) => (
                <span key={activity} className="rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: 'var(--signal-fill)', color: 'var(--signal)' }}>{activity}</span>
              ))}
            </div>
          )}
          <Card className="p-4">
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>
              {workout?.notes?.trim() || workout?.sub || 'No exercises logged for this workout. Load a template to add a structured plan, or just mark it complete.'}
            </p>
          </Card>
        </div>
      )}

      <div className="mt-5 space-y-5">
        {visibleBlocks.map((block) => {
          const BlockIcon = block.icon ?? Dumbbell
          return (
          <div key={block.title}>
            <div className="mb-3 flex items-center gap-2">
              <BlockIcon size={17} style={{ color: 'var(--signal)' }} />
              <p className="font-semibold">{block.title}</p>
              {block.sub && <p className="mono text-[12px]" style={{ color: 'var(--label)' }}>{block.sub}</p>}
            </div>
            <Card className="p-0">
              {block.items.map((ex, index) => {
                const { name, detail } = ex
                const key = `${keyPrefix}::${block.title}-${name}`
                const done = checked.has(key)
                return (
                  <div key={key} className="flex min-h-[66px] w-full items-center gap-3 px-4 text-left" style={{ borderTop: index ? '1px solid var(--line)' : 'none' }}>
                    <button type="button" onClick={() => onToggleExercise(key)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border"
                        style={{ background: done ? 'var(--vital)' : 'transparent', borderColor: done ? 'var(--vital)' : 'var(--line)' }}
                      >
                        {done && <Check size={15} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold" style={{ color: done ? 'var(--vital)' : 'var(--fg)' }}>{name}</span>
                        <span className="mono block truncate text-[13px]" style={{ color: 'var(--text-soft)' }}>{detail}</span>
                      </span>
                    </button>
                    <button type="button" onClick={() => onDeleteExercise(key)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border opacity-70 transition hover:opacity-100" style={{ borderColor: 'var(--line)', color: 'var(--text-soft)', background: 'var(--surface-2)' }} aria-label={`Delete ${name}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
            </Card>
          </div>
        )})}
      </div>

      <Section title="Reuse this workout" />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCopyToDate} className="min-h-[46px] rounded-[12px] border text-[13px] font-semibold" style={{ background: 'var(--surface-1)', borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)' }}>Copy to Date</button>
        <button type="button" onClick={onSaveTemplate} className="min-h-[46px] rounded-[12px] border text-[13px] font-semibold" style={{ background: 'var(--surface-1)', borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)' }}>Save template</button>
      </div>
      <button onClick={onComplete} disabled={!canComplete} className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-3 rounded-[13px] text-[16px] font-bold disabled:opacity-55" style={{ background: canComplete ? 'var(--button-primary-surface)' : 'var(--surface-3)', color: canComplete ? 'var(--on-accent)' : 'var(--text-soft)', boxShadow: canComplete ? 'var(--button-primary-shadow)' : 'none' }}>
        <Check size={18} /> Complete workout
      </button>
    </Page>
  )
}

function AskCoach({ onBack }: { onBack: () => void }) {
  return (
    <Page nav={false}>
      <BackLink label="Back" onClick={onBack} />
      <h1 className="mt-7 text-[24px] font-black">Ask Coach</h1>
      <p className="mt-2 text-[14px]" style={{ color: 'var(--text-soft)' }}>Your AI training assistant</p>

      <div className="mt-12 flex flex-col items-center text-center">
        <IconChip icon={Zap} tone="signal" />
        <div className="mt-5"><Pill tone="amber">Coming soon</Pill></div>
        <h2 className="mt-5 max-w-[250px] text-[18px] font-black leading-snug">Form cues, nutrition tips & plan questions - answered instantly</h2>
        <p className="mt-4 max-w-[280px] text-[14px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>Soon you&apos;ll be able to ask anything about your training in plain language.</p>
      </div>

      <div className="mt-8 space-y-2">
        {[
          "What should I eat after today's workout?",
          'How do I fix my squat depth?',
          'Can we swap Thursday to Friday?',
        ].map((prompt) => (
          <div key={prompt} className="rounded-[12px] border px-4 py-3 text-[13px]" style={{ background: 'var(--surface-1)', borderColor: 'var(--line)', color: 'var(--label)' }}>{prompt}</div>
        ))}
        <div className="flex min-h-[46px] items-center gap-2 rounded-[12px] border px-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--line)' }}>
          <span className="flex-1 text-[13px]" style={{ color: 'var(--label)' }}>Message your coach...</span>
        <button className="flex h-9 w-9 items-center justify-center rounded-[10px] [background:var(--button-primary-surface)] shadow-[var(--button-primary-shadow)]" style={{ color: 'var(--on-accent)' }}>↑</button>
        </div>
      </div>
    </Page>
  )
}

function statusColor(status: string) {
  if (status === 'completed') return 'var(--vital)'
  if (status === 'missed') return 'var(--neg)'
  if (status === 'rest') return 'var(--label)'
  if (status === 'assessment') return 'var(--pulse)'
  return 'var(--signal)'
}

// Per-category variation labels shown as the subtitle in the grid.
const CATEGORY_VARIATION_LABELS: Record<DefaultCategory, string> = {
  Push: 'Chest focus · Shoulder focus',
  Pull: 'Back width · Back thickness',
  Legs: 'Quad focus · Posterior chain',
  Arms: 'Mass · Pump',
  Abs: 'Core strength · Circuit',
  Shoulders: 'Press focus · Delt detail',
}

function WorkoutsHub({ demoMode, templates, calendarEntries, onOpenTemplate, onOpenDefault, onRecentWorkouts, onSavedTemplates }: { demoMode: boolean; templates: WorkoutTemplate[]; calendarEntries: Record<string, CalendarEntry[]>; onOpenTemplate: (template: WorkoutTemplate) => void; onOpenDefault: (category: DefaultCategory) => void; onRecentWorkouts: () => void; onSavedTemplates: () => void }) {
  const recentWorkouts = demoMode
    ? [
        { title: 'Conditioning Run', sub: 'Tue · Jun 10 · 35 min', icon: Activity, tone: 'vital' },
        { title: 'Lower Body Strength', sub: 'Sun · Jun 8 · 55 min', icon: Dumbbell, tone: 'signal' },
        { title: 'Kickboxing Technique', sub: 'Thu · Jun 5 · 45 min', icon: GloveIcon, tone: 'ember' },
      ]
    : Object.entries(calendarEntries)
        .flatMap(([dateISO, entries]) =>
          entries
            .filter((e) => e.type === 'Workout')
            .map((e) => {
              const parts: string[] = []
              const d = new Date(dateISO + 'T00:00:00')
              parts.push(d.toLocaleDateString('en-US', { weekday: 'short' }))
              parts.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
              if (e.durationMinutes) parts.push(`${e.durationMinutes} min`)
              return { title: e.label, sub: parts.join(' · '), icon: Dumbbell, tone: 'signal', dateISO }
            })
        )
        .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
        .slice(0, 5)
  const favoriteTemplates = templates.filter(t => t.favorite)
  const shownTemplates = favoriteTemplates.length ? favoriteTemplates : templates.slice(0, 3)

  return (
    <Page>
      <Title title="Workouts" sub="Templates · planning · history" />

      <Section title="Workout Templates" />
      <p className="mb-3 text-[13px]" style={{ color: 'var(--text-soft)' }}>Built-in programs that scale to your time and goal.</p>
      <div className="grid grid-cols-2 gap-2">
        {DEFAULT_CATEGORIES.map((category) => (
          <button key={category} type="button" onClick={() => onOpenDefault(category)} className="flex min-h-[66px] items-start gap-0 rounded-[13px] border px-4 py-3 text-left" style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-black">{category}</span>
              <span className="mt-0.5 block text-[11px] leading-snug" style={{ color: 'var(--text-soft)' }}>{CATEGORY_VARIATION_LABELS[category]}</span>
            </span>
            <ChevronRight size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--label)' }} />
          </button>
        ))}
      </div>

      {templates.length > 0 && (
        <>
          <Section title="Saved Templates" right={`${templates.length} saved`} />
          <div className="space-y-2">
            {shownTemplates.map((template) => (
              <button key={template.id} type="button" onClick={() => onOpenTemplate(template)} className="flex min-h-[62px] w-full items-center gap-3 rounded-[13px] border px-3 text-left" style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
                <IconChip icon={ClipboardList} tone="signal" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="block truncate text-[14px] font-black">{template.name}</span>
                    {template.favorite && <Star size={12} fill="currentColor" style={{ color: 'var(--amber)' }} />}
                  </span>
                  <span className="mt-0.5 block text-[12px]" style={{ color: 'var(--text-soft)' }}>{template.tags.slice(0, 2).join(' · ')} · used {template.timesUsed}×</span>
                </span>
                <ChevronRight size={15} style={{ color: 'var(--label)' }} />
              </button>
            ))}
            {templates.length > shownTemplates.length && (
              <button type="button" onClick={onSavedTemplates} className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-[12px] border text-[13px] font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--text-soft)' }}>
                View all {templates.length} saved templates
              </button>
            )}
          </div>
        </>
      )}

      <Section title="Recent Workouts" />
      {recentWorkouts.length ? (
        <Card className="overflow-hidden p-0">
          {recentWorkouts.map((workout, index) => (
            <button key={workout.title} type="button" onClick={onRecentWorkouts} className="flex min-h-[58px] w-full items-center gap-3 px-4 text-left" style={{ borderTop: index ? '1px solid var(--line)' : 'none' }}>
              <IconChip icon={workout.icon} tone={workout.tone} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-black">{workout.title}</span>
                <span className="block text-[12px]" style={{ color: 'var(--text-soft)' }}>{workout.sub}</span>
              </span>
              <ChevronRight size={15} style={{ color: 'var(--label)' }} />
            </button>
          ))}
        </Card>
      ) : (
        <EmptyState icon={Dumbbell} title="No workouts yet" body="Log your first workout and it'll show up here." tone="signal" />
      )}
    </Page>
  )
}

function More({ setSub, focusGoals, shownMeasurements, activities, templates }: { setSub: (sub: ProfileSub) => void; focusGoals: Goal[]; shownMeasurements: string[]; activities: string[]; templates: WorkoutTemplate[] }) {
  const favoriteTemplates = templates.filter((template) => template.favorite).length
  const profileSections: { title: string; rows: { id: ProfileSub; icon: React.ComponentType<any>; title: string; sub: string; tone: string; chip?: string }[] }[] = [
    {
      title: 'Fitness',
      rows: [
        { id: 'goals', icon: Target, title: 'Goals & Targets', sub: `${focusGoals[0] ?? 'No focus'}${focusGoals[1] ? ` - ${focusGoals[1]}` : ''}${focusGoals.length > 2 ? ' +1' : ''}`, tone: 'vital' },
        { id: 'activities', icon: Dumbbell, title: 'Activities', sub: activities.join(' - '), tone: 'signal' },
        { id: 'templates', icon: ClipboardList, title: 'Workout Templates', sub: `${templates.length} saved - ${favoriteTemplates} favorites`, tone: 'vital' },
        { id: 'measurements', icon: Ruler, title: 'Measurements', sub: `${shownMeasurements.length} shown on Progress`, tone: 'pulse' },
      ],
    },
    {
      title: 'Connections',
      rows: [
        { id: 'apps', icon: Watch, title: 'Connected Apps', sub: 'Apple Health, Oura & more', tone: 'signal' },
        { id: 'coach', icon: Users, title: 'Coach Connection', sub: 'Coming soon', tone: 'vital', chip: 'Soon' },
      ],
    },
    {
      title: 'App',
      rows: [
        { id: 'preferences', icon: Settings, title: 'Preferences', sub: 'Appearance - units - notifications', tone: 'slate' },
      ],
    },
  ]
  return (
    <Page>
      <Title title="Manage" sub="Configure goals, templates, data, and app connections" />

      {profileSections.map((section) => (
        <div key={section.title}>
          <Section title={section.title} />
          <div className="space-y-2">
            {section.rows.map(({ id, icon: Icon, title, sub, tone, chip }) => (
              <Card key={id} className="flex min-h-[72px] items-center gap-3 p-4" onClick={() => setSub(id)}>
                <IconChip icon={Icon} tone={tone} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{title}</p>
                  <p className="truncate text-[12px]" style={{ color: 'var(--text-soft)' }}>{sub}</p>
                </div>
                {chip && <span className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold" style={{ borderColor: 'var(--amber-border)', color: 'var(--amber)', background: 'var(--amber-fill)' }}>{chip}</span>}
                <ChevronRight size={16} style={{ color: 'var(--label)' }} />
              </Card>
            ))}
          </div>
        </div>
      ))}
      <footer className="mt-8 pb-3 text-center text-[11px] font-semibold" style={{ color: 'var(--label)' }}>
        <p>Version 0.1.0</p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <Link href="/privacy" className="transition-colors hover:text-[var(--signal)]">Privacy Policy</Link>
          <span aria-hidden="true">&middot;</span>
          <Link href="/terms" className="transition-colors hover:text-[var(--signal)]">Terms of Service</Link>
        </div>
      </footer>
    </Page>
  )
}
function GoalsSub({ back, focusGoals, setFocusGoals, targets, setTargets, habitRows, setHabitRows, habits, setHabits }: {
  back: () => void
  focusGoals: Goal[]
  setFocusGoals: React.Dispatch<React.SetStateAction<Goal[]>>
  targets: TargetDef[]
  setTargets: React.Dispatch<React.SetStateAction<TargetDef[]>>
  habitRows: HabitDef[]
  setHabitRows: React.Dispatch<React.SetStateAction<HabitDef[]>>
  habits: Record<HabitKey, boolean>
  setHabits: React.Dispatch<React.SetStateAction<Record<HabitKey, boolean>>>
}) {
  const [editingTarget, setEditingTarget] = useState<string | null>(null)
  const [customName, setCustomName] = useState('')
  const [customIcon, setCustomIcon] = useState<(typeof habitIconChoices)[number]>(habitIconChoices[0])

  function toggleGoal(goal: Goal) {
    setFocusGoals((current) => {
      if (current.includes(goal)) return current.filter((item) => item !== goal)
      if (current.length >= 3) return current
      return [...current, goal]
    })
  }

  function addCustomHabit() {
    const label = customName.trim()
    if (!label) return
    const key = `custom-${Date.now()}`
    setHabitRows((current) => [...current, { key, label, icon: customIcon.icon }])
    setHabits((current) => ({ ...current, [key]: false }))
    setCustomName('')
  }

  function deleteHabit(key: HabitKey) {
    setHabitRows((current) => current.filter((habit) => habit.key !== key))
    setHabits((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  return (
    <SubPage title="Goals & Targets" back={back}>
      <Card className="mt-5 space-y-4">
        {focusGoals.map((goal, index) => {
          const rank = index === 0 ? 'Primary' : index === 1 ? 'Secondary' : 'Tertiary'
          const dot = index === 0 ? 'var(--signal)' : index === 1 ? 'var(--vital)' : 'var(--label)'
          return (
            <div key={goal} className="grid grid-cols-[104px_1fr] items-center gap-3">
              <span className="flex min-w-0 items-center gap-3 text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} />
                <span>{rank}</span>
              </span>
              <span className="font-semibold">{goal}</span>
            </div>
          )
        })}
        {focusGoals.length === 0 && <p className="text-[13px]" style={{ color: 'var(--text-soft)' }}>Choose up to three focus goals below.</p>}
      </Card>
      <Section title="Focus goals" right={`${focusGoals.length}/3`} />
      <Card>
        <p className="mb-4 text-[13px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>Pick up to three, in order. Your top goal shapes what your dashboard highlights first.</p>
        <div className="space-y-2">
          {goals.map((goal) => {
            const order = focusGoals.indexOf(goal) + 1
            return (
              <button key={goal} onClick={() => toggleGoal(goal)} className="flex min-h-[48px] w-full items-center gap-3 rounded-[12px] border px-3 text-left" style={{ background: order ? 'var(--vital-fill)' : 'transparent', borderColor: order ? 'var(--vital-border)' : 'var(--line)' }}>
                <span className="flex h-6 w-6 items-center justify-center rounded-[7px] border text-[12px] font-black" style={{ background: order ? 'var(--button-primary-bg)' : 'transparent', borderColor: order ? 'transparent' : 'var(--line)', color: order ? 'white' : 'var(--label)', boxShadow: order ? 'var(--button-primary-shadow)' : 'none' }}>{order || ''}</span>
                <span className="font-semibold" style={{ color: order ? 'var(--fg)' : 'var(--text-soft)' }}>{goal}</span>
              </button>
            )
          })}
        </div>
      </Card>
      <Section title="Targets" />
      <Card className="p-0">
        {targets.length === 0 && (
          <p className="px-4 py-5 text-[13px]" style={{ color: 'var(--text-soft)' }}>No targets yet. Targets you set will appear here.</p>
        )}
        {targets.map((target, index) => (
          <div key={target.label} className="flex min-h-[47px] items-center gap-3 px-4" style={{ borderTop: index ? '1px solid var(--line)' : 'none' }}>
            <span className="flex-1 font-semibold">{target.label}</span>
            {editingTarget === target.label ? (
              <input
                value={target.value}
                onChange={(event) => setTargets((current) => current.map((item) => item.label === target.label ? { ...item, value: event.target.value } : item))}
                onBlur={() => setEditingTarget(null)}
                className="mono h-8 w-24 rounded-[8px] border bg-transparent px-2 text-right text-[13px] font-semibold outline-none"
                style={{ borderColor: 'var(--line)', color: 'var(--fg)' }}
                autoFocus
              />
            ) : (
              <span className="mono font-semibold">{target.value}</span>
            )}
            <button onClick={() => setEditingTarget(target.label)} className="flex h-8 w-8 items-center justify-center rounded-[8px]" style={{ color: 'var(--label)' }}><Edit3 size={14} /></button>
          </div>
        ))}
      </Card>
      <Section title="Daily habits" right={`${habitRows.length} goals`} />
      <Card className="p-4">
        <div className="space-y-1">
          {habitRows.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex min-h-[50px] w-full items-center gap-3 rounded-[10px] px-1 text-left">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: 'var(--surface-2)', color: 'var(--label)' }}>
                <Icon size={18} />
              </span>
              <span className="flex-1 text-[14px] font-semibold">{label}</span>
              <button onClick={() => deleteHabit(key)} className="flex h-9 w-9 items-center justify-center rounded-[9px]" style={{ color: 'var(--neg)' }} aria-label={`Delete ${label}`}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </Card>
      <Card className="mt-3 p-4">
        <p className="text-[15px] font-semibold">Add habit</p>
        <p className="mt-1 text-[12px]" style={{ color: 'var(--text-soft)' }}>Create a custom habit - it shows on Today.</p>
        <input
          value={customName}
          onChange={(event) => setCustomName(event.target.value)}
          placeholder="Habit name (e.g. 10k steps)"
          className="mt-4 h-10 w-full rounded-[8px] border bg-transparent px-3 text-[13px] outline-none"
          style={{ borderColor: 'var(--line)', color: 'var(--fg)' }}
        />
        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--label)' }}>Choose an icon</p>
        <div className="mt-3 grid grid-cols-6 gap-2">
            {habitIconChoices.map((choice) => {
              const Icon = choice.icon
              const active = customIcon.name === choice.name
              return (
                <button
                  key={choice.name}
                  onClick={() => setCustomIcon(choice)}
                  className="flex h-10 w-10 items-center justify-center rounded-[10px] border"
                  style={{
                    background: active ? 'var(--signal-fill)' : 'var(--surface-2)',
                    borderColor: active ? 'var(--vital)' : 'var(--line)',
                    color: active ? 'var(--vital)' : 'var(--label)',
                  }}
                  title={choice.name}
                >
                  <Icon size={18} />
                </button>
              )
            })}
        </div>
        <button
          onClick={addCustomHabit}
          disabled={!customName.trim()}
          className="mt-8 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-semibold transition"
          style={{
            background: customName.trim() ? 'var(--vital)' : 'var(--surface-2)',
            color: customName.trim() ? '#fff' : 'var(--label)',
            opacity: customName.trim() ? 1 : 0.65,
          }}
        >
          <Plus size={17} /> Add habit
        </button>
      </Card>
    </SubPage>
  )
}

function AccountSub({ demoMode, back, backLabel = 'More', profileName, profileInitials, profilePhoto, setProfileName, setProfileInitials, setProfilePhoto, activities, focusGoals }: { demoMode: boolean; back: () => void; backLabel?: string; profileName: string; profileInitials: string; profilePhoto: string | null; setProfileName: (name: string) => void; setProfileInitials: (initials: string) => void; setProfilePhoto: (photo: string | null) => void; activities: string[]; focusGoals: Goal[] }) {
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(profileName)
  const [draftInitials, setDraftInitials] = useState(profileInitials)
  const [draftPhoto, setDraftPhoto] = useState<string | null>(profilePhoto)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  function startEdit() {
    setDraftName(profileName)
    setDraftInitials(profileInitials)
    setDraftPhoto(profilePhoto)
    setEditing(true)
  }
  function saveProfile() {
    const nextName = draftName.trim() || profileName
    const nextInitials = draftInitials.trim().slice(0, 3).toUpperCase() || profileInitials
    setProfileName(nextName)
    setProfileInitials(nextInitials)
    setProfilePhoto(draftPhoto)
    setEditing(false)
  }
  function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setDraftPhoto(reader.result)
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }
  const shownPhoto = editing ? draftPhoto : profilePhoto
  return (
    <Page>
      <BackLink label={backLabel} onClick={back} />
      <div className="pt-4">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <button type="button" onClick={() => editing ? fileInputRef.current?.click() : startEdit()} className="flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-full text-[18px] font-black text-white" style={{ background: 'var(--button-primary-bg)', boxShadow: 'var(--button-primary-shadow)' }} aria-label={editing ? 'Upload profile photo' : 'Edit profile photo'}>
              {shownPhoto ? <img src={shownPhoto} alt="" className="h-full w-full object-cover" /> : profileInitials}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="space-y-2">
                <input value={draftName} onChange={(event) => setDraftName(event.target.value)} className="h-10 w-full rounded-[10px] border bg-transparent px-3 text-[15px] font-black outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} aria-label="Profile name" />
                <div className="flex items-center gap-2">
                  <input value={draftInitials} onChange={(event) => setDraftInitials(event.target.value.toUpperCase())} className="h-9 w-20 rounded-[10px] border bg-transparent px-3 text-[13px] font-black outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} aria-label="Avatar initials" maxLength={3} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex min-h-9 items-center gap-1.5 rounded-[10px] border px-3 text-[12px] font-semibold" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}><Camera size={14} /> Photo</button>
                  {draftPhoto && <button type="button" onClick={() => setDraftPhoto(null)} className="flex min-h-9 items-center justify-center rounded-[10px] border px-3" style={{ borderColor: 'var(--danger-border)', color: 'var(--danger)', background: 'var(--danger-fill)' }} aria-label="Remove profile photo"><Trash2 size={14} /></button>}
                </div>
              </div>
            ) : (
              <>
                <h1 className="truncate text-[22px] font-black leading-tight">{profileName}</h1>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--text-soft)' }}>Personal fitness journal</p>
                <p className="mt-0.5 text-[12px]" style={{ color: 'var(--label)' }}>Member since May 2026</p>
              </>
            )}
          </div>
          <button type="button" onClick={editing ? saveProfile : startEdit} className="min-h-[34px] rounded-[10px] border px-4 text-[13px] font-semibold" style={{ borderColor: 'var(--border-strong)', background: 'var(--surface-1)' }}>{editing ? 'Save' : 'Edit'}</button>
        </div>
        {editing && <p className="mt-3 text-[12px]" style={{ color: 'var(--text-soft)' }}>Upload a photo, remove it to return to initials, or update the display name.</p>}
      </div>

      <Card className="mt-4" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-strong)', boxShadow: 'var(--shadow-card)' }}>
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>Activities</p>
        <div className="flex flex-wrap gap-2">
          {activities.slice(0, 5).map((activity) => {
            const visual = activityVisual(activity)
            return (
              <Pill key={activity} tone={visual.tone}>
                <span className="mr-1.5"><ActivityIcon activity={activity} size={13} /></span>{activity}
              </Pill>
            )
          })}
        </div>
        <div className="my-3 h-px" style={{ background: 'var(--line)' }} />
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>Goals</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {focusGoals.map((goal) => {
            const visual = goalVisual(goal)
            return (
              <span key={goal} className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
                <span style={{ color: tones[visual.tone].fg }}><GoalIcon goal={goal} size={14} /></span>
                {goal}
              </span>
            )
          })}
        </div>
      </Card>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Card className="flex min-h-[62px] flex-col items-center justify-center p-3 text-center" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-strong)', boxShadow: 'var(--shadow-card)' }}>
          <p className="mono text-[22px] font-black leading-none">{demoMode ? '42' : '0'}</p>
          <p className="mt-1 text-[10px]" style={{ color: 'var(--text-soft)' }}>Days Active</p>
        </Card>
        <Card className="flex min-h-[62px] flex-col items-center justify-center p-3 text-center" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-strong)', boxShadow: 'var(--shadow-card)' }}>
          <p className="mono text-[22px] font-black leading-none">{demoMode ? '128' : '0'}</p>
          <p className="mt-1 text-[10px]" style={{ color: 'var(--text-soft)' }}>Logged</p>
        </Card>
        <Card className="flex min-h-[62px] flex-col items-center justify-center p-3 text-center" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-strong)', boxShadow: 'var(--shadow-card)' }}>
          <p className="mono text-[22px] font-black leading-none" style={{ color: 'var(--ember)' }}>{demoMode ? '12' : '0'}</p>
          <p className="mt-1 text-[10px]" style={{ color: 'var(--text-soft)' }}>Day Streak</p>
        </Card>
      </div>
    </Page>
  )
}

function MeasurementsSub({ back, shownMeasurements, setShownMeasurements, logs, onDelete }: { back: () => void; shownMeasurements: string[]; setShownMeasurements: React.Dispatch<React.SetStateAction<string[]>>; logs: MeasurementLog[]; onDelete: (id: string) => void }) {
  const [selectedEntry, setSelectedEntry] = useState<MeasurementLog | null>(null)
  const visibleMeasurements = shownMeasurements.filter((measurement) => logs.some((entry) => entry.values[measurement]))
  const previewMeasurements = ['Body weight', 'Body fat', 'Waist'].filter((measurement) => visibleMeasurements.includes(measurement))
  const detailMeasurements = selectedEntry
    ? allMeasurements
        .map((measurement) => ({ measurement, value: selectedEntry.values[measurement] }))
        .filter((item): item is { measurement: string; value: string } => Boolean(item.value))
    : []

  function toggleMeasurement(measurement: string) {
    setShownMeasurements((current) => current.includes(measurement) ? current.filter((item) => item !== measurement) : [...current, measurement])
  }

  if (selectedEntry) {
    return (
      <Page>
        <BackLink label="Measurements" onClick={() => setSelectedEntry(null)} />
        <h1 className="mt-7 text-[22px] font-black">{selectedEntry.date}</h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-soft)' }}>Full measurement check-in</p>
        <Section title="Measurements" right={`${detailMeasurements.length} logged`} />
        <Card className="overflow-hidden p-0">
          {detailMeasurements.map(({ measurement, value }, index) => (
            <div key={measurement} className="grid min-h-[48px] grid-cols-[1fr_auto] items-center gap-4 px-4 py-3" style={{ borderTop: index ? '1px solid var(--line)' : 'none' }}>
              <span className="text-[13px] font-semibold">{measurement}</span>
              <span className="mono text-[13px] font-bold">{value}</span>
            </div>
          ))}
        </Card>
        <button type="button" onClick={() => { onDelete(selectedEntry.id); setSelectedEntry(null) }} className="mt-4 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[12px] border text-[13px] font-semibold" style={{ borderColor: 'var(--danger-border)', color: 'var(--danger)', background: 'var(--danger-fill)' }}>
          <Trash2 size={15} /> Delete this measurement
        </button>
      </Page>
    )
  }

  return (
    <SubPage title="Measurements" back={back}>
      <Section title="Measurements shown" right={`${shownMeasurements.length} on`} />
      <Card>
        <p className="mb-4 text-[13px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>Pick which metrics appear on your Progress page. Tap to add or remove.</p>
        <div className="flex flex-wrap gap-2">
          {allMeasurements.map((m) => {
            const on = shownMeasurements.includes(m)
            return <button key={m} onClick={() => toggleMeasurement(m)} className="rounded-full border px-3 py-2 text-[12px] font-semibold" style={{ background: on ? 'var(--vital-fill)' : 'transparent', color: on ? 'var(--button-secondary-fg)' : 'var(--text-soft)', borderColor: on ? 'var(--vital-border)' : 'var(--line)' }}>{on ? '✓' : '+'} {m}</button>
          })}
        </div>
      </Card>
      <Section title="Measurement Logs" right={`${logs.length} logs`} />
      {logs.length === 0 ? (
        <EmptyState icon={Ruler} title="No measurements logged yet" body="Record your first measurement from the Progress tab to start tracking check-ins." tone="vital" />
      ) : visibleMeasurements.length ? (
        <div className="space-y-3">
          {logs.map((entry) => {
            const loggedValues = visibleMeasurements
              .map((measurement) => ({ measurement, value: entry.values[measurement] }))
              .filter((item): item is { measurement: string; value: string } => Boolean(item.value))
            const previewValues = previewMeasurements
              .map((measurement) => ({ measurement, value: entry.values[measurement] }))
              .filter((item): item is { measurement: string; value: string } => Boolean(item.value))
            const moreCount = Math.max(loggedValues.length - previewValues.length, 0)
            return (
              <Card
                key={entry.id}
                className="p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-[14px] font-bold">{entry.date}</p>
                  <button type="button" onClick={() => onDelete(entry.id)} className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: 'var(--danger-fill)', color: 'var(--danger)' }} aria-label={`Delete measurement from ${entry.date}`}>
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="space-y-2">
                  {previewValues.map(({ measurement, value }) => (
                    <div key={measurement} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 text-[13px]">
                      <span className="font-medium" style={{ color: 'var(--text-soft)' }}>{measurement}</span>
                      <span className="mono font-bold">{value}</span>
                    </div>
                  ))}
                </div>
                {moreCount > 0 && <p className="mt-3 text-[12px] font-semibold" style={{ color: 'var(--label)' }}>+ {moreCount} more measurements</p>}
                <button type="button" onClick={() => setSelectedEntry(entry)} className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: 'var(--button-secondary-fg)' }}>
                  View Details <ChevronRight size={14} />
                </button>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <p className="text-[13px]" style={{ color: 'var(--text-soft)' }}>Turn on at least one measurement above to review check-ins here.</p>
        </Card>
      )}
    </SubPage>
  )
}

type DefaultWorkoutSelection = { category: DefaultCategory; focus: string; durationMin: number; exercises: GeneratedExercise[] }

type EditRow = { id: string; name: string; sets: string; reps: string }
type EditSection = { title: string; rows: EditRow[] }

function SheetSection({ title, rows }: { title: string; rows: Array<{ name: string; sets: number | string; reps: string }> }) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--label)' }}>{title}</p>
      <div className="overflow-hidden rounded-[12px] border" style={{ borderColor: 'var(--line)' }}>
        <div className="grid items-center gap-3 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em]" style={{ gridTemplateColumns: '1fr 40px 56px', color: 'var(--label)', borderBottom: '1px solid var(--line)' }}>
          <span>Exercise</span>
          <span className="text-center">Sets</span>
          <span className="text-center">Reps</span>
        </div>
        {rows.map((row, i) => (
          <div key={`${row.name}-${i}`} className="grid items-center gap-3 px-4 py-3" style={{ gridTemplateColumns: '1fr 40px 56px', borderTop: i ? '1px solid var(--line)' : 'none' }}>
            <span className="text-[13px] font-semibold">{row.name}</span>
            <span className="mono text-center text-[13px] font-bold" style={{ color: 'var(--text-soft)' }}>{row.sets}</span>
            <span className="mono text-center text-[13px] font-bold" style={{ color: 'var(--text-soft)' }}>{row.reps}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EditableSheetSection({ section, onChange }: { section: EditSection; onChange: (updated: EditSection) => void }) {
  function updateRow(id: string, field: 'name' | 'sets' | 'reps', value: string) {
    onChange({ ...section, rows: section.rows.map(r => r.id === id ? { ...r, [field]: value } : r) })
  }
  function deleteRow(id: string) {
    onChange({ ...section, rows: section.rows.filter(r => r.id !== id) })
  }
  function moveRow(id: string, dir: -1 | 1) {
    const rows = [...section.rows]
    const idx = rows.findIndex(r => r.id === id)
    const target = idx + dir
    if (target < 0 || target >= rows.length) return
    ;[rows[idx], rows[target]] = [rows[target], rows[idx]]
    onChange({ ...section, rows })
  }
  function addRow() {
    onChange({ ...section, rows: [...section.rows, { id: `${Date.now()}`, name: '', sets: '3', reps: '10' }] })
  }
  function renameTitle(value: string) {
    onChange({ ...section, title: value })
  }
  return (
    <div className="mt-5">
      <input value={section.title} onChange={e => renameTitle(e.target.value)} className="mb-2 bg-transparent text-[11px] font-black uppercase tracking-[0.18em] outline-none" style={{ color: 'var(--label)' }} />
      <div className="overflow-hidden rounded-[12px] border" style={{ borderColor: 'var(--line)' }}>
        <div className="grid items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]" style={{ gridTemplateColumns: '1fr 52px 60px 52px', color: 'var(--label)', borderBottom: '1px solid var(--line)' }}>
          <span>Exercise</span>
          <span className="text-center">Sets</span>
          <span className="text-center">Reps</span>
          <span />
        </div>
        {section.rows.map((row, i) => (
          <div key={row.id} className="grid items-center gap-2 px-3 py-2" style={{ gridTemplateColumns: '1fr 52px 60px 52px', borderTop: i ? '1px solid var(--line)' : 'none' }}>
            <input value={row.name} onChange={e => updateRow(row.id, 'name', e.target.value)} placeholder="Exercise name" className="min-w-0 bg-transparent text-[13px] font-semibold outline-none" style={{ color: 'var(--fg)' }} />
            <input value={row.sets} onChange={e => updateRow(row.id, 'sets', e.target.value)} className="mono h-8 w-full rounded-[6px] border bg-transparent px-1 text-center text-[13px] font-bold outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
            <input value={row.reps} onChange={e => updateRow(row.id, 'reps', e.target.value)} className="mono h-8 w-full rounded-[6px] border bg-transparent px-1 text-center text-[13px] font-bold outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
            <div className="flex items-center justify-end gap-1">
              <button type="button" onClick={() => moveRow(row.id, -1)} disabled={i === 0} className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[11px]" style={{ color: i === 0 ? 'var(--label)' : 'var(--text-soft)', background: 'var(--surface-2)' }} aria-label="Move up">↑</button>
              <button type="button" onClick={() => moveRow(row.id, 1)} disabled={i === section.rows.length - 1} className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[11px]" style={{ color: i === section.rows.length - 1 ? 'var(--label)' : 'var(--text-soft)', background: 'var(--surface-2)' }} aria-label="Move down">↓</button>
              <button type="button" onClick={() => deleteRow(row.id)} className="flex h-7 w-7 items-center justify-center rounded-[6px]" style={{ color: 'var(--danger)', background: 'var(--danger-fill)' }} aria-label="Remove exercise"><X size={13} /></button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addRow} className="flex min-h-[40px] w-full items-center justify-center gap-2 border-t text-[13px] font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--signal)' }}>
          <Plus size={15} /> Add exercise
        </button>
      </div>
    </div>
  )
}

function planToEditSections(plan: WorkoutPlan): EditSection[] {
  let warmUpId = 0
  let workoutId = 0
  return [
    { title: 'Warm-up', rows: plan.warmUp.map(ex => ({ id: `wu-${warmUpId++}`, name: ex.name, sets: String(ex.sets), reps: ex.reps })) },
    { title: 'Workout', rows: plan.workout.map(ex => ({ id: `wo-${workoutId++}`, name: ex.name, sets: String(ex.sets), reps: ex.reps })) },
  ]
}

function DefaultTemplateDetail({ category, primaryGoal, onBack, onUse }: {
  category: DefaultCategory
  primaryGoal?: Goal
  onBack: () => void
  onUse: (selection: DefaultWorkoutSelection) => void
}) {
  const variations = DEFAULT_TEMPLATE_VARIATIONS.filter((variation) => variation.category === category)
  const [durationMin, setDurationMin] = useState<number>(45)
  const [variationId, setVariationId] = useState(variations[0]?.id ?? '')
  const [editing, setEditing] = useState(false)
  const [editSections, setEditSections] = useState<EditSection[] | null>(null)

  const variation = variations.find((v) => v.id === variationId) ?? variations[0]
  const intent = trainingIntentForGoal(primaryGoal)
  const plan = buildDefaultWorkout(variation, durationMin, intent)

  function startEdit() {
    setEditSections(planToEditSections(plan))
    setEditing(true)
  }

  function cancelEdit() {
    setEditSections(null)
    setEditing(false)
  }

  function handleUse() {
    if (editing && editSections) {
      const allRows = editSections.flatMap(s => s.rows)
      const exercises = allRows.map(r => ({ name: r.name, sets: parseInt(r.sets) || 3, reps: r.reps, role: 'accessory' as const }))
      onUse({ category, focus: variation.focus, durationMin, exercises })
    } else {
      onUse({ category, focus: variation.focus, durationMin, exercises: plan.workout })
    }
  }

  const goalLabel = primaryGoal ? `${primaryGoal} — ${INTENT_LABEL[intent]}` : INTENT_LABEL[intent]

  return (
    <Page>
      <div className="flex items-center justify-between">
        <BackLink label="Workouts" onClick={onBack} />
        {!editing && (
          <button type="button" onClick={startEdit} className="flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-semibold" style={{ background: 'var(--surface-2)', color: 'var(--text-soft)' }}>
            <Edit3 size={14} /> Edit
          </button>
        )}
        {editing && (
          <button type="button" onClick={cancelEdit} className="rounded-[10px] px-3 py-2 text-[13px] font-semibold" style={{ color: 'var(--text-soft)' }}>Cancel</button>
        )}
      </div>
      <h1 className="mt-5 text-[24px] font-black leading-tight">{category}</h1>
      <p className="mt-1 text-[13px]" style={{ color: 'var(--text-soft)' }}>{goalLabel}</p>

      <Section title="Duration" />
      <div className="grid grid-cols-4 gap-2">
        {DEFAULT_WORKOUT_DURATIONS.map((d) => {
          const on = d === durationMin
          return (
            <button key={d} type="button" onClick={() => { setDurationMin(d); setEditSections(null); setEditing(false) }} className="min-h-[44px] rounded-[12px] border text-[13px] font-bold" style={{ background: on ? 'var(--button-primary-surface)' : 'transparent', borderColor: on ? 'transparent' : 'var(--line)', color: on ? 'var(--on-accent)' : 'var(--text-soft)', boxShadow: on ? 'var(--button-primary-shadow)' : 'none' }} aria-pressed={on}>{d}m</button>
          )
        })}
      </div>

      <Section title="Variation" />
      <div className="flex flex-wrap gap-2">
        {variations.map((v) => {
          const on = v.id === variation.id
          return (
            <button key={v.id} type="button" onClick={() => { setVariationId(v.id); setEditSections(null); setEditing(false) }} className="rounded-full border px-3.5 py-2 text-[12px] font-semibold" style={{ background: on ? 'var(--signal-fill)' : 'transparent', borderColor: on ? 'var(--signal-border)' : 'var(--line)', color: on ? 'var(--signal)' : 'var(--text-soft)' }} aria-pressed={on}>{v.focus}</button>
          )
        })}
      </div>

      {!editing && (
        <>
          <SheetSection title="Warm-up" rows={plan.warmUp} />
          <SheetSection title="Workout" rows={plan.workout} />
        </>
      )}

      {editing && editSections && editSections.map((section, i) => (
        <EditableSheetSection key={i} section={section} onChange={updated => {
          const next = [...editSections]
          next[i] = updated
          setEditSections(next)
        }} />
      ))}

      <div className="sticky bottom-0 pb-6 pt-3" style={{ background: 'var(--bg)' }}>
        <button type="button" onClick={handleUse} className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[13px] text-[15px] font-black" style={{ background: 'var(--button-primary-surface)', color: 'var(--on-accent)', boxShadow: 'var(--button-primary-shadow)' }}>
          Use this workout <ChevronRight size={17} />
        </button>
      </div>
    </Page>
  )
}

function TemplatesSub({ back, templates, setTemplates, onOpenTemplate, onOpenDefault, onCreate }: { back: () => void; templates: WorkoutTemplate[]; setTemplates: React.Dispatch<React.SetStateAction<WorkoutTemplate[]>>; onOpenTemplate: (template: WorkoutTemplate) => void; onOpenDefault: (category: DefaultCategory) => void; onCreate: () => void }) {
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<Goal | 'All'>('All')
  const filtered = templates
    .filter((template) => [template.name, template.notes, ...template.tags, ...template.activities].join(' ').toLowerCase().includes(query.toLowerCase()))
    .filter((template) => tag === 'All' || template.tags.includes(tag))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name))
  function toggleFavorite(id: string) {
    setTemplates((current) => current.map((template) => template.id === id ? { ...template, favorite: !template.favorite } : template))
  }

  return (
    <SubPage title="Workout Templates" back={back}>

      {/* ── Built-in Templates ─────────────────────────────────────────────── */}
      <Section title="Built-in Templates" />
      <p className="mb-3 text-[13px]" style={{ color: 'var(--text-soft)' }}>Scales to your time and goal. Tap to preview.</p>
      <div className="grid grid-cols-2 gap-2">
        {DEFAULT_CATEGORIES.map((category) => (
          <button key={category} type="button" onClick={() => onOpenDefault(category)} className="flex min-h-[66px] items-start rounded-[13px] border px-4 py-3 text-left" style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-black">{category}</span>
              <span className="mt-0.5 block text-[11px] leading-snug" style={{ color: 'var(--text-soft)' }}>{CATEGORY_VARIATION_LABELS[category]}</span>
            </span>
            <ChevronRight size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--label)' }} />
          </button>
        ))}
      </div>

      {/* ── Saved Templates ────────────────────────────────────────────────── */}
      <div className="mt-6 mb-3 flex items-center gap-3">
        <p className="shrink-0 text-[11px] font-black uppercase tracking-[0.20em]" style={{ color: 'var(--label)' }}>Saved Templates</p>
        <div className="h-px flex-1" style={{ background: 'var(--line)' }} />
        {templates.length > 0 && <span className="shrink-0 text-[11px] font-semibold" style={{ color: 'var(--label)' }}>{templates.length} saved</span>}
        <button type="button" onClick={onCreate} className="flex shrink-0 items-center gap-1 rounded-[9px] px-3 py-1.5 text-[11px] font-bold" style={{ background: 'var(--vital-fill)', color: 'var(--button-secondary-fg)', border: '1px solid var(--vital-border)' }}>
          <Plus size={12} /> Create
        </button>
      </div>
      {templates.length > 0 && (
        <>
          <div className="mb-3 flex min-h-[42px] items-center gap-2 rounded-[10px] border px-3" style={{ background: 'var(--surface-1)', borderColor: 'var(--line)' }}>
            <Search size={16} style={{ color: 'var(--label)' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search saved templates" className="min-w-0 flex-1 bg-transparent text-[13px] font-normal outline-none" style={{ color: 'var(--text-soft)' }} />
          </div>
          <div className="-mx-[2px] mb-3 flex gap-2 overflow-x-auto pb-1 pl-[2px]">
            {(['All', 'Weight Loss', 'Muscle Gain', 'Strength'] as const).map((goal) => (
              <button key={goal} onClick={() => setTag(goal)} className="shrink-0 rounded-full border px-4 py-2 text-[12px] font-medium" style={{ background: tag === goal ? 'var(--vital-fill)' : 'var(--surface-1)', borderColor: tag === goal ? 'var(--vital-border)' : 'var(--line)', color: tag === goal ? 'var(--button-secondary-fg)' : 'var(--text-soft)' }}>{goal}</button>
            ))}
          </div>
        </>
      )}
      <div className="space-y-3">
        {templates.length === 0 && (
          <p className="text-[13px]" style={{ color: 'var(--text-soft)' }}>No saved templates yet. Tap <strong>Create</strong> above to build one from scratch, or log a workout and save it as a template.</p>
        )}
        {templates.length > 0 && filtered.length === 0 && (
          <Card className="px-4 py-6 text-center"><p className="text-[13px]" style={{ color: 'var(--text-soft)' }}>No templates match your filters.</p></Card>
        )}
        {filtered.map((template) => (
          <Card key={template.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <button type="button" onClick={() => onOpenTemplate(template)} className="min-w-0 flex-1 text-left">
                <p className="text-[16px] font-semibold">{template.name}</p>
                <p className="mt-1 text-[13px] font-normal" style={{ color: 'var(--text-soft)' }}>{template.activities.length} {template.activities.length === 1 ? 'activity' : 'activities'}{template.defaultDurationMinutes ? ` · ${template.defaultDurationMinutes} min` : ''}</p>
              </button>
              <button type="button" onClick={() => toggleFavorite(template.id)} className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ color: template.favorite ? 'var(--ember)' : 'var(--label)', background: 'var(--surface-2)' }} aria-label={`Favorite ${template.name}`}>
                <Star size={17} fill={template.favorite ? 'currentColor' : 'none'} />
              </button>
            </div>
            <button type="button" onClick={() => onOpenTemplate(template)} className="mt-4 flex w-full flex-wrap gap-2 text-left">
              {template.tags.map((goal) => <Pill key={goal} tone={goalTone(goal)}>{goal}</Pill>)}
            </button>
            <button type="button" onClick={() => onOpenTemplate(template)} className="mt-4 flex w-full items-center gap-4 border-t pt-3 text-left text-[12px] font-normal" style={{ borderColor: 'var(--line)', color: 'var(--text-soft)' }}>
              <span className="flex items-center gap-1"><Clock size={13} /> Last used <span className="ml-1 font-semibold" style={{ color: 'var(--fg)' }}>{template.lastUsed}</span></span>
              <span className="flex items-center gap-1"><LineChart size={13} /> <span className="font-semibold" style={{ color: 'var(--fg)' }}>{template.timesUsed} times</span></span>
            </button>
          </Card>
        ))}
      </div>
    </SubPage>
  )
}

function TemplateDetailSub({ back, template, mode, onUse, onEdit, onDuplicate, onDelete }: { back: () => void; template: WorkoutTemplate; mode: 'profile' | 'workout'; onUse: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void }) {
  return (
    <Page>
      <BackLink label="Templates" onClick={back} />
      <h1 className="mt-6 text-[24px] font-black leading-tight">{template.name}</h1>
      <p className="mt-1 text-[13px]" style={{ color: 'var(--text-soft)' }}>Used {template.timesUsed} times · last {template.lastUsed}</p>
      {mode === 'profile' && <div className="mt-4 rounded-[12px] border px-3 py-2 text-[12px]" style={{ background: 'var(--signal-fill)', borderColor: 'var(--signal-border)', color: 'var(--text-soft)' }}>Use this template, then choose a date on Calendar.</div>}

      {template.defaultDurationMinutes && <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--text-soft)' }}><Clock size={13} /> {template.defaultDurationMinutes} min</div>}

      {template.tags.length > 0 && (
        <>
          <Section title="Goal tags" />
          <div className="flex flex-wrap gap-2">{template.tags.map((goal) => <Pill key={goal} tone={goalTone(goal)}>{goal}</Pill>)}</div>
        </>
      )}

      {/* Structured activity data (created via the builder). Falls back to a
          plain activity list + exercise blocks for older/built-in templates. */}
      {template.activityDetails && template.activityDetails.length > 0 ? (
        <div className="mt-5 space-y-3">
          {template.activityDetails.map((detail, i) => <ActivityDetailView key={i} detail={detail} />)}
        </div>
      ) : (
        <>
          <div className="mt-5">
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--label)' }}>Activities</p>
            <div className="overflow-hidden rounded-[12px] border" style={{ borderColor: 'var(--line)' }}>
              {template.activities.map((activity, i) => {
                const visual = activityVisual(activity)
                return (
                  <div key={activity} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i ? '1px solid var(--line)' : 'none' }}>
                    <IconChip icon={visual.icon} tone={visual.tone} />
                    <span className="text-[14px] font-semibold">{activity}</span>
                  </div>
                )
              })}
            </div>
          </div>
          {template.exercises && template.exercises.length > 0 && template.exercises.map((block, bi) => (
            <div key={bi} className="mt-5">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--label)' }}>{block.title}</p>
              <div className="overflow-hidden rounded-[12px] border" style={{ borderColor: 'var(--line)' }}>
                {block.items.map((ex, j) => (
                  <div key={j} className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--surface-2)', borderTop: j ? '1px solid var(--line)' : 'none' }}>
                    <span className="text-[13px] font-semibold">{ex.name}</span>
                    <span className="text-[12px]" style={{ color: 'var(--text-soft)' }}>{ex.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {template.notes.trim() && (
        <>
          <Section title="Notes" />
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>{template.notes}</p>
        </>
      )}
      <button onClick={onUse} className="mt-6 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[12px] text-[15px] font-bold" style={{ background: 'var(--button-primary-surface)', color: 'var(--on-accent)', boxShadow: 'var(--button-primary-shadow)' }}>
        <Dumbbell size={17} /> Use Template
      </button>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={onEdit} className="flex min-h-[48px] items-center justify-center gap-2 rounded-[12px] border text-[14px] font-bold" style={{ borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)', background: 'var(--vital-fill)' }}>
          <Edit3 size={16} /> Edit
        </button>
        <button onClick={onDuplicate} className="flex min-h-[48px] items-center justify-center gap-2 rounded-[12px] border text-[14px] font-bold" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }}>
          <Copy size={16} /> Duplicate
        </button>
      </div>
      <button onClick={onDelete} className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[12px] border text-[14px] font-bold" style={{ borderColor: 'var(--danger-border)', color: 'var(--danger)' }}>
        <Trash2 size={16} /> Delete Template
      </button>
    </Page>
  )
}

function ActivitiesSub({ back, activities, setActivities }: { back: () => void; activities: string[]; setActivities: React.Dispatch<React.SetStateAction<string[]>> }) {
  const [customActivity, setCustomActivity] = useState('')
  function toggleActivity(activity: string) {
    setActivities((current) => current.includes(activity) ? current.filter((item) => item !== activity) : [...current, activity])
  }
  function addCustomActivity() {
    const next = customActivity.trim()
    if (!next) return
    setActivities((current) => current.includes(next) ? current : [...current, next])
    setCustomActivity('')
  }
  // Built-in options plus any custom activities the user added (which aren't in
  // the preset list) — so a freshly added custom activity shows up immediately.
  const customActivities = activities.filter((activity) => !allActivities.includes(activity))
  const activityOptions = [...allActivities, ...customActivities]

  return (
    <SubPage title="Activities" back={back}>
      <Section title="Your activities" right={`${activities.length} on`} />
      <Card>
        <p className="mb-4 text-[13px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>Pick the ways you train. These shape your logging options, monthly summaries, and Timeline filters.</p>
        <div className="flex flex-wrap gap-2">
          {activityOptions.map((activity) => {
            const on = activities.includes(activity)
            return <button key={activity} onClick={() => toggleActivity(activity)} className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-semibold" style={{ background: on ? 'var(--vital-fill)' : 'transparent', color: on ? 'var(--button-secondary-fg)' : 'var(--text-soft)', borderColor: on ? 'var(--vital-border)' : 'var(--line)' }}><ActivityIcon activity={activity} size={15} />{activity}</button>
          })}
        </div>
      </Card>
      <Card className="mt-3">
        <p className="text-[15px] font-semibold">Custom activity</p>
        <div className="mt-3 flex gap-2">
          <input value={customActivity} onChange={(event) => setCustomActivity(event.target.value)} placeholder="Activity name" className="h-10 min-w-0 flex-1 rounded-[10px] border bg-transparent px-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
          <button onClick={addCustomActivity} disabled={!customActivity.trim()} className="rounded-[10px] px-4 text-[13px] font-semibold" style={{ background: customActivity.trim() ? 'var(--button-primary-bg)' : 'var(--surface-2)', color: customActivity.trim() ? '#fff' : 'var(--label)', boxShadow: customActivity.trim() ? 'var(--button-primary-shadow)' : 'none' }}>Add</button>
        </div>
      </Card>
    </SubPage>
  )
}

function CoachComingSoonSub({ back }: { back: () => void }) {
  return (
    <SubPage title="Coach Connection" back={back}>
      <Card className="mt-5 text-center">
        <IconChip icon={Users} tone="signal" />
        <h2 className="mt-4 text-[18px] font-black">Coming Soon</h2>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>Future updates will allow you to connect with a trainer, share progress, share workouts, share measurements, and receive feedback.</p>
      </Card>
    </SubPage>
  )
}

type OuraLatestData = {
  date: string
  readiness_score: number | null
  sleep_score: number | null
  activity_score: number | null
  steps: number | null
} | null

function ConnectedAppsSub({ back, demoMode = false }: { back: () => void; demoMode?: boolean }) {
  const [ouraStatus, setOuraStatus] = useState<{
    status: 'setup_required' | 'sign_in_required' | 'not_connected' | 'connected' | 'error'
    connected: boolean
    message?: string
    lastSyncedAt?: string | null
    lastError?: string | null
    latestData?: OuraLatestData
  }>({ status: 'not_connected', connected: false })
  const [ouraLoading, setOuraLoading] = useState(true)
  const [ouraBusy, setOuraBusy] = useState(false)
  const [message, setMessage] = useState('')
  const moreApps = [
    { name: 'Garmin', icon: Clock },
    { name: 'Whoop', icon: Square },
    { name: 'Fitbit', icon: Activity },
    { name: 'MyFitnessPal', icon: Apple },
  ]

  async function loadOuraStatus() {
    if (demoMode) {
      setOuraStatus({ status: 'not_connected', connected: false, message: 'Connect Oura Ring when you create an account.' })
      setOuraLoading(false)
      return
    }
    setOuraLoading(true)
    try {
      const response = await fetch('/api/integrations/oura/status', { cache: 'no-store' })
      const data = await response.json()
      setOuraStatus({
        status: data.status ?? 'error',
        connected: Boolean(data.connected),
        message: data.message,
        lastSyncedAt: data.lastSyncedAt,
        lastError: data.lastError,
        latestData: data.latestData ?? null,
      })
    } catch {
      setOuraStatus({ status: 'error', connected: false, message: 'Unable to load Oura status' })
    } finally {
      setOuraLoading(false)
    }
  }

  useEffect(() => {
    loadOuraStatus()
  }, [])

  function showLocalMessage(nextMessage: string) {
    setMessage(nextMessage)
    window.setTimeout(() => setMessage(''), 1800)
  }

  function connectOura() {
    if (demoMode) {
      showLocalMessage('Create an account to connect Oura')
      return
    }
    setOuraBusy(true)
    window.location.assign('/api/integrations/oura/start')
  }

  async function disconnectOuraApp() {
    setOuraBusy(true)
    try {
      const response = await fetch('/api/integrations/oura/disconnect', { method: 'POST' })
      const data = await response.json()
      setOuraStatus({ status: data.status ?? 'not_connected', connected: Boolean(data.connected), message: data.message })
      showLocalMessage('Oura disconnected')
    } catch {
      setOuraStatus((current) => ({ ...current, status: 'error', message: 'Unable to disconnect Oura' }))
      showLocalMessage('Unable to disconnect Oura')
    } finally {
      setOuraBusy(false)
    }
  }

  async function testOuraFetch() {
    setOuraBusy(true)
    try {
      const response = await fetch('/api/integrations/oura/test-fetch', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error('verify_failed')
      showLocalMessage('Connection verified')
      await loadOuraStatus()
    } catch {
      setOuraStatus((current) => ({ ...current, status: 'error', lastError: 'verify_failed' }))
      showLocalMessage('Connection verification failed')
    } finally {
      setOuraBusy(false)
    }
  }

  async function syncOuraData() {
    setOuraBusy(true)
    try {
      const response = await fetch('/api/integrations/oura/sync', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Oura sync failed')
      showLocalMessage(data.daysCount > 0 ? `Synced ${data.daysCount} days` : 'No new data')
      if (data.latest) {
        setOuraStatus((current) => ({
          ...current,
          lastSyncedAt: new Date().toISOString(),
          lastError: null,
          latestData: data.latest,
        }))
      }
    } catch {
      setOuraStatus((current) => ({ ...current, status: 'error', lastError: 'sync_failed' }))
      showLocalMessage('Unable to sync Oura data')
    } finally {
      setOuraBusy(false)
    }
  }


  const ouraConnected = ouraStatus.connected
  const ouraStatusText = ouraLoading
    ? 'Checking...'
    : ouraStatus.status === 'setup_required'
      ? 'Oura setup required'
      : ouraStatus.status === 'sign_in_required'
        ? 'Sign in required'
        : ouraStatus.status === 'error'
          ? 'Connection needs attention'
          : ouraConnected
            ? 'Connected'
            : 'Not connected'
  const ouraStatusColor = ouraConnected && ouraStatus.status !== 'error'
    ? 'var(--vital)'
    : ouraStatus.status === 'error' || ouraStatus.status === 'setup_required'
      ? 'var(--ember)'
      : 'var(--label)'
  const ouraActionDisabled = ouraLoading || ouraBusy

  function formatLastSynced(value?: string | null) {
    if (!value) return 'Awaiting first sync'
    return `Last synced ${new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
  }

  return (
    <SubPage title="Connected Apps" back={back}>
      <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>Connect apps and devices to automatically import health, activity, and recovery data.</p>

      <Section title="Available" />
      <div className="space-y-3">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <IconChip icon={Heart} tone="vital" />
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-black">Apple Health</p>
              <p className="mt-1 text-[13px] leading-snug" style={{ color: 'var(--text-soft)' }}>Sync workouts, activity, steps, heart rate, and health metrics.</p>
            </div>
          </div>
          <div className="my-4 h-px" style={{ background: 'var(--line)' }} />
          <div className="flex min-h-[42px] items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: 'var(--label)' }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--label)' }} />
                Coming soon
              </p>
            </div>
            <button type="button" disabled className="min-h-[38px] rounded-[12px] border px-5 text-[13px] font-bold opacity-70" style={{ borderColor: 'var(--line)', color: 'var(--text-soft)' }}>Soon</button>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <IconChip icon={Target} tone="vital" />
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-black">Oura</p>
              <p className="mt-1 text-[13px] leading-snug" style={{ color: 'var(--text-soft)' }}>Import sleep, readiness, HRV, recovery, and activity insights.</p>
            </div>
          </div>
          <div className="my-4 h-px" style={{ background: 'var(--line)' }} />
          <div className="flex min-h-[42px] items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: ouraStatusColor }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: ouraStatusColor }} />
                {ouraStatusText}
              </p>
              {ouraConnected && (
                <p className="mono mt-1 text-[11px]" style={{ color: 'var(--label)' }}>
                  {formatLastSynced(ouraStatus.lastSyncedAt)}
                </p>
              )}
              {!ouraConnected && ouraStatus.message && (
                <p className="mt-1 text-[11px] leading-snug" style={{ color: 'var(--label)' }}>
                  {ouraStatus.message}
                </p>
              )}
              {ouraConnected && ouraStatus.lastError && (
                <p className="mt-1 text-[11px] leading-snug" style={{ color: 'var(--ember)' }}>
                  Last sync had an issue — tap Sync to retry
                </p>
              )}
            </div>
            {ouraStatus.status === 'setup_required' ? (
              <button type="button" disabled className="min-h-[38px] rounded-[12px] border px-5 text-[13px] font-bold opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--text-soft)' }}>
                Unavailable
              </button>
            ) : !ouraConnected ? (
              <button
                type="button"
                onClick={connectOura}
                disabled={ouraActionDisabled}
                className="min-h-[38px] rounded-[12px] px-5 text-[13px] font-bold disabled:opacity-60"
                style={{
                  background: 'var(--button-primary-surface)',
                  border: '1px solid var(--button-primary-bg)',
                  color: 'var(--on-accent)',
                  boxShadow: 'var(--button-primary-shadow)',
                }}
              >
                {ouraBusy ? 'Working...' : 'Connect'}
              </button>
            ) : null}
          </div>
          {ouraConnected && (
            <div className="mt-3 space-y-2">
              <button type="button" onClick={syncOuraData} disabled={ouraBusy} className="min-h-[42px] w-full rounded-[11px] text-[13px] font-bold disabled:opacity-60" style={{ background: 'var(--button-primary-surface)', color: '#fff', boxShadow: 'var(--button-primary-shadow)' }}>
                {ouraBusy ? 'Syncing...' : 'Sync Oura Data'}
              </button>
              <button type="button" onClick={testOuraFetch} disabled={ouraBusy} className="min-h-[38px] w-full rounded-[11px] border text-[13px] font-semibold disabled:opacity-60" style={{ background: 'var(--surface-2)', borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)', boxShadow: 'var(--button-secondary-shadow)' }}>
                Verify connection
              </button>
              <button type="button" onClick={disconnectOuraApp} disabled={ouraBusy} className="min-h-[38px] w-full rounded-[11px] border text-[13px] font-semibold disabled:opacity-60" style={{ background: 'transparent', borderColor: 'var(--danger-border)', color: 'var(--danger)' }}>
                Disconnect
              </button>            </div>
          )}
          {ouraConnected && ouraStatus.latestData && (
            <div className="mt-4 rounded-[11px] p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
              <p className="mono mb-2 text-[10px] uppercase tracking-widest" style={{ color: 'var(--label)' }}>
                {new Date(ouraStatus.latestData.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {ouraStatus.latestData.readiness_score != null && (
                  <div className="text-center">
                    <p className="text-[18px] font-black" style={{ color: 'var(--vital)' }}>{ouraStatus.latestData.readiness_score}</p>
                    <p className="text-[10px]" style={{ color: 'var(--label)' }}>Readiness</p>
                  </div>
                )}
                {ouraStatus.latestData.sleep_score != null && (
                  <div className="text-center">
                    <p className="text-[18px] font-black" style={{ color: 'var(--pulse)' }}>{ouraStatus.latestData.sleep_score}</p>
                    <p className="text-[10px]" style={{ color: 'var(--label)' }}>Sleep</p>
                  </div>
                )}
                {ouraStatus.latestData.steps != null && (
                  <div className="text-center">
                    <p className="text-[18px] font-black" style={{ color: 'var(--signal)' }}>{ouraStatus.latestData.steps >= 1000 ? `${Math.round(ouraStatus.latestData.steps / 100) / 10}k` : ouraStatus.latestData.steps}</p>
                    <p className="text-[10px]" style={{ color: 'var(--label)' }}>Steps</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Section title="More integrations" />
      <div className="space-y-2">
        {moreApps.map(({ name, icon: Icon }) => (
          <Card key={name} className="flex min-h-[66px] items-center gap-3 p-4" style={{ opacity: 0.62 }}>
            <IconChip icon={Icon} tone="slate" />
            <p className="flex-1 font-semibold">{name}</p>
            <span className="text-[12px] font-semibold" style={{ color: 'var(--label)' }}>Coming Soon</span>
          </Card>
        ))}
      </div>

      <Section title="Why connect apps" />
      <Card>
        <p className="text-[15px] font-bold leading-snug">Connected data can power personalized insights.</p>
        <div className="mt-4 space-y-3">
          {['Sleep quality may influence performance', 'Recovery trends may affect training readiness', 'Daily habits can impact goal progress'].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <IconChip icon={LineChart} tone="signal" />
              <p className="text-[13px] font-semibold leading-snug">{item}</p>
            </div>
          ))}
        </div>
      </Card>
      {message && (
        <div className="fixed bottom-[96px] left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-[12px] border px-4 py-3 text-[13px] font-semibold shadow-2xl" style={{ background: 'var(--surface-1)', borderColor: 'var(--line)', color: 'var(--fg)' }}>
          <Check size={16} />
          {message}
        </div>
      )}
    </SubPage>
  )
}

function CoachSub({ back, connect }: { back: () => void; connect: () => void }) {
  const permissions = ['Share progress', 'Share measurements', 'Share workout history', 'Share calendar', 'Share meal photos', 'Share notes']
  const [sharing, setSharing] = useState<Record<string, boolean>>(() => Object.fromEntries(permissions.map((permission) => [permission, true])))

  return (
    <SubPage title="Coach Connection" back={back}>
      <Section title="Connected coach" />
      <Card className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--signal)] text-[12px] font-black">CD</div>
        <div className="flex-1">
          <p className="font-semibold">Coach Taylor</p>
          <p className="text-[12px]" style={{ color: 'var(--text-soft)' }}>Strength & kickboxing - since Jan 2026</p>
        </div>
        <Pill tone="vital">Connected</Pill>
      </Card>
      <button onClick={connect} className="mt-3 min-h-[42px] w-full rounded-[11px] border text-[14px] font-semibold" style={{ color: 'var(--button-secondary-fg)', borderColor: 'var(--vital-border)', background: 'var(--surface-1)' }}>+ Connect another trainer</button>
      <button className="mt-2 min-h-[42px] w-full rounded-[11px] border text-[14px] font-semibold" style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)', background: 'var(--surface-1)' }}>Disconnect trainer</button>
      <Section title="Sharing permissions" />
      <Card className="p-0">
        {permissions.map((permission, index) => (
          <button key={permission} onClick={() => setSharing((current) => ({ ...current, [permission]: !current[permission] }))} className="flex min-h-[50px] w-full items-center px-4 text-left" style={{ borderTop: index ? '1px solid var(--line)' : 'none' }}>
            <span className="flex-1 font-semibold">{permission}</span>
            <span className="flex h-7 w-12 items-center rounded-full p-1" style={{ background: sharing[permission] ? 'var(--signal)' : 'var(--surface-3)', justifyContent: sharing[permission] ? 'flex-end' : 'flex-start' }}>
              <span className="h-5 w-5 rounded-full bg-white" />
            </span>
          </button>
        ))}
      </Card>
    </SubPage>
  )
}

function PreferencesSub({ back, theme, onTheme, onReplayTutorial, trackStrengthWeights, onToggleStrengthWeights }: { back: () => void; theme: 'dark' | 'light'; onTheme: () => void; onReplayTutorial: () => void; trackStrengthWeights: boolean; onToggleStrengthWeights: () => void }) {
  return (
    <SubPage title="Preferences" back={back}>
      <Section title="Settings" />
      <Card className="p-0">
        <PrefRow icon={theme === 'dark' ? Sun : Moon} label="Appearance" value={theme === 'dark' ? 'Dark' : 'Light'} onClick={onTheme} />
        <PrefRow icon={Scale} label="Units" value="lb - ft" />
        <PrefRow icon={Bell} label="Reminders" toggle />
        <PrefRow icon={Bell} label="Notifications" toggle />
      </Card>
      <Section title="Workout preferences" />
      <Card className="p-0">
        <button type="button" onClick={onToggleStrengthWeights} className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left" aria-pressed={trackStrengthWeights}>
          <Dumbbell size={17} style={{ color: 'var(--label)' }} />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Track strength training weights</span>
            <span className="block text-[12px]" style={{ color: 'var(--text-soft)' }}>Show weight fields when logging strength sets.</span>
          </span>
          <span className="flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors" style={{ background: trackStrengthWeights ? 'var(--vital)' : 'var(--surface-3)' }}>
            <span className="h-5 w-5 rounded-full bg-white transition-transform" style={{ transform: trackStrengthWeights ? 'translateX(20px)' : 'translateX(0)' }} />
          </span>
        </button>
      </Card>
      <Section title="Help" />
      <Card className="p-0">
        <PrefRow icon={Home} label="Replay app tour" value="" onClick={onReplayTutorial} />
      </Card>
    </SubPage>
  )
}

function PrivacySub({ back }: { back: () => void }) {
  return (
    <SubPage title="Privacy & Sharing" back={back}>
      <Section title="Sharing" />
      <Card className="p-0">
        {['Share progress', 'Share measurements', 'Share workout history', 'Share calendar'].map((label, index) => (
          <div key={label} className="flex min-h-[56px] items-center px-4" style={{ borderTop: index ? '1px solid var(--line)' : 'none' }}>
            <span className="flex-1 font-semibold">{label}</span>
            <span className="flex h-8 w-14 items-center justify-end rounded-full bg-[var(--signal)] p-1"><span className="h-6 w-6 rounded-full bg-white" /></span>
          </div>
        ))}
      </Card>
    </SubPage>
  )
}

function ConnectSub({ back }: { back: () => void }) {
  return (
    <Page nav={false}>
      <BackLink label="Back" onClick={back} />
      <h1 className="mt-7 text-[22px] font-black">Connect a trainer</h1>
      <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>Optional - your journal works solo forever. Connect to share your history with a coach and unlock their workouts & notes.</p>
      <Card className="mt-5 text-center">
        <p className="mb-4 text-left font-semibold">Scan their QR code</p>
        <Qr />
        <p className="mt-4 text-[12px]" style={{ color: 'var(--label)' }}>Point your camera at your trainer&apos;s code</p>
      </Card>
      <Card className="mt-3">
        <p className="mb-3 font-semibold">Or enter an invite code</p>
        <div className="flex gap-2"><input defaultValue="DEVIN-4K2P" className="mono min-h-[38px] min-w-0 flex-1 rounded-[9px] border bg-transparent px-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--label)' }} /><button className="rounded-[9px] [background:var(--button-primary-surface)] px-4 font-bold shadow-[var(--button-primary-shadow)]">Join</button></div>
      </Card>
      <Card className="mt-3">
        <p className="mb-3 font-semibold">Or invite by email</p>
        <div className="flex gap-2"><input placeholder="trainer@email.com" className="min-h-[38px] min-w-0 flex-1 rounded-[9px] border bg-transparent px-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--label)' }} /><button className="rounded-[9px] border px-4 font-semibold" style={{ borderColor: 'var(--line)' }}>Send</button></div>
      </Card>
    </Page>
  )
}

function SubPage({ title, back, children }: { title: string; back: () => void; children: React.ReactNode }) {
  return (
    <Page>
      <BackLink label="More" onClick={back} />
      <h1 className="mt-7 text-[22px] font-black">{title}</h1>
      {children}
    </Page>
  )
}

function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} className="mt-3 flex min-h-[44px] items-center gap-1 text-[14px] font-semibold" style={{ color: 'var(--button-secondary-fg)' }}><ChevronLeft size={18} /> {label}</button>
}

function PrefRow({ icon: Icon, label, value, toggle, onClick }: { icon: React.ComponentType<any>; label: string; value?: string; toggle?: boolean; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left" style={{ borderTop: label === 'Appearance' ? 'none' : '1px solid var(--line)' }}>
      <Icon size={17} style={{ color: label === 'Appearance' ? 'var(--signal)' : 'var(--label)' }} />
      <span className="flex-1 font-semibold">{label}</span>
      {toggle ? <span className="flex h-8 w-14 items-center justify-end rounded-full bg-[var(--signal)] p-1"><span className="h-6 w-6 rounded-full bg-white" /></span> : <span className="mono text-[13px]" style={{ color: 'var(--text-soft)' }}>{value}</span>}
    </Tag>
  )
}

function Qr() {
  const cells = '11111110010111111110100010011100100010101110101010101110101110101010101110101010001001000100010111111110101011111110000000001000000000101101111011101011100101100100100110010101011011011011101100100101101001011010010111111010010110101000100010111010100011101010101110101110001010100010101010001010111111110100101111111'
  return (
    <div className="mx-auto grid h-[158px] w-[158px] grid-cols-[repeat(17,1fr)] rounded-[12px] bg-white p-3">
      {Array.from({ length: 17 * 17 }, (_, i) => <span key={i} className={cells[i % cells.length] === '1' ? 'bg-black' : 'bg-white'} />)}
    </div>
  )
}

function Title({ title, sub }: { title: string; sub: string }) {
  return <div className="pt-7"><h1 className="text-[24px] font-black leading-tight">{title}</h1><p className="mt-2 text-[14px]" style={{ color: 'var(--text-soft)' }}>{sub}</p></div>
}

function TrainerClients({ onClient }: { onClient: () => void }) {
  const [adding, setAdding] = useState(false)
  const overview = [
    ['4', 'Total clients', 'white'],
    ['3', 'Sessions today', 'signal'],
    ['3', 'Need attention', 'ember'],
  ] as const

  return (
    <Page>
      <Title title="Clients" sub="Who needs attention today" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        {overview.map(([value, label, tone]) => <Card key={label} className="p-3 text-center"><MetricMini value={value} label={label} tone={tone} /></Card>)}
      </div>
      <button onClick={() => setAdding((open) => !open)} className="mt-3 min-h-[44px] w-full rounded-[12px] border text-[14px] font-semibold" style={{ background: 'var(--surface-1)', borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)' }}>+ Add Client</button>
      {adding && (
        <Card className="mt-3">
          <Section title="Basic info" />
          <div className="space-y-2">
            <input placeholder="Name" className="h-11 w-full rounded-[10px] border bg-transparent px-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
            <input placeholder="Email optional" className="h-11 w-full rounded-[10px] border bg-transparent px-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
            <input placeholder="Phone optional" className="h-11 w-full rounded-[10px] border bg-transparent px-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
          </div>
          <Section title="Training type" />
          <div className="grid grid-cols-2 gap-2">
            <button className="min-h-[42px] rounded-[10px] border text-[12px] font-semibold" style={{ borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)', background: 'var(--vital-fill)' }}>Monthly Subscription</button>
            <button className="min-h-[42px] rounded-[10px] border text-[12px] font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--text-soft)' }}>Session Package</button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input placeholder="Sessions / month" className="h-10 rounded-[10px] border bg-transparent px-3 text-[12px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
            <input placeholder="Renewal day" className="h-10 rounded-[10px] border bg-transparent px-3 text-[12px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
          </div>
          <Section title="Goal" />
          <div className="flex flex-wrap gap-2">{['Weight Loss', 'Muscle Gain', 'Strength', 'General Fitness', 'Mobility', 'Conditioning', 'Sports Performance', 'Rehab'].map((goal) => <Pill key={goal} tone="signal">{goal}</Pill>)}</div>
          <button onClick={() => setAdding(false)} className="mt-4 min-h-[44px] w-full rounded-[12px] [background:var(--button-primary-surface)] text-[14px] font-bold shadow-[var(--button-primary-shadow)]" style={{ color: 'var(--on-accent)' }}>Save client</button>
        </Card>
      )}
      <Section title="Roster" />
      <div className="space-y-2">
        {trainerClients.map((client) => (
          <Card key={client.email} className="flex items-center gap-3 p-3" onClick={onClient}>
            <IconChip icon={User} tone={client.status === 'Active' ? 'vital' : client.status === 'Inactive' ? 'slate' : 'ember'} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{client.name}</p>
              <p className="text-[12px]" style={{ color: 'var(--text-soft)' }}>{client.sessions} sessions left - renews {client.renewal}</p>
              <p className="text-[11px]" style={{ color: 'var(--label)' }}>Last session {client.last}</p>
            </div>
            <Pill tone={client.status === 'Active' ? 'vital' : client.status === 'Out of Sessions' ? 'ember' : client.status === 'Inactive' ? 'slate' : 'ember'}>{client.status}</Pill>
          </Card>
        ))}
      </div>
    </Page>
  )
}

function TrainerClientDetail({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<'Overview' | 'Progress' | 'Notes'>('Overview')
  const [action, setAction] = useState<'workout' | 'measurement' | 'note' | ''>('')
  const [showNoShow, setShowNoShow] = useState(false)
  const [sessionsLeft, setSessionsLeft] = useState(trainerClients[0].sessions)
  const [lastSession, setLastSession] = useState(trainerClients[0].last)
  const client = trainerClients[0]
  const tabs = ['Overview', 'Progress', 'Notes'] as const
  const quickActions = [
    ['Log Workout', 'workout'],
    ['Add Measurement', 'measurement'],
    ['Add Coach Note', 'note'],
  ] as const
  const alerts = ['Renewal due in 16 days', 'No workout logged this week', 'Assessment due next week']
  const progress = [
    ['▼9.8', 'Weight', 'vital'],
    ['▼1.4"', 'Waist', 'vital'],
    ['▼2.6%', 'Body fat', 'vital'],
    ['14', 'Workouts', 'signal'],
    ['86%', 'Consistency', 'vital'],
    ['35 lb', 'Bench PR', 'ember'],
  ] as const
  const activity = ['Workout logged - Upper Body + Bag Work', 'Measurement added - 148.2 lb', 'Coach note added', 'Assessment completed - 82 / 100', 'Session completed']
  function markSession(type: 'trained' | 'rescheduled') {
    if (type === 'trained') setSessionsLeft((current) => Math.max(0, current - 1))
    setLastSession('Today')
  }

  return (
    <Page nav={false}>
      <BackLink label="All clients" onClick={onBack} />
      <Title title={client.name} sub={`${client.status} - ${client.email}`} />
      <div className="mt-4 flex rounded-[12px] border p-1" style={{ background: 'var(--surface-1)', borderColor: 'var(--line)' }}>
        {tabs.map((tab) => <button key={tab} onClick={() => setView(tab)} className="min-h-[34px] flex-1 rounded-[9px] text-[12px] font-semibold" style={{ background: view === tab ? 'var(--button-primary-bg)' : 'transparent', color: view === tab ? 'var(--on-accent)' : 'var(--text-soft)', boxShadow: view === tab ? 'var(--button-primary-shadow)' : 'none' }}>{tab}</button>)}
      </div>
      {view === 'Overview' && (
        <>
          <Section title="Client snapshot" />
          <Card className="p-0">
            {[
              ['Connection', client.connection],
              ['Sessions left', `${sessionsLeft}`],
              ['Renewal date', client.renewal],
              ['Primary goal', client.goal],
              ['Last session', lastSession],
              ['Last measurement', client.measurement],
              ['Assessment score', client.score],
            ].map(([label, value], index) => <div key={label} className="flex min-h-[44px] items-center px-4" style={{ borderTop: index ? '1px solid var(--line)' : 'none' }}><span className="flex-1 font-semibold">{label}</span><span className="text-right text-[13px]" style={{ color: 'var(--text-soft)' }}>{value}</span></div>)}
          </Card>
          <Section title="Alerts" />
          <Card>{alerts.length ? <div className="space-y-2">{alerts.map((alert) => <div key={alert} className="rounded-[10px] border px-3 py-2 text-[13px] font-semibold" style={{ borderColor: 'var(--ember-border)', background: 'var(--ember-fill)', color: 'var(--ember)' }}>{alert}</div>)}</div> : <p className="text-[13px]" style={{ color: 'var(--text-soft)' }}>Everything is up to date.</p>}</Card>
          <Section title="Session status" />
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => markSession('trained')} className="min-h-[46px] rounded-[12px] border text-[13px] font-semibold" style={{ background: 'var(--vital-fill)', borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)' }}>Trained</button>
            <button onClick={() => setShowNoShow(true)} className="min-h-[46px] rounded-[12px] border text-[13px] font-semibold" style={{ background: 'var(--ember-fill)', borderColor: 'var(--ember-border)', color: 'var(--neg)' }}>No Show</button>
            <button onClick={() => markSession('rescheduled')} className="min-h-[46px] rounded-[12px] border text-[13px] font-semibold" style={{ background: 'var(--surface-1)', borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)' }}>Rescheduled</button>
          </div>
          {showNoShow && <Card className="mt-2"><p className="mb-3 text-[13px] font-semibold">Charge session?</p><div className="grid grid-cols-2 gap-2"><button onClick={() => { setSessionsLeft((current) => Math.max(0, current - 1)); setShowNoShow(false) }} className="min-h-[40px] rounded-[10px] [background:var(--button-primary-surface)] text-[13px] font-bold shadow-[var(--button-primary-shadow)]" style={{ color: 'var(--on-accent)' }}>Yes</button><button onClick={() => setShowNoShow(false)} className="min-h-[40px] rounded-[10px] border text-[13px] font-semibold" style={{ borderColor: 'var(--line)' }}>No</button></div></Card>}
          <Section title="Quick actions" />
          <div className="grid grid-cols-3 gap-2">{quickActions.map(([label, key]) => <button key={key} onClick={() => setAction(key)} className="min-h-[50px] rounded-[12px] border text-[12px] font-semibold" style={{ background: action === key ? 'var(--vital-fill)' : 'var(--surface-1)', borderColor: action === key ? 'var(--vital-border)' : 'var(--line)', color: action === key ? 'var(--button-secondary-fg)' : 'var(--fg)' }}>{label}</button>)}</div>
          {action === 'workout' && <Card className="mt-2"><input defaultValue="Today" className="mb-3 h-10 w-full rounded-[10px] border bg-transparent px-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} /><div className="space-y-2">{['Exercise name', 'Set 1 reps + weight', 'Set 2 reps + weight', 'Set 3 reps + weight', 'Set 4 reps + weight'].map((placeholder) => <input key={placeholder} placeholder={placeholder} className="h-10 w-full rounded-[10px] border bg-transparent px-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />)}</div><div className="mt-3 grid grid-cols-2 gap-2"><button className="min-h-[38px] rounded-[10px] border text-[12px] font-semibold" style={{ borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)' }}>+ Add Set</button><button className="min-h-[38px] rounded-[10px] border text-[12px] font-semibold" style={{ borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)' }}>+ Add Exercise</button></div></Card>}
          {action === 'measurement' && <Card className="mt-2"><div className="grid grid-cols-2 gap-2">{['Weight', 'Body Fat', 'Neck', 'Chest', 'Waist', 'Hips', 'Left Bicep', 'Right Bicep', 'Left Forearm', 'Right Forearm', 'Left Thigh', 'Right Thigh', 'Left Calf', 'Right Calf'].map((label) => <input key={label} placeholder={label} className="h-10 rounded-[10px] border bg-transparent px-3 text-[12px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />)}</div></Card>}
          {action === 'note' && <Card className="mt-2"><textarea placeholder="Coach note..." className="min-h-24 w-full bg-transparent text-[13px] outline-none" style={{ color: 'var(--fg)' }} /></Card>}
          <Section title="Progress snapshot" />
          <div className="grid grid-cols-3 gap-2">{progress.map(([value, label, tone]) => <Card key={label} className="p-3 text-center"><MetricMini value={value} label={label} tone={tone} /></Card>)}</div>
          <Section title="Recent activity" />
          <Card className="p-0">{activity.map((item, index) => <div key={item} className="px-4 py-3 text-[13px] font-semibold" style={{ borderTop: index ? '1px solid var(--line)' : 'none' }}>{item}</div>)}</Card>
        </>
      )}
      {view === 'Progress' && (
        <>
          <Section title="Progress snapshot" />
          <div className="grid grid-cols-3 gap-2">{progress.map(([value, label, tone]) => <Card key={label} className="p-3 text-center"><MetricMini value={value} label={label} tone={tone} /></Card>)}</div>
          <Section title="History" />
          <Card className="p-0">{['Measurements - Jun 12', 'Weight - 148.2 lb', 'Body fat - 19.4%', 'Assessment - 82 / 100', 'PR - Dumbbell Bench'].map((item, index) => <div key={item} className="px-4 py-3 text-[13px] font-semibold" style={{ borderTop: index ? '1px solid var(--line)' : 'none' }}>{item}</div>)}</Card>
        </>
      )}
      {view === 'Notes' && (
        <>
          <Section title="Coach notes" />
          <Card><p className="text-[13px] leading-relaxed">Keep guard up through later bag rounds. Hydrate tonight before lower-body day.</p></Card>
          <Section title="Session notes" />
          <Card><textarea placeholder="Add private or shared notes..." className="min-h-28 w-full bg-transparent text-[13px] outline-none" style={{ color: 'var(--fg)' }} /></Card>
        </>
      )}
    </Page>
  )
}

function TrainerActivity() {
  const feed = [
    ['Session completed', 'Maya Rivera - Upper Body + Bag Work', 'Today', 'vital'],
    ['Measurement added', 'Daniel Cho - waist 35.2 in', 'Today', 'pulse'],
    ['Renewal alert', 'Daniel Cho renews Jun 18', 'Today', 'ember'],
    ['Trainer logged workout', 'Priya Nair - Mobility reset', 'Yesterday', 'signal'],
    ['Client logged weight', 'Maya Rivera - 148.2 lb', 'Jun 12', 'vital'],
    ['Coach note added', 'Keep guard up through later rounds', 'Jun 12', 'pulse'],
    ['Inactive client alert', 'Elena has not trained in 14 days', 'Jun 10', 'ember'],
  ] as const

  return (
    <Page>
      <Title title="Activity" sub="Trainer-wide updates and alerts" />
      <Section title="Today" />
      <Card className="p-0">
        {feed.map(([title, sub, date, tone], index) => (
          <div key={`${title}-${sub}`} className="flex min-h-[60px] items-center gap-3 px-4" style={{ borderTop: index ? '1px solid var(--line)' : 'none' }}>
            <IconChip icon={title.includes('Measurement') ? Ruler : title.includes('weight') ? Scale : title.includes('alert') ? Bell : title.includes('workout') ? Dumbbell : ClipboardList} tone={tone} />
            <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{title}</span><span className="block truncate text-[12px]" style={{ color: 'var(--text-soft)' }}>{sub}</span></span>
            <span className="mono text-[11px]" style={{ color: 'var(--label)' }}>{date}</span>
          </div>
        ))}
      </Card>
    </Page>
  )
}

function TrainerBuild() {
  const [type, setType] = useState('Upper Body')
  const workoutTypes = ['Push', 'Pull', 'Legs', 'Upper Body', 'Lower Body', 'Full Body', 'Kickboxing', 'Muay Thai', 'Conditioning', 'Mobility']
  return (
    <Page>
      <Title title="Build" sub="Generate, edit, and save simple templates" />
      <Section title="Generate workout" />
      <Card className="mt-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {workoutTypes.map((item) => <button key={item} onClick={() => setType(item)} className="rounded-full border px-3 py-2 text-[12px] font-semibold" style={{ background: type === item ? 'var(--button-primary-bg)' : 'transparent', borderColor: type === item ? 'var(--button-primary-bg)' : 'var(--line)', color: type === item ? 'var(--on-accent)' : 'var(--text-soft)', boxShadow: type === item ? 'var(--button-primary-shadow)' : 'none' }}>{item}</button>)}
        </div>
        <Card className="p-3" style={{ background: 'var(--surface-2)' }}>
          <p className="font-semibold">{type} template</p>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--text-soft)' }}>Warmup - Main workout - Cooldown</p>
        </Card>
        <button className="mt-3 min-h-[44px] w-full rounded-[12px] [background:var(--button-primary-surface)] text-[13px] font-bold shadow-[var(--button-primary-shadow)]" style={{ color: 'var(--on-accent)' }}>Generate</button>
        <div className="mt-2 grid grid-cols-2 gap-2"><button className="min-h-[40px] rounded-[10px] border text-[12px] font-semibold" style={{ borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)' }}>Edit</button><button className="min-h-[40px] rounded-[10px] border text-[12px] font-semibold" style={{ borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)' }}>Save Template</button></div>
      </Card>
      <Section title="Saved templates" />
      <div className="space-y-2">{['Upper Body Strength', 'Lower Body Strength', 'Kickboxing Conditioning'].map((template) => <Card key={template} className="flex items-center gap-3"><IconChip icon={Dumbbell} tone="signal" /><span className="flex-1 font-semibold">{template}</span><button className="text-[12px] font-semibold" style={{ color: 'var(--button-secondary-fg)' }}>Assign</button></Card>)}</div>
    </Page>
  )
}

function TrainerProfile({ onRole }: { onRole: (role: Role) => void }) {
  return (
    <Page>
      <div className="pt-7">
        <button onClick={() => onRole('client')} className="mb-4 text-[13px] font-semibold" style={{ color: 'var(--button-secondary-fg)' }}>Personal / Trainer</button>
        <h1 className="text-[24px] font-black leading-tight">Coach Taylor</h1>
        <p className="mt-2 text-[14px]" style={{ color: 'var(--text-soft)' }}>Strength & kickboxing - Downtown</p>
      </div>
      <Card className="mt-4 p-0">
        {[
          ['Name', 'Coach Taylor'],
          ['Specialty', 'Strength + kickboxing'],
          ['Gym/location', 'Downtown'],
          ['Preferences', 'Reminders - dark mode - lb'],
          ['Invite code', 'DEVIN-4K2P'],
        ].map(([label, value], index) => <div key={label} className="flex min-h-[48px] items-center px-4" style={{ borderTop: index ? '1px solid var(--line)' : 'none' }}><span className="flex-1 font-semibold">{label}</span><span className="text-[13px]" style={{ color: 'var(--text-soft)' }}>{value}</span></div>)}
      </Card>
      <button className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[12px] border text-[14px] font-semibold" style={{ borderColor: 'var(--danger-border)', color: 'var(--danger)' }}><LogOut size={16} /> Sign out</button>
    </Page>
  )
}

function BottomNav({ role, tab, trainerTab, setTab, setTrainerTab }: { role: Role; tab: Tab; trainerTab: TrainerTab; setTab: (tab: Tab) => void; setTrainerTab: (tab: TrainerTab) => void }) {
  const clientItems = [
    ['today', Home, 'Today'],
    ['workouts', Dumbbell, 'Workouts'],
    ['calendar', CalendarDays, 'Calendar'],
    ['progress', LineChart, 'Progress'],
    ['more', Grid2X2, 'More'],
  ] as const
  const trainerItems = [
    ['clients', Users, 'Clients'],
    ['activity', ClipboardList, 'Activity'],
    ['build', Dumbbell, 'Build'],
    ['profile', User, 'Profile'],
  ] as const
  const items = role === 'client' ? clientItems : trainerItems
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 flex h-[82px] w-full max-w-[392px] -translate-x-1/2 items-start justify-around border-t px-4 pt-3 sm:max-w-[372px]" style={{ background: 'var(--nav)', borderColor: 'var(--line)' }}>
      {items.map(([id, Icon, label]) => {
        const active = role === 'client' ? tab === id : trainerTab === id
        return <button key={id} onClick={() => role === 'client' ? setTab(id as Tab) : setTrainerTab(id as TrainerTab)} className="relative flex w-14 flex-col items-center gap-1.5" style={{ color: active ? 'var(--fg)' : 'var(--label)', textShadow: active ? '0 0 14px rgba(46,130,188,0.22)' : 'none' }}>
          {active && <span className="pointer-events-none absolute -top-1 h-7 w-9 rounded-full opacity-35 blur-lg" style={{ background: 'var(--aurora)' }} />}
          <Icon size={22} strokeWidth={active ? 2.4 : 2} />
          <span className="text-[10px] font-bold">{label}</span>
        </button>
      })}
    </nav>
  )
}

function Fab({ open, onToggle, onAction }: { open: boolean; onToggle: () => void; onAction: (sheet: Sheet) => void }) {
  const actions = [
    ['Log Workout', Dumbbell, 'signal', 'workoutLog'],
    ['Log Weight', Scale, 'vital', 'weight'],
    ['Add Measurement', Ruler, 'pulse', 'measure'],
    ['Add Meal Photo', Camera, 'ember', 'meal'],
    ['Add Note', User, 'pulse', 'note'],
  ] as const

  return (
    <>
      {open && <button aria-label="Close quick actions backdrop" onClick={onToggle} className="fixed inset-0 z-40 backdrop-blur-[1px]" style={{ background: 'var(--overlay)' }} />}
      <div className="fixed bottom-[96px] left-1/2 z-50 flex w-full max-w-[392px] -translate-x-1/2 flex-col items-end gap-3 pr-[22px] sm:max-w-[372px]">
        {open && (
          <div className="flex flex-col items-end space-y-3 pb-1">
            {actions.map(([label, Icon, tone, action]) => (
              <button key={label} onClick={() => onAction(action)} className="ml-auto flex min-h-[38px] items-center justify-end gap-3 rounded-[10px] border px-3 text-right text-[13px] font-semibold backdrop-blur" style={{ background: 'var(--action-bg)', borderColor: 'var(--action-border)', color: 'var(--fg)', boxShadow: '0 10px 24px rgba(0,0,0,0.18)' }}>
                <span className="text-right">{label}</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-[10px]" style={{ background: tones[tone].bg, color: tones[tone].fg }}>
                  <Icon size={17} />
                </span>
              </button>
            ))}
          </div>
        )}
        <button onClick={onToggle} className="flex h-[58px] w-[58px] items-center justify-center rounded-[16px] backdrop-blur-md" style={{ background: 'var(--fab-surface)', color: 'var(--on-accent)', boxShadow: 'var(--fab-shadow)' }}>
          {open ? <X size={28} strokeWidth={2.5} /> : <Plus size={30} strokeWidth={2.5} />}
        </button>
      </div>
    </>
  )
}

function ActivityChooser({ options, onChoose }: { options: string[]; onChoose: (activity: string) => void }) {
  return (
    <Card className="p-3">
      <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--label)' }}>Choose an activity</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((activity) => {
          const visual = activityVisual(activity)
          return (
            <button key={activity} type="button" onClick={() => onChoose(activity)} className="flex min-h-[54px] items-center gap-3 rounded-[10px] border px-3 text-left text-[13px] font-semibold" style={{ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--fg)' }}>
              <IconChip icon={visual.icon} tone={visual.tone} />
              <span className="leading-tight">{activity}</span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

// Controlled activity builder. All state lives in the parent's `activityDetails`
// array; this card reads `detail` and reports every edit via `onChange` so the
// data actually persists when the workout/template is saved.
function ActivityLogCard({ detail, index, onChange, onDelete }: { detail: ActivityDetail; index: number; onChange: (next: ActivityDetail) => void; onDelete: (index: number) => void }) {
  const activity = detail.activity
  const visual = activityVisual(activity)
  const combat = COMBAT_ACTIVITIES.includes(activity)
  const strikingTone = activity === 'BJJ' ? 'pulse' : activity === 'Muay Thai' ? 'ember' : 'signal'
  const trackWeights = detail.trackWeights ?? false
  const exercises = detail.exercises ?? []
  const focus = detail.focus ?? []

  function patch(partial: Partial<ActivityDetail>) {
    onChange({ ...detail, ...partial })
  }
  function toggleFocus(item: string) {
    patch({ focus: focus.includes(item) ? focus.filter((f) => f !== item) : [...focus, item] })
  }
  function patchExercise(exId: string, next: Partial<StrengthExercise>) {
    patch({ exercises: exercises.map((ex) => ex.id === exId ? { ...ex, ...next } : ex) })
  }
  function patchSet(exId: string, setIdx: number, field: keyof StrengthSet, value: string) {
    patch({ exercises: exercises.map((ex) => ex.id !== exId ? ex : { ...ex, sets: ex.sets.map((s, i) => i === setIdx ? { ...s, [field]: value } : s) }) })
  }
  function addSet(exId: string) {
    patch({ exercises: exercises.map((ex) => ex.id !== exId ? ex : { ...ex, sets: [...ex.sets, emptyStrengthSet()] }) })
  }
  function removeSet(exId: string, setIdx: number) {
    patch({ exercises: exercises.map((ex) => ex.id !== exId ? ex : { ...ex, sets: ex.sets.filter((_, i) => i !== setIdx) }) })
  }
  function addExercise() {
    patch({ exercises: [...exercises, makeStrengthExercise()] })
  }
  function removeExercise(exId: string) {
    patch({ exercises: exercises.filter((ex) => ex.id !== exId) })
  }

  function chipStyle(active: boolean, tone: string) {
    return {
      borderColor: active ? tones[tone].fg : 'var(--line)',
      color: active ? tones[tone].fg : 'var(--text-soft)',
      background: active ? tones[tone].bg : 'transparent',
    }
  }
  function segmentStyle(active: boolean) {
    return {
      background: active ? 'var(--vital)' : 'transparent',
      color: active ? 'var(--on-accent)' : 'var(--text-soft)',
    }
  }
  return (
    <Card className="p-4" style={{ background: 'var(--surface-2)' }}>
      <div className="mb-4 flex items-center gap-3">
        <IconChip icon={visual.icon} tone={visual.tone} />
        <p className="flex-1 text-[16px] font-bold">{activity}</p>
        <button type="button" onClick={() => onDelete(index)} className="flex h-8 w-8 items-center justify-center rounded-[8px]" style={{ color: 'var(--neg)' }} aria-label={`Delete ${activity}`}>
          <Trash2 size={16} />
        </button>
      </div>
      {activity === 'Strength Training' && (
        <div className="space-y-3">
          <div className="-mt-1 mb-1 flex items-center justify-end">
            <button type="button" onClick={() => patch({ trackWeights: !trackWeights })} className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: trackWeights ? 'var(--button-secondary-fg)' : 'var(--label)' }} aria-pressed={trackWeights}>
              <span className="flex h-4 w-7 items-center rounded-full p-0.5 transition-colors" style={{ background: trackWeights ? 'var(--vital)' : 'var(--surface-3)' }}>
                <span className="h-3 w-3 rounded-full bg-white transition-transform" style={{ transform: trackWeights ? 'translateX(12px)' : 'translateX(0)' }} />
              </span>
              Track Weights
            </button>
          </div>
          {exercises.map((exercise) => (
            <div key={exercise.id} className="rounded-[12px] border p-3" style={{ borderColor: 'var(--line)' }}>
              <div className="mb-3 flex items-center gap-3">
                <input value={exercise.name} onChange={(e) => patchExercise(exercise.id, { name: e.target.value })} placeholder="Exercise name" className="min-w-0 flex-1 rounded-[8px] border bg-transparent px-3 py-2 text-[13px] font-semibold outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
                <button type="button" onClick={() => removeExercise(exercise.id)} className="flex h-8 w-8 items-center justify-center rounded-[8px]" style={{ color: 'var(--neg)' }} aria-label="Remove exercise"><Trash2 size={15} /></button>
              </div>
              {exercise.sets.map((set, setIdx) => (
                <div key={setIdx} className="mb-2 grid items-center gap-2" style={{ gridTemplateColumns: trackWeights ? '34px minmax(56px,1fr) 28px minmax(64px,1fr) 16px 24px' : '34px minmax(56px,1fr) 28px 24px' }}>
                  <span className="whitespace-pre-line text-[10px] font-semibold leading-tight" style={{ color: 'var(--label)' }}>{`Set\n${setIdx + 1}`}</span>
                  <input value={set.reps} onChange={(e) => patchSet(exercise.id, setIdx, 'reps', e.target.value)} inputMode="numeric" placeholder="0" className="mono h-9 min-w-0 rounded-[8px] border bg-transparent px-2 text-center text-[14px] font-semibold outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--label)' }}>reps</span>
                  {trackWeights && <input value={set.weight} onChange={(e) => patchSet(exercise.id, setIdx, 'weight', e.target.value)} inputMode="decimal" placeholder="0" className="mono h-9 min-w-0 rounded-[8px] border bg-transparent px-2 text-center text-[14px] font-semibold outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />}
                  {trackWeights && <span className="text-[10px] font-semibold" style={{ color: 'var(--label)' }}>lb</span>}
                  <button type="button" onClick={() => removeSet(exercise.id, setIdx)} disabled={exercise.sets.length <= 1} className="flex h-7 w-7 items-center justify-center rounded-[7px] disabled:opacity-30" style={{ color: 'var(--label)' }} aria-label="Remove set"><Minus size={13} /></button>
                </div>
              ))}
              <button type="button" onClick={() => addSet(exercise.id)} className="mt-1 flex items-center gap-2 text-[13px] font-semibold" style={{ color: 'var(--button-secondary-fg)' }}><Plus size={16} /> Add set</button>
            </div>
          ))}
          <button type="button" onClick={addExercise} className="flex min-h-[38px] w-full items-center justify-center gap-2 rounded-[10px] border border-dashed text-[13px] font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--text-soft)' }}><Plus size={16} /> Add exercise</button>
        </div>
      )}
      {combat && (
        <div className="space-y-4">
          <div><p className="mb-2 text-[12px] font-semibold" style={{ color: 'var(--text-soft)' }}>Intensity</p><div className="flex gap-2">{['Light', 'Moderate', 'Hard'].map((item) => <button key={item} type="button" onClick={() => patch({ intensity: item })} className="rounded-full border px-4 py-2 text-[12px] font-semibold" style={chipStyle(detail.intensity === item, strikingTone)}>{item}</button>)}</div></div>
          <div><p className="mb-2 text-[12px] font-semibold" style={{ color: 'var(--text-soft)' }}>Training format</p><div className="grid grid-cols-2 rounded-[10px] border p-1" style={{ borderColor: 'var(--line)' }}>{['Rounds', 'Time'].map((item) => <button key={item} type="button" onClick={() => patch({ format: item })} className="rounded-[8px] py-2 text-[13px] font-bold" style={segmentStyle(detail.format === item)}>{item}</button>)}</div></div>
          <div className="grid grid-cols-2 items-center gap-3"><span className="text-[13px] font-semibold">{detail.format === 'Time' ? 'Minutes' : 'Rounds'}</span><input value={detail.amount ?? ''} onChange={(e) => patch({ amount: e.target.value })} inputMode="numeric" placeholder="0" className="mono h-10 rounded-[8px] border bg-transparent px-3 text-center text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} /></div>
          <div><p className="mb-2 text-[12px]" style={{ color: 'var(--text-soft)' }}>Focus - optional</p><div className="flex flex-wrap gap-2">{(activity === 'BJJ' ? ['Technique', 'Drilling', 'Rolling', 'Positional Sparring', 'Open Mat', 'Competition Prep'] : ['Technique', 'Bag Work', 'Pads', 'Sparring', 'Conditioning']).map((item) => <button key={item} type="button" onClick={() => toggleFocus(item)} className="rounded-full border px-3 py-2 text-[12px] font-semibold" style={chipStyle(focus.includes(item), strikingTone)}>{item}</button>)}</div></div>
          <textarea value={detail.notes ?? ''} onChange={(e) => patch({ notes: e.target.value })} placeholder="Optional notes..." className="min-h-[62px] w-full rounded-[8px] border bg-transparent p-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
        </div>
      )}
      {activity === 'Swimming' && (
        <div className="space-y-4">
          <div><p className="mb-2 text-[12px] font-semibold" style={{ color: 'var(--text-soft)' }}>Intensity</p><div className="flex gap-2">{['Easy', 'Moderate', 'Hard'].map((item) => <button key={item} type="button" onClick={() => patch({ intensity: item })} className="rounded-full border px-4 py-2 text-[12px] font-semibold" style={chipStyle(detail.intensity === item, 'vital')}>{item}</button>)}</div></div>
          <div className="grid grid-cols-3 rounded-[10px] border p-1" style={{ borderColor: 'var(--line)' }}>{['Laps', 'Distance', 'Time'].map((item) => <button key={item} type="button" onClick={() => patch({ format: item })} className="rounded-[8px] py-2 text-[13px] font-bold" style={segmentStyle(detail.format === item)}>{item}</button>)}</div>
          <div className="grid grid-cols-2 items-center gap-3"><span className="text-[13px] font-semibold">{detail.format === 'Time' ? 'Minutes' : detail.format}</span><input value={detail.amount ?? ''} onChange={(e) => patch({ amount: e.target.value })} inputMode="numeric" placeholder="0" className="mono h-10 rounded-[8px] border bg-transparent px-3 text-center text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} /></div>
          <textarea value={detail.notes ?? ''} onChange={(e) => patch({ notes: e.target.value })} placeholder="Optional notes..." className="min-h-[62px] w-full rounded-[8px] border bg-transparent p-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
        </div>
      )}
      {activity === 'Cardio' && (
        <div className="space-y-4">
          <div><p className="mb-2 text-[12px] font-semibold" style={{ color: 'var(--text-soft)' }}>Intensity</p><div className="flex gap-2">{['Easy', 'Moderate', 'Hard'].map((item) => <button key={item} type="button" onClick={() => patch({ intensity: item })} className="rounded-full border px-4 py-2 text-[12px] font-semibold" style={chipStyle(detail.intensity === item, 'vital')}>{item}</button>)}</div></div>
          <div><p className="mb-2 text-[12px] font-semibold" style={{ color: 'var(--text-soft)' }}>Cardio type</p><div className="flex flex-wrap gap-2">{['Walk', 'Run', 'Bike', 'Row', 'Stair Climber', 'Other'].map((item) => <button key={item} type="button" onClick={() => patch({ cardioType: item })} className="rounded-full border px-3 py-2 text-[12px] font-semibold" style={chipStyle(detail.cardioType === item, 'vital')}>{item}</button>)}</div></div>
          <div className="grid grid-cols-2 rounded-[10px] border p-1" style={{ borderColor: 'var(--line)' }}>{['Distance', 'Time'].map((item) => <button key={item} type="button" onClick={() => patch({ format: item })} className="rounded-[8px] py-2 text-[13px] font-bold" style={segmentStyle(detail.format === item)}>{item}</button>)}</div>
          <div className="grid grid-cols-[1fr_96px_28px] items-center gap-3"><span className="text-[13px] font-semibold">{detail.format === 'Time' ? 'Minutes' : 'Distance'}</span><input value={detail.amount ?? ''} onChange={(e) => patch({ amount: e.target.value })} inputMode="decimal" placeholder="0" className="mono h-10 rounded-[8px] border bg-transparent px-3 text-center text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} /><span className="text-[12px]" style={{ color: 'var(--label)' }}>{detail.format === 'Time' ? 'min' : 'mi'}</span></div>
          <textarea value={detail.notes ?? ''} onChange={(e) => patch({ notes: e.target.value })} placeholder="Optional notes..." className="min-h-[62px] w-full rounded-[8px] border bg-transparent p-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
        </div>
      )}
      {activity === 'Mobility' && (
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_96px_28px] items-center gap-3"><span className="text-[13px] font-semibold">Minutes</span><input value={detail.amount ?? ''} onChange={(e) => patch({ amount: e.target.value })} inputMode="numeric" placeholder="0" className="mono h-10 rounded-[8px] border bg-transparent px-3 text-center text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} /><span className="text-[12px]" style={{ color: 'var(--label)' }}>min</span></div>
          <div><p className="mb-2 text-[12px]" style={{ color: 'var(--text-soft)' }}>Focus areas</p><div className="flex flex-wrap gap-2">{['Hips', 'Shoulders', 'Back', 'Ankles', 'Neck', 'Full Body'].map((item) => <button key={item} type="button" onClick={() => toggleFocus(item)} className="rounded-full border px-3 py-2 text-[12px] font-semibold" style={chipStyle(focus.includes(item), 'pulse')}>{item}</button>)}</div></div>
          <textarea value={detail.notes ?? ''} onChange={(e) => patch({ notes: e.target.value })} placeholder="Optional notes..." className="min-h-[62px] w-full rounded-[8px] border bg-transparent p-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
        </div>
      )}
      {activity === 'Custom Activity' && (
        <div className="space-y-4">
          <input value={detail.customName ?? ''} onChange={(e) => patch({ customName: e.target.value })} placeholder="Activity name" className="h-10 w-full rounded-[8px] border bg-transparent px-3 text-[13px] font-semibold outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
          <div className="grid grid-cols-3 rounded-[10px] border p-1" style={{ borderColor: 'var(--line)' }}>{['Time', 'Rounds', 'Custom'].map((item) => <button key={item} type="button" onClick={() => patch({ format: item })} className="rounded-[8px] py-2 text-[13px] font-bold" style={segmentStyle(detail.format === item)}>{item}</button>)}</div>
          <div className="grid grid-cols-[1fr_96px_28px] items-center gap-3"><span className="text-[13px] font-semibold">{detail.format === 'Time' ? 'Minutes' : detail.format}</span><input value={detail.amount ?? ''} onChange={(e) => patch({ amount: e.target.value })} inputMode="numeric" placeholder="0" className="mono h-10 rounded-[8px] border bg-transparent px-3 text-center text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} /><span className="text-[12px]" style={{ color: 'var(--label)' }}>{detail.format === 'Time' ? 'min' : ''}</span></div>
          <textarea value={detail.notes ?? ''} onChange={(e) => patch({ notes: e.target.value })} placeholder="Optional notes..." className="min-h-[62px] w-full rounded-[8px] border bg-transparent p-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
        </div>
      )}
    </Card>
  )
}

// Read-only render of one activity's structured data, for template + workout
// detail views. Mirrors what the builder captured — never fabricated values.
function ActivityDetailView({ detail }: { detail: ActivityDetail }) {
  const visual = activityVisual(detail.activity)
  const isStrength = detail.activity === 'Strength Training'
  const namedExercises = (detail.exercises ?? []).filter((e) => e.name.trim())
  const focus = detail.focus ?? []
  const metaParts: { label: string; value: string }[] = []
  if (detail.intensity) metaParts.push({ label: 'Intensity', value: detail.intensity })
  if (detail.cardioType) metaParts.push({ label: 'Type', value: detail.cardioType })
  if (detail.amount?.trim()) metaParts.push({ label: detail.format || 'Amount', value: detail.format === 'Time' ? `${detail.amount} min` : detail.amount })
  return (
    <div className="overflow-hidden rounded-[12px] border" style={{ borderColor: 'var(--line)' }}>
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'var(--surface-2)' }}>
        <IconChip icon={visual.icon} tone={visual.tone} />
        <span className="text-[14px] font-bold">{detail.customName?.trim() || detail.activity}</span>
      </div>
      <div className="space-y-2 px-4 py-3">
        {isStrength && namedExercises.length > 0 && namedExercises.map((ex, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold">{ex.name}</span>
            <span className="mono shrink-0 text-[12px]" style={{ color: 'var(--text-soft)' }}>{formatStrengthDetail(ex.sets, detail.trackWeights ?? false)}</span>
          </div>
        ))}
        {isStrength && namedExercises.length === 0 && <p className="text-[12px]" style={{ color: 'var(--text-soft)' }}>No exercises added</p>}
        {!isStrength && metaParts.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]" style={{ color: 'var(--text-soft)' }}>
            {metaParts.map((m) => <span key={m.label}>{m.label}: <span className="font-semibold" style={{ color: 'var(--fg)' }}>{m.value}</span></span>)}
          </div>
        )}
        {focus.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {focus.map((f) => <span key={f} className="rounded-full border px-2.5 py-1 text-[11px] font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--text-soft)' }}>{f}</span>)}
          </div>
        )}
        {detail.notes?.trim() && <p className="pt-1 text-[12px] leading-snug" style={{ color: 'var(--text-soft)' }}>{detail.notes}</p>}
      </div>
    </div>
  )
}

// Common workout lengths shown as one-tap chips (2x3 grid).
const DURATION_CHIPS = [15, 30, 45, 60, 90, 120]

// Per-activity default duration (minutes) used to preselect a chip when logging
// a fresh workout. A loaded template's own duration always takes precedence.
const ACTIVITY_DEFAULT_DURATION: Record<string, number> = {
  BJJ: 90,
  Kickboxing: 45,
  'Muay Thai': 45,
  Weightlifting: 60,
  'Strength Training': 60,
  Swimming: 30,
  Mobility: 15,
}

function activityDefaultDuration(activity?: string): number | undefined {
  return activity ? ACTIVITY_DEFAULT_DURATION[activity] : undefined
}

function BottomSheet({ sheet, initialSheetDate, selectedDateLabel, shownMeasurements, loadedTemplate, editingEntry, editingTemplate, todayNote, habits, habitRows, trackStrengthWeights, lastWeight, onHabit, onClose, onSave, onLoadFavorite, onCopyPastWorkout }: {
  sheet: Sheet
  initialSheetDate?: string
  selectedDateLabel: string
  shownMeasurements: string[]
  loadedTemplate?: WorkoutTemplate | null
  editingEntry?: { dateISO: string; id: string; entry: CalendarEntry } | null
  editingTemplate?: WorkoutTemplate | null
  todayNote: string
  habits: Record<HabitKey, boolean>
  habitRows: HabitDef[]
  trackStrengthWeights: boolean
  lastWeight?: string
  onHabit: (key: HabitKey) => void
  onClose: () => void
  onSave: (sheet: Sheet, options?: SheetSaveOptions) => void
  onLoadFavorite: () => void
  onCopyPastWorkout: () => void
}) {
  const workoutActivityOptions = ['Strength Training', 'BJJ', 'Kickboxing', 'Muay Thai', 'Swimming', 'Cardio', 'Mobility', 'Custom Activity']
  const [photoKind, setPhotoKind] = useState<PhotoKind>('Meal')
  const [mealPhotoType, setMealPhotoType] = useState<MealPhotoType>('Breakfast')
  const [progressPhotoType, setProgressPhotoType] = useState<ProgressPhotoType>('Front')
  // Structured per-activity data is the source of truth. The list of activity
  // names is derived from it.
  const [activityDetails, setActivityDetails] = useState<ActivityDetail[]>([])
  const chosenActivities = activityDetails.map((d) => d.activity)
  const [showActivityChooser, setShowActivityChooser] = useState(false)
  const [favoriteTemplate, setFavoriteTemplate] = useState(false)
  const [templateTags, setTemplateTags] = useState<Goal[]>(['Weight Loss', 'Strength'])
  const [workoutName, setWorkoutName] = useState('')
  const [workoutNotes, setWorkoutNotes] = useState('')
  const [workoutDurationMinutes, setWorkoutDurationMinutes] = useState(60)
  const [workoutTime, setWorkoutTime] = useState('')
  const [sheetDateISO, setSheetDateISO] = useState(() => getLocalDateISO())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [customDurationMode, setCustomDurationMode] = useState(false)
  const [customDurationInput, setCustomDurationInput] = useState('')
  // True once the user picks a duration themselves, so activity defaults stop
  // overriding their choice.
  const [durationTouched, setDurationTouched] = useState(false)
  const [templateName, setTemplateName] = useState('')
  // Raw per-measurement inputs for the 'measure' sheet, reset each open.
  const [measureValues, setMeasureValues] = useState<Record<string, string>>({})
  useEffect(() => {
    if (sheet !== 'measure') return
    // Editing a measurement → seed the inputs with the stored values (stripped to
    // the numeric part, since stored values carry units like "33.0 in").
    if (editingEntry?.entry.type === 'Measurement' && editingEntry.entry.measurementValues) {
      setMeasureValues(Object.fromEntries(
        Object.entries(editingEntry.entry.measurementValues).map(([k, v]) => [k, String(v).replace(/[^0-9.]/g, '')]),
      ))
    } else {
      setMeasureValues({})
    }
  }, [sheet, editingEntry])
  // Today's reflection: seed the editor with the existing note so it's editable,
  // not overwritten blank, each time the sheet opens.
  const [noteDraft, setNoteDraft] = useState('')
  useEffect(() => {
    if (sheet === 'reflection') setNoteDraft(todayNote)
    else if (sheet === 'note') {
      // Editing an existing Note/Reflection entry → seed its text; else blank.
      const e = editingEntry?.entry
      const existing = e?.type === 'Reflection' ? (e.note ?? e.label ?? '')
        : e?.type === 'Note' ? (e.note ?? e.sub ?? '')
        : ''
      setNoteDraft(existing)
    }
  }, [sheet, todayNote, editingEntry])
  const photoFileInputRef = useRef<HTMLInputElement | null>(null)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [mealHealthScore, setMealHealthScore] = useState<number | null>(null)
  useEffect(() => {
    setPhotoDataUrl(null)
    // Editing a Photo entry → seed kind, label, and health score so the sheet
    // reflects what was logged.
    if ((sheet === 'meal' || sheet === 'progressPhoto') && editingEntry?.entry.type === 'Photo') {
      const e = editingEntry.entry
      setMealHealthScore(e.healthScore ?? null)
      if (e.photoKind) setPhotoKind(e.photoKind)
      if (e.photoKind === 'Meal' && e.photoLabel) setMealPhotoType(e.photoLabel as MealPhotoType)
      if (e.photoKind === 'Progress' && e.photoLabel) setProgressPhotoType(e.photoLabel as ProgressPhotoType)
    } else {
      setMealHealthScore(null)
    }
  }, [sheet, editingEntry])
  const [weightDraft, setWeightDraft] = useState('')
  useEffect(() => {
    if (sheet !== 'weight') return
    const existing = editingEntry?.entry.type === 'Weight' ? (editingEntry.entry.sub?.replace(/\s*lb$/, '').trim() ?? '') : ''
    setWeightDraft(existing)
  }, [sheet, editingEntry])
  useEffect(() => {
    if (!sheet) return
    // Always sync the date to where this sheet was opened from (Calendar date or today).
    setSheetDateISO(initialSheetDate ?? getLocalDateISO())
    setShowDatePicker(false)
    if (sheet !== 'workoutLog' && sheet !== 'createWorkout' && sheet !== 'scheduleWorkout' && sheet !== 'createTemplate') return
    const initialActivities = editingEntry?.entry.activity ? [editingEntry.entry.activity] : loadedTemplate?.activities ?? []
    setWorkoutName(editingEntry?.entry.label ?? loadedTemplate?.name ?? '')
    setWorkoutTime(editingEntry?.entry.workout?.time ?? (sheet === 'scheduleWorkout' ? '' : getLocalTimeHHMM()))
    if (sheet === 'scheduleWorkout') return
    // Seed structured activity data: an edited entry's stored details → a loaded
    // template's stored details → fresh defaults for each named activity.
    const seededDetails: ActivityDetail[] =
      editingEntry?.entry.workout?.activityDetails
      ?? loadedTemplate?.activityDetails
      ?? initialActivities.map((a) => makeActivityDetail(a, trackStrengthWeights))
    setActivityDetails(seededDetails)
    setWorkoutNotes(editingEntry?.entry.sub ?? loadedTemplate?.notes ?? '')
    if (sheet === 'createTemplate') {
      setTemplateTags(loadedTemplate?.tags ?? [])
      setFavoriteTemplate(Boolean(editingTemplate?.favorite))
    }
    // Precedence: an entry being edited → a loaded template's duration →
    // the first activity's default → 60.
    const resolvedDuration = editingEntry?.entry.durationMinutes
      ?? loadedTemplate?.defaultDurationMinutes
      ?? activityDefaultDuration(initialActivities[0])
      ?? 60
    setWorkoutDurationMinutes(resolvedDuration)
    // Off-grid values (e.g. a 50-min template) open in the custom input so the
    // value is visible; common lengths show as a selected chip.
    setCustomDurationMode(!DURATION_CHIPS.includes(resolvedDuration))
    setCustomDurationInput(String(resolvedDuration))
    // A duration coming from an edited entry or template is treated as chosen.
    setDurationTouched(Boolean(editingEntry?.entry.durationMinutes ?? loadedTemplate?.defaultDurationMinutes))
    setShowActivityChooser(false)
  }, [sheet, loadedTemplate, editingEntry, editingTemplate, initialSheetDate])

  // When the user adds the first activity to a fresh log, preselect that
  // activity's default duration — unless they've already picked one themselves.
  useEffect(() => {
    if (sheet !== 'workoutLog' && sheet !== 'createWorkout' && sheet !== 'createTemplate') return
    if (durationTouched || editingEntry || loadedTemplate) return
    const def = activityDefaultDuration(activityDetails[0]?.activity)
    if (def) {
      setWorkoutDurationMinutes(def)
      setCustomDurationMode(!DURATION_CHIPS.includes(def))
      setCustomDurationInput(String(def))
    }
  }, [activityDetails, sheet, durationTouched, editingEntry, loadedTemplate])
  useEffect(() => {
    // When editing a Photo entry, the photo-seed effect sets the kind; don't override it.
    if (editingEntry?.entry.type === 'Photo') return
    if (sheet === 'meal') setPhotoKind('Meal')
    if (sheet === 'progressPhoto') setPhotoKind('Progress')
  }, [sheet, editingEntry])
  function addWorkoutActivity(activity: string) {
    setActivityDetails((current) => [...current, makeActivityDetail(activity, trackStrengthWeights)])
    setShowActivityChooser(false)
  }
  function deleteWorkoutActivity(index: number) {
    setActivityDetails((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }
  function toggleTemplateTag(goal: Goal) {
    setTemplateTags((current) => current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal])
  }
  if (!sheet) return null
  const title = {
    meal: 'Add photo',
    workoutLog: 'Log workout',
    createWorkout: 'Create workout',
    createTemplate: 'New Template',
    saveTemplate: 'Save as Template',
    weight: 'Log weight',
    measure: 'Add measurement',
    progressPhoto: 'Add progress photo',
    scheduleWorkout: 'Plan workout',
    calendarEvent: 'Add calendar event',
    habits: "Today's habits",
    note: 'Add a note',
    reflection: "Today's Reflection",
  }[sheet]
  // When editing an existing entry, prefer an "Edit …" title.
  const editTitle = editingEntry ? ({
    workoutLog: 'Edit workout', weight: 'Edit weight', measure: 'Edit measurement',
    note: editingEntry.entry.type === 'Reflection' ? 'Edit reflection' : 'Edit note',
    meal: 'Edit photo', progressPhoto: 'Edit photo',
  } as Partial<Record<Sheet, string>>)[sheet] : undefined
  const sheetTitle = (sheet === 'createTemplate' && editingTemplate) ? 'Edit Template' : (editTitle ?? title)

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" style={{ background: 'var(--overlay)' }}>
      <div className="max-h-[92dvh] w-full max-w-[392px] overflow-y-auto rounded-t-[24px] border-t p-4 sm:max-w-[372px]" style={{ background: 'var(--surface-1)', borderColor: 'var(--line)', boxShadow: '0 -16px 44px rgba(0,0,0,0.38)' }}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: 'var(--surface-3)' }} />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-bold">{sheetTitle}</h2>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'var(--surface-2)' }}><X size={18} /></button>
        </div>
        {(sheet === 'meal' || sheet === 'progressPhoto') && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 rounded-[10px] border p-1" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
              {(['Meal', 'Progress'] as const).map((kind) => (
                <button key={kind} type="button" onClick={() => setPhotoKind(kind)} className="min-h-[34px] rounded-[8px] text-[13px] font-semibold" style={{ background: photoKind === kind ? 'var(--button-primary-bg)' : 'transparent', color: photoKind === kind ? 'var(--on-accent)' : 'var(--text-soft)', boxShadow: photoKind === kind ? 'var(--button-primary-shadow)' : 'none' }}>{kind}</button>
              ))}
            </div>
            <button type="button" onClick={() => photoFileInputRef.current?.click()} className="flex h-[250px] w-full flex-col items-center justify-center overflow-hidden rounded-[14px] border border-dashed" style={{ borderColor: 'var(--border-strong)', color: 'var(--label)' }}>
              {photoDataUrl ? (
                <img src={photoDataUrl} alt="Selected" className="h-full w-full object-cover" />
              ) : (
                <>
                  <Camera size={28} />
                  <span className="mt-4 text-[13px]">Tap to add a photo</span>
                </>
              )}
            </button>
            <input ref={photoFileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setPhotoDataUrl(reader.result as string); reader.readAsDataURL(file) }} />
            {photoKind === 'Meal' && (
              <div className="flex flex-wrap gap-2">
                {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map((chip) => {
                  const active = mealPhotoType === chip
                  return <button key={chip} type="button" onClick={() => setMealPhotoType(chip)} className="rounded-full border px-3 py-1.5 text-[12px] font-semibold" style={{ background: active ? 'var(--vital-fill)' : 'transparent', borderColor: active ? 'var(--vital-border)' : 'var(--line)', color: active ? 'var(--button-secondary-fg)' : 'var(--text-soft)' }} aria-pressed={active}>{chip}</button>
                })}
              </div>
            )}
            {photoKind === 'Meal' && (
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--label)' }}>Health Score</p>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button key={score} type="button" onClick={() => setMealHealthScore(mealHealthScore === score ? null : score)} className="h-9 w-9 rounded-[8px] border text-[13px] font-bold" style={{ background: mealHealthScore === score ? 'var(--vital-fill)' : 'transparent', borderColor: mealHealthScore === score ? 'var(--vital-border)' : 'var(--line)', color: mealHealthScore === score ? 'var(--button-secondary-fg)' : 'var(--text-soft)' }} aria-pressed={mealHealthScore === score}>{score}</button>
                  ))}
                </div>
              </div>
            )}
            {photoKind === 'Progress' && (
              <div className="flex flex-wrap gap-2">
                {(['Front', 'Side', 'Back'] as const).map((chip) => {
                  const active = progressPhotoType === chip
                  return <button key={chip} type="button" onClick={() => setProgressPhotoType(chip)} className="rounded-full border px-3 py-1.5 text-[12px] font-semibold" style={{ background: active ? 'var(--vital-fill)' : 'transparent', borderColor: active ? 'var(--vital-border)' : 'var(--line)', color: active ? 'var(--button-secondary-fg)' : 'var(--text-soft)' }} aria-pressed={active}>{chip}</button>
                })}
              </div>
            )}
            <textarea placeholder="Optional note..." className="min-h-[62px] w-full rounded-[8px] border bg-transparent p-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
          </div>
        )}
        {(sheet === 'workoutLog' || sheet === 'createWorkout' || sheet === 'createTemplate') && (
          <div className="space-y-3">
            {sheet === 'workoutLog' && (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={onLoadFavorite} className="flex min-h-[42px] items-center justify-center gap-2 rounded-[12px] border px-3 text-[12px] font-bold" style={{ borderColor: 'var(--line)', color: 'var(--fg)', background: 'transparent' }}><Star size={15} style={{ color: 'var(--ember)' }} /> Load from Template</button>
                <button type="button" onClick={onCopyPastWorkout} className="flex min-h-[42px] items-center justify-center gap-2 rounded-[12px] border px-3 text-[12px] font-bold" style={{ borderColor: 'var(--line)', color: 'var(--fg)', background: 'transparent' }}><Copy size={15} style={{ color: 'var(--label)' }} /> Copy Past Workout</button>
              </div>
            )}
            {sheet === 'workoutLog' && (
              <div>
                <div className="flex min-h-[44px] items-center gap-2 rounded-[10px] border px-3 py-2" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
                  <CalendarDays size={15} style={{ color: 'var(--text-soft)' }} />
                  <span className="flex-1 text-[13px] font-semibold">{editingEntry ? `Editing - ${selectedDateLabel}` : (() => { const d = new Date(sheetDateISO + 'T12:00:00'); const todayISO = getLocalDateISO(); return sheetDateISO === todayISO ? `Today - ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) })()}</span>
                  {!editingEntry && <button type="button" onClick={() => setShowDatePicker((p) => !p)} className="rounded-full border px-2.5 py-1 text-[12px] font-semibold" style={{ background: 'var(--surface-1)', borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)' }}>Change date</button>}
                </div>
                {showDatePicker && !editingEntry && (
                  <input type="date" value={sheetDateISO} max={getLocalDateISO()} onChange={(e) => { setSheetDateISO(e.target.value); setShowDatePicker(false) }} className="mt-1 h-10 w-full rounded-[8px] border bg-transparent px-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input value={workoutName || loadedTemplate?.name || ''} onChange={(event) => setWorkoutName(event.target.value)} placeholder={sheet === 'createWorkout' ? 'Template name (e.g. Hip Recovery)' : sheet === 'createTemplate' ? 'Template name (e.g. Back Day)' : 'Workout name (e.g. BJJ, Kickboxing, Back day)'} className="h-10 min-w-0 flex-1 rounded-[8px] border bg-transparent px-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
              {sheet === 'createTemplate' && (
                <button type="button" onClick={() => setFavoriteTemplate((v) => !v)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border" style={{ borderColor: favoriteTemplate ? 'var(--ember)' : 'var(--line)', color: favoriteTemplate ? 'var(--ember)' : 'var(--label)', background: 'var(--surface-2)' }} aria-label="Favorite" aria-pressed={favoriteTemplate}>
                  <Star size={17} fill={favoriteTemplate ? 'currentColor' : 'none'} />
                </button>
              )}
            </div>
            {loadedTemplate && !editingTemplate && <div className="rounded-[10px] border px-3 py-2 text-[12px]" style={{ borderColor: 'var(--signal-border)', background: 'var(--signal-fill)', color: 'var(--text-soft)' }}>Loaded from <span className="font-semibold" style={{ color: 'var(--fg)' }}>{loadedTemplate.name}</span></div>}

            {/* Duration — one-tap chips for common lengths, Custom for the rest */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>Duration</p>
                <button type="button" onClick={() => { setCustomDurationMode((m) => !m); setCustomDurationInput(String(workoutDurationMinutes)); setDurationTouched(true) }} className="text-[12px] font-semibold" style={{ color: 'var(--signal)' }}>
                  {customDurationMode ? 'Presets' : 'Custom'}
                </button>
              </div>
              {customDurationMode ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={customDurationInput}
                    onChange={(e) => {
                      setCustomDurationInput(e.target.value)
                      setDurationTouched(true)
                      const n = parseInt(e.target.value, 10)
                      if (n > 0) setWorkoutDurationMinutes(n)
                    }}
                    placeholder="e.g. 47"
                    className="mono h-11 w-[100px] rounded-[10px] border bg-transparent px-3 text-center text-[18px] font-black outline-none"
                    style={{ borderColor: 'var(--line)', color: 'var(--fg)' }}
                  />
                  <span className="text-[14px] font-semibold" style={{ color: 'var(--text-soft)' }}>minutes</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {DURATION_CHIPS.map((min) => {
                    const active = workoutDurationMinutes === min
                    return (
                      <button
                        key={min}
                        type="button"
                        onClick={() => { setWorkoutDurationMinutes(min); setDurationTouched(true) }}
                        className="min-h-[44px] rounded-[12px] border text-[14px] font-bold"
                        style={{
                          background: active ? 'var(--vital-fill)' : 'transparent',
                          borderColor: active ? 'var(--vital-border)' : 'var(--line)',
                          color: active ? 'var(--button-secondary-fg)' : 'var(--text-soft)',
                        }}
                        aria-pressed={active}
                      >
                        {min}m
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {sheet === 'createWorkout' && (
              <div className="flex flex-wrap gap-2">
                {goals.map((goal, index) => <Pill key={goal} tone={index < 2 ? goalTone(goal) : 'slate'}>{goal}</Pill>)}
              </div>
            )}
            {sheet === 'workoutLog' && (
              <div className="flex items-center gap-2 rounded-[12px] border px-3" style={{ borderColor: 'var(--line)' }}>
                <Clock size={15} style={{ color: 'var(--text-soft)' }} />
                <input type="time" value={workoutTime} onChange={(e) => setWorkoutTime(e.target.value)} className="h-11 flex-1 bg-transparent text-[13px] outline-none" style={{ color: workoutTime ? 'var(--fg)' : 'var(--text-soft)' }} />
                {workoutTime ? <button type="button" onClick={() => setWorkoutTime('')} className="px-2 py-1 rounded-[6px] text-[11px] font-semibold" style={{ color: 'var(--label)', background: 'var(--surface-2)' }}>Clear</button> : <span className="text-[12px]" style={{ color: 'var(--text-soft)' }}>Optional</span>}
              </div>
            )}
            {sheet === 'createTemplate' && (
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>Goal tags</p>
                <div className="flex flex-wrap gap-2">
                  {goals.map((goal) => (
                    <button key={goal} type="button" onClick={() => toggleTemplateTag(goal as Goal)} className="rounded-full border px-3 py-1.5 text-[12px] font-semibold" style={{ background: templateTags.includes(goal as Goal) ? 'var(--vital-fill)' : 'transparent', borderColor: templateTags.includes(goal as Goal) ? 'var(--vital-border)' : 'var(--line)', color: templateTags.includes(goal as Goal) ? 'var(--button-secondary-fg)' : 'var(--text-soft)' }}>{goal}</button>
                  ))}
                </div>
              </div>
            )}
            <Section title="Activities" />
            {activityDetails.length > 0 && (
              <div className="space-y-3">
                {activityDetails.map((detail, index) => (
                  <ActivityLogCard key={`${detail.activity}-${index}`} detail={detail} index={index} onChange={(next) => setActivityDetails((curr) => curr.map((d, i) => i === index ? next : d))} onDelete={deleteWorkoutActivity} />
                ))}
              </div>
            )}
            {(showActivityChooser || activityDetails.length === 0) && (
              <>
                {activityDetails.length === 0 && !showActivityChooser && (
                  <button type="button" onClick={() => setShowActivityChooser(true)} className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[12px] border text-[14px] font-semibold" style={{ background: 'var(--surface-1)', borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}><Plus size={18} /> Add Activity</button>
                )}
                {showActivityChooser && <ActivityChooser options={workoutActivityOptions} onChoose={addWorkoutActivity} />}
              </>
            )}
            {activityDetails.length > 0 && !showActivityChooser && <button type="button" onClick={() => setShowActivityChooser(true)} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[12px] border text-[13px] font-semibold" style={{ background: 'var(--surface-1)', borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)', boxShadow: 'var(--button-secondary-shadow)' }}><Plus size={17} /> Add Activity</button>}
            <textarea value={workoutNotes} onChange={(event) => setWorkoutNotes(event.target.value)} placeholder="Notes (e.g. rolled 5 rounds, worked guard retention)..." className="min-h-[62px] w-full rounded-[8px] border bg-transparent p-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
          </div>
        )}
        {sheet === 'saveTemplate' && (
          <div className="space-y-4">
            <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Template name" className="h-11 w-full rounded-[10px] border bg-transparent px-3 text-[13px] font-semibold outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--label)' }}>Goal tags</p>
              <div className="flex flex-wrap gap-2">{goals.map((goal) => {
                const selected = templateTags.includes(goal)
                return (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => toggleTemplateTag(goal)}
                    className="rounded-full border px-3 py-1.5 text-[12px] font-semibold"
                    style={{
                      background: selected ? tones[goalTone(goal)].bg : 'transparent',
                      borderColor: selected ? tones[goalTone(goal)].border : 'var(--line)',
                      color: selected ? tones[goalTone(goal)].fg : 'var(--text-soft)',
                    }}
                    aria-pressed={selected}
                  >
                    {goal}
                  </button>
                )
              })}</div>
            </div>
            <button
              type="button"
              onClick={() => setFavoriteTemplate((current) => !current)}
              className="flex min-h-[64px] w-full items-center justify-between rounded-[12px] border px-4 text-left"
              style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
              aria-pressed={favoriteTemplate}
            >
              <span>
                <span className="block text-[13px] font-bold">Add to favorites</span>
                <span className="mt-0.5 block text-[12px]" style={{ color: 'var(--text-soft)' }}>Pinned to the top of Templates</span>
              </span>
              <span
                className="relative h-[28px] w-[44px] rounded-full transition-colors"
                style={{ background: favoriteTemplate ? 'var(--signal)' : 'var(--surface-3)' }}
              >
                <span
                  className="absolute top-[4px] h-5 w-5 rounded-full bg-white transition-transform"
                  style={{ left: 4, transform: favoriteTemplate ? 'translateX(16px)' : 'translateX(0)' }}
                />
              </span>
            </button>
          </div>
        )}
        {sheet === 'weight' && (
          <div className="space-y-4 text-center">
            <div className="flex items-end justify-center gap-2">
              <input
                value={weightDraft}
                onChange={(e) => setWeightDraft(e.target.value.replace(/[^0-9.]/g, ''))}
                inputMode="decimal"
                placeholder="0.0"
                className="mono h-[58px] w-[120px] rounded-[8px] border bg-transparent px-3 text-center text-[30px] font-black outline-none"
                style={{ borderColor: 'var(--line)', color: 'var(--fg)' }}
              />
              <span className="mb-3 text-[14px]" style={{ color: 'var(--text-soft)' }}>lb</span>
            </div>
            <p className="text-[12px]" style={{ color: 'var(--label)' }}>
              {lastWeight ? `Last logged ${lastWeight}` : 'No previous entry'}
            </p>
          </div>
        )}
        {sheet === 'measure' && (
          <div className="space-y-3">
            <p className="text-[12px]" style={{ color: 'var(--text-soft)' }}>Enabled from More measurements.</p>
            {shownMeasurements.length ? (
              <div className="grid grid-cols-2 gap-2">
                {shownMeasurements.map((label) => {
                  const unit = label === 'Body weight' ? 'lb' : label === 'Body fat' ? '%' : 'in'
                  return (
                    <label key={label} className="block">
                      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--label)' }}>{label}</span>
                      <div className="grid grid-cols-[1fr_28px] items-center gap-1 rounded-[10px] border px-2" style={{ borderColor: 'var(--line)' }}>
                        <input value={measureValues[label] ?? ''} onChange={(event) => setMeasureValues((current) => ({ ...current, [label]: event.target.value }))} className="mono h-11 min-w-0 bg-transparent text-[13px] font-black outline-none" style={{ color: 'var(--fg)' }} inputMode="decimal" />
                        <span className="text-[11px]" style={{ color: 'var(--label)' }}>{unit}</span>
                      </div>
                    </label>
                  )
                })}
              </div>
            ) : (
              <p className="rounded-[10px] border px-3 py-3 text-[13px]" style={{ borderColor: 'var(--line)', color: 'var(--text-soft)' }}>No measurements enabled yet.</p>
            )}
          </div>
        )}
        {(sheet === 'scheduleWorkout' || sheet === 'calendarEvent') && (
          <div className="space-y-3">
            <input value={sheet === 'scheduleWorkout' ? workoutName : ''} onChange={(e) => { if (sheet === 'scheduleWorkout') setWorkoutName(e.target.value) }} placeholder={sheet === 'scheduleWorkout' ? 'Workout title (e.g. Morning Lift, BJJ)' : 'Event title'} className="h-12 w-full rounded-[12px] border bg-transparent px-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
            <input defaultValue={selectedDateLabel} className="h-12 w-full rounded-[12px] border bg-transparent px-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
            {sheet === 'scheduleWorkout' && (
              <div className="flex items-center gap-2 rounded-[12px] border px-3" style={{ borderColor: 'var(--line)' }}>
                <Clock size={15} style={{ color: 'var(--text-soft)' }} />
                <input type="time" value={workoutTime} onChange={(e) => setWorkoutTime(e.target.value)} className="h-12 flex-1 bg-transparent text-[13px] outline-none" style={{ color: workoutTime ? 'var(--fg)' : 'var(--text-soft)' }} />
                {workoutTime && <button type="button" onClick={() => setWorkoutTime('')} className="text-[11px] font-semibold px-2 py-1 rounded-[6px]" style={{ color: 'var(--label)', background: 'var(--surface-2)' }}>Clear</button>}
              </div>
            )}
          </div>
        )}
        {sheet === 'habits' && <div className="space-y-2">{habitRows.map(({ key, label }) => <button key={key} onClick={() => onHabit(key)} className="flex min-h-[46px] w-full items-center gap-3 rounded-[12px] px-3 text-left" style={{ background: habits[key] ? 'var(--vital-fill)' : 'var(--surface-2)' }}><Check size={16} style={{ color: habits[key] ? 'var(--button-secondary-fg)' : 'var(--label)' }} /><span className="font-semibold">{label}</span></button>)}</div>}
        {(sheet === 'note' || sheet === 'reflection') && <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder={sheet === 'reflection' ? 'How did today go? Anything to remember...' : 'Add a note...'} className="min-h-[106px] w-full rounded-[8px] border bg-transparent p-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />}
        {(() => {
          const templateNameMissing = sheet === 'createTemplate' && !(workoutName.trim() || loadedTemplate?.name?.trim())
          return (
        <button disabled={templateNameMissing} onClick={() => { onSave(sheet, { photoKind, photoLabel: photoKind === 'Meal' ? mealPhotoType : progressPhotoType, templateTags, templateName, templateActivities: chosenActivities, favoriteTemplate, workoutName, workoutActivities: chosenActivities, activityDetails, workoutNotes, workoutDurationMinutes, workoutTime: workoutTime.trim() || undefined, overrideDate: sheetDateISO, note: noteDraft, measurementValues: sheet === 'measure' ? Object.fromEntries(Object.entries(measureValues).map(([label, raw]) => [label, formatMeasurementValue(label, raw)]).filter(([, value]) => value)) : undefined, weightValue: sheet === 'weight' ? weightDraft.trim() : undefined, healthScore: mealHealthScore ?? undefined }) }} className="mt-6 min-h-[50px] w-full rounded-[13px] text-[14px] font-bold disabled:opacity-40" style={{ background: 'var(--button-primary-bg)', color: 'var(--on-accent)', boxShadow: 'var(--button-primary-shadow)' }}>{(sheet === 'saveTemplate' || sheet === 'createTemplate') ? (editingTemplate ? 'Save Changes' : 'Save Template') : 'Save'}</button>
          )
        })()}
        {sheet === 'saveTemplate' && <button onClick={onClose} className="mt-2 min-h-[42px] w-full rounded-[12px] border text-[13px] font-semibold" style={{ borderColor: 'var(--line)' }}>Not now</button>}
        {sheet === 'createTemplate' && <button onClick={onClose} className="mt-2 min-h-[42px] w-full rounded-[12px] border text-[13px] font-semibold" style={{ borderColor: 'var(--line)' }}>Cancel</button>}
      </div>
    </div>
  )
}

function PastWorkoutPickerSheet({ open, entries, onSelect, onClose }: { open: boolean; entries: { dateISO: string; entry: CalendarEntry }[]; onSelect: (entry: CalendarEntry) => void; onClose: () => void }) {
  if (!open) return null
  const workouts = entries.filter((e) => e.entry.type === 'Workout').slice(0, 30)
  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center" style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className="flex w-full max-w-[392px] animate-[slideUp_220ms_cubic-bezier(0.32,0.72,0,1)] flex-col rounded-t-[24px] border-t sm:max-w-[372px]" style={{ background: 'var(--surface-1)', borderColor: 'var(--line)', boxShadow: '0 -16px 44px rgba(0,0,0,0.38)', height: '65dvh' }} onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 px-4 pb-3 pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-bold">Copy Past Workout</h2>
              <p className="mt-1 text-[12px]" style={{ color: 'var(--text-soft)' }}>Select a previous workout to copy into today.</p>
            </div>
            <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]" style={{ background: 'var(--surface-2)' }} aria-label="Close"><X size={18} /></button>
          </div>
          <div className="flex justify-center pb-1"><div className="h-1 w-10 rounded-full" style={{ background: 'var(--surface-3)' }} /></div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          {workouts.length === 0 ? (
            <div className="rounded-[14px] border px-4 py-8 text-center" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
              <p className="text-[13px]" style={{ color: 'var(--text-soft)' }}>No past workouts found. Log a workout first to copy it here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {workouts.map(({ dateISO, entry }) => (
                <button key={entry.id ?? `${dateISO}-${entry.label}`} type="button" onClick={() => onSelect(entry)} className="flex min-h-[64px] w-full items-center gap-3 rounded-[14px] border px-3 text-left" style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
                  <IconChip icon={Dumbbell} tone="signal" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold">{entry.label}</span>
                    <span className="mt-0.5 block text-[12px]" style={{ color: 'var(--text-soft)' }}>
                      {[entry.activity, entry.durationMinutes ? `${entry.durationMinutes} min` : null, dateISO].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <ChevronRight size={16} style={{ color: 'var(--label)' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TemplatePickerSheet({ open, templates, onSelect, onSelectDefault, onClose }: { open: boolean; templates: WorkoutTemplate[]; onSelect: (template: WorkoutTemplate) => void; onSelectDefault: (category: DefaultCategory) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const sheetRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartH = useRef(0)
  const winH = useRef(0)

  useEffect(() => {
    if (open) {
      setQuery('')
      winH.current = window.innerHeight
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'height 220ms cubic-bezier(0.32,0.72,0,1)'
        sheetRef.current.style.height = `${Math.round(winH.current * 0.65)}px`
      }
    }
  }, [open])

  function onPillDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDragging.current = true
    dragStartY.current = e.clientY
    dragStartH.current = sheetRef.current?.offsetHeight ?? Math.round(winH.current * 0.65)
  }
  function onPillMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current || !sheetRef.current) return
    const delta = dragStartY.current - e.clientY
    const next = Math.max(180, Math.min(winH.current * 0.94, dragStartH.current + delta))
    sheetRef.current.style.transition = 'none'
    sheetRef.current.style.height = `${next}px`
  }
  function onPillUp() {
    if (!isDragging.current || !sheetRef.current) return
    isDragging.current = false
    const cur = sheetRef.current.offsetHeight
    const compact = winH.current * 0.65
    const mid = winH.current * 0.775
    sheetRef.current.style.transition = 'height 220ms cubic-bezier(0.32,0.72,0,1)'
    sheetRef.current.style.height = cur > mid ? `${Math.round(winH.current * 0.92)}px` : `${Math.round(compact)}px`
  }

  if (!open) return null
  const q = query.toLowerCase()
  const builtIn = DEFAULT_CATEGORIES.filter((category) => `${category} ${CATEGORY_VARIATION_LABELS[category]}`.toLowerCase().includes(q))
  const filtered = templates
    .filter((template) => [template.name, template.notes, ...template.tags, ...template.activities].join(' ').toLowerCase().includes(q))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name))
  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center" style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div
        ref={sheetRef}
        className="flex w-full max-w-[392px] animate-[slideUp_220ms_cubic-bezier(0.32,0.72,0,1)] flex-col rounded-t-[24px] border-t sm:max-w-[372px]"
        style={{ background: 'var(--surface-1)', borderColor: 'var(--line)', boxShadow: '0 -16px 44px rgba(0,0,0,0.38)', height: '65dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — only this strip initiates dragging */}
        <div
          className="shrink-0 touch-none cursor-grab select-none active:cursor-grabbing"
          onPointerDown={onPillDown}
          onPointerMove={onPillMove}
          onPointerUp={onPillUp}
          onPointerCancel={onPillUp}
        >
          <div className="flex justify-center pb-2 pt-3">
            <div className="h-1 w-10 rounded-full" style={{ background: 'var(--surface-3)' }} />
          </div>
        </div>

        {/* Sticky header — title, close, search */}
        <div className="shrink-0 px-4 pb-3">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-bold">Choose template</h2>
              <p className="mt-1 text-[12px]" style={{ color: 'var(--text-soft)' }}>Load a built-in or saved workout into today&apos;s log.</p>
            </div>
            <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]" style={{ background: 'var(--surface-2)' }} aria-label="Close template picker"><X size={18} /></button>
          </div>
          <div className="flex min-h-[42px] items-center gap-2 rounded-[10px] border px-3" style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
            <Search size={16} style={{ color: 'var(--label)' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none" style={{ color: 'var(--fg)' }} />
          </div>
        </div>

        {/* Scrollable list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          {builtIn.length > 0 && (
            <>
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--label)' }}>Built-in Templates</p>
              <div className="space-y-2">
                {builtIn.map((category) => (
                  <button key={category} type="button" onClick={() => onSelectDefault(category)} className="flex min-h-[70px] w-full items-center gap-3 rounded-[14px] border px-3 text-left" style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
                    <IconChip icon={Dumbbell} tone="vital" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold">{category}</span>
                      <span className="mt-1 block text-[12px]" style={{ color: 'var(--text-soft)' }}>{CATEGORY_VARIATION_LABELS[category]}</span>
                    </span>
                    <ChevronRight size={16} style={{ color: 'var(--label)' }} />
                  </button>
                ))}
              </div>
            </>
          )}

          <p className="mb-2 mt-5 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--label)' }}>Saved Templates</p>
          <div className="space-y-2">
            {filtered.map((template) => (
              <button key={template.id} type="button" onClick={() => onSelect(template)} className="flex min-h-[70px] w-full items-center gap-3 rounded-[14px] border px-3 text-left" style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
                <IconChip icon={Dumbbell} tone="signal" />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[14px] font-bold">{template.name}</span>
                    {template.favorite && <Star size={14} fill="currentColor" className="shrink-0" style={{ color: 'var(--amber)' }} />}
                  </span>
                  <span className="mt-1 block text-[12px]" style={{ color: 'var(--text-soft)' }}>{template.activities.length} {template.activities.length === 1 ? 'activity' : 'activities'} · last used {template.lastUsed}</span>
                </span>
                <ChevronRight size={16} style={{ color: 'var(--label)' }} />
              </button>
            ))}
            {!filtered.length && (
              <div className="rounded-[14px] border px-4 py-5 text-center" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
                <p className="text-[13px]" style={{ color: 'var(--text-soft)' }}>{templates.length ? 'No saved templates match your search.' : 'No saved templates yet. Save a workout to reuse it here.'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function AccountSwitchSheet({ open, role, onRole, onClose, onCreate }: { open: boolean; role: Role; onRole: (role: Role) => void; onClose: () => void; onCreate: () => void }) {
  if (!open) return null
  const rows: { role?: Role; label: string; sub: string; icon: React.ComponentType<any>; tone: string; action?: () => void }[] = [
    { role: 'client', label: 'Personal', sub: 'Maya Rivera', icon: User, tone: 'signal' },
    { role: 'trainer', label: 'Trainer', sub: 'Coach Taylor', icon: Users, tone: 'pulse' },
    { label: 'Create Trainer Profile', sub: 'Set up coaching tools', icon: Plus, tone: 'vital', action: onCreate },
  ]
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" style={{ background: 'var(--overlay)' }}>
      <div className="w-full max-w-[392px] rounded-t-[24px] border-t p-4 sm:max-w-[372px]" style={{ background: 'var(--surface-1)', borderColor: 'var(--line)', boxShadow: '0 -16px 44px rgba(0,0,0,0.38)' }}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: 'var(--surface-3)' }} />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[18px] font-bold">Switch account</h2>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'var(--surface-2)' }}><X size={18} /></button>
        </div>
        <div className="space-y-2">
          {rows.map((row) => {
            const Icon = row.icon
            const selected = row.role === role
            return (
              <button key={row.label} onClick={() => { if (row.role) onRole(row.role); else row.action?.(); onClose() }} className="flex min-h-[56px] w-full items-center gap-3 rounded-[13px] px-3 text-left" style={{ background: selected ? 'var(--signal-fill)' : 'var(--surface-2)' }}>
                <IconChip icon={Icon} tone={row.tone} />
                <span className="flex-1"><span className="block font-semibold">{row.label}</span><span className="block text-[12px]" style={{ color: 'var(--text-soft)' }}>{row.sub}</span></span>
                {selected && <Check size={17} style={{ color: 'var(--button-secondary-fg)' }} />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Toast({ message }: { message: string }) {
  return <div className="fixed bottom-[92px] left-1/2 z-[80] -translate-x-1/2 rounded-full bg-[rgba(15,24,41,0.94)] px-4 py-2 text-[13px] font-black text-white shadow-xl">{message}</div>
}

function SaveTemplatePrompt({ open, skip, onSkip, onSave, onClose }: { open: boolean; skip: boolean; onSkip: (skip: boolean) => void; onSave: () => void; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center" style={{ background: 'var(--overlay)' }}>
      <div className="w-full max-w-[392px] rounded-t-[24px] border-t p-5 sm:max-w-[372px]" style={{ background: 'var(--surface-1)', borderColor: 'var(--line)', boxShadow: '0 -16px 44px rgba(0,0,0,0.38)' }}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: 'var(--surface-3)' }} />
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]" style={{ background: 'var(--vital-fill)', color: 'var(--vital)' }}>
            <Check size={20} strokeWidth={3} />
          </span>
          <div>
            <h2 className="text-[18px] font-black">Template Saved</h2>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>Would you like to save this as a template?</p>
          </div>
        </div>
        <button type="button" onClick={onSave} className="mt-5 min-h-[48px] w-full rounded-[13px] text-[14px] font-bold" style={{ background: 'var(--button-primary-surface)', color: 'var(--on-accent)', boxShadow: 'var(--button-primary-shadow)' }}>Save as Template</button>
        <button type="button" onClick={() => onSkip(!skip)} className="mt-4 flex min-h-[34px] w-full items-center gap-3 text-left text-[13px] font-semibold" style={{ color: 'var(--text-soft)' }}>
          <span className="flex h-5 w-5 items-center justify-center rounded-[5px] border" style={{ borderColor: skip ? 'var(--signal)' : 'var(--line)', background: skip ? 'var(--signal)' : 'transparent', color: 'var(--on-accent)' }}>
            {skip && <Check size={13} strokeWidth={3} />}
          </span>
          Don&apos;t ask again for this workout
        </button>
        <button type="button" onClick={onClose} className="mt-2 min-h-[44px] w-full rounded-[12px] border text-[13px] font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--fg)', background: 'var(--surface-1)' }}>Not Now</button>
      </div>
    </div>
  )
}

function AvatarMenuSheet({ open, theme, unitSystem, profileName, profileInitials, profilePhoto, onUnits, onClose, onProfile, onIntegrations, onTheme, onSignOut }: { open: boolean; theme: 'dark' | 'light'; unitSystem: 'lbs' | 'kg'; profileName: string; profileInitials: string; profilePhoto: string | null; onUnits: (unit: 'lbs' | 'kg') => void; onClose: () => void; onProfile: () => void; onIntegrations: () => void; onTheme: () => void; onSignOut: () => void }) {
  if (!open) return null
  function run(action?: () => void) {
    onClose()
    action?.()
  }
  const dark = theme === 'dark'
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center" style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className="max-h-[60vh] w-full max-w-[392px] animate-[slideUp_180ms_ease-out] overflow-y-auto rounded-t-[24px] border-t p-5 shadow-[0_-18px_54px_rgba(0,0,0,0.42)] sm:max-w-[372px]" style={{ background: 'var(--surface-1)', borderColor: 'var(--line)' }} onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: 'var(--surface-3)' }} />
        <div className="space-y-4">
          <Card className="overflow-hidden p-0" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-strong)', boxShadow: 'var(--shadow-card)' }}>
            <button type="button" onClick={() => run(onProfile)} className="flex min-h-[72px] w-full items-center gap-3 px-4 text-left">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-[16px] font-black text-white" style={{ background: 'var(--button-primary-bg)', boxShadow: 'var(--button-primary-shadow)' }}>
                {profilePhoto ? <img src={profilePhoto} alt="" className="h-full w-full object-cover" /> : profileInitials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-black">{profileName}</span>
                <span className="mt-0.5 block text-[13px] font-bold" style={{ color: 'var(--button-secondary-fg)' }}>View Profile</span>
              </span>
                <ChevronRight size={15} style={{ color: 'var(--label)' }} />
            </button>
          </Card>

          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--label)' }}>Integrations</p>
            <Card className="overflow-hidden p-0" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-strong)', boxShadow: 'var(--shadow-card)' }}>
              {[
                { label: 'Apple Health', icon: Heart, tone: 'vital', soon: true },
                { label: 'Oura Ring', icon: Target, tone: 'pulse', soon: false },
              ].map((row, index) => {
                const Icon = row.icon
                return (
                  <button key={row.label} type="button" onClick={() => run(onIntegrations)} className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left" style={{ borderTop: index ? '1px solid var(--line)' : 'none' }}>
                    <IconChip icon={Icon} tone={row.tone} />
                    <span className="min-w-0 flex-1"><span className="block text-[14px] font-semibold">{row.label}</span></span>
                    {row.soon ? (
                      <span className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold" style={{ borderColor: 'var(--amber-border)', color: 'var(--amber)', background: 'var(--amber-fill)' }}>Soon</span>
                    ) : (
                      <ChevronRight size={16} style={{ color: 'var(--label)' }} />
                    )}
                  </button>
                )
              })}
            </Card>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--label)' }}>Preferences</p>
            <Card className="overflow-hidden p-0" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-strong)', boxShadow: 'var(--shadow-card)' }}>
              <div className="flex min-h-[64px] items-center gap-3 px-4">
                <IconChip icon={Scale} tone="vital" />
                <span className="min-w-0 flex-1 text-[14px] font-semibold">Units</span>
                <div className="grid grid-cols-2 rounded-[10px] border p-1 text-[12px] font-bold" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
                  {(['lbs', 'kg'] as const).map((unit) => {
                    const active = unitSystem === unit
                    return (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => onUnits(unit)}
                        className="min-h-[30px] rounded-[8px] px-3 transition-colors"
                        style={{ background: active ? 'var(--vital)' : 'transparent', color: active ? 'var(--on-accent)' : 'var(--text-soft)' }}
                        aria-pressed={active}
                      >
                        {unit}
                      </button>
                    )
                  })}
                </div>
              </div>
              <button type="button" onClick={onTheme} className="flex min-h-[64px] w-full items-center gap-3 px-4 text-left" style={{ borderTop: '1px solid var(--line)' }}>
                <IconChip icon={dark ? Moon : Sun} tone="signal" />
                <span className="min-w-0 flex-1"><span className="block text-[14px] font-semibold">Dark Mode</span><span className="block text-[12px]" style={{ color: 'var(--text-soft)' }}>{dark ? 'On' : 'Off'}</span></span>
                <span className="relative h-[30px] w-[48px] rounded-full transition-colors" style={{ background: dark ? 'var(--signal)' : 'var(--surface-3)' }}>
                  <span className="absolute top-[4px] h-[22px] w-[22px] rounded-full bg-white transition-transform" style={{ left: 4, transform: dark ? 'translateX(18px)' : 'translateX(0)' }} />
                </span>
              </button>
            </Card>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--label)' }}>Support</p>
            <Card className="overflow-hidden p-0" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-strong)', boxShadow: 'var(--shadow-card)' }}>
              <button type="button" onClick={onClose} className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left">
                <IconChip icon={Bell} tone="slate" />
                <span className="min-w-0 flex-1 text-[14px] font-semibold">Help & Feedback</span>
                <ChevronRight size={15} style={{ color: 'var(--label)' }} />
              </button>
            </Card>
          </div>

          <button type="button" onClick={() => run(onSignOut)} className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-[12px] border text-[13px] font-semibold" style={{ borderColor: 'var(--danger-border)', color: 'var(--danger)', background: 'transparent' }}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

function SavePlanTemplateModal({ open, workout, duplicate, onSave, onClose }: { open: boolean; workout: ScheduledWorkout | null; duplicate: boolean; onSave: (favorite: boolean) => void; onClose: () => void }) {
  const [favorite, setFavorite] = useState(false)
  if (!open) return null
  const plan = workout ?? { label: 'Upper Body + Bag Work', sub: 'Strength - Kickboxing - 60 min', activities: ['Strength', 'Kickboxing'] }
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center" style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className="w-full max-w-[392px] rounded-t-[24px] border-t p-5 shadow-[0_-18px_54px_rgba(0,0,0,0.40)] sm:max-w-[372px]" style={{ background: 'var(--surface-1)', borderColor: 'var(--line)' }} onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: 'var(--surface-3)' }} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[20px] font-black">Save Template</h2>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>{plan.label}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-soft)' }}><X size={18} /></button>
        </div>
        <div className="mt-5 rounded-[14px] border p-4" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
          <p className="text-[13px] font-bold">{plan.activities.join(' - ')}</p>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--text-soft)' }}>{plan.sub}</p>
        </div>
        {duplicate && (
          <div className="mt-3 rounded-[12px] border px-3 py-2 text-[12px] font-semibold" style={{ borderColor: 'var(--ember-border)', background: 'var(--ember-fill)', color: 'var(--ember)' }}>
            A duplicate template already exists for this workout.
          </div>
        )}
        <button
          type="button"
          onClick={() => setFavorite((current) => !current)}
          className="mt-4 flex min-h-[56px] w-full items-center justify-between rounded-[13px] border px-4 text-left"
          style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
          aria-pressed={favorite}
        >
          <span>
            <span className="block text-[13px] font-bold">Favorite template</span>
            <span className="mt-0.5 block text-[12px]" style={{ color: 'var(--text-soft)' }}>Pin it above regular templates</span>
          </span>
          <span className="relative h-[28px] w-[46px] rounded-full transition-colors" style={{ background: favorite ? 'var(--signal)' : 'var(--surface-3)' }}>
            <span className="absolute top-[4px] h-5 w-5 rounded-full bg-white transition-transform" style={{ left: 4, transform: favorite ? 'translateX(18px)' : 'translateX(0)' }} />
          </span>
        </button>
        <button type="button" onClick={() => onSave(favorite)} className="mt-5 min-h-[50px] w-full rounded-[13px] text-[14px] font-bold" style={{ background: 'var(--button-primary-surface)', color: 'var(--on-accent)', boxShadow: 'var(--button-primary-shadow)' }}>Save</button>
        <button type="button" onClick={onClose} className="mt-2 min-h-[44px] w-full rounded-[12px] border text-[13px] font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--fg)', background: 'var(--surface-1)' }}>Dismiss</button>
      </div>
    </div>
  )
}

// Asks before overwriting a workout already loaded into Today, so loading a
// second template doesn't silently discard the first.
function ReplaceWorkoutModal({ open, currentLabel, incomingLabel, onReplace, onClose }: { open: boolean; currentLabel: string; incomingLabel: string; onReplace: () => void; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center" style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className="w-full max-w-[392px] rounded-t-[24px] border-t p-5 shadow-[0_-18px_54px_rgba(0,0,0,0.40)] sm:max-w-[372px]" style={{ background: 'var(--surface-1)', borderColor: 'var(--line)' }} onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: 'var(--surface-3)' }} />
        <h2 className="text-[20px] font-black">Replace today&apos;s workout?</h2>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>
          You already have <span className="font-semibold" style={{ color: 'var(--fg)' }}>{currentLabel}</span> loaded for today. Replace it with <span className="font-semibold" style={{ color: 'var(--fg)' }}>{incomingLabel}</span>?
        </p>
        <button type="button" onClick={onReplace} className="mt-5 min-h-[50px] w-full rounded-[13px] text-[14px] font-bold" style={{ background: 'var(--button-primary-surface)', color: 'var(--on-accent)', boxShadow: 'var(--button-primary-shadow)' }}>Replace workout</button>
        <button type="button" onClick={onClose} className="mt-2 min-h-[44px] w-full rounded-[12px] border text-[13px] font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--fg)', background: 'var(--surface-1)' }}>Keep current</button>
      </div>
    </div>
  )
}

function sameCalendarDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function copyDatePayload(date: Date): CopyWorkoutDate {
  return {
    day: date.getDate(),
    month: date.getMonth(),
    year: date.getFullYear(),
    label: new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(date),
  }
}

function MiniCalendar({ label, selectedDate, onSelectDate, minDate, helper }: { label: string; selectedDate: Date; onSelectDate: (date: Date) => void; minDate?: Date; helper?: string }) {
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1)
  const weekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const leadingBlanks = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay()
  const monthTitle = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(viewDate)
  const selectedLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(selectedDate)
  const today = new Date(2026, 5, 15)

  function changeMonth(offset: number) {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  return (
    <div className="rounded-[16px] border p-3" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>{label}</p>
          <div className="mt-1 flex items-center gap-2">
            <button type="button" onClick={() => changeMonth(-1)} className="flex h-8 w-8 items-center justify-center rounded-[9px] border" style={{ borderColor: 'var(--line)', background: 'var(--surface-1)', color: 'var(--fg)' }} aria-label="Previous month"><ChevronLeft size={16} /></button>
            <p className="min-w-[118px] text-center text-[13px] font-bold">{monthTitle}</p>
            <button type="button" onClick={() => changeMonth(1)} className="flex h-8 w-8 items-center justify-center rounded-[9px] border" style={{ borderColor: 'var(--line)', background: 'var(--surface-1)', color: 'var(--fg)' }} aria-label="Next month"><ChevronRight size={16} /></button>
          </div>
        </div>
        <span className="rounded-full px-3 py-1 text-[12px] font-bold" style={{ background: 'var(--vital-fill)', color: 'var(--button-secondary-fg)' }}>
          {selectedLabel}
        </span>
      </div>
      {helper && <p className="mb-3 text-[12px] leading-snug" style={{ color: 'var(--text-soft)' }}>{helper}</p>}
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekLabels.map((day) => (
          <span key={day} className="pb-1 text-[10px] font-black uppercase" style={{ color: 'var(--label)' }}>{day}</span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, index) => <span key={`blank-${index}`} />)}
        {days.map((day) => {
          const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
          const selected = sameCalendarDate(selectedDate, date)
          const disabled = Boolean(minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()))
          const isToday = sameCalendarDate(today, date)
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(date)}
              className="relative flex h-10 items-center justify-center rounded-[10px] text-[13px] font-bold transition disabled:opacity-30"
              style={{
                background: isToday && !selected ? 'var(--vital-fill)' : 'var(--surface-1)',
                border: selected ? '1px solid var(--vital)' : `1px solid ${isToday ? 'var(--vital-border)' : 'var(--line)'}`,
                color: selected ? 'var(--vital)' : isToday ? 'var(--vital)' : 'var(--fg)',
                boxShadow: 'none',
              }}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CopyWorkoutModal({ open, workout, onClose, onCopy }: { open: boolean; workout: ScheduledWorkout | null; onClose: () => void; onCopy: (dates: CopyWorkoutDate[], recurrence?: 'weekly') => void }) {
  const [mode, setMode] = useState<'single' | 'repeat'>('single')
  const [singleDate, setSingleDate] = useState(() => new Date(2026, 5, 16))
  const [startDate, setStartDate] = useState(() => new Date(2026, 5, 16))
  const [selectedWeekdays, setSelectedWeekdays] = useState<Set<number>>(new Set([2, 4]))
  const [endMode, setEndMode] = useState<'count' | 'date'>('count')
  const [occurrences, setOccurrences] = useState(4)
  const [endDate, setEndDate] = useState(() => new Date(2026, 5, 30))
  if (!open) return null
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const title = workout?.label ?? 'Workout'
  const repeatDates: Date[] = []
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const maxDate = endMode === 'date'
    ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
    : new Date(startDate.getFullYear(), startDate.getMonth() + 6, startDate.getDate())
  while (cursor <= maxDate && repeatDates.length < (endMode === 'count' ? occurrences : 120)) {
    if (selectedWeekdays.has(cursor.getDay())) repeatDates.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  const repeatCopies = repeatDates.map(copyDatePayload)

  function toggleWeekday(day: number) {
    setSelectedWeekdays((current) => {
      const next = new Set(current)
      next.has(day) ? next.delete(day) : next.add(day)
      return next.size ? next : current
    })
  }

  function submit() {
    if (mode === 'single') onCopy([copyDatePayload(singleDate)])
    else onCopy(repeatCopies, 'weekly')
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center" style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-[392px] overflow-y-auto rounded-t-[24px] border-t p-5 shadow-[0_-24px_60px_rgba(0,0,0,0.36)] sm:max-w-[372px]" style={{ background: 'var(--surface-1)', borderColor: 'var(--line)' }} onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: 'var(--surface-3)' }} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[20px] font-black">Copy to Date</h2>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--text-soft)' }}>{title}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-soft)' }}><X size={18} /></button>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-[12px] border p-1" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
          {[
            ['single', 'Single Date'],
            ['repeat', 'Repeat Schedule'],
          ].map(([value, label]) => (
            <button key={value} type="button" onClick={() => setMode(value as 'single' | 'repeat')} className="min-h-[38px] rounded-[9px] text-[13px] font-bold" style={{ background: mode === value ? 'var(--button-primary-bg)' : 'transparent', color: mode === value ? 'var(--on-accent)' : 'var(--text-soft)', boxShadow: mode === value ? 'var(--button-primary-shadow)' : 'none' }}>{label}</button>
          ))}
        </div>

        {mode === 'single' ? (
          <div className="mt-5">
            <MiniCalendar label="Select date" selectedDate={singleDate} onSelectDate={setSingleDate} helper="Choose the date to schedule a fresh copy." />
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <MiniCalendar label="Start date" selectedDate={startDate} onSelectDate={setStartDate} helper="Repeats begin on or after this date." />

            <div className="rounded-[16px] border p-3" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
              <p className="mb-2 text-[12px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>Repeat weekly on</p>
              <div className="grid grid-cols-7 gap-1.5">
                {weekdays.map((label, index) => (
                  <button key={label} type="button" onClick={() => toggleWeekday(index)} className="h-10 rounded-[10px] border text-[11px] font-bold" style={{ background: selectedWeekdays.has(index) ? 'var(--button-primary-bg)' : 'var(--surface-1)', borderColor: selectedWeekdays.has(index) ? 'var(--button-primary-bg)' : 'var(--line)', color: selectedWeekdays.has(index) ? 'var(--on-accent)' : 'var(--fg)', boxShadow: selectedWeekdays.has(index) ? 'var(--button-primary-shadow)' : 'none' }}>{label}</button>
                ))}
              </div>
            </div>

            <div className="rounded-[16px] border p-3" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
              <p className="mb-2 text-[12px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--label)' }}>End</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setEndMode('count')} className="min-h-[40px] rounded-[10px] border text-[12px] font-bold" style={{ borderColor: endMode === 'count' ? 'var(--button-primary-bg)' : 'var(--line)', color: endMode === 'count' ? 'var(--on-accent)' : 'var(--text-soft)', background: endMode === 'count' ? 'var(--button-primary-bg)' : 'var(--surface-1)', boxShadow: endMode === 'count' ? 'var(--button-primary-shadow)' : 'none' }}>After X</button>
                <button type="button" onClick={() => setEndMode('date')} className="min-h-[40px] rounded-[10px] border text-[12px] font-bold" style={{ borderColor: endMode === 'date' ? 'var(--button-primary-bg)' : 'var(--line)', color: endMode === 'date' ? 'var(--on-accent)' : 'var(--text-soft)', background: endMode === 'date' ? 'var(--button-primary-bg)' : 'var(--surface-1)', boxShadow: endMode === 'date' ? 'var(--button-primary-shadow)' : 'none' }}>End date</button>
              </div>
              {endMode === 'count' ? (
                <div className="mt-3 flex items-center gap-3 rounded-[12px] border px-3 py-2" style={{ borderColor: 'var(--line)', background: 'var(--surface-1)' }}>
                  <span className="flex-1 text-[13px] font-semibold">Occurrences</span>
                  <input type="number" min={1} max={12} value={occurrences} onChange={(event) => setOccurrences(Math.max(1, Number(event.target.value) || 1))} className="mono h-9 w-20 rounded-[8px] border bg-transparent px-2 text-center text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
                </div>
              ) : (
                <div className="mt-3">
                  <MiniCalendar label="End on" selectedDate={endDate} onSelectDate={setEndDate} minDate={startDate} />
                </div>
              )}
            </div>

            <p className="rounded-[12px] border px-3 py-2 text-[12px] font-semibold" style={{ borderColor: 'var(--signal-border)', color: 'var(--fg)', background: 'var(--signal-fill)' }}>
              {repeatCopies.length} workout{repeatCopies.length === 1 ? '' : 's'} will be scheduled.
            </p>
          </div>
        )}

        <button type="button" onClick={submit} disabled={mode === 'repeat' && !repeatCopies.length} className="mt-5 min-h-[50px] w-full rounded-[13px] text-[14px] font-bold disabled:opacity-55" style={{ background: 'var(--button-primary-surface)', color: 'var(--on-accent)', boxShadow: 'var(--button-primary-shadow)' }}>
          Copy workout
        </button>
      </div>
    </div>
  )
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

const TUTORIAL_STEPS: { icon: React.ComponentType<{ size?: number }>; title: string; body: string }[] = [
  { icon: Dumbbell, title: 'Log it in one tap', body: 'Tap the + button to log workouts, weight, notes, meals, and measurements.' },
  { icon: CalendarDays, title: 'Review your history', body: 'Use Calendar and Timeline to look back at everything you’ve logged.' },
  { icon: TrendingUp, title: 'Track your trends', body: 'Progress charts your weight, measurements, and activity over time.' },
  { icon: Heart, title: 'Connect Oura', body: 'Sync sleep, readiness, HRV, and recovery from your Oura ring in Connected Apps.' },
  { icon: LineChart, title: 'Discover patterns', body: 'Insights surface what’s actually helping you — the more you log, the sharper they get.' },
]

function TutorialOverlay({ open, onClose, finishLabel = 'Done' }: { open: boolean; onClose: () => void; finishLabel?: string }) {
  const [step, setStep] = useState(0)
  useEffect(() => { if (open) setStep(0) }, [open])
  if (!open) return null
  const isLast = step === TUTORIAL_STEPS.length - 1
  const current = TUTORIAL_STEPS[step]
  const Icon = current.icon
  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center" style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className="w-full max-w-[392px] animate-[slideUp_200ms_ease-out] rounded-t-[24px] border-t p-6 sm:max-w-[372px]" style={{ background: 'var(--surface-1)', borderColor: 'var(--line)', boxShadow: '0 -16px 44px rgba(0,0,0,0.4)' }} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {TUTORIAL_STEPS.map((_, index) => (
              <span key={index} className="h-1.5 rounded-full transition-all" style={{ width: index === step ? 20 : 6, background: index === step ? 'var(--signal)' : 'var(--surface-3)' }} />
            ))}
          </div>
          <button type="button" onClick={onClose} className="text-[13px] font-semibold" style={{ color: 'var(--label)' }}>Skip</button>
        </div>
        <div className="mt-7 flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-[16px]" style={{ background: 'var(--signal-fill)', color: 'var(--signal)' }}>
            <Icon size={26} />
          </span>
          <p className="mt-4 text-[18px] font-black">{current.title}</p>
          <p className="mt-2 max-w-[300px] text-[14px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>{current.body}</p>
        </div>
        <div className="mt-7 flex items-center gap-3">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="flex min-h-[48px] flex-1 items-center justify-center rounded-[13px] border text-[14px] font-bold" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }}>Back</button>
          )}
          <button type="button" onClick={() => (isLast ? onClose() : setStep((s) => s + 1))} className="flex min-h-[48px] flex-[2] items-center justify-center gap-2 rounded-[13px] text-[14px] font-black" style={{ background: 'var(--button-primary-surface)', color: 'var(--on-accent)', boxShadow: 'var(--button-primary-shadow)' }}>
            {isLast ? finishLabel : <>Next <ChevronRight size={16} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}

type OnboardingData = { name: string; goals: Goal[]; habits: HabitDef[]; activities: string[] }

function OnboardingFlow({ initialName, onComplete }: { initialName: string; onComplete: (data: OnboardingData) => void }) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState(initialName)
  const [selectedGoals, setSelectedGoals] = useState<Goal[]>([])
  const [habitKeys, setHabitKeys] = useState<string[]>(defaultHabitRows.map((h) => h.key))
  const [customHabits, setCustomHabits] = useState<HabitDef[]>([])
  const [customHabitInput, setCustomHabitInput] = useState('')
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [customActivityInput, setCustomActivityInput] = useState('')

  const habitOptions = [...defaultHabitRows, ...customHabits]
  const activityOptions = Array.from(new Set([...allActivities, ...selectedActivities]))

  function toggleGoal(goal: Goal) {
    setSelectedGoals((prev) => {
      if (prev.includes(goal)) return prev.filter((g) => g !== goal)
      if (prev.length >= 3) return prev
      return [...prev, goal]
    })
  }
  function toggleHabit(key: string) {
    setHabitKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }
  function addCustomHabit() {
    const label = customHabitInput.trim()
    if (!label) return
    const key = `custom_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
    if (!habitOptions.some((h) => h.key === key)) {
      setCustomHabits((prev) => [...prev, { key, label, icon: Check }])
      setHabitKeys((prev) => [...prev, key])
    }
    setCustomHabitInput('')
  }
  function toggleActivity(activity: string) {
    setSelectedActivities((prev) => (prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]))
  }
  function addCustomActivity() {
    const label = customActivityInput.trim()
    if (!label) return
    if (!selectedActivities.includes(label)) setSelectedActivities((prev) => [...prev, label])
    setCustomActivityInput('')
  }

  function finish() {
    const habits = habitOptions.filter((h) => habitKeys.includes(h.key))
    onComplete({ name: name.trim() || initialName, goals: selectedGoals, habits, activities: selectedActivities })
  }

  const canNext = step === 1 ? name.trim().length > 0
    : step === 2 ? selectedGoals.length > 0
    : step === 3 ? habitKeys.length > 0
    : step === 4 ? selectedActivities.length > 0
    : true

  if (step === 5) {
    // Optional tutorial — Skip or Finish both complete onboarding.
    return <TutorialOverlay open onClose={finish} finishLabel="Finish" />
  }

  const goalRank = (goal: Goal) => selectedGoals.indexOf(goal)

  return (
    <Page nav={false}>
      <div className="flex items-center gap-1.5 pt-6">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className="h-1.5 flex-1 rounded-full transition-all" style={{ background: n <= step ? 'var(--signal)' : 'var(--surface-3)' }} />
        ))}
      </div>
      <p className="mt-4 text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--label)' }}>Step {step} of 5</p>

      {step === 1 && (
        <div className="mt-3">
          <h1 className="text-[24px] font-black leading-tight">What should we call you?</h1>
          <p className="mt-2 text-[14px]" style={{ color: 'var(--text-soft)' }}>This is the name shown across your journal.</p>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Your name" maxLength={40} className="mt-6 h-12 w-full rounded-[12px] border bg-transparent px-4 text-[16px] font-semibold outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
        </div>
      )}

      {step === 2 && (
        <div className="mt-3">
          <h1 className="text-[24px] font-black leading-tight">Pick your top 3 goals</h1>
          <p className="mt-2 text-[14px]" style={{ color: 'var(--text-soft)' }}>Tap in order — the first is your primary focus. Tap again to remove.</p>
          <div className="mt-5 flex flex-col gap-2">
            {goals.map((goal) => {
              const rank = goalRank(goal)
              const selected = rank >= 0
              const visual = goalVisual(goal)
              return (
                <button key={goal} type="button" onClick={() => toggleGoal(goal)} className="flex min-h-[54px] items-center gap-3 rounded-[12px] border px-4 text-left" style={{ background: selected ? tones[visual.tone].bg : 'transparent', borderColor: selected ? tones[visual.tone].border : 'var(--line)' }}>
                  <span style={{ color: selected ? tones[visual.tone].fg : 'var(--label)' }}><GoalIcon goal={goal} size={18} /></span>
                  <span className="flex-1 text-[15px] font-bold" style={{ color: selected ? 'var(--fg)' : 'var(--text-soft)' }}>{goal}</span>
                  {selected && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-black" style={{ background: tones[visual.tone].fg, color: 'var(--on-accent)' }}>{rank + 1}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-3">
          <h1 className="text-[24px] font-black leading-tight">Which habits to track?</h1>
          <p className="mt-2 text-[14px]" style={{ color: 'var(--text-soft)' }}>These become your daily check-offs. You can change them anytime.</p>
          <div className="mt-5 flex flex-col gap-2">
            {habitOptions.map(({ key, label, icon: Icon }) => {
              const selected = habitKeys.includes(key)
              return (
                <button key={key} type="button" onClick={() => toggleHabit(key)} className="flex min-h-[52px] items-center gap-3 rounded-[12px] border px-4 text-left" style={{ background: selected ? 'var(--habit-done-bg)' : 'transparent', borderColor: selected ? 'var(--habit-done-border)' : 'var(--line)' }}>
                  <IconChip icon={Icon} tone={selected ? 'vital' : 'slate'} />
                  <span className="flex-1 text-[14px] font-semibold" style={{ color: selected ? 'var(--fg)' : 'var(--text-soft)' }}>{label}</span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-[8px] border" style={{ background: selected ? 'var(--vital)' : 'transparent', borderColor: selected ? 'var(--vital)' : 'var(--line)', color: 'var(--on-accent)' }}>{selected && <Check size={15} strokeWidth={3} />}</span>
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input value={customHabitInput} onChange={(e) => setCustomHabitInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addCustomHabit() }} placeholder="Add a custom habit" maxLength={32} className="h-11 flex-1 rounded-[10px] border bg-transparent px-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
            <button type="button" onClick={addCustomHabit} disabled={!customHabitInput.trim()} className="flex h-11 items-center gap-1.5 rounded-[10px] border px-3 text-[13px] font-bold disabled:opacity-50" style={{ borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)' }}><Plus size={15} /> Add</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="mt-3">
          <h1 className="text-[24px] font-black leading-tight">What do you do?</h1>
          <p className="mt-2 text-[14px]" style={{ color: 'var(--text-soft)' }}>Pick the activities you train. Add your own if it’s missing.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {activityOptions.map((activity) => {
              const selected = selectedActivities.includes(activity)
              const visual = activityVisual(activity)
              return (
                <button key={activity} type="button" onClick={() => toggleActivity(activity)} className="flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold" style={{ background: selected ? tones[visual.tone].bg : 'transparent', borderColor: selected ? tones[visual.tone].border : 'var(--line)', color: selected ? tones[visual.tone].fg : 'var(--text-soft)' }}>
                  <ActivityIcon activity={activity} size={14} />{activity}
                  {selected && <Check size={13} strokeWidth={3} />}
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <input value={customActivityInput} onChange={(e) => setCustomActivityInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addCustomActivity() }} placeholder="Add a custom activity" maxLength={28} className="h-11 flex-1 rounded-[10px] border bg-transparent px-3 text-[13px] outline-none" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }} />
            <button type="button" onClick={addCustomActivity} disabled={!customActivityInput.trim()} className="flex h-11 items-center gap-1.5 rounded-[10px] border px-3 text-[13px] font-bold disabled:opacity-50" style={{ borderColor: 'var(--vital-border)', color: 'var(--button-secondary-fg)' }}><Plus size={15} /> Add</button>
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center gap-3">
        {step > 1 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="flex min-h-[50px] flex-1 items-center justify-center rounded-[13px] border text-[14px] font-bold" style={{ borderColor: 'var(--line)', color: 'var(--fg)' }}>Back</button>
        )}
        <button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)} className="flex min-h-[50px] flex-[2] items-center justify-center gap-2 rounded-[13px] text-[14px] font-black disabled:opacity-50" style={{ background: 'var(--button-primary-surface)', color: 'var(--on-accent)', boxShadow: 'var(--button-primary-shadow)' }}>
          {step === 4 ? 'Continue' : 'Next'} <ChevronRight size={16} />
        </button>
      </div>
    </Page>
  )
}

export function AppShell({ user, demoMode = false, initialData }: { user: SupabaseUser; demoMode?: boolean; initialData?: AppShellInitialData | null }) {
  const router = useRouter()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [unitSystem, setUnitSystem] = useState<'lbs' | 'kg'>('lbs')
  const [profileName, setProfileName] = useState(() => {
    if (!demoMode && initialData?.profile) {
      const name = [initialData.profile.first_name, initialData.profile.last_name].filter(Boolean).join(' ')
      return name || displayNameFromUser(user)
    }
    return displayNameFromUser(user)
  })
  const [profileInitials, setProfileInitials] = useState(() => {
    if (!demoMode && initialData?.profile) {
      const name = [initialData.profile.first_name, initialData.profile.last_name].filter(Boolean).join(' ')
      if (name) return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'U'
    }
    return initialsFromUser(user)
  })
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  // Workout preference: show weight fields on strength logging. Off by default
  // for new and existing users until enabled.
  const [trackStrengthWeights, setTrackStrengthWeights] = useState(false)
  const [role] = useState<Role>('client')
  const [tab, setTab] = useState<Tab>('today')
  const [previousTab, setPreviousTab] = useState<Tab>('today')
  const [profileBackTab, setProfileBackTab] = useState<Tab | null>(null)
  const [trainerTab, setTrainerTab] = useState<TrainerTab>('clients')
  const [sub, setSub] = useState<ProfileSub>('')
  const [fabOpen, setFabOpen] = useState(false)
  const [sheet, setSheet] = useState<Sheet>('')
  const [calendarSheetDate, setCalendarSheetDate] = useState<string>(() => getLocalDateISO())
  const [toast, setToast] = useState('')
  const [todayISO] = useState(() => getLocalDateISO())
  const todayDayOfMonth = Number(todayISO.slice(8, 10))
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate())
  // calendarEntries is the single source of truth for all logged data.
  // Key: ISO date string YYYY-MM-DD. Today tab derives its workouts from here.
  const [calendarEntries, setCalendarEntries] = useState<Record<string, CalendarEntry[]>>({})
  // Today's workouts are derived — not separate state. Any write to calendarEntries
  // for today automatically reflects here. The index is UI state only.
  const todayWorkouts: ScheduledWorkout[] = (calendarEntries[todayISO] ?? [])
    .filter(e => e.type === 'Workout')
    .map(e => e.workout ?? {
      id: e.id ?? `legacy-${todayISO}`,
      label: e.label,
      sub: e.sub ?? '',
      activities: e.activity ? [e.activity] : [],
      durationMinutes: e.durationMinutes,
      status: 'planned' as WorkoutStatus,
    })
  const [selectedWorkoutIndex, setSelectedWorkoutIndex] = useState(0)
  const safeWorkoutIndex = Math.min(selectedWorkoutIndex, Math.max(0, todayWorkouts.length - 1))
  const todayWorkout = todayWorkouts[safeWorkoutIndex] ?? null
  const workoutStatus: WorkoutStatus = todayWorkout?.status ?? 'none'
  const [workoutChecklist, setWorkoutChecklist] = useState<Set<string>>(new Set())
  const [deletedWorkoutExercises, setDeletedWorkoutExercises] = useState<Set<string>>(new Set())
  const [dailyGoalsExpanded, setDailyGoalsExpanded] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [pastWorkoutPickerOpen, setPastWorkoutPickerOpen] = useState(false)
  const [copyWorkoutOpen, setCopyWorkoutOpen] = useState(false)
  const [savePlanTemplateOpen, setSavePlanTemplateOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null)
  const [templateMode, setTemplateMode] = useState<'profile' | 'workout'>('profile')
  const [loadedTemplate, setLoadedTemplate] = useState<WorkoutTemplate | null>(null)
  const [templatePrompt, setTemplatePrompt] = useState<SheetSaveOptions | null>(null)
  const [skipTemplatePrompt, setSkipTemplatePrompt] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState<WorkoutTemplate | null>(null)
  // A built-in workout waiting on a replace-confirm because Today already has
  // one loaded (#1). Applied or discarded by ReplaceWorkoutModal.
  const [pendingDefault, setPendingDefault] = useState<DefaultWorkoutSelection | null>(null)
  const [editingEntry, setEditingEntry] = useState<{ dateISO: string; id: string; entry: CalendarEntry } | null>(null)
  // The saved template being edited in the createTemplate sheet (null = creating new).
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null)
  // Which built-in "Strength starter" category is open (null = the hub).
  const [defaultCategory, setDefaultCategory] = useState<DefaultCategory | null>(null)
  // Real users start from their own saved choices (onboarding / Supabase /
  // localStorage), never the demo seeds. Only demoMode shows the sample data.
  const [focusGoals, setFocusGoals] = useState<Goal[]>(() => {
    if (!demoMode) {
      return ((initialData?.goals ?? []).map((g) => GOAL_TYPE_TO_UI[g]).filter(Boolean)) as Goal[]
    }
    return defaultSelectedGoals
  })
  const [activities, setActivities] = useState<string[]>(demoMode ? defaultActivities : [])
  const [targets, setTargets] = useState<TargetDef[]>(demoMode ? defaultTargets : [])
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [measurementLogs, setMeasurementLogs] = useState<MeasurementLog[]>(demoMode ? DEMO_MEASUREMENT_LOGS : [])
  const [habitRows, setHabitRows] = useState<HabitDef[]>(() => {
    if (!demoMode && initialData?.primaryGoal) {
      return goalTypeToHabitRows(initialData.primaryGoal)
    }
    return defaultHabitRows
  })
  const [shownMeasurements, setShownMeasurements] = useState<string[]>(defaultShownMeasurements)
  const [habits, setHabits] = useState<Record<HabitKey, boolean>>(() => {
    if (!demoMode && initialData?.primaryGoal) {
      const rows = goalTypeToHabitRows(initialData.primaryGoal)
      if (initialData.journalEntry) {
        return answersToHabits(initialData.journalEntry.answers, rows)
      }
      return Object.fromEntries(rows.map((r) => [r.key, false]))
    }
    return { protein: true, water: true, workout: true, mobility: false, sleep: true, sugar: false }
  })
  // todayNote is derived from calendarEntries — no separate state or persistence key.
  const todayNote = (calendarEntries[todayISO] ?? []).find(e => e.type === 'Reflection')?.label ?? ''
  const showNav = sub !== 'connect'
  // Gates the localStorage save effects until after the initial hydrate so we
  // never overwrite saved data with the default seed on first paint.
  const [hydrated, setHydrated] = useState(false)
  // First-run onboarding gate (decided after hydrate) and tutorial replay.
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Leaving the Workouts tab closes any open starter-workout detail.
  useEffect(() => {
    if (tab !== 'workouts') setDefaultCategory(null)
  }, [tab])

  // ─── Hydrate state: Supabase (via SSR initialData) → localStorage cache ─────
  // Priority: Supabase data from initialData (set at login, survives reinstall)
  //   > localStorage cache (fast offline read)
  //   > empty default.
  // On first sign-in after the persistence migration, localStorage has data but
  // Supabase is empty — we upload localStorage to Supabase so subsequent logins
  // on any device read from Supabase.
  useEffect(() => {
    if (demoMode) return
    const uid = user.id
    const sb = createBrowserSupabaseClient()

    // ── Simple localStorage-only preferences (unchanged) ───────────────────
    const savedTheme = loadPersisted<'dark' | 'light' | null>(uid, 'theme', null)
    if (savedTheme) setTheme(savedTheme)
    const savedUnits = loadPersisted<'lbs' | 'kg' | null>(uid, 'units', null)
    if (savedUnits) setUnitSystem(savedUnits)
    const savedFocusGoals = loadPersisted<Goal[] | null>(uid, 'focusGoals', null)
    if (savedFocusGoals?.length) setFocusGoals(savedFocusGoals)
    const savedPhoto = loadPersisted<string | null>(uid, 'profilePhoto', null)
    if (savedPhoto) setProfilePhoto(savedPhoto)
    const savedProfileName = loadPersisted<string | null>(uid, 'profileName', null)
    if (savedProfileName) setProfileName(savedProfileName)

    // ── user_journal_preferences (Supabase > localStorage) ─────────────────
    if (initialData?.preferences) {
      const p = initialData.preferences
      if (p.tracked_activities?.length) setActivities(p.tracked_activities)
      if (p.visible_measurements?.length) setShownMeasurements(p.visible_measurements)
      if (Array.isArray(p.habit_rows) && (p.habit_rows as unknown[]).length) {
        const rows = p.habit_rows as { key: string; label: string }[]
        setHabitRows(rows.map((r) => ({ ...r, icon: HABIT_ICON_MAP[r.key] ?? Check })))
      }
      setTrackStrengthWeights(p.track_strength_weights ?? false)
    } else {
      const savedActivities = loadPersisted<string[] | null>(uid, 'activities', null)
      if (savedActivities) setActivities(savedActivities)
      const savedMeasurements = loadPersisted<string[] | null>(uid, 'measurements', null)
      if (savedMeasurements) setShownMeasurements(savedMeasurements)
      const savedHabitRows = loadPersisted<{ key: string; label: string }[] | null>(uid, 'habitRows', null)
      if (savedHabitRows?.length) setHabitRows(savedHabitRows.map((r) => ({ ...r, icon: HABIT_ICON_MAP[r.key] ?? Check })))
      setTrackStrengthWeights(loadPersisted<boolean>(uid, 'trackStrengthWeights', false))
      // Upload to Supabase so future logins read from there
      if (savedActivities || savedMeasurements || savedHabitRows) {
        void sb.from('user_journal_preferences').upsert({
          user_id: uid,
          tracked_activities: savedActivities ?? [],
          visible_measurements: savedMeasurements ?? [],
          habit_rows: savedHabitRows?.map(({ key, label }) => ({ key, label })) ?? [],
          custom_tags: [],
          track_strength_weights: loadPersisted<boolean>(uid, 'trackStrengthWeights', false),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      }
    }

    // ── workout_templates (Supabase > localStorage) ─────────────────────────
    if (initialData?.templates && initialData.templates.length > 0) {
      const converted = initialData.templates.map(rowToTemplate)
      setTemplates(converted)
      savePersisted(uid, 'templates', converted)
    } else {
      const savedTemplates = loadPersisted<WorkoutTemplate[] | null>(uid, 'templates', null)
      if (savedTemplates?.length) {
        setTemplates(savedTemplates)
        // One-time upload: localStorage → Supabase
        void sb.from('workout_templates').upsert(
          savedTemplates.map((t) => templateToRow(t, uid)),
          { onConflict: 'id' }
        )
      }
    }

    // ── measurement_logs (Supabase > localStorage) ──────────────────────────
    if (initialData?.measurementLogs && initialData.measurementLogs.length > 0) {
      const converted = initialData.measurementLogs.map(rowToMeasurementLog)
      setMeasurementLogs(converted)
      savePersisted(uid, 'measurementLogs', converted)
    } else {
      const savedMeasurementLogs = loadPersisted<MeasurementLog[] | null>(uid, 'measurementLogs', null)
      if (savedMeasurementLogs?.length) {
        setMeasurementLogs(savedMeasurementLogs)
        // One-time upload: localStorage → Supabase
        void sb.from('measurement_logs').upsert(
          savedMeasurementLogs.map((log) => measurementLogToRow(log, uid)),
          { onConflict: 'user_id,id' }
        )
      }
    }

    // ── calendar_entries (Supabase > localStorage) ──────────────────────────
    if (initialData?.calendarRows && initialData.calendarRows.length > 0) {
      // Group Supabase rows by date
      const byDate: Record<string, CalendarEntry[]> = {}
      for (const row of initialData.calendarRows) {
        const { dateISO, entry } = rowToCalendarEntry(row)
        byDate[dateISO] = [...(byDate[dateISO] ?? []), entry]
      }
      setCalendarEntries(byDate)
      savePersisted(uid, 'calendarEntries', byDate)
    } else {
      const savedEntries = loadPersisted<Record<string | number, CalendarEntry[]> | null>(uid, 'calendarEntries', null)
      if (savedEntries) {
        // Migrate old day-of-month number keys to ISO date strings.
        const migrated: Record<string, CalendarEntry[]> = {}
        const now = new Date()
        for (const [key, entries] of Object.entries(savedEntries)) {
          if (typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
            migrated[key] = entries
          } else {
            const day = Number(key)
            if (day >= 1 && day <= 31) {
              const iso = getLocalDateISO(new Date(now.getFullYear(), now.getMonth(), day))
              migrated[iso] = [...(migrated[iso] ?? []), ...entries]
            }
          }
        }
        setCalendarEntries(migrated)
        // One-time upload: localStorage → Supabase (entries with valid ids only)
        const rows = Object.entries(migrated).flatMap(([dateISO, entries]) =>
          entries.filter((e) => e.id).map((e) => calendarEntryToRow(e, dateISO, uid))
        )
        if (rows.length) {
          void sb.from('calendar_entries').upsert(rows, { onConflict: 'user_id,id' })
        }
      }
    }

    // ── Workout session progress (localStorage only — transient, today-scoped) ─
    const savedSession = loadPersisted<{ dateISO: string; checklist: string[]; deleted: string[] } | null>(uid, 'workoutSession', null)
    const todayISOForHydrate = getLocalDateISO()
    if (savedSession && savedSession.dateISO === todayISOForHydrate) {
      if (savedSession.checklist?.length) setWorkoutChecklist(new Set(savedSession.checklist))
      if (savedSession.deleted?.length) setDeletedWorkoutExercises(new Set(savedSession.deleted))
    }

    // ── Seed today's reflection from Supabase journal_entries ───────────────
    if (initialData?.journalEntry?.answers?.notes) {
      const note = String(initialData.journalEntry.answers.notes).trim()
      if (note) {
        setCalendarEntries((current) => {
          const todayKey = getLocalDateISO()
          const existing = current[todayKey] ?? []
          if (existing.some(e => e.type === 'Reflection')) return current
          return { ...current, [todayKey]: [...existing, { id: 'reflection-today', type: 'Reflection', label: note, editable: true }] }
        })
      }
    }

    // ── Onboarding gate ─────────────────────────────────────────────────────
    const onboardingCompleted = loadPersisted<boolean>(uid, 'onboardingCompleted', false)
    const hasExistingGoals = (initialData?.goals?.length ?? 0) > 0
    if (onboardingCompleted || hasExistingGoals) {
      if (!onboardingCompleted) savePersisted(uid, 'onboardingCompleted', true)
      setNeedsOnboarding(false)
    } else {
      setNeedsOnboarding(true)
    }

    setHydrated(true)
  }, [demoMode, user.id, initialData])

  // ─── Persist launch-only state on change (after hydrate, never in demo) ────
  useEffect(() => { if (hydrated && !demoMode) savePersisted(user.id, 'theme', theme) }, [theme, hydrated, demoMode, user.id])
  useEffect(() => { if (hydrated && !demoMode) savePersisted(user.id, 'units', unitSystem) }, [unitSystem, hydrated, demoMode, user.id])
  useEffect(() => { if (hydrated && !demoMode) savePersisted(user.id, 'activities', activities) }, [activities, hydrated, demoMode, user.id])
  useEffect(() => { if (hydrated && !demoMode) savePersisted(user.id, 'measurements', shownMeasurements) }, [shownMeasurements, hydrated, demoMode, user.id])
  useEffect(() => { if (hydrated && !demoMode) savePersisted(user.id, 'focusGoals', focusGoals) }, [focusGoals, hydrated, demoMode, user.id])
  useEffect(() => { if (hydrated && !demoMode) savePersisted(user.id, 'habitRows', habitRows.map(({ key, label }) => ({ key, label }))) }, [habitRows, hydrated, demoMode, user.id])
  useEffect(() => { if (hydrated && !demoMode) savePersisted(user.id, 'calendarEntries', calendarEntries) }, [calendarEntries, hydrated, demoMode, user.id])
  useEffect(() => {
    if (!hydrated || demoMode) return
    savePersisted(user.id, 'templates', templates)
    const rows = templates.map((t) => templateToRow(t, user.id))
    if (rows.length > 0) {
      void createBrowserSupabaseClient().from('workout_templates').upsert(rows, { onConflict: 'id' })
    }
  }, [templates, hydrated, demoMode, user.id])
  useEffect(() => { if (hydrated && !demoMode) savePersisted(user.id, 'measurementLogs', measurementLogs) }, [measurementLogs, hydrated, demoMode, user.id])
  useEffect(() => { if (hydrated && !demoMode) savePersisted(user.id, 'profilePhoto', profilePhoto) }, [profilePhoto, hydrated, demoMode, user.id])
  useEffect(() => { if (hydrated && !demoMode) savePersisted(user.id, 'profileName', profileName) }, [profileName, hydrated, demoMode, user.id])
  useEffect(() => { if (hydrated && !demoMode) savePersisted(user.id, 'trackStrengthWeights', trackStrengthWeights) }, [trackStrengthWeights, hydrated, demoMode, user.id])
  // Workout session progress: exercise checklist and deleted keys, date-guarded.
  // Workouts themselves are in calendarEntries; only transient progress needs this.
  useEffect(() => {
    if (hydrated && !demoMode) savePersisted(user.id, 'workoutSession', {
      dateISO: getLocalDateISO(),
      checklist: Array.from(workoutChecklist),
      deleted: Array.from(deletedWorkoutExercises),
    })
  }, [workoutChecklist, deletedWorkoutExercises, hydrated, demoMode, user.id])

  // ─── Persist profile name + focus goals to Supabase (existing tables) ──────
  useEffect(() => {
    if (!hydrated || demoMode) return
    const parts = profileName.trim().split(/\s+/).filter(Boolean)
    const first_name = parts[0] ?? ''
    const last_name = parts.slice(1).join(' ')
    const supabase = createBrowserSupabaseClient()
    void supabase.from('profiles').update({ first_name, last_name }).eq('id', user.id)
  }, [profileName, hydrated, demoMode, user.id])

  useEffect(() => {
    if (!hydrated || demoMode) return
    // Sync the ordered focus goals back to user_goals. Goals without a GoalType
    // equivalent (e.g. Endurance) are dropped here but preserved in localStorage;
    // primary is the first goal that maps to a GoalType so the journal system
    // always has a primary.
    // TODO(supabase): add a rank column + upsert instead of delete/insert, and
    // debounce if goal reordering becomes high-frequency.
    const mappable = focusGoals.map((g) => GOAL_UI_TO_TYPE[g]).filter(Boolean) as GoalType[]
    const rows = mappable.map((goal, index) => ({ user_id: user.id, goal, is_primary: index === 0 }))
    const supabase = createBrowserSupabaseClient()
    void (async () => {
      await supabase.from('user_goals').delete().eq('user_id', user.id)
      if (rows.length) await supabase.from('user_goals').insert(rows)
    })()
  }, [focusGoals, hydrated, demoMode, user.id])

  useEffect(() => {
    if (!demoMode) return
    const shouldShowDemoToast = window.localStorage.getItem('soma-demo-toast') === '1'
    if (!shouldShowDemoToast) return
    window.localStorage.removeItem('soma-demo-toast')
    setToast("Viewing demo. Changes won't be saved.")
    const timeout = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(timeout)
  }, [demoMode])

  useEffect(() => {
    if (demoMode) return
    const params = new URLSearchParams(window.location.search)
    const ouraResult = params.get('oura')
    if (!ouraResult) return
    window.history.replaceState(null, '', window.location.pathname)
    if (ouraResult === 'connected') {
      setToast('Oura Ring connected')
      window.setTimeout(() => setToast(''), 2000)
      setTab('more')
      setSub('apps')
    } else if (ouraResult === 'consent_denied') {
      setToast('Oura connection cancelled')
      window.setTimeout(() => setToast(''), 2000)
    } else if (ouraResult === 'no_oura_data') {
      setToast('Oura account has no data yet')
      window.setTimeout(() => setToast(''), 2400)
    } else if (ouraResult !== 'setup_required') {
      setToast('Oura connection failed')
      window.setTimeout(() => setToast(''), 2000)
    }
  }, [demoMode])

  function toggleTheme() {
    setTheme((current) => current === 'dark' ? 'light' : 'dark')
  }

  async function signOut() {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    document.cookie = `${DEMO_MODE_COOKIE}=; path=/; max-age=0; SameSite=Lax`
    window.localStorage.removeItem('soma-demo-mode')
    window.localStorage.removeItem('soma-demo-toast')
    setAvatarMenuOpen(false)
    router.push('/login')
    router.refresh()
  }

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 1600)
  }

  function persistHabit(key: string, value: boolean) {
    if (demoMode) return
    fetch('/api/journal/today', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key, value }),
    }).catch(() => {})
  }

  function handleOnboardingComplete(data: OnboardingData) {
    const name = data.name.trim() || displayNameFromUser(user)
    setProfileName(name)
    setProfileInitials(name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'U')
    if (data.goals.length) setFocusGoals(data.goals)
    if (data.habits.length) {
      setHabitRows(data.habits)
      setHabits(Object.fromEntries(data.habits.map((h) => [h.key, false])))
    }
    if (data.activities.length) setActivities(data.activities)
    // The save effects (name → profiles, goals → user_goals, the rest →
    // localStorage) persist these once state updates, since hydrated is true.
    savePersisted(user.id, 'onboardingCompleted', true)
    setNeedsOnboarding(false)
    setTab('today')
  }

  const now = new Date()
  const selectedDateLabel = selectedDay === todayDayOfMonth
    ? `Today - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : `${now.toLocaleDateString('en-US', { month: 'long' })} ${selectedDay}, ${now.getFullYear()}`

  function buildScheduledWorkout(options?: SheetSaveOptions): ScheduledWorkout {
    const details = options?.activityDetails ?? loadedTemplate?.activityDetails ?? []
    const savedWorkoutActivities = options?.workoutActivities?.filter(Boolean) ?? []
    const sourceActivities = savedWorkoutActivities.length ? savedWorkoutActivities : loadedTemplate?.activities ?? []
    const primaryActivity = sourceActivities[0]
    const label = options?.workoutName?.trim() || loadedTemplate?.name || primaryActivity || 'Workout'
    const durationStr = options?.workoutDurationMinutes ? `${options.workoutDurationMinutes} min` : null
    const activitiesStr = sourceActivities.slice(0, 3).join(' - ')
    const sub = options?.workoutNotes?.trim() || [activitiesStr, durationStr].filter(Boolean).join(' · ') || 'Workout planned'
    // Strength activity data becomes the checklist; the full structured data is
    // stored alongside so every activity's fields survive save + reload.
    const exercises = activityDetailsToExerciseBlocks(details)
    return {
      id: `workout-${Date.now()}`,
      label,
      sub,
      activities: sourceActivities,
      sourceTemplateId: loadedTemplate?.id,
      exercises: exercises.length ? exercises : undefined,
      activityDetails: details.length ? details : undefined,
      notes: options?.workoutNotes?.trim() || undefined,
      durationMinutes: options?.workoutDurationMinutes,
      time: options?.workoutTime || undefined,
      status: 'planned',
    }
  }

  // Add a workout to a date's calendar entries (defaults to today). Deriving
  // todayWorkouts from calendarEntries means this automatically updates Today.
  function appendTodayWorkout(workout: ScheduledWorkout, dateISO?: string) {
    const key = dateISO ?? todayISO
    const entry: CalendarEntry = {
      id: workout.id,
      type: 'Workout',
      label: workout.label,
      sub: workout.sub,
      activity: workout.activities?.[0],
      durationMinutes: workout.durationMinutes,
      editable: true,
      workout,
    }
    setCalendarEntries((c) => {
      const existing = c[key] ?? []
      const workoutCount = existing.filter(e => e.type === 'Workout').length
      if (key === todayISO) setSelectedWorkoutIndex(workoutCount)
      return { ...c, [key]: [...existing, entry] }
    })
  }

  function addCalendarEntry(sheetType: Sheet, options?: SheetSaveOptions) {
    const savedWorkoutActivities = options?.workoutActivities?.filter(Boolean) ?? []
    const primaryActivity = savedWorkoutActivities[0]
    const workoutLabel = options?.workoutName?.trim() || loadedTemplate?.name || primaryActivity || 'Workout'
    const workoutNotes = options?.workoutNotes?.trim()
    const photoLabel = options?.photoLabel ?? (options?.photoKind === 'Progress' || sheetType === 'progressPhoto' ? 'Front' : 'Breakfast')

    // Workout entries carry the full ScheduledWorkout payload so Today can
    // derive its hero card directly from calendarEntries without a second store.
    const makeWorkoutEntry = (workout: ScheduledWorkout): CalendarEntry => ({
      id: workout.id,
      type: 'Workout',
      label: workout.label,
      sub: workout.sub,
      activity: workout.activities?.[0],
      durationMinutes: workout.durationMinutes,
      editable: true,
      workout,
    })

    const loggedWorkout: ScheduledWorkout = {
      ...buildScheduledWorkout(options),
      status: 'planned',
    }
    const plannedWorkout: ScheduledWorkout = buildScheduledWorkout(options)  // status: 'planned'

    const noteText = options?.note?.trim() ?? ''
    const entryBySheet: Partial<Record<Sheet, CalendarEntry>> = {
      workoutLog: makeWorkoutEntry(loggedWorkout),
      scheduleWorkout: makeWorkoutEntry(plannedWorkout),
      weight: { type: 'Weight', label: 'Weight logged', sub: options?.weightValue ? `${options.weightValue} lb` : undefined },
      meal: options?.photoKind === 'Progress'
        ? { type: 'Photo', label: 'Progress photo', sub: photoLabel, photoKind: 'Progress', photoLabel }
        : { type: 'Photo', label: 'Meal photo', sub: [photoLabel, options?.healthScore ? `Score ${options.healthScore}/10` : null].filter(Boolean).join(' · '), photoKind: 'Meal', photoLabel, healthScore: options?.healthScore },
      progressPhoto: { type: 'Photo', label: 'Progress photo', sub: photoLabel, photoKind: 'Progress', photoLabel },
      note: { type: 'Note', label: 'Note', note: noteText, sub: noteText ? (noteText.length > 60 ? `${noteText.slice(0, 60)}…` : noteText) : 'Journal note added' },
    }
    const entry = entryBySheet[sheetType]
    if (!entry) return

    // Use the ISO date from the sheet's date picker, or fall back to today.
    const dateKey = options?.overrideDate ?? todayISO
    const nextEntry = { id: `${sheetType}-${Date.now()}`, ...entry, editable: true }
    setCalendarEntries((current) => {
      const existing = current[dateKey] ?? []
      // For workout entries logged/planned for today, track which slot to show.
      if ((sheetType === 'workoutLog' || sheetType === 'scheduleWorkout') && dateKey === todayISO) {
        const workoutCount = existing.filter(e => e.type === 'Workout').length
        setSelectedWorkoutIndex(workoutCount)
      }
      return { ...current, [dateKey]: [...existing, nextEntry] }
    })
    if (!demoMode && nextEntry.id) {
      void createBrowserSupabaseClient().from('calendar_entries').upsert(calendarEntryToRow(nextEntry, dateKey, user.id), { onConflict: 'user_id,id' })
    }
  }

  function deleteCalendarEntry(dateISO: string, id: string) {
    setCalendarEntries((current) => ({ ...current, [dateISO]: (current[dateISO] ?? []).filter((entry) => entry.id !== id) }))
    if (!demoMode) void createBrowserSupabaseClient().from('calendar_entries').delete().eq('id', id).eq('user_id', user.id)
    showToast('Entry deleted')
  }

  function updateCalendarEntry(dateISO: string, updated: CalendarEntry) {
    if (!updated.id) return
    setCalendarEntries((current) => ({ ...current, [dateISO]: (current[dateISO] ?? []).map(e => e.id === updated.id ? updated : e) }))
    if (!demoMode) void createBrowserSupabaseClient().from('calendar_entries').upsert(calendarEntryToRow(updated, dateISO, user.id), { onConflict: 'user_id,id' })
  }

  function editCalendarEntry(dateISO: string, entry: CalendarEntry) {
    if (!entry.id) return
    setEditingEntry({ dateISO, id: entry.id, entry })
    setLoadedTemplate(null)
    // Each entry type opens its own sheet, pre-filled, so the right fields are edited.
    const sheetByType: Record<string, Sheet> = {
      Weight: 'weight',
      Note: 'note',
      Reflection: 'note',
      Measurement: 'measure',
      Photo: 'meal',
    }
    setSheet(sheetByType[entry.type] ?? 'workoutLog')
  }

  function selectCalendarDay(day: number, dateISO: string) {
    setSelectedDay(day)
    if (!pendingTemplate) return
    setCalendarEntries((current) => ({
      ...current,
      [dateISO]: [...(current[dateISO] ?? []), {
        id: `template-${pendingTemplate.id}-${Date.now()}`,
        type: 'Workout',
        label: pendingTemplate.name,
        sub: pendingTemplate.activities.slice(0, 3).join(' - '),
        editable: true,
      }],
    }))
    setPendingTemplate(null)
    showToast('Workout scheduled')
  }

  function copyWorkoutToDays(dates: CopyWorkoutDate[], recurrence?: 'weekly') {
    const workout = todayWorkout ?? { id: 'today-fallback', label: 'Upper Body + Bag Work', sub: 'Strength - Kickboxing - 60 min', activities: ['Strength', 'Kickboxing'] }
    setCalendarEntries((current) => {
      const next = { ...current }
      dates.forEach((date, index) => {
        const dateISO = getLocalDateISO(new Date(date.year, date.month, date.day))
        next[dateISO] = [...(next[dateISO] ?? []), {
          id: `copy-${workout.id}-${Date.now()}-${index}`,
          type: 'Workout',
          label: workout.label,
          sub: `${workout.sub} - ${date.label}`,
          activity: workout.activities[0],
          editable: true,
          originWorkoutId: workout.id,
          recurrence,
          scheduledDate: date,
        }]
      })
      return next
    })
    setCopyWorkoutOpen(false)
    setSelectedDay(dates[0]?.day ?? selectedDay)
    setTab('calendar')
    showToast(dates.length === 1 ? 'Workout copied' : `${dates.length} workouts scheduled`)
  }

  function togglePlanExercise(key: string) {
    setWorkoutChecklist((current) => {
      const next = new Set(current)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function deletePlanExercise(key: string) {
    setDeletedWorkoutExercises((current) => new Set(current).add(key))
    setWorkoutChecklist((current) => {
      const next = new Set(current)
      next.delete(key)
      return next
    })
    showToast('Exercise removed')
  }

  function normalizedActivities(items: string[]) {
    return items.map((item) => item.trim().toLowerCase()).filter(Boolean).sort().join('|')
  }

  function currentPlanTemplateDuplicate() {
    const workout = todayWorkout ?? { label: 'Upper Body + Bag Work', activities: ['Strength', 'Kickboxing'] }
    const workoutName = workout.label.trim().toLowerCase()
    const workoutActivities = normalizedActivities(workout.activities)
    return templates.some((template) => (
      template.name.trim().toLowerCase() === workoutName ||
      normalizedActivities(template.activities) === workoutActivities
    ))
  }

  function saveCurrentPlanAsTemplate(favorite: boolean) {
    const workout = todayWorkout
    if (!workout) { setSavePlanTemplateOpen(false); return }
    const nextTemplate: WorkoutTemplate = {
      id: `template-${Date.now()}`,
      name: workout.label,
      tags: [],
      activities: workout.activities,
      notes: workout.notes ?? '',
      favorite,
      lastUsed: 'Never',
      timesUsed: 0,
      defaultDurationMinutes: workout.durationMinutes,
      exercises: workout.exercises,
      activityDetails: workout.activityDetails,
    }
    setTemplates((current) => [nextTemplate, ...current])
    if (!demoMode) void createBrowserSupabaseClient().from('workout_templates').upsert(templateToRow(nextTemplate, user.id), { onConflict: 'id' })
    setSavePlanTemplateOpen(false)
    showToast('Saved to Workout Templates')
  }

  function saveWorkoutAsTemplate(options?: SheetSaveOptions) {
    const details = options?.activityDetails ?? []
    const savedActivities = options?.templateActivities?.filter(Boolean) ?? options?.workoutActivities?.filter(Boolean) ?? details.map((d) => d.activity)
    const exercises = activityDetailsToExerciseBlocks(details)
    const nextTemplate: WorkoutTemplate = {
      id: `template-${Date.now()}`,
      name: options?.templateName?.trim() || options?.workoutName?.trim() || 'Untitled Template',
      tags: options?.templateTags?.length ? options.templateTags : [],
      activities: savedActivities.length ? savedActivities : ['Strength Training'],
      notes: options?.workoutNotes?.trim() || '',
      favorite: Boolean(options?.favoriteTemplate),
      lastUsed: 'Never',
      timesUsed: 0,
      defaultDurationMinutes: options?.workoutDurationMinutes,
      exercises: exercises.length ? exercises : undefined,
      activityDetails: details.length ? details : undefined,
    }
    setTemplates((current) => [nextTemplate, ...current])
    if (!demoMode) void createBrowserSupabaseClient().from('workout_templates').upsert(templateToRow(nextTemplate, user.id), { onConflict: 'id' })
  }

  function saveSheet(sheetType: Sheet, options?: SheetSaveOptions) {
    // Editing an existing template: update in place, preserving id/usage stats,
    // and stay on the detail page showing the refreshed template.
    if (sheetType === 'createTemplate' && editingTemplate) {
      const details = options?.activityDetails ?? []
      const exercises = activityDetailsToExerciseBlocks(details)
      const updated: WorkoutTemplate = {
        ...editingTemplate,
        name: options?.workoutName?.trim() || options?.templateName?.trim() || editingTemplate.name,
        tags: options?.templateTags ?? editingTemplate.tags,
        activities: options?.workoutActivities?.filter(Boolean) ?? details.map((d) => d.activity),
        notes: options?.workoutNotes?.trim() ?? '',
        favorite: Boolean(options?.favoriteTemplate),
        defaultDurationMinutes: options?.workoutDurationMinutes,
        exercises: exercises.length ? exercises : undefined,
        activityDetails: details.length ? details : undefined,
      }
      setTemplates((current) => current.map((t) => t.id === editingTemplate.id ? updated : t))
      if (!demoMode) void createBrowserSupabaseClient().from('workout_templates').upsert(templateToRow(updated, user.id), { onConflict: 'id' })
      setSelectedTemplate(updated)
      setEditingTemplate(null)
      setLoadedTemplate(null)
      setSheet('')
      showToast('Template updated')
      return
    }
    if (sheetType === 'saveTemplate' || sheetType === 'createTemplate') {
      saveWorkoutAsTemplate(options)
      setSheet('')
      setTab('more')
      setSub('templates')
      showToast('Template saved')
      return
    }
    if (sheetType === 'workoutLog' && editingEntry) {
      const savedWorkoutActivities = options?.workoutActivities?.filter(Boolean) ?? []
      const primaryActivity = savedWorkoutActivities[0]
      const details = options?.activityDetails ?? editingEntry.entry.workout?.activityDetails ?? []
      const exercises = activityDetailsToExerciseBlocks(details)
      const updatedWorkout: ScheduledWorkout | undefined = editingEntry.entry.workout
        ? {
            ...editingEntry.entry.workout,
            label: options?.workoutName?.trim() || primaryActivity || editingEntry.entry.workout.label,
            sub: options?.workoutNotes?.trim() || editingEntry.entry.workout.sub,
            activities: savedWorkoutActivities.length ? savedWorkoutActivities : editingEntry.entry.workout.activities,
            durationMinutes: options?.workoutDurationMinutes ?? editingEntry.entry.workout.durationMinutes,
            exercises: exercises.length ? exercises : undefined,
            activityDetails: details.length ? details : undefined,
            notes: options?.workoutNotes?.trim() || editingEntry.entry.workout.notes,
          }
        : undefined
      const updatedEntry: CalendarEntry = {
        ...editingEntry.entry,
        label: options?.workoutName?.trim() || primaryActivity || editingEntry.entry.label,
        sub: options?.workoutNotes?.trim() || undefined,
        activity: primaryActivity ?? editingEntry.entry.activity,
        durationMinutes: options?.workoutDurationMinutes ?? editingEntry.entry.durationMinutes,
        workout: updatedWorkout,
      }
      setCalendarEntries((current) => ({
        ...current,
        [editingEntry.dateISO]: (current[editingEntry.dateISO] ?? []).map((entry) => entry.id === editingEntry.id ? updatedEntry : entry),
      }))
      if (!demoMode && updatedEntry.id) {
        void createBrowserSupabaseClient().from('calendar_entries').upsert(calendarEntryToRow(updatedEntry, editingEntry.dateISO, user.id), { onConflict: 'user_id,id' })
      }
      setEditingEntry(null)
      setSheet('')
      setLoadedTemplate(null)
      showToast('Workout updated')
      return
    }
    if (sheetType === 'weight' && editingEntry && options?.weightValue?.trim()) {
      const updatedEntry: CalendarEntry = {
        ...editingEntry.entry,
        sub: `${options.weightValue} lb`,
      }
      setCalendarEntries((current) => ({
        ...current,
        [editingEntry.dateISO]: (current[editingEntry.dateISO] ?? []).map((entry) => entry.id === editingEntry.id ? updatedEntry : entry),
      }))
      setEditingEntry(null)
      setSheet('')
      showToast('Weight updated')
      return
    }
    // Note / Reflection edit — update the existing entry in place, preserving its type and date.
    if (sheetType === 'note' && editingEntry && (editingEntry.entry.type === 'Note' || editingEntry.entry.type === 'Reflection')) {
      const text = options?.note?.trim() ?? ''
      const isReflection = editingEntry.entry.type === 'Reflection'
      if (!text) {
        // Cleared text → delete the entry rather than leaving an empty note.
        setCalendarEntries((current) => ({
          ...current,
          [editingEntry.dateISO]: (current[editingEntry.dateISO] ?? []).filter((e) => e.id !== editingEntry.id),
        }))
      } else {
        const preview = text.length > 60 ? `${text.slice(0, 60)}…` : text
        const updatedEntry: CalendarEntry = {
          ...editingEntry.entry,
          note: text,
          label: isReflection ? text : editingEntry.entry.label,
          sub: isReflection ? editingEntry.entry.sub : preview,
        }
        setCalendarEntries((current) => ({
          ...current,
          [editingEntry.dateISO]: (current[editingEntry.dateISO] ?? []).map((e) => e.id === editingEntry.id ? updatedEntry : e),
        }))
      }
      setEditingEntry(null)
      setSheet('')
      showToast(isReflection ? 'Reflection updated' : 'Note updated')
      return
    }
    // Measurement edit — update the calendar entry's values AND the linked log.
    if (sheetType === 'measure' && editingEntry && editingEntry.entry.type === 'Measurement') {
      const values = Object.fromEntries(
        Object.entries(options?.measurementValues ?? {}).filter(([, value]) => value && value.trim()),
      )
      const summary = Object.entries(values).map(([k, v]) => `${k} ${v}`).join(' · ') || 'Body metrics updated'
      const updatedEntry: CalendarEntry = { ...editingEntry.entry, measurementValues: values, sub: summary }
      setCalendarEntries((current) => ({
        ...current,
        [editingEntry.dateISO]: (current[editingEntry.dateISO] ?? []).map((e) => e.id === editingEntry.id ? updatedEntry : e),
      }))
      const logId = editingEntry.entry.measurementLogId
      if (logId) {
        const updatedLog = { id: logId, date: '', values } // date filled from existing log
        setMeasurementLogs((current) => {
          const next = current.map((log) => log.id === logId ? { ...log, values } : log)
          if (!demoMode) {
            const log = next.find((l) => l.id === logId)
            if (log) void createBrowserSupabaseClient().from('measurement_logs').upsert(measurementLogToRow(log, user.id), { onConflict: 'user_id,id' })
          }
          return next
        })
      }
      if (!demoMode && updatedEntry.id && editingEntry.dateISO) {
        void createBrowserSupabaseClient().from('calendar_entries').upsert(calendarEntryToRow(updatedEntry, editingEntry.dateISO, user.id), { onConflict: 'user_id,id' })
      }
      setEditingEntry(null)
      setSheet('')
      showToast('Measurement updated')
      return
    }
    // Photo / meal edit — update the existing photo entry (metadata only).
    if ((sheetType === 'meal' || sheetType === 'progressPhoto') && editingEntry && editingEntry.entry.type === 'Photo') {
      const kind = options?.photoKind ?? editingEntry.entry.photoKind ?? 'Meal'
      const photoLabel = options?.photoLabel ?? editingEntry.entry.photoLabel
      const isMeal = kind === 'Meal'
      const sub = isMeal
        ? [photoLabel, options?.healthScore ? `Score ${options.healthScore}/10` : null].filter(Boolean).join(' · ')
        : photoLabel
      const updatedEntry: CalendarEntry = {
        ...editingEntry.entry,
        label: isMeal ? 'Meal photo' : 'Progress photo',
        sub,
        photoKind: kind,
        photoLabel,
        healthScore: isMeal ? (options?.healthScore ?? undefined) : undefined,
      }
      setCalendarEntries((current) => ({
        ...current,
        [editingEntry.dateISO]: (current[editingEntry.dateISO] ?? []).map((e) => e.id === editingEntry.id ? updatedEntry : e),
      }))
      setEditingEntry(null)
      setSheet('')
      showToast('Photo updated')
      return
    }
    if (sheetType === 'weight' && options?.weightValue?.trim()) {
      const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const newLog: MeasurementLog = { id: `weight-${Date.now()}`, date, values: { 'Body weight': `${options.weightValue} lb` } }
      setMeasurementLogs((current) => [newLog, ...current])
      if (!demoMode) void createBrowserSupabaseClient().from('measurement_logs').upsert(measurementLogToRow(newLog, user.id), { onConflict: 'user_id,id' })
    }
    if (sheetType === 'measure') {
      // Create the dated measurement log AND a linked calendar entry that carries
      // the same values + log id, so the entry can be edited later and kept in sync.
      const values = Object.fromEntries(
        Object.entries(options?.measurementValues ?? {}).filter(([, value]) => value && value.trim()),
      )
      if (Object.keys(values).length) {
        const dateKey = options?.overrideDate ?? todayISO
        const dateLabel = new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        const logId = `measure-${Date.now()}`
        const newLog: MeasurementLog = { id: logId, date: dateLabel, values }
        setMeasurementLogs((current) => [newLog, ...current])
        if (!demoMode) void createBrowserSupabaseClient().from('measurement_logs').upsert(measurementLogToRow(newLog, user.id), { onConflict: 'user_id,id' })
        const summary = Object.entries(values).map(([k, v]) => `${k} ${v}`).join(' · ') || 'Body metrics updated'
        const entry: CalendarEntry = {
          id: logId, type: 'Measurement', label: 'Measurements logged', sub: summary,
          editable: true, measurementValues: values, measurementLogId: logId,
        }
        setCalendarEntries((current) => ({ ...current, [dateKey]: [...(current[dateKey] ?? []), entry] }))
        if (!demoMode) void createBrowserSupabaseClient().from('calendar_entries').upsert(calendarEntryToRow(entry, dateKey, user.id), { onConflict: 'user_id,id' })
      }
      setSheet('')
      showToast('Saved')
      return
    }
    if (sheetType === 'reflection') {
      const note = options?.note?.trim() ?? ''
      const reflectionEntry: CalendarEntry = { id: 'reflection-today', type: 'Reflection', label: note, note, editable: true }
      setCalendarEntries((current) => {
        const existing = (current[todayISO] ?? []).filter(e => e.type !== 'Reflection')
        if (!note) return { ...current, [todayISO]: existing }
        return { ...current, [todayISO]: [...existing, reflectionEntry] }
      })
      if (!demoMode && note) {
        void createBrowserSupabaseClient().from('calendar_entries').upsert(calendarEntryToRow(reflectionEntry, todayISO, user.id), { onConflict: 'user_id,id' })
      }
      setSheet('')
      showToast('Reflection saved')
      return
    }
    const shouldAskTemplate = sheetType === 'workoutLog' && !loadedTemplate && !skipTemplatePrompt
    if (sheetType === 'createWorkout') {
      appendTodayWorkout(buildScheduledWorkout(options))
      setSheet('')
      showToast('Workout scheduled')
      return
    }
    addCalendarEntry(sheetType, options)
    setSheet('')
    if (sheetType === 'workoutLog') setLoadedTemplate(null)
    if (sheetType === 'workoutLog') setEditingEntry(null)
    showToast('Saved')
    if (shouldAskTemplate) setTemplatePrompt(options ?? {})
  }

  function deleteMeasurementLog(id: string) {
    setMeasurementLogs((current) => current.filter((log) => log.id !== id))
    if (!demoMode) void createBrowserSupabaseClient().from('measurement_logs').delete().eq('id', id).eq('user_id', user.id)
    showToast('Measurement deleted')
  }

  // Load a built-in starter workout as today's planned workout. If one is
  // already loaded (and not yet completed), confirm the replacement first so a
  // wrong selection doesn't silently overwrite the current plan (#1).
  function useDefaultWorkout(selection: DefaultWorkoutSelection) {
    if (todayWorkout && workoutStatus !== 'done') {
      setPendingDefault(selection)
      return
    }
    applyDefaultWorkout(selection)
  }

  function applyDefaultWorkout(selection: DefaultWorkoutSelection) {
    const workout: ScheduledWorkout = {
      id: `default-${Date.now()}`,
      label: `${selection.category} - ${selection.focus}`,
      sub: `${selection.durationMin} min - ${selection.exercises.length} exercises`,
      activities: ['Strength Training'],
      durationMinutes: selection.durationMin,
      status: 'planned',
      exercises: selection.exercises.length
        ? [{ title: 'Workout', sub: `${selection.exercises.length} exercises`, items: selection.exercises.map(ex => ({ name: ex.name, detail: `${ex.sets} × ${ex.reps}` })) }]
        : undefined,
    }
    const entry: CalendarEntry = {
      id: workout.id, type: 'Workout', label: workout.label, sub: workout.sub,
      activity: workout.activities[0], durationMinutes: workout.durationMinutes,
      editable: true, workout,
    }
    // Remove any un-completed planned workouts for today before adding the new one.
    // Completed workouts stay in Calendar as history.
    setCalendarEntries((c) => {
      const todayEntries = c[todayISO] ?? []
      const kept = todayEntries.filter(e => e.type !== 'Workout' || e.workout?.status === 'done')
      return { ...c, [todayISO]: [...kept, entry] }
    })
    setSelectedWorkoutIndex(0)
    setWorkoutChecklist(new Set())
    setDeletedWorkoutExercises(new Set())
    setDefaultCategory(null)
    setTab('today')
    showToast('Workout added to today')
  }

  function clearTodayWorkout() {
    setCalendarEntries((c) => {
      const entries = c[todayISO] ?? []
      const workoutEntries = entries.filter(e => e.type === 'Workout')
      const targetEntry = workoutEntries[safeWorkoutIndex]
      if (!targetEntry) return c
      return { ...c, [todayISO]: entries.filter(e => e !== targetEntry) }
    })
    setSelectedWorkoutIndex((i) => Math.max(0, i - 1))
    showToast('Workout cleared')
  }

  function openSheet(action: Sheet, keepTemplate = false) {
    if ((action === 'workoutLog' || action === 'scheduleWorkout' || action === 'createTemplate') && !keepTemplate) {
      setLoadedTemplate(null)
      setEditingEntry(null)
    }
    setFabOpen(false)
    setSheet(action)
  }

  function openTemplatePicker() {
    setFabOpen(false)
    setTemplatePickerOpen(true)
  }

  function loadTemplateIntoWorkout(template: WorkoutTemplate) {
    setLoadedTemplate(template)
    setTemplateMode('workout')
    setTemplatePickerOpen(false)
    setSheet('workoutLog')
    showToast(`${template.name} Template Loaded`)
  }

  function loadBuiltInTemplateIntoWorkout(category: DefaultCategory) {
    setTemplatePickerOpen(false)
    setSheet('')
    setDefaultCategory(category)
    setProfileBackTab(tab)
    setTab('workouts')
  }


  function openPastWorkoutPicker() {
    setFabOpen(false)
    setPastWorkoutPickerOpen(true)
  }

  function loadPastWorkoutIntoLog(entry: CalendarEntry) {
    const synthetic: WorkoutTemplate = {
      id: `past-${entry.id ?? Date.now()}`,
      name: entry.label,
      tags: [],
      activities: entry.workout?.activities ?? (entry.activity ? [entry.activity] : []),
      notes: entry.workout?.notes ?? entry.sub ?? '',
      favorite: false,
      lastUsed: '',
      timesUsed: 0,
      defaultDurationMinutes: entry.durationMinutes,
      exercises: entry.workout?.exercises,
      activityDetails: entry.workout?.activityDetails,
    }
    setLoadedTemplate(synthetic)
    setPastWorkoutPickerOpen(false)
    setSheet('workoutLog')
    showToast('Past workout loaded')
  }

  const lastWeight = measurementLogs.find((log) => log.values['Body weight'])?.values['Body weight']

  // Trainer/client features are intentionally kept isolated for a future version.
  const visibleWorkoutExerciseKeys = workoutExerciseBlocks(todayWorkout, demoMode).flatMap((block) => block.items.map((ex) => `${todayWorkout?.id ?? 'demo'}::${block.title}-${ex.name}`)).filter((key) => !deletedWorkoutExercises.has(key))
  const workoutProgress = {
    complete: visibleWorkoutExerciseKeys.filter((key) => workoutChecklist.has(key)).length,
    total: visibleWorkoutExerciseKeys.length,
    pct: visibleWorkoutExerciseKeys.length ? Math.round((visibleWorkoutExerciseKeys.filter((key) => workoutChecklist.has(key)).length / visibleWorkoutExerciseKeys.length) * 100) : 0,
  }

  const content = useMemo(() => {
    if (sub === 'account') return <AccountSub demoMode={demoMode} back={() => { setSub(''); if (profileBackTab && profileBackTab !== 'more') { setTab(profileBackTab); setProfileBackTab(null) } }} backLabel={profileBackTab && profileBackTab !== 'more' ? (profileBackTab.charAt(0).toUpperCase() + profileBackTab.slice(1)) : 'More'} profileName={profileName} profileInitials={profileInitials} profilePhoto={profilePhoto} setProfileName={setProfileName} setProfileInitials={setProfileInitials} setProfilePhoto={setProfilePhoto} activities={activities} focusGoals={focusGoals} />
    if (sub === 'goals') return <GoalsSub back={() => { setSub(''); if (profileBackTab && profileBackTab !== 'more') { setTab(profileBackTab); setProfileBackTab(null) } }} focusGoals={focusGoals} setFocusGoals={setFocusGoals} targets={targets} setTargets={setTargets} habitRows={habitRows} setHabitRows={setHabitRows} habits={habits} setHabits={setHabits} />
    if (sub === 'activities') return <ActivitiesSub back={() => setSub('')} activities={activities} setActivities={setActivities} />
    if (sub === 'measurements') return <MeasurementsSub back={() => { setSub(''); if (profileBackTab && profileBackTab !== 'more') { setTab(profileBackTab); setProfileBackTab(null) } }} shownMeasurements={shownMeasurements} setShownMeasurements={setShownMeasurements} logs={measurementLogs} onDelete={deleteMeasurementLog} />
    if (sub === 'templates') return <TemplatesSub back={() => { setSub(''); setTemplateMode('profile') }} templates={templates} setTemplates={setTemplates} onOpenTemplate={(template) => { setSelectedTemplate(template); setSub('templateDetail') }} onOpenDefault={(category) => { setDefaultCategory(category); setSub(''); setTab('workouts') }} onCreate={() => openSheet('createTemplate')} />
    if (sub === 'templateDetail' && selectedTemplate) return <TemplateDetailSub back={() => setSub('templates')} template={selectedTemplate} mode={templateMode} onUse={() => {
      if (templateMode === 'workout') {
        setLoadedTemplate(selectedTemplate)
        setSub('')
        setTab('today')
        setSheet('workoutLog')
        showToast('Template loaded')
      } else {
        setPendingTemplate(selectedTemplate)
        setSub('')
        setTab('calendar')
        showToast('Choose a date')
      }
    }} onEdit={() => {
      // Edit in place: seed the createTemplate sheet from this template and mark
      // it as the one being edited so saving updates it instead of duplicating.
      setEditingTemplate(selectedTemplate)
      setLoadedTemplate(selectedTemplate)
      openSheet('createTemplate', true)
    }} onDuplicate={() => {
      setEditingTemplate(null)
      setLoadedTemplate({ ...selectedTemplate, name: `${selectedTemplate.name} (copy)` })
      setSub('')
      openSheet('createTemplate', true)
    }} onDelete={() => {
      setTemplates((current) => current.filter((template) => template.id !== selectedTemplate.id))
      if (!demoMode) void createBrowserSupabaseClient().from('workout_templates').delete().eq('id', selectedTemplate.id).eq('user_id', user.id)
      setSelectedTemplate(null)
      setSub('templates')
      showToast('Template deleted')
    }} />
    if (sub === 'coach') return <CoachComingSoonSub back={() => setSub('')} />
    if (sub === 'apps') return <ConnectedAppsSub back={() => setSub('')} demoMode={demoMode} />
    if (sub === 'preferences') return <PreferencesSub back={() => setSub('')} theme={theme} onTheme={toggleTheme} onReplayTutorial={() => { setSub(''); setTutorialOpen(true) }} trackStrengthWeights={trackStrengthWeights} onToggleStrengthWeights={() => setTrackStrengthWeights((v) => !v)} />
    if (sub === 'privacy') return <PrivacySub back={() => setSub('')} />
    if (tab === 'timeline') return <Timeline demoMode={demoMode} userId={user.id} calendarEntries={calendarEntries} onOpenWorkout={() => { setPreviousTab('timeline'); setTab('workout') }} showToast={showToast} />
    if (tab === 'milestones') return <MilestonesLibrary demoMode={demoMode} onBack={() => { setTab(previousTab); setPreviousTab('today') }} />
    if (tab === 'workouts') {
      if (defaultCategory) return <DefaultTemplateDetail category={defaultCategory} primaryGoal={focusGoals[0]} onBack={() => setDefaultCategory(null)} onUse={useDefaultWorkout} />
      return <WorkoutsHub demoMode={demoMode} templates={templates} calendarEntries={calendarEntries} onOpenTemplate={(template) => { setTemplateMode('workout'); setSelectedTemplate(template); setSub('templateDetail') }} onOpenDefault={(category) => setDefaultCategory(category)} onRecentWorkouts={() => setTab('calendar')} onSavedTemplates={() => { setSub('templates'); setTemplateMode('profile'); setProfileBackTab('workouts') }} />
    }
    if (tab === 'progress') return <ProgressPersonal demoMode={demoMode} shownMeasurements={shownMeasurements} focusGoals={focusGoals} activities={activities} calendarEntries={calendarEntries} measurementLogs={measurementLogs} onLogWeight={() => openSheet('weight')} onAddMeasurement={() => openSheet('measure')} onViewMeasurements={() => { setProfileBackTab(tab); setTab('more'); setSub('measurements') }} onInsights={() => setTab('insights')} />
    if (tab === 'calendar') return <Calendar demoMode={demoMode} userId={user.id} selectedDay={selectedDay} journalEntries={calendarEntries} pendingTemplate={pendingTemplate} onSelectDay={selectCalendarDay} onAction={(action, dateISO) => { setCalendarSheetDate(dateISO); openSheet(action) }} onEditEntry={editCalendarEntry} onDeleteEntry={deleteCalendarEntry} onUpdateEntry={updateCalendarEntry} onOpenWorkout={() => setTab('workout')} onSaveEntryAsTemplate={(entry) => { const t: WorkoutTemplate = { id: `template-${Date.now()}`, name: entry.label, tags: [], activities: entry.workout?.activities ?? (entry.activity ? [entry.activity] : []), notes: entry.workout?.notes ?? entry.sub ?? '', favorite: false, lastUsed: 'Never', timesUsed: 0, defaultDurationMinutes: entry.durationMinutes, exercises: entry.workout?.exercises, activityDetails: entry.workout?.activityDetails }; setTemplates(prev => [t, ...prev]); showToast('Saved to Workout Templates') }} />
    if (tab === 'insights') return <Insights demoMode={demoMode} focusGoals={focusGoals} activities={activities} />
    if (tab === 'more') return <More setSub={(next) => { if (next === 'templates') setTemplateMode('profile'); if (next === 'account') setProfileBackTab(null); setSub(next) }} focusGoals={focusGoals} shownMeasurements={shownMeasurements} activities={activities} templates={templates} />
    if (tab === 'workout') return <WorkoutDetail workout={todayWorkout} demoMode={demoMode} checked={workoutChecklist} deletedExercises={deletedWorkoutExercises} onToggleExercise={togglePlanExercise} onDeleteExercise={deletePlanExercise} onBack={() => { setTab(previousTab); setPreviousTab('today') }} onCopyToDate={() => setCopyWorkoutOpen(true)} onSaveTemplate={() => setSavePlanTemplateOpen(true)} onComplete={() => { setHabits((prev) => ({ ...prev, workout: true })); persistHabit('workout', true); setCalendarEntries((c) => { const entries = c[todayISO] ?? []; const workoutEntries = entries.filter(e => e.type === 'Workout'); const target = workoutEntries[safeWorkoutIndex]; if (!target) return c; return { ...c, [todayISO]: entries.map(e => e !== target ? e : { ...e, workout: e.workout ? { ...e.workout, status: 'done' } : e.workout }) }; }); setTab('today'); showToast('Workout complete') }} />
    return <Today demoMode={demoMode} habits={habits} habitRows={habitRows} focusGoals={focusGoals} activities={activities} shownMeasurements={shownMeasurements} workoutStatus={workoutStatus} todayWorkout={todayWorkout} workoutCount={todayWorkouts.length} workoutIndex={safeWorkoutIndex} onSelectWorkout={setSelectedWorkoutIndex} workoutProgress={workoutProgress} dailyGoalsExpanded={dailyGoalsExpanded} profileName={profileName} profileInitials={profileInitials} profilePhoto={profilePhoto} todayNote={todayNote} onToggleDailyGoals={() => setDailyGoalsExpanded((expanded) => !expanded)} onHabit={(key) => { const next = !habits[key]; setHabits((prev) => ({ ...prev, [key]: next })); persistHabit(key, next) }} onMilestones={() => { setPreviousTab(tab); setTab('milestones') }} onAvatar={() => setAvatarMenuOpen(true)} onViewPlan={() => setTab('workout')} onAddTemplate={openTemplatePicker} onClearWorkout={clearTodayWorkout} onGenerateWorkout={() => setSheet('createWorkout')} onManageGoals={() => { setProfileBackTab(tab); setTab('more'); setSub('goals') }} onNote={() => setSheet('reflection')} onLogWorkout={() => openSheet('workoutLog')} />
  }, [role, trainerTab, tab, previousTab, sub, habits, habitRows, focusGoals, activities, targets, templates, measurementLogs, shownMeasurements, selectedDay, calendarEntries, theme, selectedTemplate, templateMode, pendingTemplate, pendingDefault, loadedTemplate, editingEntry, defaultCategory, selectedWorkoutIndex, workoutChecklist, deletedWorkoutExercises, workoutProgress, dailyGoalsExpanded, profileName, profileInitials, profilePhoto, todayNote, demoMode, trackStrengthWeights])

  if (needsOnboarding && !demoMode) {
    return (
      <Phone>
        <OnboardingFlow initialName={profileName} onComplete={handleOnboardingComplete} />
        {toast && <Toast message={toast} />}
      </Phone>
    )
  }

  return (
    <Phone>
      {content}
      {showNav && tab !== 'more' && tab !== 'insights' && tab !== 'workout' && tab !== 'askCoach' && tab !== 'milestones' && <Fab open={fabOpen} onToggle={() => setFabOpen((open) => !open)} onAction={(action) => { setCalendarSheetDate(getLocalDateISO()); openSheet(action) }} />}
      {showNav && tab !== 'workout' && tab !== 'askCoach' && tab !== 'milestones' && <BottomNav role={role} tab={tab} trainerTab={trainerTab} setTab={(next) => { setSub(''); setFabOpen(false); setTab(next) }} setTrainerTab={(next) => { setFabOpen(false); setTrainerTab(next) }} />}
      <BottomSheet sheet={sheet} initialSheetDate={calendarSheetDate} selectedDateLabel={selectedDateLabel} shownMeasurements={shownMeasurements} loadedTemplate={loadedTemplate} editingEntry={editingEntry} editingTemplate={editingTemplate} todayNote={todayNote} habits={habits} habitRows={habitRows} trackStrengthWeights={trackStrengthWeights} lastWeight={lastWeight} onHabit={(key) => { const next = !habits[key]; setHabits((prev) => ({ ...prev, [key]: next })); persistHabit(key, next) }} onClose={() => { if (sheet === 'workoutLog' || sheet === 'weight') { setLoadedTemplate(null); setEditingEntry(null) }; if (sheet === 'createTemplate') { setLoadedTemplate(null); setEditingTemplate(null) }; setSheet('') }} onSave={saveSheet} onLoadFavorite={openTemplatePicker} onCopyPastWorkout={openPastWorkoutPicker} />
      <TemplatePickerSheet open={templatePickerOpen} templates={templates} onSelect={loadTemplateIntoWorkout} onSelectDefault={loadBuiltInTemplateIntoWorkout} onClose={() => setTemplatePickerOpen(false)} />
      <PastWorkoutPickerSheet open={pastWorkoutPickerOpen} entries={Object.entries(calendarEntries).flatMap(([dateISO, isoEntries]) => isoEntries.map((entry) => ({ dateISO, entry }))).sort((a, b) => b.dateISO.localeCompare(a.dateISO))} onSelect={loadPastWorkoutIntoLog} onClose={() => setPastWorkoutPickerOpen(false)} />
      <SaveTemplatePrompt
        open={Boolean(templatePrompt)}
        skip={skipTemplatePrompt}
        onSkip={setSkipTemplatePrompt}
        onSave={() => {
          saveWorkoutAsTemplate(templatePrompt ?? {})
          setTemplatePrompt(null)
          showToast('Saved to Workout Templates')
        }}
        onClose={() => setTemplatePrompt(null)}
      />
      <CopyWorkoutModal open={copyWorkoutOpen} workout={todayWorkout} onClose={() => setCopyWorkoutOpen(false)} onCopy={copyWorkoutToDays} />
      <SavePlanTemplateModal open={savePlanTemplateOpen} workout={todayWorkout} duplicate={currentPlanTemplateDuplicate()} onSave={saveCurrentPlanAsTemplate} onClose={() => setSavePlanTemplateOpen(false)} />
      <ReplaceWorkoutModal
        open={Boolean(pendingDefault)}
        currentLabel={todayWorkout?.label ?? 'your current workout'}
        incomingLabel={pendingDefault ? `${pendingDefault.category} - ${pendingDefault.focus}` : ''}
        onReplace={() => { if (pendingDefault) applyDefaultWorkout(pendingDefault); setPendingDefault(null) }}
        onClose={() => { setPendingDefault(null); setDefaultCategory(null); if (profileBackTab && profileBackTab !== 'workouts') { setTab(profileBackTab); setProfileBackTab(null) } }}
      />
      <AvatarMenuSheet
        open={avatarMenuOpen}
        theme={theme}
        unitSystem={unitSystem}
        profileName={profileName}
        profileInitials={profileInitials}
        profilePhoto={profilePhoto}
        onUnits={setUnitSystem}
        onClose={() => setAvatarMenuOpen(false)}
        onProfile={() => { setProfileBackTab(tab); setTab('more'); setSub('account') }}
        onIntegrations={() => { setTab('more'); setSub('apps') }}
        onTheme={toggleTheme}
        onSignOut={signOut}
      />
      <TutorialOverlay open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
      {toast && <Toast message={toast} />}
    </Phone>
  )
}
