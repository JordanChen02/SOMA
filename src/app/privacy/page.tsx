import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | SOMA',
  description: 'Privacy Policy for SOMA.',
}

const sections = [
  {
    title: 'Information We Collect',
    body: 'SOMA collects the fitness journal information you choose to enter, such as workouts, goals, habits, body measurements, weight, notes, progress photos, meal photos, and related check-ins.',
  },
  {
    title: 'Connected Apps',
    body: 'If you connect Apple Health, Oura, or future integrations, SOMA may import health, activity, sleep, recovery, workout, or related data allowed by the permissions you grant. You may disconnect integrations at any time.',
  },
  {
    title: 'How Data Is Used',
    body: 'We use your data to help track progress, organize your fitness history, show trends, support goal check-ins, and prepare future insights. We do not sell your personal fitness data.',
  },
  {
    title: 'Your Choices',
    body: 'You control what you enter and which integrations you connect. Disconnecting an integration stops future imports from that service, though previously imported data may remain in your journal unless removed.',
  },
  {
    title: 'Not Medical Advice',
    body: 'SOMA is a fitness journal and planning tool. It does not provide medical advice, diagnosis, treatment, or professional health guidance.',
  },
]

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <div className="mx-auto max-w-[680px]">
        <Link href="/today" className="text-[14px] font-semibold" style={{ color: 'var(--button-secondary-fg)' }}>Back to app</Link>
        <header className="mt-8">
          <p className="text-[11px] font-black uppercase tracking-[0.20em]" style={{ color: 'var(--label)' }}>SOMA</p>
          <h1 className="mt-3 text-[30px] font-black leading-tight">Privacy Policy</h1>
          <p className="mt-3 text-[14px]" style={{ color: 'var(--text-soft)' }}>Last updated June 20, 2026</p>
        </header>
        <section className="mt-8 rounded-[16px] border p-5" style={{ background: 'var(--surface-1)', borderColor: 'var(--line)' }}>
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>
            This Privacy Policy explains how SOMA handles information for this MVP fitness journal application.
          </p>
          <div className="mt-6 space-y-6">
            {sections.map((section) => (
              <div key={section.title}>
                <h2 className="text-[16px] font-black">{section.title}</h2>
                <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>{section.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
