import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | SOMA',
  description: 'Terms of Service for SOMA.',
}

const sections = [
  {
    title: 'Use of the App',
    body: 'SOMA is provided as an MVP fitness journal for tracking workouts, goals, habits, measurements, notes, and related fitness information.',
  },
  {
    title: 'Your Responsibility',
    body: 'You are responsible for the information you enter, the goals you set, and the training decisions you make based on your journal.',
  },
  {
    title: 'No Medical or Professional Advice',
    body: 'The app does not provide medical, health, fitness, nutrition, or other professional advice. Consult a qualified professional before making health or training decisions.',
  },
  {
    title: 'Connected Integrations',
    body: 'Connected app features, including Apple Health, Oura, and future integrations, may depend on third-party services, permissions, availability, APIs, and user accounts.',
  },
  {
    title: 'Changes and Availability',
    body: 'Features may change over time as SOMA evolves. The app is provided as-is and may be updated, changed, paused, or discontinued.',
  },
]

export default function TermsPage() {
  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <div className="mx-auto max-w-[680px]">
        <Link href="/today" className="text-[14px] font-semibold" style={{ color: 'var(--button-secondary-fg)' }}>Back to app</Link>
        <header className="mt-8">
          <p className="text-[11px] font-black uppercase tracking-[0.20em]" style={{ color: 'var(--label)' }}>SOMA</p>
          <h1 className="mt-3 text-[30px] font-black leading-tight">Terms of Service</h1>
          <p className="mt-3 text-[14px]" style={{ color: 'var(--text-soft)' }}>Last updated June 20, 2026</p>
        </header>
        <section className="mt-8 rounded-[16px] border p-5" style={{ background: 'var(--surface-1)', borderColor: 'var(--line)' }}>
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>
            These Terms of Service describe the basic terms for using SOMA.
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
