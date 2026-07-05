'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LockKeyhole, Mail, Play } from 'lucide-react'
import { DEMO_MODE_COOKIE } from '@/lib/auth/demo'
import { ensureUserProfile } from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/client'

function SomaBrandHero() {
  return (
    /*
      Wrap SVG in a div with left+right fade mask to dissolve hard edges
      into the page background — fixes visible boundary on right side.
    */
    <div
      style={{
        WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 7%, black 88%, transparent 100%)',
        maskImage: 'linear-gradient(90deg, transparent 0%, black 7%, black 88%, transparent 100%)',
      }}
    >
      <svg
        viewBox="0 0 390 283"
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sl-aurora-h" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22D3A6" />
            <stop offset="48%" stopColor="#3AA4EB" />
            <stop offset="100%" stopColor="#7B61FF" />
          </linearGradient>
          <linearGradient id="sl-aurora-d" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22D3A6" />
            <stop offset="50%" stopColor="#3AA4EB" />
            <stop offset="100%" stopColor="#7B61FF" />
          </linearGradient>
          <radialGradient id="sl-glow-teal" cx="15%" cy="20%" r="55%">
            <stop offset="0%" stopColor="#22D3A6" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#22D3A6" stopOpacity="0" />
          </radialGradient>
          {/* Purple: large radius + low opacity = atmospheric, not blob */}
          <radialGradient id="sl-glow-purple" cx="90%" cy="98%" r="80%">
            <stop offset="0%" stopColor="#7B61FF" stopOpacity="0.10" />
            <stop offset="45%" stopColor="#7B61FF" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#7B61FF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sl-ring-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3AA4EB" stopOpacity="0.28" />
            <stop offset="65%" stopColor="#3AA4EB" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#3AA4EB" stopOpacity="0" />
          </radialGradient>
          <filter id="sl-f-ring" x="-55%" y="-55%" width="210%" height="210%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="sl-f-dot" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width="390" height="283" fill="#03070D" />
        <rect width="390" height="283" fill="url(#sl-glow-teal)" />
        <rect width="390" height="283" fill="url(#sl-glow-purple)" />

        {/* Ring — unchanged, proportions felt right */}
        <ellipse cx="195" cy="81" rx="72" ry="72" fill="url(#sl-ring-halo)" />
        <path
          d="M 239.43 92.90 A 46 46 0 1 1 239.43 69.10"
          stroke="url(#sl-aurora-d)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          filter="url(#sl-f-ring)"
        />
        <circle cx="239.43" cy="69.10" r="3" fill="#22D3A6" filter="url(#sl-f-dot)" />

        {/*
          SOMΛ — fontSize 47 (~8% smaller), letterSpacing 16, weight 300.
          y pulled up 6px vs previous (194→188).
        */}
        <text
          x="195"
          y="188"
          textAnchor="middle"
          fontFamily="-apple-system, 'Helvetica Neue', Arial, sans-serif"
          fontSize="47"
          fontWeight="300"
          letterSpacing="16"
          fill="white"
        >
          SOM&#x039B;
        </text>

        {/* Tagline — y pulled up 8px (223→215) */}
        <text
          x="195"
          y="215"
          textAnchor="middle"
          fontFamily="-apple-system, 'Helvetica Neue', Arial, sans-serif"
          fontSize="10"
          fontWeight="600"
          letterSpacing="4"
          fill="url(#sl-aurora-h)"
        >
          BODY. MIND. PERFORMANCE.
        </text>

        {/* Underline — 70px wide, centered (x=160), y pulled up 10px (237→227) */}
        <rect x="160" y="227" width="70" height="3" rx="1.5" fill="url(#sl-aurora-h)" />
      </svg>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const queryError = new URLSearchParams(window.location.search).get('error')
    if (queryError === 'oura_sign_in_required') setError('Sign in before connecting Oura.')
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    document.cookie = `${DEMO_MODE_COOKIE}=; path=/; max-age=0; SameSite=Lax`
    window.localStorage.removeItem('soma-demo-mode')
    window.localStorage.removeItem('soma-demo-toast')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await ensureUserProfile(supabase, user)
    router.push('/today')
    router.refresh()
  }

  function handleDemoAccess() {
    document.cookie = `${DEMO_MODE_COOKIE}=1; path=/; max-age=604800; SameSite=Lax`
    window.localStorage.setItem('soma-demo-mode', '1')
    window.localStorage.setItem('soma-demo-toast', '1')
    router.push('/today')
    router.refresh()
  }

  return (
    <main className="relative min-h-dvh" style={{ background: '#03070D', color: '#F3F7FB' }}>
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col" style={{ paddingTop: 'max(14px, env(safe-area-inset-top))' }}>
        {/* Brand hero — inline SVG, no frame/clip/translateY hacks */}
        <SomaBrandHero />

        {/* Login section */}
        <div className="flex flex-1 flex-col px-5 pb-safe-bottom" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>

          {/* Card */}
          <div
            className="rounded-[22px] border backdrop-blur-2xl"
            style={{
              padding: '22px 20px 20px',
              background: 'linear-gradient(145deg, rgba(9,16,29,0.90), rgba(5,9,17,0.95))',
              borderColor: 'rgba(58,164,235,0.36)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.60), 0 0 28px rgba(58,164,235,0.14), 0 0 48px rgba(34,211,166,0.06), 0 0 56px rgba(123,97,255,0.09), inset 0 1px 0 rgba(255,255,255,0.055)',
            }}
          >
            <h2
              className="font-extrabold leading-tight tracking-[-0.035em]"
              style={{ fontSize: '26px', color: 'white' }}
            >
              Welcome back
            </h2>
            <p className="mt-1 text-[13px] font-medium leading-snug" style={{ color: '#9AA8BD' }}>
              Sign in to continue your journey.
            </p>

            {!mounted ? (
              <div className="mt-5 space-y-2.5" aria-hidden="true">
                <div className="rounded-[12px]" style={{ height: '48px', background: 'rgba(26,35,51,0.60)' }} />
                <div className="rounded-[12px]" style={{ height: '48px', background: 'rgba(26,35,51,0.60)' }} />
                <div className="mt-2 rounded-[14px]" style={{ height: '52px', background: 'linear-gradient(90deg,#22D3A6,#3AA4EB,#7B61FF)', opacity: 0.5 }} />
              </div>
            ) : (
              <>
                <form onSubmit={handleLogin} className="mt-5" style={{ display: 'grid', gap: '10px' }} suppressHydrationWarning>

                  {/* Email field */}
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.80)' }}>
                      Email
                    </label>
                    <div
                      className="flex items-center gap-3 rounded-[12px] border px-3.5"
                      style={{ height: '48px', background: 'rgba(5,9,17,0.56)', borderColor: 'rgba(83,100,124,0.40)' }}
                    >
                      <Mail size={17} style={{ color: '#8795AA', flexShrink: 0 }} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="Enter your email"
                        className="soma-auth-input min-w-0 flex-1 bg-transparent text-[13px] font-medium outline-none placeholder:text-[#8795AA]"
                        style={{ color: 'white' }}
                        suppressHydrationWarning
                      />
                    </div>
                  </div>

                  {/* Password field */}
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.80)' }}>
                      Password
                    </label>
                    <div
                      className="flex items-center gap-3 rounded-[12px] border px-3.5"
                      style={{ height: '48px', background: 'rgba(5,9,17,0.56)', borderColor: 'rgba(83,100,124,0.40)' }}
                    >
                      <LockKeyhole size={17} style={{ color: '#8795AA', flexShrink: 0 }} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Enter your password"
                        className="soma-auth-input min-w-0 flex-1 bg-transparent text-[13px] font-medium outline-none placeholder:text-[#8795AA]"
                        style={{ color: 'white' }}
                        suppressHydrationWarning
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        style={{ color: '#8795AA' }}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p
                      className="rounded-[11px] border px-4 py-2.5 text-[12px] font-semibold"
                      style={{ background: 'rgba(255,107,87,0.10)', borderColor: 'rgba(255,107,87,0.28)', color: '#FF6B57' }}
                    >
                      {error}
                    </p>
                  )}

                  {/* Sign In */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-1 flex w-full items-center justify-center rounded-[14px] text-[15px] font-bold text-white disabled:opacity-60"
                    style={{
                      height: '52px',
                      background: 'linear-gradient(90deg, #22D3A6, #3AA4EB, #7B61FF)',
                      boxShadow: '0 12px 30px rgba(58,164,235,0.28), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.14)',
                    }}
                  >
                    {loading ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>

                {/* OR divider */}
                <div className="my-4 flex items-center gap-4">
                  <div className="h-px flex-1" style={{ background: 'rgba(130,145,170,0.20)' }} />
                  <span className="text-[12px] font-semibold" style={{ color: '#8795AA' }}>OR</span>
                  <div className="h-px flex-1" style={{ background: 'rgba(130,145,170,0.20)' }} />
                </div>

                {/* Google */}
                <button
                  type="button"
                  onClick={() => setError('Google sign-in is not enabled yet.')}
                  className="flex w-full items-center justify-center gap-2.5 rounded-[12px] border text-[13px] font-semibold text-white"
                  style={{ height: '48px', background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(83,100,124,0.44)' }}
                >
                  <GoogleIcon />
                  Continue with Google
                </button>

                {/* Sign up */}
                <p className="mt-4 text-center text-[13px] font-medium" style={{ color: '#8795AA' }}>
                  Don&apos;t have an account?{' '}
                  <Link href="/signup" className="font-bold" style={{ color: '#3AA4EB' }}>
                    Sign up
                  </Link>
                </p>
              </>
            )}
          </div>

          {/* Explore demo — below card, aurora gradient treatment */}
          <button
            type="button"
            onClick={handleDemoAccess}
            className="mx-auto mt-6 flex items-center gap-2 text-[13px] font-semibold"
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(34,211,166,0.18) 0%, rgba(123,97,255,0.18) 100%)',
                border: '1px solid',
                borderColor: 'transparent',
                backgroundClip: 'padding-box',
                boxShadow: 'inset 0 0 0 1px rgba(58,164,235,0.35), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.10)',
              }}
            >
              <Play size={10} fill="url(#demo-aurora)" style={{ marginLeft: '1px' }} />
            </span>
            <span
              style={{
                background: 'linear-gradient(90deg, #22D3A6, #3AA4EB, #7B61FF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Explore SOMA demo
            </span>
            <span
              style={{
                background: 'linear-gradient(90deg, #3AA4EB, #7B61FF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              ›
            </span>
          </button>

          {/* Terms */}
          <p className="mt-3 text-center text-[11px] leading-relaxed" style={{ color: '#576070' }}>
            By continuing, you agree to our{' '}
            <button type="button" className="underline" style={{ color: '#5A8BB0' }}>
              Terms of Service
            </button>
            {' '}and{' '}
            <button type="button" className="underline" style={{ color: '#5A8BB0' }}>
              Privacy Policy
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}
