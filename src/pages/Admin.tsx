import { useState, useEffect } from 'react'
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged, type User,
} from 'firebase/auth'
import {
  collection, doc, getDocs, setDoc, deleteDoc,
  orderBy, query,
} from 'firebase/firestore'
import { auth, db } from '../firebase'
import type { AcademyEvent, EventPricing } from '../types/event'

// ── Helpers ─────────────────────────────────────────────────────────────────

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const EMPTY: Omit<AcademyEvent, 'id' | 'createdAt'> = {
  slug: '', title: '', description: '',
  date: '', time: '', location: '',
  price: '', ages: 'Ages 5+', isDropOff: true,
  status: 'upcoming', flyerImageUrl: '', registrationUrl: '',
  pricing: { oneChild: 0, twoChildren: 0, threeChildren: 0 },
  activities: [''], included: [''], allergyInfo: [''],
  faq: [{ q: '', a: '' }],
  published: false,
}

function dollars(cents: number) {
  return cents > 0 ? (cents / 100).toFixed(2) : ''
}

function toCents(val: string) {
  const n = parseFloat(val.replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : Math.round(n * 100)
}

// ── Login ────────────────────────────────────────────────────────────────────

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-cream min-h-screen flex items-center justify-center px-6 font-body">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="AIM Academy" className="w-14 h-14 rounded-2xl shadow-md object-contain bg-white p-1 mx-auto mb-4" />
          <h1 className="font-kids text-3xl text-wood-dark">Admin Login</h1>
          <p className="text-stone-500 text-sm mt-1 font-quick">Anas Ibn Malik Academy</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-8 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-stone-700 font-quick mb-2">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 font-quick mb-2">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition" />
          </div>
          {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-wood text-white font-bold font-quick py-3.5 rounded-full shadow-md hover:brightness-95 transition disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Dynamic list helpers ─────────────────────────────────────────────────────

function StringList({ label, items, onChange }: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-stone-700 font-quick mb-2">{label}</label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input value={item} onChange={e => { const n = [...items]; n[i] = e.target.value; onChange(n) }}
              className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400" />
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="text-stone-400 hover:text-rose-500 transition px-2">✕</button>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...items, ''])}
          className="text-sm text-sage-700 font-quick font-semibold hover:underline">+ Add item</button>
      </div>
    </div>
  )
}

function FaqList({ items, onChange }: {
  items: Array<{ q: string; a: string }>
  onChange: (items: Array<{ q: string; a: string }>) => void
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-stone-700 font-quick mb-2">FAQ</label>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2">
            <div className="flex gap-2 items-start">
              <div className="flex-1 space-y-2">
                <input placeholder="Question" value={item.q}
                  onChange={e => { const n = [...items]; n[i] = { ...n[i], q: e.target.value }; onChange(n) }}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400" />
                <textarea placeholder="Answer" value={item.a} rows={2}
                  onChange={e => { const n = [...items]; n[i] = { ...n[i], a: e.target.value }; onChange(n) }}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 resize-none" />
              </div>
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="text-stone-400 hover:text-rose-500 transition mt-1">✕</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...items, { q: '', a: '' }])}
          className="text-sm text-sage-700 font-quick font-semibold hover:underline">+ Add question</button>
      </div>
    </div>
  )
}

// ── Event Form ───────────────────────────────────────────────────────────────

