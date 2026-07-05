export type GoalType =
  | 'fat_loss'
  | 'muscle_gain'
  | 'strength'
  | 'pain_mobility'
  | 'kickboxing'
  | 'general_health'
  | 'return_from_injury'

export type CompletionStatus = 'complete' | 'partial' | 'missed'

export interface Profile {
  id: string
  first_name: string
  last_name: string
  gym_location: string | null
  training_frequency: string
  injuries: string | null
  coach_sharing_enabled: boolean
  created_at: string
}

export interface UserGoal {
  id: string
  user_id: string
  goal: GoalType
  is_primary: boolean
}

export interface JournalEntry {
  id: string
  user_id: string
  entry_date: string
  goal: GoalType
  answers: Record<string, string | number | boolean>
  completion_status: CompletionStatus
  created_at: string
}

export interface CoachNote {
  id: string
  entry_id: string
  coach_id: string
  note: string
  created_at: string
  coach?: { first_name: string; last_name: string }
}

export interface CoachLink {
  id: string
  client_id: string
  coach_id: string
  is_active: boolean
}

export type QuestionType = 'boolean' | 'scale' | 'text' | 'number' | 'select'

export interface Question {
  key: string
  label: string
  type: QuestionType
  options?: string[]
  min?: number
  max?: number
  placeholder?: string
}
