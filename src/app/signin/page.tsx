'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopNav } from '@/components/top-nav'
import { createClient } from '@/lib/supabase/client'

type Mode = 'choose' | 'email' | 'magic'

export default function SignInPage() {
  const router = useRouter()
  // createClient() is only safe to call in the browser — call it inside handlers, not here
  const getSupabase = () => createClient()
  const [mode, setMode] = useState<Mode>('choose')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  async function handleOAuth(provider: 'google' | 'apple') {
    setLoading(true)
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setFeedback({ type: 'error', text: error.message })
      setLoading(false)
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)
    const supabase = getSupabase()

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        setFeedback({ type: 'error', text: error.message })
      } else {
        setFeedback({ type: 'success', text: 'Check your email to confirm your account.' })
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setFeedback({ type: 'error', text: error.message })
      } else {
        router.push('/dashboard')
        router.refresh()
        return
      }
    }
    setLoading(false)
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setFeedback(
      error
        ? { type: 'error', text: error.message }
        : { type: 'success', text: 'Magic link sent — check your email.' }
    )
    setLoading(false)
  }

  return (
    <div className="min-h-screen glass-page">
      <TopNav />
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-5 pb-16 pt-10 md:grid-cols-[1.2fr_1fr] md:px-8">
        <section className="glass-surface-strong rounded-3xl p-8 md:p-10">
          <p className="text-sm uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">Account Access</p>
          <h1 className="mt-4 font-display text-5xl leading-tight text-[color:var(--ink)]">
            Sign in to start your next speaking sprint.
          </h1>

          {feedback && (
            <div
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                feedback.type === 'error'
                  ? 'bg-red-500/10 text-red-600'
                  : 'bg-green-500/10 text-green-700'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {mode === 'choose' && (
            <div className="mt-8 space-y-3">
              <button
                onClick={() => handleOAuth('google')}
                disabled={loading}
                className="w-full rounded-2xl border border-black/15 bg-white px-4 py-3 text-left text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-50"
              >
                Continue with Google
              </button>
              <button
                onClick={() => handleOAuth('apple')}
                disabled={loading}
                className="w-full rounded-2xl bg-black px-4 py-3 text-left text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                Continue with Apple
              </button>
              <button
                onClick={() => setMode('email')}
                className="w-full rounded-2xl bg-[color:var(--highlight)] px-4 py-3 text-left text-sm font-medium text-black transition hover:opacity-90"
              >
                Continue with Email
              </button>
              <button
                onClick={() => setMode('magic')}
                className="w-full rounded-2xl bg-[color:var(--ink)] px-4 py-3 text-left text-sm font-medium text-white transition hover:opacity-90"
              >
                Magic Link via Email
              </button>
            </div>
          )}

          {mode === 'email' && (
            <form onSubmit={handleEmailSubmit} className="mt-8 space-y-4">
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--highlight)]"
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--highlight)]"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[color:var(--highlight)] px-4 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Loading…' : isSignUp ? 'Create account' : 'Sign in'}
              </button>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full text-center text-sm text-[color:var(--ink-soft)] underline"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
              <button
                type="button"
                onClick={() => { setMode('choose'); setFeedback(null) }}
                className="w-full text-center text-sm text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]"
              >
                ← Back
              </button>
            </form>
          )}

          {mode === 'magic' && (
            <form onSubmit={handleMagicLink} className="mt-8 space-y-4">
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--highlight)]"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[color:var(--ink)] px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send Magic Link'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('choose'); setFeedback(null) }}
                className="w-full text-center text-sm text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]"
              >
                ← Back
              </button>
            </form>
          )}

          <p className="mt-6 text-sm text-[color:var(--ink-soft)]">
            By continuing, you agree to our terms, privacy policy, and recording consent for coaching analytics.
          </p>
        </section>

        <aside className="glass-surface rounded-3xl p-6">
          <h2 className="font-display text-3xl text-[color:var(--ink)]">What happens after sign in</h2>
          <ul className="mt-4 space-y-3 text-sm text-[color:var(--ink-soft)]">
            <li>1. Spin from a 1000-topic library.</li>
            <li>2. Choose your prep and speaking durations.</li>
            <li>3. Record uninterrupted delivery.</li>
            <li>4. Review your transcript, score, and coaching tips.</li>
            <li>5. Track pace, clarity, and pronunciation trends over time.</li>
          </ul>
        </aside>
      </main>
    </div>
  )
}