function EventForm({
  initial, onSave, onCancel,
}: {
  initial: Partial<AcademyEvent>
  onSave: (data: Omit<AcademyEvent, 'id'>) => Promise<void>
  onCancel: () => void
}) {
  const isNew = !initial.id
  const [form, setForm] = useState<Omit<AcademyEvent, 'id'>>({
    ...EMPTY,
    createdAt: new Date().toISOString(),
    ...initial,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slugManual, setSlugManual] = useState(!isNew)

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleTitleChange(title: string) {
    set('title', title)
    if (!slugManual) set('slug', slugify(title))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.slug) { setError('Slug is required.'); return }
    if (!form.title) { setError('Title is required.'); return }
    setSaving(true)
    setError(null)
    try {
      const clean = {
        ...form,
        activities: form.activities.filter(Boolean),
        included: form.included.filter(Boolean),
        allergyInfo: form.allergyInfo.filter(Boolean),
        faq: form.faq.filter(f => f.q || f.a),
      }
      await onSave(clean)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition'
  const labelCls = 'block text-sm font-semibold text-stone-700 font-quick mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Basic info */}
      <section className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-6 space-y-5">
        <h3 className="font-kids text-xl text-wood-dark">Basic Info</h3>

        <div>
          <label className={labelCls}>Title <span className="text-rose-500">*</span></label>
          <input value={form.title} onChange={e => handleTitleChange(e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>
            Slug <span className="text-rose-500">*</span>
            <span className="text-stone-400 font-normal ml-1">(used in URL: /events/your-slug)</span>
          </label>
          <input value={form.slug}
            onChange={e => { setSlugManual(true); set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')) }}
            className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
            className={inputCls + ' resize-none'} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value as AcademyEvent['status'])}
              className={inputCls}>
              <option value="upcoming">Upcoming</option>
              <option value="sold-out">Sold Out</option>
              <option value="past">Past</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-7">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={form.published} onChange={e => set('published', e.target.checked)} className="sr-only peer" />
              <div className="w-10 h-6 bg-stone-200 peer-checked:bg-sage-600 rounded-full transition peer-focus:ring-2 peer-focus:ring-sage-400" />
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4 shadow-sm" />
            </label>
            <span className="text-sm font-semibold font-quick text-stone-700">
              {form.published ? 'Published' : 'Draft'}
            </span>
          </div>
        </div>

        <div>
          <label className={labelCls}>Flyer Image URL</label>
          <input value={form.flyerImageUrl} onChange={e => set('flyerImageUrl', e.target.value)}
            placeholder="https://..." className={inputCls} />
          {form.flyerImageUrl && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-stone-200 max-h-48 w-auto inline-block">
              <img src={form.flyerImageUrl} alt="Preview" className="max-h-48 object-contain" />
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>Registration URL <span className="text-stone-400 font-normal">(for upcoming events)</span></label>
          <input value={form.registrationUrl} onChange={e => set('registrationUrl', e.target.value)}
            placeholder="https://forms.gle/..." className={inputCls} />
        </div>
      </section>

      {/* Event details */}
      <section className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-6 space-y-5">
        <h3 className="font-kids text-xl text-wood-dark">Event Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Date</label>
            <input value={form.date} onChange={e => set('date', e.target.value)}
              placeholder="Friday, July 17, 2026" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Time</label>
            <input value={form.time} onChange={e => set('time', e.target.value)}
              placeholder="4:30 – 7:30 PM" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Price</label>
            <input value={form.price} onChange={e => set('price', e.target.value)}
              placeholder="$24.99" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ages</label>
            <input value={form.ages} onChange={e => set('ages', e.target.value)}
              placeholder="Ages 5+" className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Location</label>
          <input value={form.location} onChange={e => set('location', e.target.value)}
            placeholder="14325 Willard Rd Unit D, Chantilly, VA 20151" className={inputCls} />
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.isDropOff} onChange={e => set('isDropOff', e.target.checked)}
            className="w-4 h-4 accent-sage-600" />
          <span className="text-sm font-semibold text-stone-700 font-quick">Drop-off event</span>
        </label>
      </section>

      {/* Pricing */}
      <section className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-6 space-y-5">
        <div>
          <h3 className="font-kids text-xl text-wood-dark">Pricing</h3>
          <p className="text-sm text-stone-400 font-quick mt-1">Set per-child pricing. Leave at $0 to hide the payment section.</p>
        </div>
        {(
          [
            ['oneChild',     '1 Child'],
            ['twoChildren',  '2 Children'],
            ['threeChildren','3 Children'],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="flex items-center gap-4">
            <label className="w-32 text-sm font-semibold text-stone-700 font-quick">{label}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
              <input
                type="number" min="0" step="0.01"
                value={dollars(form.pricing?.[key] ?? 0)}
                onChange={e => set('pricing', { ...form.pricing, [key]: toCents(e.target.value) } as EventPricing)}
                placeholder="0.00"
                className="pl-7 pr-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
          </div>
        ))}
      </section>

      {/* Activities */}
      <section className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-6">
        <h3 className="font-kids text-xl text-wood-dark mb-4">Activities</h3>
        <StringList label="Your child will enjoy" items={form.activities}
          onChange={v => set('activities', v)} />
      </section>

      {/* Included + Allergy */}
      <section className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-6 space-y-6">
        <h3 className="font-kids text-xl text-wood-dark">Included & Allergy</h3>
        <StringList label="What's included" items={form.included}
          onChange={v => set('included', v)} />
        <StringList label="Allergy info (ingredients that may be present)" items={form.allergyInfo}
          onChange={v => set('allergyInfo', v)} />
      </section>

      {/* FAQ */}
      <section className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-6">
        <h3 className="font-kids text-xl text-wood-dark mb-4">FAQ</h3>
        <FaqList items={form.faq} onChange={v => set('faq', v)} />
      </section>

      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="flex-1 bg-wood text-white font-bold font-quick py-3.5 rounded-full shadow-md hover:brightness-95 transition disabled:opacity-60">
          {saving ? 'Saving…' : (isNew ? 'Create Event' : 'Save Changes')}
        </button>
        <button type="button" onClick={onCancel}
          className="px-6 py-3.5 rounded-full border border-stone-200 text-stone-600 font-quick font-semibold hover:bg-stone-50 transition">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Event List ───────────────────────────────────────────────────────────────

function EventList({
  events, onNew, onEdit, onDelete, onTogglePublish,
}: {
  events: AcademyEvent[]
  onNew: () => void
  onEdit: (event: AcademyEvent) => void
  onDelete: (event: AcademyEvent) => void
  onTogglePublish: (event: AcademyEvent) => void
}) {
  const statusColors: Record<string, string> = {
    upcoming: 'bg-sage-100 text-sage-700',
    'sold-out': 'bg-orange-100 text-orange-700',
    past: 'bg-stone-100 text-stone-500',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-kids text-2xl text-wood-dark">Events</h2>
        <button onClick={onNew}
          className="bg-wood text-white font-bold font-quick px-5 py-2.5 rounded-full shadow-md hover:brightness-95 transition text-sm">
          + New Event
        </button>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-12 text-center">
          <div className="text-4xl mb-3">🌿</div>
          <p className="font-kids text-xl text-stone-400">No events yet</p>
          <p className="text-stone-400 text-sm mt-1 font-quick">Click "New Event" to create your first event.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(event => (
            <div key={event.id} className="bg-white rounded-[20px] border border-stone-200/70 shadow-sm p-5 flex items-center gap-4">
              {event.flyerImageUrl && (
                <img src={event.flyerImageUrl} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-stone-100" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-kids text-lg text-wood-dark truncate">{event.title}</span>
                  <span className={`text-xs font-semibold font-quick px-2.5 py-0.5 rounded-full ${statusColors[event.status]}`}>
                    {event.status}
                  </span>
                </div>
                <div className="text-xs text-stone-400 font-quick mt-0.5">/events/{event.slug}</div>
                {event.date && <div className="text-sm text-stone-500 mt-0.5">{event.date}</div>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <label className="relative inline-flex items-center cursor-pointer" title={event.published ? 'Published' : 'Draft'}>
                  <input type="checkbox" checked={event.published} onChange={() => onTogglePublish(event)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-stone-200 peer-checked:bg-sage-600 rounded-full transition" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4 shadow-sm" />
                </label>
                <button onClick={() => onEdit(event)}
                  className="text-xs font-quick font-semibold text-stone-600 hover:text-sage-700 transition px-3 py-1.5 rounded-xl hover:bg-stone-50">
                  Edit
                </button>
                <button onClick={() => onDelete(event)}
                  className="text-xs font-quick font-semibold text-stone-400 hover:text-rose-600 transition px-3 py-1.5 rounded-xl hover:bg-rose-50">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Admin Root ───────────────────────────────────────────────────────────────

export default function Admin() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [events, setEvents] = useState<AcademyEvent[]>([])
  const [editing, setEditing] = useState<Partial<AcademyEvent> | null>(null)
  const [deleting, setDeleting] = useState<AcademyEvent | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false) })
  }, [])

  useEffect(() => {
    if (!user) return
    loadEvents()
  }, [user])

  async function loadEvents() {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as AcademyEvent)))
  }

  async function handleSave(data: Omit<AcademyEvent, 'id'>) {
    await setDoc(doc(db, 'events', data.slug), data)
    await loadEvents()
    setEditing(null)
  }

  async function handleDelete(event: AcademyEvent) {
    await deleteDoc(doc(db, 'events', event.slug))
    await loadEvents()
    setDeleting(null)
  }

  async function handleTogglePublish(event: AcademyEvent) {
    await setDoc(doc(db, 'events', event.slug), { ...event, published: !event.published })
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, published: !e.published } : e))
  }

  if (authLoading) {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <LoginForm />

  return (
    <div className="bg-cream min-h-screen font-body">
      {/* Admin header */}
      <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur border-b border-stone-200/70">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shadow-sm" />
            <span className="font-kids text-lg text-wood-dark">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="text-sm font-quick font-semibold text-stone-500 hover:text-sage-700 transition">View Site</a>
            <button onClick={() => signOut(auth)}
              className="text-sm font-quick font-semibold text-stone-500 hover:text-rose-600 transition">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {editing ? (
          <div>
            <button onClick={() => setEditing(null)}
              className="text-sm font-quick font-semibold text-stone-500 hover:text-sage-700 transition mb-6 flex items-center gap-1">
              ← Back to events
            </button>
            <h2 className="font-kids text-3xl text-wood-dark mb-8">
              {editing.id ? 'Edit Event' : 'New Event'}
            </h2>
            <EventForm initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />
          </div>
        ) : (
          <EventList
            events={events}
            onNew={() => setEditing({})}
            onEdit={setEditing}
            onDelete={setDeleting}
            onTogglePublish={handleTogglePublish}
          />
        )}
      </main>

      {/* Delete confirmation modal */}
      {deleting && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-[28px] shadow-2xl border border-stone-200 p-8 max-w-sm w-full text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="font-kids text-2xl text-wood-dark mb-2">Delete event?</h3>
            <p className="text-stone-500 text-sm mb-6">
              "<strong>{deleting.title}</strong>" will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleting)}
                className="flex-1 bg-rose-600 text-white font-bold font-quick py-3 rounded-full hover:brightness-95 transition">
                Delete
              </button>
              <button onClick={() => setDeleting(null)}
                className="flex-1 border border-stone-200 text-stone-600 font-quick font-semibold py-3 rounded-full hover:bg-stone-50 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
