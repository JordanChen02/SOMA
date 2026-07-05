export const CLIENT_NAME = 'Avery Stone'
export const COACH_NAME = 'Coach Taylor'

export interface Exercise {
  key: string
  name: string
  detail: string
}

export interface Block {
  icon: string
  name: string
  sub: string
  exercises: Exercise[]
}

export interface Session {
  id: string
  name: string
  types: { label: string; color: 'signal' | 'vital' }[]
  duration: string
  time?: string
  date: string
  dateLabel: string
  focus?: string
  coachNote: string
  blocks: Block[]
}

export const SESSIONS: Session[] = [
  {
    id: 'jun-15',
    name: 'Upper Body + Bag Work',
    types: [{ label: 'Strength', color: 'signal' }, { label: 'Kickboxing', color: 'signal' }],
    duration: '60 min',
    time: '6:00 PM',
    date: '2026-06-15',
    dateLabel: 'Today · Jun 15',
    focus: 'Push · Pull · Conditioning',
    coachNote: 'Great energy today — your jab-cross timing has improved a lot since last month. Focus on keeping your guard up during the bag rounds next session. Strength numbers are trending up nicely on the bench.',
    blocks: [
      {
        icon: 'activity',
        name: 'Warm-up',
        sub: '10 min',
        exercises: [
          { key: 'w1', name: 'Jump Rope', detail: '3 min · easy pace' },
          { key: 'w2', name: 'Band Pull-aparts', detail: '2 × 15' },
          { key: 'w3', name: 'Shadow Boxing', detail: '2 min · light' },
        ],
      },
      {
        icon: 'dumbbell',
        name: 'Strength',
        sub: '4 exercises',
        exercises: [
          { key: 's1', name: 'Dumbbell Bench Press', detail: '3 × 10 · 30–35 lb' },
          { key: 's2', name: 'Seated Cable Row', detail: '3 × 12 · 50 lb' },
          { key: 's3', name: 'Overhead Press', detail: '3 × 10 · 20 lb' },
          { key: 's4', name: 'Lat Pulldown', detail: '3 × 12 · 55 lb' },
        ],
      },
      {
        icon: 'zap',
        name: 'Bag Work · Kickboxing',
        sub: '4 rounds',
        exercises: [
          { key: 'b1', name: 'Heavy Bag Rounds', detail: '4 × 3 min · jab–cross–hook' },
          { key: 'b2', name: 'Teep + Roundhouse', detail: '2 × 2 min each side' },
        ],
      },
      {
        icon: 'heart',
        name: 'Core & Cooldown',
        sub: '10 min',
        exercises: [
          { key: 'c1', name: 'Plank', detail: '3 × 45 sec' },
          { key: 'c2', name: 'Full Stretch', detail: '5 min · guided' },
        ],
      },
    ],
  },
  {
    id: 'jun-12',
    name: 'Conditioning Run',
    types: [{ label: 'Cardio', color: 'vital' }],
    duration: '35 min',
    date: '2026-06-12',
    dateLabel: 'Thu · Jun 12',
    coachNote: 'Solid effort on the intervals. Your recovery time between sets is improving.',
    blocks: [],
  },
  {
    id: 'jun-10',
    name: 'Lower Body Strength',
    types: [{ label: 'Strength', color: 'signal' }],
    duration: '55 min',
    date: '2026-06-10',
    dateLabel: 'Tue · Jun 10',
    coachNote: 'Great squat depth today. Keep the knees tracking over toes.',
    blocks: [
      {
        icon: 'dumbbell',
        name: 'Legs',
        sub: '5 exercises',
        exercises: [
          { key: 'l1', name: 'Goblet Squat', detail: '3 × 12 · 35 lb' },
          { key: 'l2', name: 'Romanian Deadlift', detail: '3 × 10 · 65 lb' },
          { key: 'l3', name: 'Dumbbell Lunge', detail: '3 × 10 each side · 25 lb' },
          { key: 'l4', name: 'Leg Press', detail: '3 × 15 · 120 lb' },
          { key: 'l5', name: 'Calf Raises', detail: '3 × 20 · bodyweight' },
        ],
      },
    ],
  },
  {
    id: 'jun-08',
    name: 'Kickboxing Technique',
    types: [{ label: 'Kickboxing', color: 'signal' }],
    duration: '45 min',
    date: '2026-06-08',
    dateLabel: 'Sun · Jun 8',
    coachNote: 'Footwork is improving. Work on pivoting after the cross.',
    blocks: [],
  },
  {
    id: 'jun-05',
    name: 'Full Body Strength',
    types: [{ label: 'Strength', color: 'signal' }],
    duration: '60 min',
    date: '2026-06-05',
    dateLabel: 'Thu · Jun 5',
    coachNote: 'Strong session across the board.',
    blocks: [],
  },
  {
    id: 'jun-02',
    name: 'Intervals + Bag',
    types: [{ label: 'Kickboxing', color: 'signal' }, { label: 'Cardio', color: 'vital' }],
    duration: '50 min',
    date: '2026-06-02',
    dateLabel: 'Mon · Jun 2',
    coachNote: 'Good cardio base is showing. Heart rate recovery is faster.',
    blocks: [],
  },
  {
    id: 'may-29',
    name: 'Lower Body Strength',
    types: [{ label: 'Strength', color: 'signal' }],
    duration: '55 min',
    date: '2026-05-29',
    dateLabel: 'Thu · May 29',
    coachNote: 'Deadlift form is locking in nicely.',
    blocks: [],
  },
]

