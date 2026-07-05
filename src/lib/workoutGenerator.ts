export interface GeneratorInputs {
  energy: number       // 1-5
  sleep: number        // 1-5
  soreness: string[]   // muscle groups that are sore
  timeAvailable: number // minutes
  equipment: string[]  // available equipment
  goals: string[]      // user_goals.goal values
  injuries: string     // free text
}

export interface GeneratedExercise {
  name: string
  sets: number
  repsRange: string
  rpe: number
  notes?: string
  category: string
}

export interface GeneratedWorkout {
  title: string
  focus: string
  warmup: string[]
  exercises: GeneratedExercise[]
  cooldown: string[]
  coachNote: string
  estimatedTime: number
}

// ── Exercise database ────────────────────────────────────────────────────────

type ExerciseEntry = {
  name: string
  muscles: string[]
  equipment: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: string
}

const EXERCISES: ExerciseEntry[] = [
  // Push
  { name: 'Barbell Bench Press', muscles: ['chest', 'shoulders', 'triceps'], equipment: ['barbell', 'bench'], difficulty: 'intermediate', category: 'push' },
  { name: 'Dumbbell Bench Press', muscles: ['chest', 'shoulders', 'triceps'], equipment: ['dumbbells', 'bench'], difficulty: 'beginner', category: 'push' },
  { name: 'Push-Ups', muscles: ['chest', 'shoulders', 'triceps'], equipment: [], difficulty: 'beginner', category: 'push' },
  { name: 'Dumbbell Shoulder Press', muscles: ['shoulders', 'triceps'], equipment: ['dumbbells'], difficulty: 'beginner', category: 'push' },
  { name: 'Barbell Overhead Press', muscles: ['shoulders', 'triceps'], equipment: ['barbell'], difficulty: 'intermediate', category: 'push' },
  { name: 'Lateral Raises', muscles: ['shoulders'], equipment: ['dumbbells'], difficulty: 'beginner', category: 'push' },
  { name: 'Cable Fly', muscles: ['chest'], equipment: ['cable'], difficulty: 'beginner', category: 'push' },
  { name: 'Tricep Pushdown', muscles: ['triceps'], equipment: ['cable'], difficulty: 'beginner', category: 'push' },
  { name: 'Skull Crushers', muscles: ['triceps'], equipment: ['barbell', 'bench'], difficulty: 'intermediate', category: 'push' },
  { name: 'Incline Dumbbell Press', muscles: ['chest', 'shoulders'], equipment: ['dumbbells', 'bench'], difficulty: 'beginner', category: 'push' },
  // Pull
  { name: 'Barbell Row', muscles: ['back', 'biceps'], equipment: ['barbell'], difficulty: 'intermediate', category: 'pull' },
  { name: 'Dumbbell Row', muscles: ['back', 'biceps'], equipment: ['dumbbells'], difficulty: 'beginner', category: 'pull' },
  { name: 'Pull-Ups', muscles: ['back', 'biceps'], equipment: ['pullup_bar'], difficulty: 'intermediate', category: 'pull' },
  { name: 'Lat Pulldown', muscles: ['back', 'biceps'], equipment: ['cable'], difficulty: 'beginner', category: 'pull' },
  { name: 'Seated Cable Row', muscles: ['back', 'biceps'], equipment: ['cable'], difficulty: 'beginner', category: 'pull' },
  { name: 'Face Pulls', muscles: ['shoulders', 'back'], equipment: ['cable'], difficulty: 'beginner', category: 'pull' },
  { name: 'Barbell Curl', muscles: ['biceps'], equipment: ['barbell'], difficulty: 'beginner', category: 'pull' },
  { name: 'Dumbbell Curl', muscles: ['biceps'], equipment: ['dumbbells'], difficulty: 'beginner', category: 'pull' },
  { name: 'Hammer Curl', muscles: ['biceps'], equipment: ['dumbbells'], difficulty: 'beginner', category: 'pull' },
  { name: 'Trap Bar Deadlift', muscles: ['back', 'glutes', 'hamstrings'], equipment: ['trap_bar'], difficulty: 'intermediate', category: 'pull' },
  // Legs
  { name: 'Barbell Back Squat', muscles: ['quads', 'glutes', 'hamstrings'], equipment: ['barbell', 'rack'], difficulty: 'intermediate', category: 'legs' },
  { name: 'Goblet Squat', muscles: ['quads', 'glutes'], equipment: ['dumbbells'], difficulty: 'beginner', category: 'legs' },
  { name: 'Romanian Deadlift', muscles: ['hamstrings', 'glutes'], equipment: ['barbell'], difficulty: 'intermediate', category: 'legs' },
  { name: 'Dumbbell Lunge', muscles: ['quads', 'glutes'], equipment: ['dumbbells'], difficulty: 'beginner', category: 'legs' },
  { name: 'Bulgarian Split Squat', muscles: ['quads', 'glutes'], equipment: ['dumbbells', 'bench'], difficulty: 'intermediate', category: 'legs' },
  { name: 'Leg Press', muscles: ['quads', 'glutes'], equipment: ['machine'], difficulty: 'beginner', category: 'legs' },
  { name: 'Leg Curl', muscles: ['hamstrings'], equipment: ['machine'], difficulty: 'beginner', category: 'legs' },
  { name: 'Calf Raises', muscles: ['calves'], equipment: ['machine'], difficulty: 'beginner', category: 'legs' },
  { name: 'Hip Thrust', muscles: ['glutes'], equipment: ['barbell', 'bench'], difficulty: 'intermediate', category: 'legs' },
  { name: 'Box Jump', muscles: ['quads', 'glutes'], equipment: ['box'], difficulty: 'intermediate', category: 'legs' },
  // Core
  { name: 'Plank', muscles: ['core'], equipment: [], difficulty: 'beginner', category: 'core' },
  { name: 'Cable Crunch', muscles: ['core'], equipment: ['cable'], difficulty: 'beginner', category: 'core' },
  { name: 'Dead Bug', muscles: ['core'], equipment: [], difficulty: 'beginner', category: 'core' },
  { name: 'Pallof Press', muscles: ['core'], equipment: ['cable'], difficulty: 'beginner', category: 'core' },
  { name: 'Ab Wheel Rollout', muscles: ['core'], equipment: ['ab_wheel'], difficulty: 'intermediate', category: 'core' },
  // Cardio / conditioning
  { name: 'Jump Rope', muscles: [], equipment: ['jump_rope'], difficulty: 'beginner', category: 'cardio' },
  { name: 'Rowing Machine', muscles: [], equipment: ['rower'], difficulty: 'beginner', category: 'cardio' },
  { name: 'Battle Ropes', muscles: [], equipment: ['battle_ropes'], difficulty: 'intermediate', category: 'cardio' },
  { name: 'Kettlebell Swing', muscles: ['glutes', 'hamstrings', 'back'], equipment: ['kettlebell'], difficulty: 'intermediate', category: 'conditioning' },
  { name: 'Farmer Carry', muscles: ['core', 'back', 'shoulders'], equipment: ['dumbbells'], difficulty: 'beginner', category: 'conditioning' },
  // Mobility / rehab
  { name: 'Hip 90/90 Stretch', muscles: ['hips'], equipment: [], difficulty: 'beginner', category: 'mobility' },
  { name: 'Thoracic Rotation', muscles: ['back'], equipment: [], difficulty: 'beginner', category: 'mobility' },
  { name: 'Ankle Circles', muscles: ['calves'], equipment: [], difficulty: 'beginner', category: 'mobility' },
  { name: 'Band Pull-Apart', muscles: ['shoulders', 'back'], equipment: ['resistance_band'], difficulty: 'beginner', category: 'mobility' },
]

