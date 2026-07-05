'use client'

import { Question } from '@/lib/types'

interface Props {
  question: Question
  value: string | number | boolean | undefined
  onChange: (key: string, value: string | number | boolean) => void
}

export function QuestionField({ question, value, onChange }: Props) {
  const { key, label, type, min = 1, max = 5, options, placeholder } = question

  if (type === 'boolean') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-zinc-700">{label}</p>
        <div className="flex gap-3">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              onClick={() => onChange(key, v)}
              className={`flex-1 py-3 rounded-2xl border-2 font-semibold text-sm transition-all ${
                value === v
                  ? v
                    ? 'border-[var(--vital-border)] bg-[var(--vital-fill)] text-[var(--button-secondary-fg)]'
                    : 'border-red-400 bg-red-50 text-red-600'
                  : 'border-zinc-200 bg-white text-zinc-500'
              }`}
            >
              {v ? '✓ Yes' : '✗ No'}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'scale') {
    const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i)
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-zinc-700">
          {label} <span className="text-zinc-400 font-normal">({min}–{max})</span>
        </p>
        <div className="flex gap-2">
          {steps.map((v) => (
            <button
              key={v}
              onClick={() => onChange(key, v)}
              className={`flex-1 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                value === v
                  ? 'border-[var(--button-primary-bg)] bg-[var(--button-primary-bg)] text-white shadow-[var(--button-primary-shadow)]'
                  : 'border-zinc-200 bg-white text-zinc-600'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'select' && options) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-zinc-700">{label}</p>
        <div className="flex flex-col gap-1.5">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => onChange(key, opt)}
              className={`w-full text-left px-4 py-2.5 rounded-2xl border-2 text-sm font-medium transition-all ${
                value === opt
                  ? 'border-[var(--vital-border)] bg-[var(--vital-fill)] text-[var(--button-secondary-fg)]'
                  : 'border-zinc-200 bg-white text-zinc-600'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'number') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-zinc-700">{label}</p>
        <input
          type="number"
          value={value as number ?? ''}
          onChange={(e) => onChange(key, Number(e.target.value))}
          placeholder={placeholder ?? '0'}
          className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-900 text-base focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>
    )
  }

  // text
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-zinc-700">{label}</p>
      <textarea
        value={value as string ?? ''}
        onChange={(e) => onChange(key, e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-900 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
      />
    </div>
  )
}
