'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SomaLogo } from '@/components/SomaLogo'
import { DEMO_MODE_COOKIE } from '@/lib/auth/demo'
import { ensureUserProfile } from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const accountType = 'client'
  const setAccountType = (_type: 'trainer' | 'client') => {}
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    document.cookie = `${DEMO_MODE_COOKIE}=; path=/; max-age=0; SameSite=Lax`
    window.localStorage.removeItem('soma-demo-mode')
    window.localStorage.removeItem('soma-demo-toast')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { account_type: accountType },
      },
    })
    if (error) { setError(error.message); setLoading(false) }
    else if (data.user && data.session) {
      await ensureUserProfile(supabase, data.user)
      router.push('/today')
      router.refresh()
    } else {
      setLoading(false)
      setDone(true)
    }
  }

  if (done) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--fg)' }} className="flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">📬</div>
        <h1 className="text-[22px] font-bold mb-2">Check your email</h1>
        <p className="text-[14px] max-w-xs" style={{ color: 'var(--fg-2)' }}>
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
        </p>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--fg)' }} className="flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <SomaLogo size={28} />
          </div>
          <span className="font-bold tracking-[0.08em]" style={{ color: 'var(--fg)' }}>SOMA</span>
        </Link>

        <h1 className="text-[24px] font-bold mb-1">Create your account</h1>
        <p className="text-[13px] mb-6" style={{ color: 'var(--fg-2)' }}>Start your personal fitness journal.</p>

        {!mounted ? (
          <div className="space-y-3" aria-hidden="true">
            <div className="h-[72px] rounded-[13px]" style={{ background: 'var(--surface-1)' }} />
            <div className="h-[72px] rounded-[13px]" style={{ background: 'var(--surface-1)' }} />
            <div className="h-[48px] rounded-[13px]" style={{ background: 'var(--surface-2)' }} />
          </div>
        ) : (
        <>
        {/* Account type */}
        <div className="hidden">
          {(['trainer', 'client'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setAccountType(type)}
              className="py-4 rounded-[13px] border-2 flex flex-col items-center gap-2 transition-all"
              style={{
                borderColor: accountType === type ? 'var(--vital)' : 'var(--border)',
                background: accountType === type ? 'var(--vital-fill)' : 'var(--surface-1)',
              }}
            >
              <span className="text-2xl">{type === 'trainer' ? '🏋️' : '👤'}</span>
              <span className="text-[13px] font-semibold capitalize" style={{ color: accountType === type ? 'var(--vital)' : 'var(--fg-2)' }}>
                {type === 'trainer' ? 'Trainer' : 'Client'}
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-3" suppressHydrationWarning>
          <div className="flex flex-col gap-1.5" suppressHydrationWarning>
            <label className="text-[12px] font-medium" style={{ color: 'var(--fg-2)' }}>Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              placeholder="you@example.com"
              className="h-[46px] px-4 rounded-[11px] text-[14px] outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--fg)' }}
              suppressHydrationWarning
            />
          </div>
          <div className="flex flex-col gap-1.5" suppressHydrationWarning>
            <label className="text-[12px] font-medium" style={{ color: 'var(--fg-2)' }}>Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              placeholder="Min 6 characters"
              className="h-[46px] px-4 rounded-[11px] text-[14px] outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--fg)' }}
              suppressHydrationWarning
            />
          </div>
          {error && <p className="text-[12px] px-3 py-2 rounded-[9px]" style={{ background: 'var(--ember-fill)', color: 'var(--neg)' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="h-[48px] rounded-[13px] font-semibold text-[15px] text-white mt-1 disabled:opacity-50"
            style={{ background: 'var(--button-primary-bg)', boxShadow: 'var(--button-primary-shadow)' }}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span className="text-[12px]" style={{ color: 'var(--fg-3)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        <button
          type="button"
          disabled
          className="w-full h-[48px] rounded-[13px] font-semibold text-[14px] flex items-center justify-center gap-3 opacity-60"
          style={{ background: 'var(--surface-1)', color: 'var(--fg-1)', border: '1px solid var(--border)' }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google OAuth coming later
        </button>

        <p className="text-center text-[13px] mt-5" style={{ color: 'var(--fg-3)' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold" style={{ color: 'var(--button-secondary-fg)' }}>Log in</Link>
        </p>
        </>
        )}
      </div>
    </div>
  )
}
