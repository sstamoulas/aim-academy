import { useState, useEffect, useRef } from 'react'
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged, type User,
} from 'firebase/auth'
import {
  collection, doc, getDocs, setDoc, deleteDoc, orderBy, query, where,
} from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { httpsCallable } from 'firebase/functions'
import { auth, db, storage, functions } from '../firebase'
import type { AcademyEvent, EventDetail, EventSection, SectionType, PricingTier, PricingModel } from '../types/event'
import { PRICING_MODEL_LABELS } from '../types/event'
import type { AcademyClass, Student } from '../types/portal'

// ── User management types ─────────────────────────────────────────────────────

type UserRole = 'admin' | 'teacher' | 'parent'

interface UserRecord {
  uid: string
  email: string
  displayName: string
  role: UserRole
  createdAt: string
  invitedBy: string | null
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  teacher: 'Teacher',
  parent: 'Parent',
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-amber-100 text-amber-700 border-amber-200',
  teacher: 'bg-sage-100 text-sage-700 border-sage-200',
  parent: 'bg-sky-100 text-sky-700 border-sky-200',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }

function slugify(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}


const DEFAULT_DETAILS: EventDetail[] = [
  { id: uid(), icon: '📅', label: 'Date', value: '' },
  { id: uid(), icon: '🕟', label: 'Time', value: '' },
  { id: uid(), icon: '📍', label: 'Location', value: '' },
  { id: uid(), icon: '👧', label: 'Ages', value: '' },
  { id: uid(), icon: '💲', label: 'Price', value: '' },
]

const DEFAULT_PRICING: PricingTier[] = [
  { id: uid(), label: '1 Child', sublabel: 'Per child rate', amount: 0 },
  { id: uid(), label: '2 Children', sublabel: 'Best for siblings', amount: 0 },
  { id: uid(), label: '3 Children', sublabel: 'Family discount', amount: 0 },
]

const EMPTY: Omit<AcademyEvent, 'id' | 'createdAt'> = {
  slug: '', title: '', description: '',
  status: 'upcoming', flyerImageUrl: '', registrationUrl: '',
  pricing: DEFAULT_PRICING.map(t => ({ ...t, id: uid() })),
  details: DEFAULT_DETAILS,
  sections: [],
  published: false,
}

// ── Login ─────────────────────────────────────────────────────────────────────

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    try { await signInWithEmailAndPassword(auth, email, password) }
    catch { setError('Invalid email or password.') }
    finally { setLoading(false) }
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
  )
}

// ── Image Uploader ────────────────────────────────────────────────────────────