// ── Rule engine ──────────────────────────────────────────────────────────────

function selectExercises(
  categories: string[],
  equipment: string[],
  sore: string[],
  count: number
): GeneratedExercise[] {
  const hasEquip = (e: ExerciseEntry) =>
    e.equipment.length === 0 || e.equipment.some((eq) => equipment.includes(eq))

  const notSore = (e: ExerciseEntry) =>
    !e.muscles.some((m) => sore.some((s) => m.includes(s) || s.includes(m)))

  const pool = EXERCISES.filter(
    (e) => categories.includes(e.category) && hasEquip(e) && notSore(e)
  )

  // Shuffle deterministically enough for variety
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map((e) => ({
    name: e.name,
    sets: 3,
    repsRange: '8-12',
    rpe: 7,
    category: e.category,
  }))
}

export function generateWorkout(inputs: GeneratorInputs): GeneratedWorkout {
  const { energy, sleep, soreness, timeAvailable, equipment, goals, injuries } = inputs

  const readiness = Math.round((energy + sleep) / 2) // 1-5

  // ── Determine focus from goals + readiness ──────────────────────────────
  const primaryGoal = goals[0] ?? 'general_health'

  let title = 'Full Body'
  let focus = 'General fitness'
  let categories: string[] = []
  let exerciseCount = 4
  let sets = 3
  let repsRange = '10-12'
  let rpe = readiness >= 4 ? 8 : readiness >= 3 ? 7 : 6

  // Low readiness: switch to mobility/light day
  if (readiness <= 2) {
    title = 'Active Recovery'
    focus = 'Low-intensity movement to aid recovery'
    categories = ['mobility', 'core']
    exerciseCount = 4
    sets = 2
    repsRange = '12-15'
    rpe = 5
  } else if (primaryGoal === 'fat_loss' || primaryGoal === 'general_health') {
    if (timeAvailable < 30) {
      title = 'Express Full Body'
      focus = 'High-efficiency compound movements'
      categories = ['push', 'pull', 'legs', 'conditioning']
      exerciseCount = 3
      sets = 3
      repsRange = '10-15'
    } else {
      title = 'Full Body'
      focus = 'Compound-first, accessory finish'
      categories = ['push', 'pull', 'legs', 'core']
      exerciseCount = 5
      sets = 3
      repsRange = '10-12'
    }
  } else if (primaryGoal === 'muscle_gain') {
    const soreHasChest = soreness.some((s) => ['chest', 'shoulders', 'triceps', 'push'].includes(s))
    const soreHasBack = soreness.some((s) => ['back', 'biceps', 'pull'].includes(s))
    const soreHasLegs = soreness.some((s) => ['quads', 'hamstrings', 'glutes', 'calves', 'legs'].includes(s))

    if (soreHasChest && !soreHasBack) {
      title = 'Back Day'
      focus = 'Pull pattern — width + thickness'
      categories = ['pull', 'core']
    } else if (soreHasBack && !soreHasChest) {
      title = 'Chest Day'
      focus = 'Push pattern — compound + isolation'
      categories = ['push', 'core']
    } else if (soreHasLegs) {
      title = 'Upper Body'
      focus = 'Push + Pull — legs are recovering'
      categories = ['push', 'pull', 'core']
    } else {
      title = 'Leg Day'
      focus = 'Lower body — quads, hamstrings, glutes'
      categories = ['legs', 'core']
    }
    exerciseCount = timeAvailable < 45 ? 4 : 6
    sets = readiness >= 4 ? 4 : 3
    repsRange = readiness >= 4 ? '6-10' : '8-12'
  } else if (primaryGoal === 'strength') {
    title = 'Strength Day'
    focus = 'Heavy compound lifts — low reps, high intensity'
    categories = ['push', 'pull', 'legs']
    exerciseCount = timeAvailable < 45 ? 3 : 4
    sets = readiness >= 4 ? 5 : 4
    repsRange = '3-6'
    rpe = readiness >= 4 ? 9 : 8
  } else if (primaryGoal === 'kickboxing') {
    title = 'Kickboxing Conditioning'
    focus = 'Explosive power + conditioning'
    categories = ['conditioning', 'core', 'legs']
    exerciseCount = 5
    sets = 3
    repsRange = '12-15'
    rpe = 7
  } else if (primaryGoal === 'pain_mobility' || primaryGoal === 'return_from_injury') {
    title = 'Movement & Mobility'
    focus = 'Joint prep, stability, controlled loading'
    categories = ['mobility', 'core', 'conditioning']
    exerciseCount = 5
    sets = 2
    repsRange = '12-20'
    rpe = 5
  }

  // Adjust time
  const estimatedTime = Math.min(timeAvailable, sets * exerciseCount * 4 + 10)

  // ── Select exercises ──────────────────────────────────────────────────────
  const selected = selectExercises(categories, equipment, soreness, exerciseCount)

  // Apply computed sets/reps/rpe
  const finalExercises = selected.map((ex) => ({ ...ex, sets, repsRange, rpe }))

  // ── Warmup / cooldown ────────────────────────────────────────────────────
  const warmup = [
    '5 min light cardio (bike or treadmill)',
    'Arm circles × 10 each direction',
    'Hip circles × 10 each direction',
    'Bodyweight squat × 10',
    'Band pull-aparts × 15',
  ]

  const cooldown = [
    "Child's pose — 60s",
    'Figure-4 glute stretch — 30s each side',
    'Doorway chest stretch — 30s each side',
    'Seated hamstring stretch — 30s each side',
    'Diaphragmatic breathing — 5 deep breaths',
  ]

  // ── Coach note ────────────────────────────────────────────────────────────
  const energyLabel = energy <= 2 ? 'low energy' : energy === 3 ? 'moderate energy' : 'high energy'
  const sleepLabel = sleep <= 2 ? 'poor sleep' : sleep === 3 ? 'average sleep' : 'good sleep'

  let coachNote = `Generated based on ${energyLabel} and ${sleepLabel} today.`
  if (soreness.length > 0) coachNote += ` Avoiding ${soreness.join(', ')} (sore).`
  if (readiness <= 2) coachNote += ' Keeping intensity low — prioritize form and recovery.'
  if (injuries && injuries.trim()) coachNote += ` Note: ${injuries.trim()}.`
  coachNote += ' Listen to your body and rest if needed.'

  return {
    title,
    focus,
    warmup,
    exercises: finalExercises,
    cooldown,
    coachNote,
    estimatedTime,
  }
}
