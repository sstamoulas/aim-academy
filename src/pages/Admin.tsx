import { useState, useEffect, useRef } from 'react'
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged, type User,
} from 'firebase/auth'
import {
  collection, doc, getDocs, setDoc, deleteDoc, orderBy, query,
} from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { auth, db, storage } from '../firebase'
import type { AcademyEvent, EventDetail, EventSection, SectionType, PricingTier, PricingModel } from '../types/event'
import { PRICING_MODEL_LABELS } from '../types/event'

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
                  <span className="font-kids text-lg text-wood-dark truncate">{event.title}</span>
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

// ── Admin Root ────────────────────────────────────────────────────────────────

export default function Admin() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [events, setEvents] = useState<AcademyEvent[]>([])
  const [editing, setEditing] = useState<Partial<AcademyEvent> | null>(null)
  const [deleting, setDeleting] = useState<AcademyEvent | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false) })
  }, [])

  useEffect(() => { if (user) loadEvents() }, [user])

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
