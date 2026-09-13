import { useState, useEffect } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import type { Registration, RegistrationChild } from '../types/portal'

type Step = 'loading' | 'auth' | 'family-info' | 'pending' | 'approved' | 'rejected'

const GRADES = ['Pre-K', 'Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade',
  '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade',
  '11th Grade', '12th Grade', 'Adult / Parent']

const EMPTY_CHILD: RegistrationChild = { firstName: '', lastName: '', dateOfBirth: '', grade: '' }

// ── Auth Step ─────────────────────────────────────────────────────────────────

function AuthStep({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    try {
      if (mode === 'signup') {
        if (password !== confirm) { setError('Passwords do not match.'); setLoading(false); return }
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      onDone()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('email-already-in-use')) setError('An account with this email already exists. Try signing in.')
      else if (msg.includes('wrong-password') || msg.includes('invalid-credential')) setError('Incorrect email or password.')
      else if (msg.includes('weak-password')) setError('Password must be at least 6 characters.')
      else setError('Something went wrong. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <img src="/logo.png" alt="AIM Academy" className="w-14 h-14 rounded-2xl shadow-md object-contain bg-white p-1 mx-auto mb-4" />
        <h1 className="font-kids text-3xl text-wood-dark">Family Registration</h1>
        <p className="text-stone-500 text-sm mt-1 font-quick">Anas Ibn Malik Academy</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-8 space-y-5">
        <div className="flex rounded-2xl border border-stone-200 overflow-hidden mb-2">
          {(['signup', 'signin'] as const).map(m => (
            <button key={m} type="button" onClick={() => { setMode(m); setError(null) }}
              className={`flex-1 py-2.5 text-sm font-semibold font-quick transition ${
                mode === m ? 'bg-sage-600 text-white' : 'text-stone-400 hover:text-stone-600'
              }`}>
              {m === 'signup' ? 'New Family' : 'Sign In'}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 font-quick mb-2">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 transition text-sm" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-700 font-quick mb-2">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
            className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 transition text-sm" />
        </div>
        {mode === 'signup' && (
          <div>
            <label className="block text-sm font-semibold text-stone-700 font-quick mb-2">Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 transition text-sm" />
          </div>
        )}
        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-wood text-white font-bold font-quick py-3.5 rounded-full shadow-md hover:brightness-95 transition disabled:opacity-60">
          {loading ? (mode === 'signup' ? 'Creating account…' : 'Signing in…') : (mode === 'signup' ? 'Continue →' : 'Sign In')}
        </button>
      </form>
    </div>
  )
}

// ── Family Info Step ──────────────────────────────────────────────────────────

function FamilyInfoStep({ user, onSubmitted }: { user: User; onSubmitted: () => void }) {
  const [parentName, setParentName] = useState('')
  const [phone, setPhone] = useState('')
  const [children, setChildren] = useState<RegistrationChild[]>([{ ...EMPTY_CHILD }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateChild(index: number, field: keyof RegistrationChild, value: string) {
    setChildren(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
  }

  function addChild() { setChildren(prev => [...prev, { ...EMPTY_CHILD }]) }
  function removeChild(index: number) { setChildren(prev => prev.filter((_, i) => i !== index)) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setSaving(true)
    const validChildren = children.filter(c => c.firstName.trim() && c.lastName.trim())
    if (validChildren.length === 0) { setError('Please add at least one child.'); setSaving(false); return }
    try {
      await setDoc(doc(db, 'registrations', user.uid), {
        parentName: parentName.trim(),
        email: user.email,
        phone: phone.trim(),
        children: validChildren,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      })
      onSubmitted()
    } catch {
      setError('Failed to submit. Please try again.')
    } finally { setSaving(false) }
  }

  return (
    <div className="w-full max-w-lg">
      <div className="text-center mb-8">
        <img src="/logo.png" alt="AIM Academy" className="w-14 h-14 rounded-2xl shadow-md object-contain bg-white p-1 mx-auto mb-4" />
        <h1 className="font-kids text-3xl text-wood-dark">Family Information</h1>
        <p className="text-stone-500 text-sm mt-1 font-quick">Tell us about your family to complete registration.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Parent info */}
        <div className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-6 space-y-4">
          <h2 className="font-kids text-xl text-wood-dark">Parent / Guardian</h2>
          <div>
            <label className="block text-sm font-semibold text-stone-700 font-quick mb-2">Full Name</label>
            <input value={parentName} onChange={e => setParentName(e.target.value)} required
              placeholder="e.g. Sister Khadija Ali"
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 font-quick mb-2">Phone Number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
              placeholder="e.g. (703) 555-1234"
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 font-quick mb-2">Email</label>
            <input value={user.email ?? ''} disabled
              className="w-full rounded-2xl border border-stone-200 bg-stone-100 px-4 py-3 text-stone-400 text-sm cursor-not-allowed" />
          </div>
        </div>

        {/* Children */}
        <div className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-6 space-y-5">
          <h2 className="font-kids text-xl text-wood-dark">Children</h2>
          {children.map((child, i) => (
            <div key={i} className="border border-stone-100 rounded-2xl p-4 space-y-3 relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-quick text-stone-400 uppercase tracking-wider">Child {i + 1}</span>
                {children.length > 1 && (
                  <button type="button" onClick={() => removeChild(i)}
                    className="text-xs font-quick text-stone-400 hover:text-rose-500 transition cursor-pointer">
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 font-quick mb-1">First Name</label>
                  <input value={child.firstName} onChange={e => updateChild(i, 'firstName', e.target.value)} required
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 font-quick mb-1">Last Name</label>
                  <input value={child.lastName} onChange={e => updateChild(i, 'lastName', e.target.value)} required
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 font-quick mb-1">Date of Birth <span className="text-stone-300">(optional)</span></label>
                  <input type="date" value={child.dateOfBirth} onChange={e => updateChild(i, 'dateOfBirth', e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 font-quick mb-1">Grade / Level <span className="text-stone-300">(optional)</span></label>
                  <select value={child.grade} onChange={e => updateChild(i, 'grade', e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm">
                    <option value="">Select…</option>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addChild}
            className="w-full border-2 border-dashed border-stone-200 text-stone-400 hover:border-sage-300 hover:text-sage-600 font-quick font-semibold py-3 rounded-2xl transition text-sm">
            + Add Another Child
          </button>
        </div>

        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{error}</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-wood text-white font-bold font-quick py-4 rounded-full shadow-md hover:brightness-95 transition disabled:opacity-60 text-sm">
          {saving ? 'Submitting…' : 'Submit Registration'}
        </button>
      </form>
    </div>
  )
}

// ── Status Screens ────────────────────────────────────────────────────────────

function PendingScreen({ reg }: { reg: Registration }) {
  return (
    <div className="w-full max-w-sm text-center">
      <div className="text-5xl mb-4">⏳</div>
      <h1 className="font-kids text-3xl text-wood-dark mb-3">Registration Submitted</h1>
      <p className="text-stone-500 text-sm font-quick leading-relaxed mb-6">
        Thank you, <strong>{reg.parentName}</strong>! Your registration is under review.
        We'll send you an email once it's been approved.
      </p>
      <div className="bg-white rounded-[28px] border border-stone-200/70 p-5 text-left space-y-2 mb-6">
        <p className="text-xs font-bold font-quick text-stone-400 uppercase tracking-wider mb-3">Your children</p>
        {reg.children.map((c, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-xs font-bold text-sage-700 font-quick">
              {c.firstName[0]}{c.lastName[0]}
            </div>
            <div>
              <div className="font-semibold text-stone-700 font-quick text-sm">{c.firstName} {c.lastName}</div>
              {c.grade && <div className="text-xs text-stone-400 font-quick">{c.grade}</div>}
            </div>
          </div>
        ))}
      </div>
      <a href="/" className="font-quick text-sm font-semibold text-stone-400 hover:text-sage-700 transition">← Back to home</a>
    </div>
  )
}

function RejectedScreen({ reg }: { reg: Registration }) {
  return (
    <div className="w-full max-w-sm text-center">
      <div className="text-5xl mb-4">📋</div>
      <h1 className="font-kids text-3xl text-wood-dark mb-3">Registration Update</h1>
      <p className="text-stone-500 text-sm font-quick leading-relaxed mb-4">
        We were unable to approve your registration at this time.
      </p>
      {reg.rejectReason && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4 mb-6 text-left">
          <p className="text-xs font-bold font-quick text-rose-400 uppercase tracking-wider mb-1">Reason</p>
          <p className="text-rose-700 text-sm font-quick">{reg.rejectReason}</p>
        </div>
      )}
      <a href="/contact" className="inline-block bg-wood text-white font-bold font-quick px-6 py-3 rounded-full shadow-md hover:brightness-95 transition text-sm mb-4">
        Contact Us
      </a>
      <div className="mt-2">
        <a href="/" className="font-quick text-sm font-semibold text-stone-400 hover:text-sage-700 transition">← Back to home</a>
      </div>
    </div>
  )
}

// ── Register Root ─────────────────────────────────────────────────────────────

export default function Register() {
  const [user, setUser] = useState<User | null>(null)
  const [step, setStep] = useState<Step>('loading')
  const [registration, setRegistration] = useState<Registration | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      setUser(u)
      if (!u) { setStep('auth'); return }

      const token = await u.getIdTokenResult()
      const role = token.claims['role'] as string | undefined

      // Already a parent — send to portal
      if (role === 'parent') { window.location.href = '/portal/parent'; return }

      // Admin/teacher — they don't need to register
      if (role === 'admin' || role === 'teacher') { window.location.href = '/admin'; return }

      // No role — check for existing registration
      const regDoc = await getDoc(doc(db, 'registrations', u.uid))
      if (regDoc.exists()) {
        const reg = { id: regDoc.id, ...regDoc.data() } as Registration
        setRegistration(reg)
        if (reg.status === 'approved') {
          // Role should be set — force token refresh and redirect
          await u.getIdToken(true)
          window.location.href = '/portal/parent'
        } else if (reg.status === 'rejected') {
          setStep('rejected')
        } else {
          setStep('pending')
        }
      } else {
        setStep('family-info')
      }
    })
  }, [])

  if (step === 'loading') {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-cream antialiased min-h-screen flex flex-col font-body">
      <header className="sticky top-0 z-30 bg-cream/90 backdrop-blur border-b border-stone-200/60 px-6 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="AIM Academy" className="w-8 h-8 rounded-xl object-contain bg-white p-0.5 shadow-sm" />
          <span className="font-kids text-lg text-wood-dark leading-none">AIM Academy</span>
        </a>
        <a href="/" className="text-sm text-stone-500 hover:text-wood-dark transition font-quick flex items-center gap-1">
          <span>←</span> Back to home
        </a>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        {step === 'auth' && <AuthStep onDone={() => setStep('family-info')} />}
        {step === 'family-info' && user && (
          <FamilyInfoStep user={user} onSubmitted={() => setStep('pending')} />
        )}
        {step === 'pending' && registration && <PendingScreen reg={registration} />}
        {step === 'rejected' && registration && <RejectedScreen reg={registration} />}
      </div>
    </div>
  )
}