export const WEIGHT_SERIES = [158, 156.4, 155.1, 154.3, 152.8, 151.5, 150.6, 149.7, 148.9, 148.2]

export interface Measurement {
  date: string
  bodyWeight: number
  bodyFatPct: number
  waist: number
  chest: number
  hips: number
  leftBicep: number
  rightBicep: number
  neck: number
}

export const MEASUREMENTS: Measurement[] = [
  { date: '2026-06-01', bodyWeight: 148.2, bodyFatPct: 17.1, waist: 33.0, chest: 40.5, hips: 38.0, leftBicep: 14.5, rightBicep: 14.7, neck: 15.0 },
  { date: '2026-05-01', bodyWeight: 151.5, bodyFatPct: 18.2, waist: 34.0, chest: 40.0, hips: 38.5, leftBicep: 14.2, rightBicep: 14.4, neck: 15.0 },
  { date: '2026-04-01', bodyWeight: 154.3, bodyFatPct: 19.0, waist: 34.8, chest: 39.5, hips: 39.0, leftBicep: 14.0, rightBicep: 14.2, neck: 14.8 },
  { date: '2026-03-01', bodyWeight: 156.4, bodyFatPct: 19.8, waist: 35.5, chest: 39.0, hips: 39.5, leftBicep: 13.8, rightBicep: 14.0, neck: 14.8 },
  { date: '2026-02-01', bodyWeight: 158.0, bodyFatPct: 20.5, waist: 36.0, chest: 38.5, hips: 40.0, leftBicep: 13.5, rightBicep: 13.8, neck: 14.6 },
]

export interface CalendarEvent {
  date: string
  type: 'workout' | 'rest' | 'cardio' | 'assessment' | 'missed'
  title: string
  status: 'completed' | 'scheduled' | 'missed' | 'rest'
}

export const CALENDAR_EVENTS: CalendarEvent[] = [
  { date: '2026-06-15', type: 'workout', title: 'Upper Body + Bag Work', status: 'scheduled' },
  { date: '2026-06-14', type: 'rest', title: 'Rest Day', status: 'rest' },
  { date: '2026-06-13', type: 'rest', title: 'Rest Day', status: 'rest' },
  { date: '2026-06-12', type: 'cardio', title: 'Conditioning Run', status: 'completed' },
  { date: '2026-06-11', type: 'rest', title: 'Rest Day', status: 'rest' },
  { date: '2026-06-10', type: 'workout', title: 'Lower Body Strength', status: 'completed' },
  { date: '2026-06-09', type: 'missed', title: 'Upper Body', status: 'missed' },
  { date: '2026-06-08', type: 'workout', title: 'Kickboxing Technique', status: 'completed' },
  { date: '2026-06-07', type: 'rest', title: 'Rest Day', status: 'rest' },
  { date: '2026-06-06', type: 'rest', title: 'Rest Day', status: 'rest' },
  { date: '2026-06-05', type: 'workout', title: 'Full Body Strength', status: 'completed' },
  { date: '2026-06-04', type: 'rest', title: 'Rest Day', status: 'rest' },
  { date: '2026-06-03', type: 'cardio', title: 'Cardio Day', status: 'completed' },
  { date: '2026-06-02', type: 'workout', title: 'Intervals + Bag', status: 'completed' },
  { date: '2026-06-17', type: 'workout', title: 'Leg Day', status: 'scheduled' },
  { date: '2026-06-19', type: 'workout', title: 'Back Day', status: 'scheduled' },
  { date: '2026-06-21', type: 'rest', title: 'Rest Day', status: 'rest' },
  { date: '2026-06-22', type: 'workout', title: 'Kickboxing', status: 'scheduled' },
]
