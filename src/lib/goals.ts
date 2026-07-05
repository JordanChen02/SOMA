import { GoalType, Question } from './types'

export const GOAL_LABELS: Record<GoalType, string> = {
  fat_loss: 'Fat Loss',
  muscle_gain: 'Muscle Gain',
  strength: 'Strength',
  pain_mobility: 'Pain / Mobility',
  kickboxing: 'Kickboxing',
  general_health: 'General Health',
  return_from_injury: 'Return From Injury',
}

export const GOAL_QUESTIONS: Record<GoalType, Question[]> = {
  fat_loss: [
    { key: 'calorie_target', label: 'Hit calorie target?', type: 'boolean' },
    { key: 'protein_target', label: 'Hit protein target?', type: 'boolean' },
    { key: 'workout', label: 'Workout completed?', type: 'boolean' },
    { key: 'steps', label: 'Steps completed?', type: 'boolean' },
    { key: 'sleep', label: 'Sleep quality', type: 'scale', min: 1, max: 5 },
    { key: 'notes', label: 'Notes', type: 'text', placeholder: 'Anything to add?' },
  ],
  muscle_gain: [
    { key: 'workout', label: 'Workout completed?', type: 'boolean' },
    { key: 'protein_target', label: 'Hit protein target?', type: 'boolean' },
    { key: 'calorie_surplus', label: 'In calorie surplus?', type: 'boolean' },
    { key: 'sleep', label: 'Sleep quality', type: 'scale', min: 1, max: 5 },
    { key: 'energy', label: 'Energy level', type: 'scale', min: 1, max: 5 },
    { key: 'notes', label: 'Notes', type: 'text', placeholder: 'Anything to add?' },
  ],
  strength: [
    { key: 'workout', label: 'Workout completed?', type: 'boolean' },
    { key: 'pr_attempt', label: 'PR attempt today?', type: 'boolean' },
    { key: 'form_focus', label: 'Technique focus', type: 'text', placeholder: 'e.g. Squat depth' },
    { key: 'sleep', label: 'Sleep quality', type: 'scale', min: 1, max: 5 },
    { key: 'recovery', label: 'Recovery feeling', type: 'scale', min: 1, max: 5 },
    { key: 'notes', label: 'Notes', type: 'text', placeholder: 'Anything to add?' },
  ],
  pain_mobility: [
    { key: 'pain_level', label: 'Pain level (0–10)', type: 'scale', min: 0, max: 10 },
    {
      key: 'area_affected',
      label: 'Area affected',
      type: 'select',
      options: ['None', 'Neck', 'Shoulder', 'Back', 'Hip', 'Knee', 'Ankle', 'Other'],
    },
    { key: 'mobility_done', label: 'Mobility work completed?', type: 'boolean' },
    {
      key: 'trend',
      label: 'Feeling better or worse today?',
      type: 'select',
      options: ['Much better', 'Better', 'Same', 'Worse', 'Much worse'],
    },
    { key: 'notes', label: 'Notes', type: 'text', placeholder: 'Anything to add?' },
  ],
  kickboxing: [
    { key: 'trained', label: 'Trained today?', type: 'boolean' },
    { key: 'rounds', label: 'Rounds completed', type: 'number' },
    { key: 'technique_focus', label: 'Technique focus', type: 'text', placeholder: 'e.g. Jab-cross combos' },
    { key: 'cardio_rating', label: 'Cardio rating', type: 'scale', min: 1, max: 5 },
    { key: 'notes', label: 'Notes', type: 'text', placeholder: 'Anything to add?' },
  ],
  general_health: [
    { key: 'workout', label: 'Exercise today?', type: 'boolean' },
    { key: 'water', label: 'Drank enough water?', type: 'boolean' },
    { key: 'sleep', label: 'Sleep quality', type: 'scale', min: 1, max: 5 },
    { key: 'stress', label: 'Stress level', type: 'scale', min: 1, max: 5 },
    { key: 'mood', label: 'Mood', type: 'scale', min: 1, max: 5 },
    { key: 'notes', label: 'Notes', type: 'text', placeholder: 'Anything to add?' },
  ],
  return_from_injury: [
    { key: 'pain_level', label: 'Pain level (0–10)', type: 'scale', min: 0, max: 10 },
    { key: 'rehab_done', label: 'Rehab exercises completed?', type: 'boolean' },
    { key: 'activity', label: 'Any activity today?', type: 'boolean' },
    {
      key: 'trend',
      label: 'Recovery trend',
      type: 'select',
      options: ['Much better', 'Better', 'Same', 'Worse', 'Much worse'],
    },
    { key: 'notes', label: 'Notes', type: 'text', placeholder: 'Anything to add?' },
  ],
}

export function computeCompletionStatus(
  goal: GoalType,
  answers: Record<string, string | number | boolean>
): 'complete' | 'partial' | 'missed' {
  const questions = GOAL_QUESTIONS[goal].filter((q) => q.type !== 'text')
  if (questions.length === 0) return 'complete'

  const answered = questions.filter((q) => {
    const val = answers[q.key]
    return val !== undefined && val !== '' && val !== null
  })

  if (answered.length === 0) return 'missed'
  if (answered.length < questions.length) return 'partial'
  return 'complete'
}