function ImageUploader({ value, slug, onChange }: {
  value: string
  slug: string
  onChange: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    if (!slug) { alert('Set a slug first before uploading an image.'); return }
    setUploading(true)
    const storageRef = ref(storage, `events/${slug}/flyer_${Date.now()}`)
    const task = uploadBytesResumable(storageRef, file)
    task.on('state_changed',
      snap => setProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      err => { console.error(err); setUploading(false) },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        onChange(url); setUploading(false); setProgress(0)
      }
    )
  }

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => fileRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-sage-500 bg-sage-50' : 'border-stone-200 hover:border-sage-300 hover:bg-stone-50'
        }`}
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {uploading ? (
          <div className="space-y-2">
            <div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-stone-500 font-quick">Uploading… {progress}%</p>
            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-sage-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <>
            <div className="text-3xl mb-2">🖼️</div>
            <p className="text-sm font-semibold text-stone-600 font-quick">Drop an image or click to upload</p>
            <p className="text-xs text-stone-400 mt-1">PNG, JPG, WEBP</p>
          </>
        )}
      </div>

      {/* URL fallback */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-stone-200" />
        <span className="text-xs text-stone-400 font-quick">or paste a URL</span>
        <div className="flex-1 h-px bg-stone-200" />
      </div>
      <input value={value} onChange={e => onChange(e.target.value)}
        placeholder="https://…"
        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400" />

      {/* Preview */}
      {value && (
        <div className="relative group">
          <img src={value} alt="Preview" className="w-full max-h-64 object-contain rounded-2xl border border-stone-200 bg-stone-50" />
          <button type="button" onClick={() => onChange('')}
            className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-full w-7 h-7 flex items-center justify-center text-stone-500 hover:text-rose-600 shadow transition opacity-0 group-hover:opacity-100">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// ── Dynamic Details ───────────────────────────────────────────────────────────

function DetailsList({ items, onChange }: {
  items: EventDetail[]
  onChange: (items: EventDetail[]) => void
}) {
  function update(id: string, field: keyof EventDetail, val: string) {
    onChange(items.map(d => d.id === id ? { ...d, [field]: val } : d))
  }

  return (
    <div className="space-y-2">
      {items.map((d, i) => (
        <div key={d.id} className="flex items-center gap-2">
          <input value={d.icon} onChange={e => update(d.id, 'icon', e.target.value)}
            placeholder="📅" maxLength={4}
            className="w-12 text-center rounded-xl border border-stone-200 bg-stone-50 px-2 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-sage-400" />
          <input value={d.label} onChange={e => update(d.id, 'label', e.target.value)}
            placeholder="Label"
            className="w-28 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400" />
          <input value={d.value} onChange={e => update(d.id, 'value', e.target.value)}
            placeholder="Value"
            className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400" />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="text-stone-300 hover:text-rose-500 transition px-1.5 text-lg">✕</button>
        </div>
      ))}
      <button type="button"
        onClick={() => onChange([...items, { id: uid(), icon: '📌', label: '', value: '' }])}
        className="text-sm text-sage-700 font-quick font-semibold hover:underline mt-1">
        + Add detail
      </button>
    </div>
  )
}

// ── Section Editors ───────────────────────────────────────────────────────────

function ListSectionEditor({ section, onChange }: { section: EventSection; onChange: (s: EventSection) => void }) {
  const items = section.items ?? ['']
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input value={item} onChange={e => { const n = [...items]; n[i] = e.target.value; onChange({ ...section, items: n }) }}
            className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400" />
          <button type="button" onClick={() => onChange({ ...section, items: items.filter((_, j) => j !== i) })}
            className="text-stone-300 hover:text-rose-500 transition px-1">✕</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange({ ...section, items: [...items, ''] })}
        className="text-sm text-sage-700 font-quick font-semibold hover:underline">+ Add item</button>
    </div>
  )
}

function FaqSectionEditor({ section, onChange }: { section: EventSection; onChange: (s: EventSection) => void }) {
  const faqs = section.faqs ?? [{ q: '', a: '' }]
  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => (
        <div key={i} className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2">
          <div className="flex gap-2 items-start">
            <div className="flex-1 space-y-2">
              <input placeholder="Question" value={faq.q}
                onChange={e => { const n = [...faqs]; n[i] = { ...n[i], q: e.target.value }; onChange({ ...section, faqs: n }) }}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400" />
              <textarea placeholder="Answer" value={faq.a} rows={2}
                onChange={e => { const n = [...faqs]; n[i] = { ...n[i], a: e.target.value }; onChange({ ...section, faqs: n }) }}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sage-400" />
            </div>
            <button type="button" onClick={() => onChange({ ...section, faqs: faqs.filter((_, j) => j !== i) })}
              className="text-stone-300 hover:text-rose-500 transition mt-1">✕</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange({ ...section, faqs: [...faqs, { q: '', a: '' }] })}
        className="text-sm text-sage-700 font-quick font-semibold hover:underline">+ Add question</button>
    </div>
  )
}

function TextSectionEditor({ section, onChange }: { section: EventSection; onChange: (s: EventSection) => void }) {
  return (
    <textarea value={section.body ?? ''} rows={4}
      onChange={e => onChange({ ...section, body: e.target.value })}
      placeholder="Write your content here…"
      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 resize-none focus:outline-none focus:ring-2 focus:ring-sage-400" />
  )
}

// ── Pricing List ──────────────────────────────────────────────────────────────

function PricingTierRow({ tier, onUpdate, onRemove }: {
  tier: PricingTier
  onUpdate: (patch: Partial<PricingTier>) => void
  onRemove: () => void
}) {
  const [priceStr, setPriceStr] = useState(tier.amount > 0 ? (tier.amount / 100).toFixed(2) : '')

  function commitPrice(val: string) {
    const n = parseFloat(val.replace(/[^0-9.]/g, ''))
    onUpdate({ amount: isNaN(n) ? 0 : Math.round(n * 100) })
  }

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 grid grid-cols-2 gap-2">
          <input
            value={tier.label}
            onChange={e => onUpdate({ label: e.target.value })}
            placeholder="Label (e.g. 1 Child)"
            className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400"
          />
          <input
            value={tier.sublabel ?? ''}
            onChange={e => onUpdate({ sublabel: e.target.value })}
            placeholder="Sublabel (optional)"
            className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-500 focus:outline-none focus:ring-2 focus:ring-sage-400"
          />
        </div>
        <div className="relative flex-shrink-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
          <input
            type="text"
            inputMode="decimal"
            value={priceStr}
            onChange={e => setPriceStr(e.target.value)}
            onBlur={e => {
              const formatted = parseFloat(e.target.value.replace(/[^0-9.]/g, ''))
              const display = isNaN(formatted) ? '' : formatted.toFixed(2)
              setPriceStr(display)
              commitPrice(e.target.value)
            }}
            placeholder="0.00"
            className="pl-7 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-sage-400"
          />
        </div>
        <button type="button" onClick={onRemove}
          className="text-stone-300 hover:text-rose-500 transition px-1.5 text-lg flex-shrink-0">✕</button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-stone-400 font-quick">Pricing model:</span>
        {(Object.entries(PRICING_MODEL_LABELS) as [PricingModel, string][]).map(([key, label]) => {
          const active = tier.model === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onUpdate({ model: active ? undefined : key })}
              className={`text-xs font-quick font-semibold px-3 py-1 rounded-full border transition ${
                active
                  ? 'bg-sage-600 text-white border-sage-600'
                  : 'bg-white text-stone-500 border-stone-200 hover:border-sage-400 hover:text-sage-700'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PricingList({ tiers, onChange }: {
  tiers: PricingTier[]
  onChange: (tiers: PricingTier[]) => void
}) {
  function update(id: string, patch: Partial<PricingTier>) {
    onChange(tiers.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  return (
    <div className="space-y-3">
      {tiers.map((tier, i) => (
        <PricingTierRow
          key={tier.id}
          tier={tier}
          onUpdate={patch => update(tier.id, patch)}
          onRemove={() => onChange(tiers.filter((_, j) => j !== i))}
        />
      ))}
      <button type="button"
        onClick={() => onChange([...tiers, { id: uid(), label: '', sublabel: '', amount: 0 }])}
        className="text-sm text-sage-700 font-quick font-semibold hover:underline mt-1">
        + Add tier
      </button>
    </div>
  )
}

// ── Sections List ─────────────────────────────────────────────────────────────

const SECTION_ICONS: Record<SectionType, string> = { list: '📋', faq: '❓', text: '📝' }
const SECTION_LABELS: Record<SectionType, string> = { list: 'List', faq: 'FAQ', text: 'Text' }

function SectionsList({ sections, onChange }: {
  sections: EventSection[]
  onChange: (sections: EventSection[]) => void
}) {
  function update(id: string, updated: EventSection) {
    onChange(sections.map(s => s.id === id ? updated : s))
  }
  function remove(id: string) { onChange(sections.filter(s => s.id !== id)) }
  function addSection(type: SectionType) {
    const base = { id: uid(), type, title: '' }
    const defaults: Partial<EventSection> =
      type === 'list' ? { items: [''] } :
      type === 'faq'  ? { faqs: [{ q: '', a: '' }] } :
      { body: '' }
    onChange([...sections, { ...base, ...defaults }])
  }
  function move(i: number, dir: -1 | 1) {
    const n = [...sections]
    const j = i + dir
    if (j < 0 || j >= n.length) return
    ;[n[i], n[j]] = [n[j], n[i]]
    onChange(n)
  }

  return (
    <div className="space-y-4">
      {sections.map((section, i) => (
        <div key={section.id} className="bg-white rounded-[20px] border border-stone-200/70 shadow-sm overflow-hidden">
          {/* Section header */}
          <div className="flex items-center gap-3 px-5 py-3 bg-stone-50 border-b border-stone-100">
            <span className="text-base">{SECTION_ICONS[section.type]}</span>
            <span className="text-xs font-bold uppercase tracking-widest text-stone-400 font-quick">{SECTION_LABELS[section.type]}</span>
            <input value={section.title} onChange={e => update(section.id, { ...section, title: e.target.value })}
              placeholder="Section title…"
              className="flex-1 bg-transparent text-sm font-semibold text-stone-700 placeholder-stone-300 outline-none border-b border-transparent focus:border-sage-400 pb-0.5 transition" />
            <div className="flex items-center gap-1 ml-auto">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                className="text-stone-300 hover:text-stone-600 transition disabled:opacity-30 px-1">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === sections.length - 1}
                className="text-stone-300 hover:text-stone-600 transition disabled:opacity-30 px-1">↓</button>
              <button type="button" onClick={() => remove(section.id)}
                className="text-stone-300 hover:text-rose-500 transition px-1 ml-1">✕</button>
            </div>
          </div>
          {/* Section content */}
          <div className="p-5">
            {section.type === 'list' && <ListSectionEditor section={section} onChange={s => update(section.id, s)} />}
            {section.type === 'faq'  && <FaqSectionEditor  section={section} onChange={s => update(section.id, s)} />}
            {section.type === 'text' && <TextSectionEditor section={section} onChange={s => update(section.id, s)} />}
          </div>
        </div>
      ))}

      {/* Add section buttons */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-widest text-stone-400 font-quick self-center mr-1">Add section:</span>
        {(['list', 'faq', 'text'] as SectionType[]).map(type => (
          <button key={type} type="button" onClick={() => addSection(type)}
            className="flex items-center gap-1.5 text-sm font-quick font-semibold text-stone-600 bg-white border border-stone-200 hover:border-sage-400 hover:text-sage-700 px-4 py-2 rounded-full transition shadow-sm">
            {SECTION_ICONS[type]} {SECTION_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Event Form ────────────────────────────────────────────────────────────────

function EventForm({ initial, onSave, onCancel }: {
  initial: Partial<AcademyEvent>
  onSave: (data: Omit<AcademyEvent, 'id'>) => Promise<void>
  onCancel: () => void
}) {
  const isNew = !initial.id
  const [form, setForm] = useState<Omit<AcademyEvent, 'id'>>({
    ...EMPTY,
    createdAt: new Date().toISOString(),
    ...initial,
    pricing: initial.pricing ?? DEFAULT_PRICING.map(t => ({ ...t, id: uid() })),
    details: initial.details ?? DEFAULT_DETAILS.map(d => ({ ...d, id: uid() })),
    sections: initial.sections ?? [],
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
    setSaving(true); setError(null)
    try {
      await onSave({
        ...form,
        details: form.details.filter(d => d.label || d.value),
        sections: form.sections.map(s => ({
          ...s,
          items: s.items?.filter(Boolean),
          faqs: s.faqs?.filter(f => f.q || f.a),
        })),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 transition'
  const labelCls = 'block text-sm font-semibold text-stone-700 font-quick mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Basic info ── */}
      <section className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-6 space-y-5">
        <h3 className="font-kids text-xl text-wood-dark">Basic Info</h3>

        <div>
          <label className={labelCls}>Title <span className="text-rose-500">*</span></label>
          <input value={form.title} onChange={e => handleTitleChange(e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>
            Slug <span className="text-rose-500">*</span>
            <span className="text-stone-400 font-normal ml-1">— appears in URL: /events/<em>slug</em></span>
          </label>
          <input value={form.slug}
            onChange={e => { setSlugManual(true); set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')) }}
            className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Short Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
            className={inputCls + ' resize-none'} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              Event Status
              <span className="text-stone-400 font-normal ml-1">— shown as a badge on the event page</span>
            </label>
            <select value={form.status} onChange={e => set('status', e.target.value as AcademyEvent['status'])} className={inputCls}>
              <option value="upcoming">Upcoming — registration open</option>
              <option value="sold-out">Sold Out — registration closed</option>
              <option value="past">Past — event has occurred</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Visibility</label>
            <div
              onClick={() => set('published', !form.published)}
              className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                form.published
                  ? 'border-sage-500 bg-sage-50'
                  : 'border-stone-200 bg-stone-50 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-bold font-quick ${form.published ? 'text-sage-700' : 'text-stone-500'}`}>
                  {form.published ? '🟢 Live' : '⚪ Draft'}
                </span>
                <div className="relative">
                  <div className={`w-10 h-6 rounded-full transition-colors ${form.published ? 'bg-sage-600' : 'bg-stone-300'}`} />
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.published ? 'left-5' : 'left-1'}`} />
                </div>
              </div>
              <p className="text-xs text-stone-400 font-quick leading-snug">
                {form.published
                  ? 'Visible to the public and appears in the Events nav.'
                  : 'Only you can see this. Not shown on the site.'}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className={labelCls}>
            External Registration URL
            <span className="text-stone-400 font-normal ml-1">— optional</span>
          </label>
          <input value={form.registrationUrl} onChange={e => set('registrationUrl', e.target.value)}
            placeholder="https://forms.gle/… or any signup link"
            className={inputCls} />
          <p className="text-xs text-stone-400 font-quick mt-1">
            Use this instead of (or alongside) Stripe pricing — e.g. a Google Form, Jotform, or Eventbrite link. If set with no pricing, shows a "Register Now →" button. If set with pricing, shows as a secondary option below the payment button.
          </p>
        </div>

        {/* Registration closed toggle */}
        <div className={`rounded-2xl border-2 p-5 transition-all ${form.registrationClosed ? 'border-rose-300 bg-rose-50' : 'border-stone-200 bg-stone-50'}`}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-sm font-bold font-quick text-stone-700">Close Registration</p>
              <p className="text-xs text-stone-400 font-quick mt-0.5">
                Hides all registration options and shows a notice on the event page.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
              <div className="relative">
                <input type="checkbox" checked={!!form.registrationClosed}
                  onChange={e => set('registrationClosed', e.target.checked)} className="sr-only peer" />
                <div className="w-10 h-6 bg-stone-300 peer-checked:bg-rose-500 rounded-full transition peer-focus:ring-2 peer-focus:ring-rose-300" />
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4 shadow-sm" />
              </div>
              <span className={`text-xs font-bold font-quick ${form.registrationClosed ? 'text-rose-600' : 'text-stone-400'}`}>
                {form.registrationClosed ? 'Closed' : 'Open'}
              </span>
            </label>
          </div>
          {form.registrationClosed && (
            <div className="mt-4">
              <label className="block text-xs font-semibold text-stone-600 font-quick mb-1.5">
                Message shown to visitors
              </label>
              <textarea
                value={form.registrationClosedReason ?? 'We reached maximum capacity for this event. Jazak Allah khayran for the overwhelming interest and community support!'}
                onChange={e => set('registrationClosedReason', e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm text-stone-800 resize-none focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
          )}
        </div>
      </section>

      {/* ── Flyer image ── */}
      <section className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-6 space-y-4">
        <h3 className="font-kids text-xl text-wood-dark">Flyer / Banner Image</h3>
        <ImageUploader value={form.flyerImageUrl} slug={form.slug} onChange={url => set('flyerImageUrl', url)} />
      </section>

      {/* ── Pricing ── */}
      <section className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="font-kids text-xl text-wood-dark">Pricing</h3>
          <p className="text-sm text-stone-400 font-quick mt-1">Add any number of tiers. Tiers with $0 are hidden on the event page.</p>
        </div>
        <PricingList tiers={form.pricing ?? []} onChange={v => set('pricing', v)} />
      </section>

      {/* ── Event Details ── */}
      <section className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="font-kids text-xl text-wood-dark">Event Details</h3>
          <p className="text-sm text-stone-400 font-quick mt-1">Add, remove, or reorder any detail rows.</p>
        </div>
        <DetailsList items={form.details} onChange={v => set('details', v)} />
      </section>

      {/* ── Content Sections ── */}
      <section className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="font-kids text-xl text-wood-dark">Content Sections</h3>
          <p className="text-sm text-stone-400 font-quick mt-1">Build the event page with lists, FAQs, and text blocks — add as many as you need.</p>
        </div>
        <SectionsList sections={form.sections} onChange={v => set('sections', v)} />
      </section>

      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{error}</p>}

      <div className="flex gap-3 pb-10">
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

// ── Event List ────────────────────────────────────────────────────────────────

function EventList({ events, onNew, onEdit, onDelete, onTogglePublish }: {
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

      {events.length > 0 && (
        <div className="flex justify-end pr-1 mb-1">
          <span className="text-xs text-stone-400 font-quick">Toggle to make live or draft</span>
        </div>
      )}
      {events.length === 0 ? (
        <div className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-12 text-center">
          <div className="text-4xl mb-3">🌿</div>
          <p className="font-kids text-xl text-stone-400">No events yet</p>
          <p className="text-stone-400 text-sm mt-1 font-quick">Click "New Event" to get started.</p>
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
                  <button onClick={() => onEdit(event)} className="font-kids text-lg text-wood-dark truncate hover:text-sage-700 transition text-left cursor-pointer">{event.title}</button>
                  <span className={`text-xs font-semibold font-quick px-2.5 py-0.5 rounded-full ${statusColors[event.status]}`}>
                    {event.status}
                  </span>
                </div>
                <div className="text-xs text-stone-400 font-quick mt-0.5">/events/{event.slug}</div>
                {event.details.find(d => d.label === 'Date')?.value && (
                  <div className="text-sm text-stone-500 mt-0.5">
                    {event.details.find(d => d.label === 'Date')?.value}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" checked={event.published} onChange={() => onTogglePublish(event)} className="sr-only peer" />
                    <div className="w-9 h-5 bg-stone-200 peer-checked:bg-sage-600 rounded-full transition" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4 shadow-sm" />
                  </div>
                  <span className={`text-xs font-bold font-quick ${event.published ? 'text-sage-700' : 'text-stone-400'}`}>
                    {event.published ? 'Live' : 'Draft'}
                  </span>
                </label>
                <div className="w-px h-5 bg-stone-200" />
                <a href={`/events/${event.slug}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-quick font-semibold text-stone-600 hover:text-sage-700 transition px-3 py-1.5 rounded-xl hover:bg-stone-50">
                  View
                </a>
                <button onClick={() => onEdit(event)}
                  className="text-xs font-quick font-semibold text-stone-600 hover:text-sage-700 transition px-3 py-1.5 rounded-xl hover:bg-stone-50 cursor-pointer">
                  Edit
                </button>
                <button onClick={() => onDelete(event)}
                  className="text-xs font-quick font-semibold text-stone-400 hover:text-rose-600 transition px-3 py-1.5 rounded-xl hover:bg-rose-50 cursor-pointer">
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

// ── Users Tab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('teacher')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [changingRoleUid, setChangingRoleUid] = useState<string | null>(null)

  const inviteUserFn = httpsCallable(functions, 'inviteUser')
  const setUserRoleFn = httpsCallable(functions, 'setUserRole')

  async function loadUsers() {
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')))
    setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserRecord)))
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true); setInviteError(null)
    try {
      await inviteUserFn({ email: inviteEmail.trim(), role: inviteRole, displayName: inviteName.trim() })
      setInviteSuccess(true)
      setInviteEmail(''); setInviteName('')
      await loadUsers()
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite user.')
    } finally {
      setInviting(false)
    }
  }

  async function handleRoleChange(uid: string, role: UserRole) {
    setChangingRoleUid(uid)
    try {
      await setUserRoleFn({ uid, role })
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role } : u))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to change role.')
    } finally {
      setChangingRoleUid(null)
    }
  }

  function initials(u: UserRecord) {
    if (u.displayName) return u.displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    return u.email[0].toUpperCase()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-kids text-3xl text-wood-dark">Users</h2>
          <p className="text-stone-500 text-sm font-quick mt-1">
            Manage who can access the admin and portal areas.
          </p>
        </div>
        <button
          onClick={() => { setInviteOpen(true); setInviteSuccess(false); setInviteError(null) }}
          className="bg-wood text-white font-bold font-quick px-5 py-2.5 rounded-full shadow-md hover:brightness-95 transition text-sm"
        >
          + Invite User
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-[28px] border border-stone-200/70 p-10 text-center text-stone-400 font-quick">
          No users yet. Invite someone to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.uid} className="bg-white rounded-2xl border border-stone-200/70 px-5 py-4 flex items-center gap-4">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-sage-100 flex items-center justify-center font-bold text-sage-700 font-quick text-sm flex-shrink-0">
                {initials(u)}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-stone-800 font-quick text-sm truncate">
                  {u.displayName || <span className="text-stone-400 italic">No name</span>}
                </div>
                <div className="text-xs text-stone-400 font-quick truncate">{u.email}</div>
              </div>
              {/* Role badge / selector */}
              <div className="flex-shrink-0">
                {changingRoleUid === u.uid ? (
                  <div className="w-5 h-5 border-2 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
                ) : (
                  <select
                    value={u.role}
                    onChange={e => handleRoleChange(u.uid, e.target.value as UserRole)}
                    className={`text-xs font-bold font-quick border rounded-full px-3 py-1 cursor-pointer focus:outline-none ${ROLE_COLORS[u.role]}`}
                  >
                    {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-[28px] shadow-2xl border border-stone-200 p-8 max-w-sm w-full">
            <h3 className="font-kids text-2xl text-wood-dark mb-6">Invite User</h3>

            {inviteSuccess ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✉️</div>
                <p className="font-semibold text-stone-800 font-quick mb-1">Invitation sent!</p>
                <p className="text-stone-500 text-sm font-quick mb-6">
                  They'll receive an email with a link to set their password.
                </p>
                <button
                  onClick={() => { setInviteOpen(false); setInviteSuccess(false) }}
                  className="w-full bg-wood text-white font-bold font-quick py-3 rounded-full hover:brightness-95 transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 font-quick mb-1.5">Email</label>
                  <input
                    type="email" required value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="teacher@example.com"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 font-quick mb-1.5">Display Name</label>
                  <input
                    type="text" value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    placeholder="Sister Fatima (optional)"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 font-quick mb-1.5">Role</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as UserRole)}
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 transition text-sm"
                  >
                    <option value="teacher">Teacher</option>
                    <option value="parent">Parent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {inviteError && (
                  <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                    {inviteError}
                  </p>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={inviting}
                    className="flex-1 bg-wood text-white font-bold font-quick py-3 rounded-full hover:brightness-95 transition disabled:opacity-60">
                    {inviting ? 'Sending…' : 'Send Invite'}
                  </button>
                  <button type="button" onClick={() => setInviteOpen(false)}
                    className="flex-1 border border-stone-200 text-stone-600 font-quick font-semibold py-3 rounded-full hover:bg-stone-50 transition">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Classes Tab ───────────────────────────────────────────────────────────────

const EMPTY_CLASS: Omit<AcademyClass, 'id' | 'createdAt'> = {
  name: '', description: '', teacherUid: '', teacherName: '', schedule: '',
}

const EMPTY_STUDENT: Omit<Student, 'id' | 'classIds' | 'createdAt'> = {
  firstName: '', lastName: '', parentName: '', parentEmail: '', parentPhone: '', notes: '',
}

function ClassesTab() {
  const [classes, setClasses] = useState<AcademyClass[]>([])
  const [teachers, setTeachers] = useState<UserRecord[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<AcademyClass | null>(null)
  const [classTab, setClassTab] = useState<'students' | 'info'>('students')

  // Class form
  const [classFormOpen, setClassFormOpen] = useState(false)
  const [classForm, setClassForm] = useState<Omit<AcademyClass, 'id' | 'createdAt'>>(EMPTY_CLASS)
  const [editingClassId, setEditingClassId] = useState<string | null>(null)
  const [savingClass, setSavingClass] = useState(false)

  // Student form
  const [studentFormOpen, setStudentFormOpen] = useState(false)
  const [studentForm, setStudentForm] = useState<Omit<Student, 'id' | 'classIds' | 'createdAt'>>(EMPTY_STUDENT)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [savingStudent, setSavingStudent] = useState(false)

  // Delete confirm
  const [deletingClass, setDeletingClass] = useState<AcademyClass | null>(null)
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null)

  async function load() {
    setLoading(true)
    const [classSnap, teacherSnap] = await Promise.all([
      getDocs(query(collection(db, 'classes'), orderBy('createdAt', 'desc'))),
      getDocs(collection(db, 'users')),
    ])
    setClasses(classSnap.docs.map(d => ({ id: d.id, ...d.data() } as AcademyClass)))
    setTeachers(
      teacherSnap.docs
        .map(d => ({ uid: d.id, ...d.data() } as UserRecord))
        .filter(u => u.role === 'teacher' || u.role === 'admin')
    )
    setLoading(false)
  }

  async function loadStudents(classId: string) {
    const snap = await getDocs(
      query(collection(db, 'students'), where('classIds', 'array-contains', classId))
    )
    setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student)))
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (selectedClass) loadStudents(selectedClass.id) }, [selectedClass])

  async function saveClass() {
    setSavingClass(true)
    const id = editingClassId ?? uid()
    await setDoc(doc(db, 'classes', id), {
      ...classForm,
      createdAt: new Date().toISOString(),
    })
    await load()
    setClassFormOpen(false)
    setEditingClassId(null)
    setClassForm(EMPTY_CLASS)
    setSavingClass(false)
  }

  async function deleteClass(cls: AcademyClass) {
    await deleteDoc(doc(db, 'classes', cls.id))
    await load()
    setDeletingClass(null)
    if (selectedClass?.id === cls.id) setSelectedClass(null)
  }

  async function saveStudent() {
    if (!selectedClass) return
    setSavingStudent(true)
    const id = editingStudentId ?? uid()
    const existingClassIds = editingStudentId
      ? (students.find(s => s.id === editingStudentId)?.classIds ?? [])
      : []
    const classIds = existingClassIds.includes(selectedClass.id)
      ? existingClassIds
      : [...existingClassIds, selectedClass.id]
    await setDoc(doc(db, 'students', id), {
      ...studentForm,
      classIds,
      createdAt: editingStudentId ? (students.find(s => s.id === id)?.createdAt ?? new Date().toISOString()) : new Date().toISOString(),
    })
    await loadStudents(selectedClass.id)
    setStudentFormOpen(false)
    setEditingStudentId(null)
    setStudentForm(EMPTY_STUDENT)
    setSavingStudent(false)
  }

  async function removeStudentFromClass(student: Student) {
    if (!selectedClass) return
    const updatedIds = student.classIds.filter(id => id !== selectedClass.id)
    await setDoc(doc(db, 'students', student.id), { ...student, classIds: updatedIds })
    await loadStudents(selectedClass.id)
    setDeletingStudent(null)
  }

  function openEditClass(cls: AcademyClass) {
    setClassForm({ name: cls.name, description: cls.description ?? '', teacherUid: cls.teacherUid, teacherName: cls.teacherName, schedule: cls.schedule ?? '' })
    setEditingClassId(cls.id)
    setClassFormOpen(true)
  }

  function openAddStudent() {
    setStudentForm(EMPTY_STUDENT)
    setEditingStudentId(null)
    setStudentFormOpen(true)
  }

  function openEditStudent(s: Student) {
    setStudentForm({ firstName: s.firstName, lastName: s.lastName, parentName: s.parentName ?? '', parentEmail: s.parentEmail ?? '', parentPhone: s.parentPhone ?? '', notes: s.notes ?? '' })
    setEditingStudentId(s.id)
    setStudentFormOpen(true)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
      </div>
    )
  }

  // Class detail view
  if (selectedClass) {
    return (
      <div>
        <button onClick={() => setSelectedClass(null)}
          className="text-sm font-quick font-semibold text-stone-500 hover:text-sage-700 transition mb-6">
          ← Back to classes
        </button>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-kids text-3xl text-wood-dark">{selectedClass.name}</h2>
            {selectedClass.teacherName && (
              <p className="text-stone-500 text-sm font-quick mt-1">Teacher: {selectedClass.teacherName}</p>
            )}
            {selectedClass.schedule && (
              <p className="text-stone-400 text-sm font-quick">{selectedClass.schedule}</p>
            )}
          </div>
          <button onClick={() => openEditClass(selectedClass)}
            className="text-sm font-quick font-semibold text-stone-500 hover:text-sage-700 transition cursor-pointer">
            Edit
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 border-b border-stone-200 mb-6">
          {(['students', 'info'] as const).map(t => (
            <button key={t} onClick={() => setClassTab(t)}
              className={`px-4 py-2 text-sm font-semibold font-quick border-b-2 -mb-px transition capitalize ${
                classTab === t ? 'border-sage-600 text-sage-700' : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}>
              {t === 'students' ? `Students (${students.length})` : 'Info'}
            </button>
          ))}
        </div>

        {classTab === 'students' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={openAddStudent}
                className="bg-wood text-white font-bold font-quick px-5 py-2.5 rounded-full shadow-md hover:brightness-95 transition text-sm">
                + Add Student
              </button>
            </div>
            {students.length === 0 ? (
              <div className="bg-white rounded-[28px] border border-stone-200/70 p-10 text-center text-stone-400 font-quick">
                No students enrolled yet.
              </div>
            ) : (
              <div className="space-y-2">
                {students.map(s => (
                  <div key={s.id} className="bg-white rounded-2xl border border-stone-200/70 px-5 py-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-sage-100 flex items-center justify-center font-bold text-sage-700 font-quick text-sm flex-shrink-0">
                      {s.firstName[0]}{s.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-stone-800 font-quick text-sm">{s.firstName} {s.lastName}</div>
                      {s.parentName && <div className="text-xs text-stone-400 font-quick">Parent: {s.parentName}{s.parentPhone ? ` · ${s.parentPhone}` : ''}</div>}
                    </div>
                    <div className="flex gap-3 text-xs font-quick font-semibold flex-shrink-0">
                      <button onClick={() => openEditStudent(s)} className="text-stone-400 hover:text-sage-700 transition cursor-pointer">Edit</button>
                      <button onClick={() => setDeletingStudent(s)} className="text-stone-400 hover:text-rose-600 transition cursor-pointer">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {classTab === 'info' && (
          <div className="bg-white rounded-[28px] border border-stone-200/70 p-8 space-y-3">
            {selectedClass.description && (
              <p className="text-stone-600 text-sm leading-relaxed">{selectedClass.description}</p>
            )}
            <p className="text-stone-500 text-sm font-quick"><span className="font-semibold">Teacher:</span> {selectedClass.teacherName || '—'}</p>
            <p className="text-stone-500 text-sm font-quick"><span className="font-semibold">Schedule:</span> {selectedClass.schedule || '—'}</p>
          </div>
        )}

        {/* Student form modal */}
        {studentFormOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-6">
            <div className="bg-white rounded-[28px] shadow-2xl border border-stone-200 p-8 max-w-sm w-full">
              <h3 className="font-kids text-2xl text-wood-dark mb-6">{editingStudentId ? 'Edit Student' : 'Add Student'}</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 font-quick mb-1">First Name</label>
                    <input value={studentForm.firstName} onChange={e => setStudentForm(f => ({ ...f, firstName: e.target.value }))} required
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 font-quick mb-1">Last Name</label>
                    <input value={studentForm.lastName} onChange={e => setStudentForm(f => ({ ...f, lastName: e.target.value }))} required
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 font-quick mb-1">Parent / Guardian Name</label>
                  <input value={studentForm.parentName} onChange={e => setStudentForm(f => ({ ...f, parentName: e.target.value }))}
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 font-quick mb-1">Parent Email</label>
                    <input type="email" value={studentForm.parentEmail} onChange={e => setStudentForm(f => ({ ...f, parentEmail: e.target.value }))}
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 font-quick mb-1">Parent Phone</label>
                    <input value={studentForm.parentPhone} onChange={e => setStudentForm(f => ({ ...f, parentPhone: e.target.value }))}
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 font-quick mb-1">Notes (optional)</label>
                  <textarea value={studentForm.notes} onChange={e => setStudentForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm resize-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={saveStudent} disabled={savingStudent || !studentForm.firstName.trim() || !studentForm.lastName.trim()}
                  className="flex-1 bg-wood text-white font-bold font-quick py-3 rounded-full hover:brightness-95 transition disabled:opacity-60">
                  {savingStudent ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => { setStudentFormOpen(false); setEditingStudentId(null) }}
                  className="flex-1 border border-stone-200 text-stone-600 font-quick font-semibold py-3 rounded-full hover:bg-stone-50 transition">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove student confirm */}
        {deletingStudent && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-6">
            <div className="bg-white rounded-[28px] shadow-2xl border border-stone-200 p-8 max-w-sm w-full text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="font-kids text-2xl text-wood-dark mb-2">Remove student?</h3>
              <p className="text-stone-500 text-sm mb-6">
                <strong>{deletingStudent.firstName} {deletingStudent.lastName}</strong> will be removed from this class.
              </p>
              <div className="flex gap-3">
                <button onClick={() => removeStudentFromClass(deletingStudent)}
                  className="flex-1 bg-rose-600 text-white font-bold font-quick py-3 rounded-full hover:brightness-95 transition">Remove</button>
                <button onClick={() => setDeletingStudent(null)}
                  className="flex-1 border border-stone-200 text-stone-600 font-quick font-semibold py-3 rounded-full hover:bg-stone-50 transition">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit class modal (re-used) */}
        {classFormOpen && (
          <ClassFormModal
            form={classForm} teachers={teachers} saving={savingClass}
            onChange={setClassForm} onSave={saveClass}
            onCancel={() => { setClassFormOpen(false); setEditingClassId(null); setClassForm(EMPTY_CLASS) }}
          />
        )}
      </div>
    )
  }

  // Classes list view
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-kids text-3xl text-wood-dark">Classes</h2>
          <p className="text-stone-500 text-sm font-quick mt-1">Manage classes and student enrollment.</p>
        </div>
        <button
          onClick={() => { setClassForm(EMPTY_CLASS); setEditingClassId(null); setClassFormOpen(true) }}
          className="bg-wood text-white font-bold font-quick px-5 py-2.5 rounded-full shadow-md hover:brightness-95 transition text-sm">
          + New Class
        </button>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white rounded-[28px] border border-stone-200/70 p-10 text-center text-stone-400 font-quick">
          No classes yet. Create your first class to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map(cls => (
            <div key={cls.id} className="bg-white rounded-2xl border border-stone-200/70 px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-sage-100 flex items-center justify-center text-xl flex-shrink-0">📚</div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedClass(cls)}>
                <div className="font-semibold text-stone-800 font-quick">{cls.name}</div>
                <div className="text-xs text-stone-400 font-quick">
                  {cls.teacherName || 'No teacher assigned'}{cls.schedule ? ` · ${cls.schedule}` : ''}
                </div>
              </div>
              <div className="flex gap-3 text-xs font-quick font-semibold flex-shrink-0">
                <button onClick={() => setSelectedClass(cls)} className="text-stone-400 hover:text-sage-700 transition cursor-pointer">View</button>
                <button onClick={() => openEditClass(cls)} className="text-stone-400 hover:text-sage-700 transition cursor-pointer">Edit</button>
                <button onClick={() => setDeletingClass(cls)} className="text-stone-400 hover:text-rose-600 transition cursor-pointer">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {classFormOpen && (
        <ClassFormModal
          form={classForm} teachers={teachers} saving={savingClass}
          onChange={setClassForm} onSave={saveClass}
          onCancel={() => { setClassFormOpen(false); setEditingClassId(null); setClassForm(EMPTY_CLASS) }}
        />
      )}

      {deletingClass && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-[28px] shadow-2xl border border-stone-200 p-8 max-w-sm w-full text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="font-kids text-2xl text-wood-dark mb-2">Delete class?</h3>
            <p className="text-stone-500 text-sm mb-6">
              "<strong>{deletingClass.name}</strong>" will be permanently deleted. Students won't be deleted but will be unenrolled.
            </p>
            <div className="flex gap-3">
              <button onClick={() => deleteClass(deletingClass)}
                className="flex-1 bg-rose-600 text-white font-bold font-quick py-3 rounded-full hover:brightness-95 transition">Delete</button>
              <button onClick={() => setDeletingClass(null)}
                className="flex-1 border border-stone-200 text-stone-600 font-quick font-semibold py-3 rounded-full hover:bg-stone-50 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ClassFormModal({
  form, teachers, saving, onChange, onSave, onCancel,
}: {
  form: Omit<AcademyClass, 'id' | 'createdAt'>
  teachers: UserRecord[]
  saving: boolean
  onChange: (f: Omit<AcademyClass, 'id' | 'createdAt'>) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-[28px] shadow-2xl border border-stone-200 p-8 max-w-sm w-full">
        <h3 className="font-kids text-2xl text-wood-dark mb-6">
          {form.name ? 'Edit Class' : 'New Class'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-600 font-quick mb-1">Class Name</label>
            <input value={form.name} onChange={e => onChange({ ...form, name: e.target.value })} required
              placeholder="e.g. Quran for Beginners"
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 font-quick mb-1">Teacher</label>
            <select
              value={form.teacherUid}
              onChange={e => {
                const selected = teachers.find(t => t.uid === e.target.value)
                onChange({ ...form, teacherUid: e.target.value, teacherName: selected?.displayName || selected?.email || '' })
              }}
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm"
            >
              <option value="">No teacher assigned</option>
              {teachers.map(t => (
                <option key={t.uid} value={t.uid}>{t.displayName || t.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 font-quick mb-1">Schedule</label>
            <input value={form.schedule} onChange={e => onChange({ ...form, schedule: e.target.value })}
              placeholder="e.g. Saturdays 10am–12pm"
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 font-quick mb-1">Description</label>
            <textarea value={form.description} onChange={e => onChange({ ...form, description: e.target.value })} rows={2}
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm resize-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onSave} disabled={saving || !form.name.trim()}
            className="flex-1 bg-wood text-white font-bold font-quick py-3 rounded-full hover:brightness-95 transition disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onCancel}
            className="flex-1 border border-stone-200 text-stone-600 font-quick font-semibold py-3 rounded-full hover:bg-stone-50 transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Admin Root ────────────────────────────────────────────────────────────────

export default function Admin() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'events' | 'classes' | 'users'>('events')
  const [events, setEvents] = useState<AcademyEvent[]>([])
  const [editing, setEditing] = useState<Partial<AcademyEvent> | null>(null)
  const [deleting, setDeleting] = useState<AcademyEvent | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      setUser(u)
      if (u) {
        const token = await u.getIdTokenResult()
        setIsAdmin(token.claims['role'] === 'admin')
      } else {
        setIsAdmin(false)
      }
      setAuthLoading(false)
    })
  }, [])

  useEffect(() => { if (user && isAdmin) loadEvents() }, [user, isAdmin])

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

  if (!isAdmin) {
    return (
      <div className="bg-cream min-h-screen flex flex-col items-center justify-center gap-4 font-body text-center px-6">
        <div className="text-5xl">🔒</div>
        <h1 className="font-kids text-3xl text-wood-dark">Access Denied</h1>
        <p className="text-stone-500 text-sm max-w-xs">
          Your account doesn't have admin access. Contact the academy if you think this is a mistake.
        </p>
        <button onClick={() => signOut(auth)}
          className="font-quick text-sm font-semibold text-rose-600 hover:underline mt-2">
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div className="bg-cream min-h-screen font-body">
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
        {/* Tab bar */}
        <div className="max-w-4xl mx-auto px-6 flex gap-1 -mb-px">
          {([['events', 'Events'], ['classes', 'Classes'], ['users', 'Users']] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setEditing(null) }}
              className={`px-5 py-2.5 text-sm font-semibold font-quick border-b-2 transition ${
                activeTab === tab
                  ? 'border-sage-600 text-sage-700'
                  : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {activeTab === 'events' ? (
          editing ? (
            <div>
              <button onClick={() => setEditing(null)}
                className="text-sm font-quick font-semibold text-stone-500 hover:text-sage-700 transition mb-6">
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
          )
        ) : activeTab === 'classes' ? (
          <ClassesTab />
        ) : (
          <UsersTab />
        )}
      </main>

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
