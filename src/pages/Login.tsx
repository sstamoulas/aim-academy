import { useState, useEffect } from 'react'
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  // If already signed in, redirect immediately
  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      if (u) {
        const token = await u.getIdTokenResult()
        const role = token.claims['role'] as string | undefined
        if (role === 'admin') window.location.href = '/admin'
        else if (role === 'teacher') window.location.href = '/portal/teacher'
        else window.location.href = '/portal/parent'
      } else {
        setChecking(false)
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const token = await cred.user.getIdTokenResult()
      const role = token.claims['role'] as string | undefined
      if (role === 'admin') window.location.href = '/admin'
      else if (role === 'teacher') window.location.href = '/portal/teacher'
      else window.location.href = '/portal/parent'
    } catch {
      setError('Invalid email or password.')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-cream min-h-screen flex flex-col font-body">
      <header className="sticky top-0 z-30 bg-cream/90 backdrop-blur border-b border-stone-200/60 px-6 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="AIM Academy" className="w-8 h-8 rounded-xl object-contain bg-white p-0.5 shadow-sm" />
          <span className="font-kids text-lg text-wood-dark leading-none">AIM Academy</span>
        </a>
        <a href="/" className="text-sm text-stone-500 hover:text-wood-dark transition font-quick flex items-center gap-1">
          <span>←</span> Back to home
        </a>
      </header>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="AIM Academy" className="w-14 h-14 rounded-2xl shadow-md object-contain bg-white p-1 mx-auto mb-4" />
            <h1 className="font-kids text-3xl text-wood-dark">Sign In</h1>
            <p className="text-stone-500 text-sm mt-1 font-quick">Anas Ibn Malik Academy</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-8 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-stone-700 font-quick mb-2">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 transition" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 font-quick mb-2">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 transition" />
            </div>
            {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-wood text-white font-bold font-quick py-3.5 rounded-full shadow-md hover:brightness-95 transition disabled:opacity-60">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
