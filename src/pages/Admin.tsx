import { useState, useEffect, useRef } from 'react'
import {
  signOut, onAuthStateChanged, type User,
} from 'firebase/auth'
import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc, orderBy, query, where,
} from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { httpsCallable } from 'firebase/functions'
import { auth, db, storage, functions } from '../firebase'
import type { AcademyEvent, EventDetail, EventSection, EventMedia, SectionType, PricingTier, PricingModel } from '../types/event'
import { PRICING_MODEL_LABELS, categorizeEvent } from '../types/event'
import type { AcademyClass, Student, Registration, ChildRequest } from '../types/portal'
import type { Program, ProgramMedia, Achievement, Review } from '../types/site'

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
  media: [],
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

// ── Media Gallery Uploader ────────────────────────────────────────────────────

type MediaItem = EventMedia | ProgramMedia

function MediaGalleryUploader({ items, storagePath, onChange }: {
  items: MediaItem[]
  storagePath: string
  onChange: (items: MediaItem[]) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    if (!storagePath) { alert('Save the item first before uploading media.'); return }
    const file = files[0]
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    if (!isImage && !isVideo) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const mediaId = uid()
    const storageRef = ref(storage, `${storagePath}/media_${Date.now()}.${ext}`)
    const task = uploadBytesResumable(storageRef, file)
    task.on('state_changed',
      snap => setProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      err => { console.error(err); setUploading(false) },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        onChange([...items, { id: mediaId, type: isVideo ? 'video' : 'image', url }])
        setUploading(false)
        setProgress(0)
      }
    )
  }

  function updateCaption(id: string, caption: string) {
    onChange(items.map(m => m.id === id ? { ...m, caption } : m))
  }

  function remove(id: string) {
    onChange(items.filter(m => m.id !== id))
  }

  function move(i: number, dir: -1 | 1) {
    const n = [...items]
    const j = i + dir
    if (j < 0 || j >= n.length) return
    ;[n[i], n[j]] = [n[j], n[i]]
    onChange(n)
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => fileRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-sage-500 bg-sage-50' : 'border-stone-200 hover:border-sage-300 hover:bg-stone-50'
        }`}
      >
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden"
          onChange={e => handleFiles(e.target.files)} />
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
            <div className="text-3xl mb-2">📸</div>
            <p className="text-sm font-semibold text-stone-600 font-quick">Drop a photo or video, or click to upload</p>
            <p className="text-xs text-stone-400 mt-1">PNG, JPG, WEBP, MP4, MOV — one file at a time</p>
          </>
        )}
      </div>

      {/* Gallery grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item, i) => (
            <div key={item.id} className="group relative bg-stone-100 rounded-2xl overflow-hidden border border-stone-200">
              {item.type === 'video' ? (
                <video src={item.url} className="w-full aspect-square object-cover" muted playsInline />
              ) : (
                <img src={item.url} alt={item.caption || ''} className="w-full aspect-square object-cover" />
              )}
              {/* Type badge */}
              <div className="absolute top-2 left-2 bg-black/50 text-white text-xs font-quick font-bold px-2 py-0.5 rounded-full">
                {item.type === 'video' ? '▶ Video' : '🖼 Photo'}
              </div>
              {/* Controls overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                  className="bg-white/90 text-stone-700 w-7 h-7 rounded-full flex items-center justify-center text-sm disabled:opacity-30 hover:bg-white transition">
                  ←
                </button>
                <button type="button" onClick={() => remove(item.id)}
                  className="bg-rose-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm hover:bg-rose-600 transition">
                  ✕
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1}
                  className="bg-white/90 text-stone-700 w-7 h-7 rounded-full flex items-center justify-center text-sm disabled:opacity-30 hover:bg-white transition">
                  →
                </button>
              </div>
              {/* Caption input */}
              <input
                value={item.caption ?? ''}
                onChange={e => updateCaption(item.id, e.target.value)}
                placeholder="Caption (optional)"
                className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs placeholder-white/50 px-2 py-1.5 font-quick outline-none opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          ))}
        </div>
      )}
      {items.length === 0 && (
        <p className="text-xs text-stone-400 font-quick text-center">No media added yet. Upload photos or videos above to build the gallery.</p>
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
    media: initial.media ?? [],
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
        sections: form.sections.map(s => {
          const sec: typeof s = { id: s.id, type: s.type, title: s.title }
          if (s.type === 'list') sec.items = (s.items ?? []).filter(Boolean)
          if (s.type === 'faq') sec.faqs = (s.faqs ?? []).filter(f => f.q || f.a)
          if (s.type === 'text') sec.body = s.body ?? ''
          return sec
        }),
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

        <div>
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

        {/* Event dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Event Start Date <span className="text-stone-400 font-normal">— optional</span></label>
            <input type="date" value={form.eventDate ?? ''} onChange={e => set('eventDate', e.target.value)}
              className={inputCls} />
            <p className="text-xs text-stone-400 font-quick mt-1">Used to auto-classify as upcoming / current / past in the nav.</p>
          </div>
          <div>
            <label className={labelCls}>Event End Date <span className="text-stone-400 font-normal">— optional</span></label>
            <input type="date" value={form.eventEndDate ?? ''} onChange={e => set('eventEndDate', e.target.value)}
              className={inputCls} />
            <p className="text-xs text-stone-400 font-quick mt-1">If set, event shows as "Current" while today is within the interval.</p>
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

      {/* ── Media Gallery ── */}
      <section className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="font-kids text-xl text-wood-dark">Event Media Gallery</h3>
          <p className="text-sm text-stone-400 font-quick mt-1">
            Photos and videos shown as a carousel on the event page once the event is past. Upload one file at a time; use arrows to reorder.
          </p>
        </div>
        <MediaGalleryUploader items={form.media ?? []} storagePath={`events/${form.slug}`} onChange={v => set('media', v as EventMedia[])} />
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
  function eventCatLabel(event: AcademyEvent) {
    const cat = categorizeEvent(event)
    if (cat === 'current') return { label: 'Happening Now', cls: 'bg-rose-100 text-rose-600' }
    if (cat === 'upcoming') return { label: 'Upcoming', cls: 'bg-sage-100 text-sage-700' }
    return { label: 'Past', cls: 'bg-stone-100 text-stone-500' }
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
          {events.map(event => {
            const { label, cls } = eventCatLabel(event)
            return (
              <div key={event.id} className="bg-white rounded-[20px] border border-stone-200/70 shadow-sm p-4">
                {/* Top row: image + title + badge */}
                <div className="flex items-start gap-3">
                  {event.flyerImageUrl && (
                    <img src={event.flyerImageUrl} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-stone-100" />
                  )}
                  <div className="flex-1 min-w-0">
                    <button onClick={() => onEdit(event)} className="font-kids text-base text-wood-dark hover:text-sage-700 transition text-left cursor-pointer w-full truncate block">
                      {event.title}
                    </button>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs font-semibold font-quick px-2.5 py-0.5 rounded-full ${cls}`}>{label}</span>
                      <span className="text-xs text-stone-400 font-quick truncate">/events/{event.slug}</span>
                    </div>
                    {(event.eventDate || event.details.find(d => d.label === 'Date')?.value) && (
                      <div className="text-xs text-stone-400 font-quick mt-0.5">
                        {event.eventDate ?? event.details.find(d => d.label === 'Date')?.value}
                      </div>
                    )}
                  </div>
                </div>
                {/* Bottom row: live toggle + actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100">
                  <label className="flex items-center gap-1.5 cursor-pointer mr-auto">
                    <div className="relative">
                      <input type="checkbox" checked={event.published} onChange={() => onTogglePublish(event)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-stone-200 peer-checked:bg-sage-600 rounded-full transition" />
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4 shadow-sm" />
                    </div>
                    <span className={`text-xs font-bold font-quick ${event.published ? 'text-sage-700' : 'text-stone-400'}`}>
                      {event.published ? 'Live' : 'Draft'}
                    </span>
                  </label>
                  <a href={`/events/${event.slug}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-quick font-semibold text-stone-500 hover:text-sage-700 transition px-3 py-1.5 rounded-lg hover:bg-stone-50">
                    View
                  </a>
                  <button onClick={() => onEdit(event)}
                    className="text-xs font-quick font-semibold text-stone-500 hover:text-sage-700 transition px-3 py-1.5 rounded-lg hover:bg-stone-50 cursor-pointer">
                    Edit
                  </button>
                  <button onClick={() => onDelete(event)}
                    className="text-xs font-quick font-semibold text-stone-400 hover:text-rose-600 transition px-3 py-1.5 rounded-lg hover:bg-rose-50 cursor-pointer">
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
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
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null)
  const [deletingUserLoading, setDeletingUserLoading] = useState(false)

  const inviteUserFn = httpsCallable(functions, 'inviteUser')
  const setUserRoleFn = httpsCallable(functions, 'setUserRole')
  const deleteUserFn = httpsCallable(functions, 'deleteUser')

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

  async function handleDeleteUser() {
    if (!deletingUser) return
    setDeletingUserLoading(true)
    try {
      await deleteUserFn({ uid: deletingUser.uid })
      setUsers(prev => prev.filter(u => u.uid !== deletingUser.uid))
      setDeletingUser(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete user.')
    } finally {
      setDeletingUserLoading(false)
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
            <div key={u.uid} className="bg-white rounded-2xl border border-stone-200/70 p-4">
              {/* Top row: avatar + name/email */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-sage-100 flex items-center justify-center font-bold text-sage-700 font-quick text-sm flex-shrink-0">
                  {initials(u)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-stone-800 font-quick text-sm truncate">
                    {u.displayName || <span className="text-stone-400 italic">No name</span>}
                  </div>
                  <div className="text-xs text-stone-400 font-quick truncate">{u.email}</div>
                </div>
              </div>
              {/* Bottom row: role selector + impersonate */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100">
                {changingRoleUid === u.uid ? (
                  <div className="w-5 h-5 border-2 border-sage-200 border-t-sage-600 rounded-full animate-spin mr-auto" />
                ) : (
                  <select
                    value={u.role}
                    onChange={e => handleRoleChange(u.uid, e.target.value as UserRole)}
                    className={`text-xs font-bold font-quick border rounded-full px-3 py-1.5 cursor-pointer focus:outline-none mr-auto ${ROLE_COLORS[u.role]}`}
                  >
                    {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => {
                    sessionStorage.setItem('impersonating', JSON.stringify({ uid: u.uid, email: u.email, role: u.role, displayName: u.displayName || u.email }))
                    window.location.href = u.role === 'teacher' ? '/portal/teacher' : '/portal/parent'
                  }}
                  className="text-xs font-semibold font-quick text-stone-400 hover:text-sage-700 border border-stone-200 hover:border-sage-400 px-3 py-1.5 rounded-lg transition flex-shrink-0"
                >
                  Impersonate
                </button>
                <button
                  onClick={() => setDeletingUser(u)}
                  className="text-xs font-semibold font-quick text-rose-400 hover:text-rose-600 border border-rose-200 hover:border-rose-400 px-3 py-1.5 rounded-lg transition flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-[28px] shadow-2xl border border-stone-200 p-8 max-w-sm w-full text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="font-kids text-2xl text-wood-dark mb-2">Remove User?</h3>
            <p className="text-stone-500 text-sm font-quick mb-6">
              This will permanently delete <strong>{deletingUser.displayName || deletingUser.email}</strong> and revoke their access. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingUser(null)}
                disabled={deletingUserLoading}
                className="flex-1 border border-stone-200 text-stone-600 font-bold font-quick py-3 rounded-full hover:bg-stone-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deletingUserLoading}
                className="flex-1 bg-rose-500 text-white font-bold font-quick py-3 rounded-full hover:bg-rose-600 transition disabled:opacity-50"
              >
                {deletingUserLoading ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
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
  name: '', description: '', teacherUid: '', teacherName: '', schedule: '', tuitionAmount: 0,
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

  // Student form (edit only)
  const [studentFormOpen, setStudentFormOpen] = useState(false)
  const [studentForm, setStudentForm] = useState<Omit<Student, 'id' | 'classIds' | 'createdAt'>>(EMPTY_STUDENT)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [savingStudent, setSavingStudent] = useState(false)

  // Student picker (add to class)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerStudents, setPickerStudents] = useState<Student[]>([])
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerLoading, setPickerLoading] = useState(false)
  const [addingStudent, setAddingStudent] = useState<string | null>(null)

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
    setClassForm({ name: cls.name, description: cls.description ?? '', teacherUid: cls.teacherUid, teacherName: cls.teacherName, schedule: cls.schedule ?? '', tuitionAmount: cls.tuitionAmount ?? 0 })
    setEditingClassId(cls.id)
    setClassFormOpen(true)
  }

  async function openStudentPicker() {
    if (!selectedClass) return
    setPickerOpen(true)
    setPickerSearch('')
    setPickerLoading(true)
    const snap = await getDocs(collection(db, 'students'))
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Student))
    // Exclude students already in this class
    setPickerStudents(all.filter(s => !s.classIds.includes(selectedClass.id)))
    setPickerLoading(false)
  }

  async function addStudentToClass(student: Student) {
    if (!selectedClass) return
    setAddingStudent(student.id)
    const updatedIds = [...student.classIds, selectedClass.id]
    await setDoc(doc(db, 'students', student.id), { ...student, classIds: updatedIds })
    await loadStudents(selectedClass.id)
    setPickerStudents(prev => prev.filter(s => s.id !== student.id))
    setAddingStudent(null)
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
              <button onClick={openStudentPicker}
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

        {/* Student picker modal */}
        {pickerOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-6">
            <div className="bg-white rounded-[28px] shadow-2xl border border-stone-200 p-8 max-w-md w-full">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-kids text-2xl text-wood-dark">Add Student</h3>
                <button onClick={() => setPickerOpen(false)} className="text-stone-400 hover:text-stone-600 text-xl leading-none">✕</button>
              </div>
              <input
                type="text"
                placeholder="Search by name…"
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-400 mb-4"
              />
              {pickerLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-7 h-7 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
                </div>
              ) : pickerStudents.length === 0 ? (
                <div className="text-center text-stone-400 font-quick text-sm py-8">
                  No registered students available to add.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {pickerStudents
                    .filter(s => {
                      const q = pickerSearch.toLowerCase()
                      return !q || `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) || (s.parentName ?? '').toLowerCase().includes(q)
                    })
                    .map(s => (
                      <div key={s.id} className="flex items-center gap-3 bg-stone-50 rounded-2xl px-4 py-3 border border-stone-100">
                        <div className="w-9 h-9 rounded-full bg-sage-100 flex items-center justify-center font-bold text-sage-700 font-quick text-sm flex-shrink-0">
                          {s.firstName[0]}{s.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-stone-800 font-quick text-sm">{s.firstName} {s.lastName}</div>
                          {s.parentName && <div className="text-xs text-stone-400 font-quick">{s.parentName}</div>}
                        </div>
                        <button
                          onClick={() => addStudentToClass(s)}
                          disabled={addingStudent === s.id}
                          className="bg-sage-600 text-white font-bold font-quick px-4 py-1.5 rounded-full text-xs hover:brightness-95 transition disabled:opacity-60 flex-shrink-0">
                          {addingStudent === s.id ? '…' : 'Add'}
                        </button>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit student form modal */}
        {studentFormOpen && editingStudentId && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-6">
            <div className="bg-white rounded-[28px] shadow-2xl border border-stone-200 p-8 max-w-sm w-full">
              <h3 className="font-kids text-2xl text-wood-dark mb-6">Edit Student</h3>
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
          <div>
            <label className="block text-xs font-semibold text-stone-600 font-quick mb-1">Monthly Tuition (optional)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-quick">$</span>
              <input
                type="number" min="0" step="0.01"
                value={form.tuitionAmount ? (form.tuitionAmount / 100).toFixed(2) : ''}
                onChange={e => onChange({ ...form, tuitionAmount: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : 0 })}
                placeholder="0.00"
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 pl-8 pr-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm"
              />
            </div>
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

// ── Registrations Tab ─────────────────────────────────────────────────────────

function RegistrationsTab() {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [childRequests, setChildRequests] = useState<ChildRequest[]>([])
  const [classes, setClasses] = useState<AcademyClass[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  // classAssignments[regId][childIndex] = classIds[]
  const [assignments, setAssignments] = useState<Record<string, Record<number, string[]>>>({})
  const [crAssignments, setCrAssignments] = useState<Record<string, string[]>>({})
  const [rejectTarget, setRejectTarget] = useState<Registration | null>(null)
  const [rejectCrTarget, setRejectCrTarget] = useState<ChildRequest | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  const approveRegistrationFn = httpsCallable(functions, 'approveRegistration')
  const rejectRegistrationFn = httpsCallable(functions, 'rejectRegistration')

  async function load() {
    setLoading(true)
    const [regSnap, crSnap, clsSnap] = await Promise.all([
      getDocs(query(collection(db, 'registrations'), orderBy('submittedAt', 'desc'))),
      getDocs(query(collection(db, 'childRequests'), orderBy('submittedAt', 'desc'))),
      getDocs(query(collection(db, 'classes'), orderBy('createdAt', 'asc'))),
    ])
    setRegistrations(regSnap.docs.map(d => ({ id: d.id, ...d.data() } as Registration)))
    setChildRequests(crSnap.docs.map(d => ({ id: d.id, ...d.data() } as ChildRequest)))
    setClasses(clsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AcademyClass)))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function toggleAssignment(regId: string, childIndex: number, classId: string) {
    setAssignments(prev => {
      const regMap = prev[regId] ?? {}
      const current = regMap[childIndex] ?? []
      const updated = current.includes(classId)
        ? current.filter(id => id !== classId)
        : [...current, classId]
      return { ...prev, [regId]: { ...regMap, [childIndex]: updated } }
    })
  }

  async function handleApprove(reg: Registration) {
    setProcessing(reg.id)
    const regAssignments = assignments[reg.id] ?? {}
    const classAssignments = reg.children.map((_, i) => ({
      childIndex: i,
      classIds: regAssignments[i] ?? [],
    }))
    try {
      await approveRegistrationFn({ registrationId: reg.id, classAssignments })
      await load()
      setExpanded(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to approve.')
    } finally { setProcessing(null) }
  }

  async function handleReject() {
    if (!rejectTarget) return
    setProcessing(rejectTarget.id)
    try {
      await rejectRegistrationFn({ registrationId: rejectTarget.id, reason: rejectReason.trim() })
      await load()
      setRejectTarget(null)
      setRejectReason('')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to reject.')
    } finally { setProcessing(null) }
  }

  async function handleApproveChildRequest(cr: ChildRequest) {
    setProcessing(cr.id)
    try {
      const classIds = crAssignments[cr.id] ?? []
      const studentId = Math.random().toString(36).slice(2)
      await setDoc(doc(db, 'students', studentId), {
        firstName: cr.child.firstName,
        lastName: cr.child.lastName,
        dateOfBirth: cr.child.dateOfBirth ?? null,
        grade: cr.child.grade ?? null,
        classIds,
        parentName: cr.parentName,
        parentEmail: cr.parentEmail,
        parentPhone: '',
        notes: '',
        createdAt: new Date().toISOString(),
      })
      await updateDoc(doc(db, 'childRequests', cr.id), {
        status: 'approved',
        classIds,
        reviewedAt: new Date().toISOString(),
      })
      await load()
      setExpanded(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to approve.')
    } finally { setProcessing(null) }
  }

  async function handleRejectChildRequest() {
    if (!rejectCrTarget) return
    setProcessing(rejectCrTarget.id)
    try {
      await updateDoc(doc(db, 'childRequests', rejectCrTarget.id), {
        status: 'rejected',
        rejectReason: rejectReason.trim(),
        reviewedAt: new Date().toISOString(),
      })
      await load()
      setRejectCrTarget(null)
      setRejectReason('')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to reject.')
    } finally { setProcessing(null) }
  }

  const pending = registrations.filter(r => r.status === 'pending')
  const reviewed = registrations.filter(r => r.status !== 'pending')
  const pendingCr = childRequests.filter(r => r.status === 'pending')
  const reviewedCr = childRequests.filter(r => r.status !== 'pending')

  const statusColor = (s: Registration['status']) =>
    s === 'approved' ? 'bg-sage-100 text-sage-700 border-sage-200' :
    s === 'rejected' ? 'bg-rose-100 text-rose-600 border-rose-200' :
    'bg-amber-100 text-amber-700 border-amber-200'

  function RegistrationCard({ reg }: { reg: Registration }) {
    const isExpanded = expanded === reg.id
    const regAssignments = assignments[reg.id] ?? {}
    return (
      <div className="bg-white rounded-2xl border border-stone-200/70 overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-4 cursor-pointer"
          onClick={() => setExpanded(isExpanded ? null : reg.id)}>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-stone-800 font-quick">{reg.parentName}</div>
            <div className="text-xs text-stone-400 font-quick">
              {reg.email} · {reg.children.length} {reg.children.length === 1 ? 'child' : 'children'} · {new Date(reg.submittedAt).toLocaleDateString()}
            </div>
          </div>
          <span className={`text-xs font-bold font-quick border px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${statusColor(reg.status)}`}>
            {reg.status}
          </span>
          <span className="text-stone-300 flex-shrink-0">{isExpanded ? '▲' : '▼'}</span>
        </div>

        {isExpanded && (
          <div className="border-t border-stone-100 px-5 py-5 space-y-5">
            {/* Parent info */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <div className="text-stone-400 font-quick">Phone</div>
              <div className="text-stone-700 font-quick">{reg.phone || '—'}</div>
              <div className="text-stone-400 font-quick">Email</div>
              <div className="text-stone-700 font-quick">{reg.email}</div>
            </div>

            {/* Children + class assignment */}
            <div className="space-y-4">
              <p className="text-xs font-bold font-quick text-stone-400 uppercase tracking-wider">Children</p>
              {reg.children.map((child, i) => (
                <div key={i} className="border border-stone-100 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-xs font-bold text-sage-700 font-quick flex-shrink-0">
                      {child.firstName[0]}{child.lastName[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-stone-800 font-quick text-sm">{child.firstName} {child.lastName}</div>
                      <div className="text-xs text-stone-400 font-quick">
                        {[child.grade, child.dateOfBirth].filter(Boolean).join(' · ') || 'No additional info'}
                      </div>
                    </div>
                  </div>
                  {reg.status === 'pending' && classes.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold font-quick text-stone-500 mb-2">Assign to class(es):</p>
                      <div className="flex flex-wrap gap-2">
                        {classes.map(cls => {
                          const selected = (regAssignments[i] ?? []).includes(cls.id)
                          return (
                            <button key={cls.id} type="button"
                              onClick={() => toggleAssignment(reg.id, i, cls.id)}
                              className={`text-xs font-quick font-semibold border px-3 py-1.5 rounded-full transition ${
                                selected ? 'bg-sage-600 text-white border-sage-600' : 'border-stone-200 text-stone-500 hover:border-sage-300'
                              }`}>
                              {cls.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {reg.status !== 'pending' && (
                    <p className="text-xs text-stone-400 font-quick italic">Review completed — edit assignments in Classes tab.</p>
                  )}
                </div>
              ))}
            </div>

            {/* Reject reason */}
            {reg.status === 'rejected' && reg.rejectReason && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <p className="text-xs font-bold font-quick text-rose-400 mb-1">Rejection reason</p>
                <p className="text-xs text-rose-700 font-quick">{reg.rejectReason}</p>
              </div>
            )}

            {/* Actions */}
            {reg.status === 'pending' && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(reg)}
                  disabled={processing === reg.id}
                  className="flex-1 bg-sage-600 text-white font-bold font-quick py-2.5 rounded-full hover:brightness-95 transition disabled:opacity-60 text-sm">
                  {processing === reg.id ? 'Approving…' : 'Approve'}
                </button>
                <button
                  onClick={() => { setRejectTarget(reg); setRejectReason('') }}
                  disabled={processing === reg.id}
                  className="flex-1 border border-rose-200 text-rose-600 font-quick font-semibold py-2.5 rounded-full hover:bg-rose-50 transition disabled:opacity-60 text-sm">
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-kids text-3xl text-wood-dark">Registrations</h2>
        <p className="text-stone-500 text-sm font-quick mt-1">Review and approve new family registrations and child requests.</p>
      </div>

      {/* Child registration requests */}
      {(pendingCr.length > 0 || reviewedCr.length > 0) && (
        <div className="mb-10">
          <p className="text-xs font-bold font-quick text-stone-500 uppercase tracking-wider mb-3">Child Registration Requests</p>
          <div className="space-y-3">
            {[...pendingCr, ...reviewedCr].map(cr => {
              const isExpanded = expanded === cr.id
              const selectedClasses = crAssignments[cr.id] ?? []
              const statusColor = cr.status === 'approved'
                ? 'bg-sage-100 text-sage-700 border-sage-200'
                : cr.status === 'rejected'
                ? 'bg-rose-100 text-rose-600 border-rose-200'
                : 'bg-amber-100 text-amber-700 border-amber-200'
              return (
                <div key={cr.id} className="bg-white rounded-2xl border border-stone-200/70 overflow-hidden">
                  <div className="px-5 py-4 flex items-center gap-4 cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : cr.id)}>
                    <div className="w-9 h-9 rounded-full bg-sage-100 flex items-center justify-center text-xs font-bold text-sage-700 font-quick flex-shrink-0">
                      {cr.child.firstName[0]}{cr.child.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-stone-800 font-quick">{cr.child.firstName} {cr.child.lastName}</div>
                      <div className="text-xs text-stone-400 font-quick">
                        Requested by {cr.parentName} ({cr.parentEmail}) · {new Date(cr.submittedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`text-xs font-bold font-quick border px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${statusColor}`}>{cr.status}</span>
                    <span className="text-stone-300 flex-shrink-0">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-stone-100 px-5 py-5 space-y-4">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        {cr.child.dateOfBirth && <><div className="text-stone-400 font-quick">Date of Birth</div><div className="text-stone-700 font-quick">{cr.child.dateOfBirth}</div></>}
                        {cr.child.grade && <><div className="text-stone-400 font-quick">Grade</div><div className="text-stone-700 font-quick">{cr.child.grade}</div></>}
                      </div>
                      {cr.status === 'pending' && classes.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold font-quick text-stone-500 mb-2">Assign to class(es):</p>
                          <div className="flex flex-wrap gap-2">
                            {classes.map(cls => {
                              const selected = selectedClasses.includes(cls.id)
                              return (
                                <button key={cls.id} type="button"
                                  onClick={() => setCrAssignments(prev => {
                                    const cur = prev[cr.id] ?? []
                                    return { ...prev, [cr.id]: selected ? cur.filter(id => id !== cls.id) : [...cur, cls.id] }
                                  })}
                                  className={`text-xs font-quick font-semibold border px-3 py-1.5 rounded-full transition ${
                                    selected ? 'bg-sage-600 text-white border-sage-600' : 'border-stone-200 text-stone-500 hover:border-sage-300'
                                  }`}>
                                  {cls.name}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {cr.status === 'rejected' && cr.rejectReason && (
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                          <p className="text-xs font-bold font-quick text-rose-400 mb-1">Rejection reason</p>
                          <p className="text-xs text-rose-700 font-quick">{cr.rejectReason}</p>
                        </div>
                      )}
                      {cr.status === 'pending' && (
                        <div className="flex gap-3">
                          <button onClick={() => handleApproveChildRequest(cr)} disabled={processing === cr.id}
                            className="flex-1 bg-sage-600 text-white font-bold font-quick py-2.5 rounded-full hover:brightness-95 transition disabled:opacity-60 text-sm">
                            {processing === cr.id ? 'Approving…' : 'Approve'}
                          </button>
                          <button onClick={() => { setRejectCrTarget(cr); setRejectReason('') }} disabled={processing === cr.id}
                            className="flex-1 border border-rose-200 text-rose-600 font-quick font-semibold py-2.5 rounded-full hover:bg-rose-50 transition disabled:opacity-60 text-sm">
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Family registrations */}
      {pending.length === 0 && reviewed.length === 0 && pendingCr.length === 0 && reviewedCr.length === 0 ? (
        <div className="bg-white rounded-[28px] border border-stone-200/70 p-10 text-center text-stone-400 font-quick">
          No registrations yet.
        </div>
      ) : (pending.length > 0 || reviewed.length > 0) && (
        <div className="space-y-8">
          <p className="text-xs font-bold font-quick text-stone-500 uppercase tracking-wider">Family Registrations</p>
          {pending.length > 0 && (
            <div>
              <p className="text-xs font-bold font-quick text-amber-600 uppercase tracking-wider mb-3">
                Pending ({pending.length})
              </p>
              <div className="space-y-3">
                {pending.map(reg => <RegistrationCard key={reg.id} reg={reg} />)}
              </div>
            </div>
          )}
          {reviewed.length > 0 && (
            <div>
              <p className="text-xs font-bold font-quick text-stone-400 uppercase tracking-wider mb-3">
                Reviewed ({reviewed.length})
              </p>
              <div className="space-y-3">
                {reviewed.map(reg => <RegistrationCard key={reg.id} reg={reg} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reject family registration modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-[28px] shadow-2xl border border-stone-200 p-8 max-w-sm w-full">
            <h3 className="font-kids text-2xl text-wood-dark mb-2">Reject Registration</h3>
            <p className="text-stone-500 text-sm font-quick mb-5">
              Rejecting <strong>{rejectTarget.parentName}</strong>. Optionally provide a reason.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Class is currently full. Please check back next semester."
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm resize-none mb-5"
            />
            <div className="flex gap-3">
              <button onClick={handleReject} disabled={processing === rejectTarget.id}
                className="flex-1 bg-rose-600 text-white font-bold font-quick py-3 rounded-full hover:brightness-95 transition disabled:opacity-60">
                {processing === rejectTarget.id ? 'Rejecting…' : 'Reject'}
              </button>
              <button onClick={() => { setRejectTarget(null); setRejectReason('') }}
                className="flex-1 border border-stone-200 text-stone-600 font-quick font-semibold py-3 rounded-full hover:bg-stone-50 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject child request modal */}
      {rejectCrTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-[28px] shadow-2xl border border-stone-200 p-8 max-w-sm w-full">
            <h3 className="font-kids text-2xl text-wood-dark mb-2">Reject Child Request</h3>
            <p className="text-stone-500 text-sm font-quick mb-5">
              Rejecting request for <strong>{rejectCrTarget.child.firstName} {rejectCrTarget.child.lastName}</strong>. Optionally provide a reason.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Class is currently full. Please check back next semester."
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm resize-none mb-5"
            />
            <div className="flex gap-3">
              <button onClick={handleRejectChildRequest} disabled={processing === rejectCrTarget.id}
                className="flex-1 bg-rose-600 text-white font-bold font-quick py-3 rounded-full hover:brightness-95 transition disabled:opacity-60">
                {processing === rejectCrTarget.id ? 'Rejecting…' : 'Reject'}
              </button>
              <button onClick={() => { setRejectCrTarget(null); setRejectReason('') }}
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

// ── Content Tab ────────────────────────────────────────────────────────────────

const ABOUT_DOC_ID = 'about'

interface AboutContent {
  heading: string
  subheading: string
  pillars: Array<{ title: string; description: string }>
}

const DEFAULT_ABOUT: AboutContent = {
  heading: 'What sets AIMAVA apart',
  subheading: 'Three pillars make our weekend academy a place families trust and children love.',
  pillars: [
    { title: 'Individualized Learning', description: 'We meet each student where they are, honoring every child\'s unique pace in Qur\'an, Arabic, and Islamic studies.' },
    { title: 'Qualified Teachers', description: 'Learn from experienced instructors with formal qualifications in Qur\'an and Tajweed, bringing authentic scholarship and compassion to every class.' },
    { title: 'Holistic Education', description: 'Integrating Islamic Studies, Arabic, and Montessori-based creativity in a nurturing, faith-filled environment.' },
  ],
}

// ── Contact Submissions Tab ───────────────────────────────────────────────────

interface ContactSubmission {
  id: string
  name: string
  email: string
  phone: string
  interests: string[]
  message: string
  submittedAt: { toDate: () => Date } | null
}

function ContactSubmissionsTab() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(query(collection(db, 'contactSubmissions'), orderBy('submittedAt', 'desc')))
      .then(snap => {
        setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as ContactSubmission)))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div>

  if (submissions.length === 0) return (
    <div className="text-center py-20 text-stone-400 font-quick">No contact submissions yet.</div>
  )

  return (
    <div className="space-y-4">
      {submissions.map(s => (
        <div key={s.id} className="bg-white rounded-[20px] border border-stone-200/70 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <div className="font-semibold text-stone-800">{s.name}</div>
              <div className="text-sm text-stone-500 font-quick">{s.email} · {s.phone}</div>
            </div>
            {s.submittedAt && (
              <div className="text-xs text-stone-400 font-quick whitespace-nowrap">
                {(typeof s.submittedAt.toDate === 'function' ? s.submittedAt.toDate() : new Date(s.submittedAt as unknown as string))
                  .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
          </div>
          {s.interests?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {s.interests.map(i => (
                <span key={i} className="text-xs bg-sage-100 text-sage-700 px-2.5 py-1 rounded-full font-quick font-semibold">{i}</span>
              ))}
            </div>
          )}
          {s.message && (
            <p className="text-sm text-stone-600 leading-relaxed border-t border-stone-100 pt-3 mt-3">{s.message}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function ContentTab() {
  const [section, setSection] = useState<'programs' | 'achievements' | 'reviews' | 'about'>('programs')

  // ── Programs ──
  const [programs, setPrograms] = useState<Program[]>([])
  const [progLoading, setProgLoading] = useState(true)
  const [editingProg, setEditingProg] = useState<Program | null>(null)
  const [showProgForm, setShowProgForm] = useState(false)
  const [progForm, setProgForm] = useState<Omit<Program, 'id'>>({
    emoji: '📖', name: '', label: '', title: '', description: '',
    imageUrl: '', imageStyle: '', href: '', comingSoon: false, order: 0, published: true, media: [],
  })
  const [savingProg, setSavingProg] = useState(false)
  const [deletingProgId, setDeletingProgId] = useState<string | null>(null)

  // ── Achievements ──
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [achLoading, setAchLoading] = useState(true)
  const [newAchText, setNewAchText] = useState('')
  const [addingAch, setAddingAch] = useState(false)
  const [editingAchId, setEditingAchId] = useState<string | null>(null)
  const [editingAchText, setEditingAchText] = useState('')
  const [deletingAchId, setDeletingAchId] = useState<string | null>(null)

  // ── Reviews ──
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [reviewForm, setReviewForm] = useState<Omit<Review, 'id'>>({ quote: '', author: '', role: '', order: 0, published: true })
  const [savingReview, setSavingReview] = useState(false)
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null)
  const [approvingReviewId, setApprovingReviewId] = useState<string | null>(null)
  const [rejectingReviewId, setRejectingReviewId] = useState<string | null>(null)

  // ── About ──
  const [about, setAbout] = useState<AboutContent>(DEFAULT_ABOUT)
  const [aboutLoading, setAboutLoading] = useState(true)
  const [savingAbout, setSavingAbout] = useState(false)

  useEffect(() => { loadPrograms() }, [])
  useEffect(() => { loadAchievements() }, [])
  useEffect(() => { loadReviews() }, [])
  useEffect(() => { loadAbout() }, [])

  async function loadPrograms() {
    setProgLoading(true)
    const snap = await getDocs(query(collection(db, 'programs'), orderBy('order', 'asc')))
    setPrograms(snap.docs.map(d => ({ id: d.id, ...d.data() } as Program)))
    setProgLoading(false)
  }

  async function loadAchievements() {
    setAchLoading(true)
    const snap = await getDocs(query(collection(db, 'achievements'), orderBy('order', 'asc')))
    setAchievements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Achievement)))
    setAchLoading(false)
  }

  async function loadAbout() {
    setAboutLoading(true)
    const snap = await getDocs(collection(db, 'site'))
    const aboutDoc = snap.docs.find(d => d.id === ABOUT_DOC_ID)
    if (aboutDoc) setAbout(aboutDoc.data() as AboutContent)
    setAboutLoading(false)
  }

  async function loadReviews() {
    setReviewsLoading(true)
    const snap = await getDocs(query(collection(db, 'reviews'), orderBy('order', 'asc')))
    setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() } as Review)))
    setReviewsLoading(false)
  }

  function openNewReview() {
    setEditingReview(null)
    setReviewForm({ quote: '', author: '', role: '', order: reviews.length, published: true })
    setShowReviewForm(true)
  }

  function openEditReview(r: Review) {
    setEditingReview(r)
    setReviewForm({ quote: r.quote, author: r.author, role: r.role ?? '', order: r.order, published: r.published })
    setShowReviewForm(true)
  }

  async function saveReview() {
    setSavingReview(true)
    const id = editingReview?.id ?? uid()
    const data: Omit<Review, 'id'> = { ...reviewForm }
    if (!data.role) delete (data as Partial<Review>).role
    await setDoc(doc(db, 'reviews', id), data)
    await loadReviews()
    setShowReviewForm(false)
    setEditingReview(null)
    setSavingReview(false)
  }

  async function toggleReview(r: Review) {
    await setDoc(doc(db, 'reviews', r.id), { ...r, published: !r.published })
    setReviews(prev => prev.map(x => x.id === r.id ? { ...x, published: !x.published } : x))
  }

  async function deleteReview(id: string) {
    setDeletingReviewId(id)
    await deleteDoc(doc(db, 'reviews', id))
    setReviews(prev => prev.filter(r => r.id !== id))
    setDeletingReviewId(null)
  }

  async function approveReview(r: Review) {
    setApprovingReviewId(r.id)
    await setDoc(doc(db, 'reviews', r.id), { ...r, published: true, status: 'approved' })
    setReviews(prev => prev.map(x => x.id === r.id ? { ...x, published: true, status: 'approved' } : x))
    setApprovingReviewId(null)
  }

  async function rejectReview(r: Review) {
    setRejectingReviewId(r.id)
    await setDoc(doc(db, 'reviews', r.id), { ...r, published: false, status: 'rejected' })
    setReviews(prev => prev.map(x => x.id === r.id ? { ...x, published: false, status: 'rejected' } : x))
    setRejectingReviewId(null)
  }

  function openNewProgram() {
    setEditingProg(null)
    setProgForm({ emoji: '📖', name: '', label: '', title: '', description: '', imageUrl: '', imageStyle: '', href: '', comingSoon: false, order: programs.length, published: true, media: [] })
    setShowProgForm(true)
  }

  function openEditProgram(p: Program) {
    setEditingProg(p)
    setProgForm({ emoji: p.emoji, name: p.name, label: p.label, title: p.title, description: p.description, imageUrl: p.imageUrl ?? '', imageStyle: p.imageStyle ?? '', href: p.href ?? '', comingSoon: p.comingSoon ?? false, order: p.order, published: p.published, media: p.media ?? [] })
    setShowProgForm(true)
  }

  async function saveProgram() {
    setSavingProg(true)
    const id = editingProg?.id ?? uid()
    const data: Omit<Program, 'id'> = { ...progForm }
    if (!data.imageUrl) delete (data as Partial<Program>).imageUrl
    if (!data.imageStyle) delete (data as Partial<Program>).imageStyle
    if (!data.href) delete (data as Partial<Program>).href
    if (!data.media || data.media.length === 0) delete (data as Partial<Program>).media
    await setDoc(doc(db, 'programs', id), data)
    await loadPrograms()
    setEditingProg(null)
    setShowProgForm(false)
    setSavingProg(false)
  }

  async function toggleProgram(p: Program) {
    await setDoc(doc(db, 'programs', p.id), { ...p, published: !p.published })
    setPrograms(prev => prev.map(x => x.id === p.id ? { ...x, published: !x.published } : x))
  }

  async function deleteProgram(id: string) {
    setDeletingProgId(id)
    await deleteDoc(doc(db, 'programs', id))
    setPrograms(prev => prev.filter(p => p.id !== id))
    setDeletingProgId(null)
  }

  async function addAchievement() {
    if (!newAchText.trim()) return
    setAddingAch(true)
    const id = uid()
    await setDoc(doc(db, 'achievements', id), { text: newAchText.trim(), order: achievements.length })
    await loadAchievements()
    setNewAchText('')
    setAddingAch(false)
  }

  async function saveAchievement(id: string) {
    if (!editingAchText.trim()) return
    const ach = achievements.find(a => a.id === id)
    if (!ach) return
    await setDoc(doc(db, 'achievements', id), { ...ach, text: editingAchText.trim() })
    setAchievements(prev => prev.map(a => a.id === id ? { ...a, text: editingAchText.trim() } : a))
    setEditingAchId(null)
  }

  async function deleteAchievement(id: string) {
    setDeletingAchId(id)
    await deleteDoc(doc(db, 'achievements', id))
    setAchievements(prev => prev.filter(a => a.id !== id))
    setDeletingAchId(null)
  }

  async function saveAbout() {
    setSavingAbout(true)
    await setDoc(doc(db, 'site', ABOUT_DOC_ID), about)
    setSavingAbout(false)
  }

  const inputCls = 'w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 transition'
  const labelCls = 'block text-sm font-semibold text-stone-700 font-quick mb-1.5'

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-kids text-3xl text-wood-dark">Site Content</h2>
        <p className="text-stone-500 text-sm font-quick mt-1 mb-4">Manage programs, achievements, and about us content.</p>
        <div className="flex gap-2 flex-wrap">
          {(['programs', 'achievements', 'reviews', 'about'] as const).map(s => (
            <button key={s} onClick={() => setSection(s)}
              className={`font-quick text-sm font-semibold px-4 py-2 rounded-full transition whitespace-nowrap ${section === s ? 'bg-wood text-white shadow' : 'border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
              {s === 'programs' ? 'Programs' : s === 'achievements' ? 'Achievements' : s === 'reviews' ? 'Reviews' : 'About Us'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Programs ── */}
      {section === 'programs' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={openNewProgram}
              className="bg-wood text-white font-bold font-quick px-5 py-2.5 rounded-full shadow-md hover:brightness-95 transition text-sm">
              + New Program
            </button>
          </div>
          {progLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-3">
              {programs.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-stone-200/70 p-4">
                  {/* Top row */}
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0 mt-0.5">{p.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-stone-800 font-quick text-sm truncate">{p.name}</div>
                      <div className="text-xs text-stone-400 font-quick truncate">{p.title}</div>
                    </div>
                    {p.comingSoon && <span className="text-xs font-quick bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full flex-shrink-0">Coming soon</span>}
                  </div>
                  {/* Bottom row */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100">
                    <label className="flex items-center gap-1.5 cursor-pointer mr-auto">
                      <div className="relative">
                        <input type="checkbox" checked={p.published} onChange={() => toggleProgram(p)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-stone-200 peer-checked:bg-sage-600 rounded-full transition" />
                        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4 shadow-sm" />
                      </div>
                      <span className={`text-xs font-bold font-quick ${p.published ? 'text-sage-700' : 'text-stone-400'}`}>
                        {p.published ? 'Live' : 'Draft'}
                      </span>
                    </label>
                    <button onClick={() => openEditProgram(p)}
                      className="text-xs font-quick text-stone-400 hover:text-sage-700 border border-stone-200 hover:border-sage-300 px-3 py-1.5 rounded-lg transition">
                      Edit
                    </button>
                    <button onClick={() => deleteProgram(p.id)}
                      className="text-xs font-quick text-stone-400 hover:text-rose-600 border border-stone-200 hover:border-rose-300 px-3 py-1.5 rounded-lg transition">
                      {deletingProgId === p.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
              {programs.length === 0 && (
                <div className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-12 text-center">
                  <p className="font-kids text-xl text-stone-400">No programs yet</p>
                </div>
              )}
            </div>
          )}

          {/* Program form modal */}
          {showProgForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center px-6 py-12 overflow-y-auto">
              <div className="bg-cream rounded-[32px] shadow-2xl w-full max-w-lg p-8 space-y-5">
                <h3 className="font-kids text-2xl text-wood-dark">{editingProg?.id ? 'Edit Program' : 'New Program'}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Emoji</label>
                    <input value={progForm.emoji} onChange={e => setProgForm(f => ({...f, emoji: e.target.value}))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Order</label>
                    <input type="number" value={progForm.order} onChange={e => setProgForm(f => ({...f, order: +e.target.value}))} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Nav Name <span className="text-stone-400 font-normal">— shown in dropdown</span></label>
                  <input value={progForm.name} onChange={e => setProgForm(f => ({...f, name: e.target.value}))} className={inputCls} placeholder="Saturday Weekend School" />
                </div>
                <div>
                  <label className={labelCls}>Card Label <span className="text-stone-400 font-normal">— small uppercase label</span></label>
                  <input value={progForm.label} onChange={e => setProgForm(f => ({...f, label: e.target.value}))} className={inputCls} placeholder="Weekend Academy" />
                </div>
                <div>
                  <label className={labelCls}>Card Title</label>
                  <input value={progForm.title} onChange={e => setProgForm(f => ({...f, title: e.target.value}))} className={inputCls} placeholder="Consistent, structured learning" />
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <textarea rows={3} value={progForm.description} onChange={e => setProgForm(f => ({...f, description: e.target.value}))} className={inputCls + ' resize-none'} />
                </div>
                <div>
                  <label className={labelCls}>Image URL <span className="text-stone-400 font-normal">— optional</span></label>
                  <input value={progForm.imageUrl} onChange={e => setProgForm(f => ({...f, imageUrl: e.target.value}))} className={inputCls} placeholder="/class-photo.jpg" />
                </div>
                <div>
                  <label className={labelCls}>Classroom Gallery <span className="text-stone-400 font-normal">— photos & videos shown on the public site</span></label>
                  <p className="text-xs text-stone-400 font-quick mb-3">
                    {editingProg ? 'Upload classroom photos and videos. They appear as a scrollable strip on the Programs section.' : 'Save the program first, then re-open to upload media.'}
                  </p>
                  {editingProg && (
                    <MediaGalleryUploader
                      items={progForm.media ?? []}
                      storagePath={`programs/${editingProg.id}`}
                      onChange={v => setProgForm(f => ({...f, media: v as ProgramMedia[]}))}
                    />
                  )}
                </div>
                <div>
                  <label className={labelCls}>Link / Anchor <span className="text-stone-400 font-normal">— optional, defaults to #dc-programs</span></label>
                  <input value={progForm.href} onChange={e => setProgForm(f => ({...f, href: e.target.value}))} className={inputCls} placeholder="#dc-programs" />
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={progForm.comingSoon} onChange={e => setProgForm(f => ({...f, comingSoon: e.target.checked}))} className="w-4 h-4 accent-sage-600" />
                    <span className="text-sm font-quick font-semibold text-stone-700">Coming Soon</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={progForm.published} onChange={e => setProgForm(f => ({...f, published: e.target.checked}))} className="w-4 h-4 accent-sage-600" />
                    <span className="text-sm font-quick font-semibold text-stone-700">Published</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={saveProgram} disabled={savingProg}
                    className="flex-1 bg-wood text-white font-bold font-quick py-3 rounded-full shadow-md hover:brightness-95 transition disabled:opacity-60">
                    {savingProg ? 'Saving…' : 'Save Program'}
                  </button>
                  <button onClick={() => { setShowProgForm(false); setEditingProg(null) }}
                    className="px-6 py-3 border border-stone-200 rounded-full font-quick text-sm font-semibold text-stone-600 hover:bg-stone-50 transition">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Reviews ── */}
      {section === 'reviews' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={openNewReview}
              className="bg-wood text-white font-bold font-quick px-5 py-2.5 rounded-full shadow-md hover:brightness-95 transition text-sm">
              + New Review
            </button>
          </div>
          {reviewsLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-3">
              {/* Pending parent-submitted reviews */}
              {reviews.filter(r => r.status === 'pending').length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-bold font-quick text-amber-600 uppercase tracking-wider mb-2">
                    Pending Approval ({reviews.filter(r => r.status === 'pending').length})
                  </p>
                  {reviews.filter(r => r.status === 'pending').map(r => (
                    <div key={r.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0 mt-0.5">💬</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-stone-700 font-quick leading-relaxed">"{r.quote}"</p>
                          <p className="text-xs text-stone-400 font-quick mt-1">— {r.author}{r.role ? `, ${r.role}` : ''}</p>
                          {r.submittedAt && (
                            <p className="text-xs text-amber-600 font-quick mt-1">
                              Submitted {new Date(r.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-amber-200">
                        <button
                          onClick={() => approveReview(r)}
                          disabled={approvingReviewId === r.id}
                          className="flex-1 bg-sage-600 text-white font-bold font-quick py-2 rounded-full text-xs hover:brightness-95 transition disabled:opacity-60">
                          {approvingReviewId === r.id ? 'Approving…' : '✓ Approve'}
                        </button>
                        <button
                          onClick={() => rejectReview(r)}
                          disabled={rejectingReviewId === r.id}
                          className="flex-1 border border-rose-300 text-rose-600 font-bold font-quick py-2 rounded-full text-xs hover:bg-rose-50 transition disabled:opacity-60">
                          {rejectingReviewId === r.id ? 'Rejecting…' : '✕ Reject'}
                        </button>
                        <button onClick={() => deleteReview(r.id)}
                          className="text-xs font-quick text-stone-400 hover:text-rose-600 border border-stone-200 hover:border-rose-300 px-3 py-2 rounded-lg transition">
                          {deletingReviewId === r.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-stone-200 pt-4 mb-2">
                    <p className="text-xs font-bold font-quick text-stone-400 uppercase tracking-wider">All Reviews</p>
                  </div>
                </div>
              )}
              {reviews.filter(r => r.status !== 'pending').map(r => (
                <div key={r.id} className="bg-white rounded-2xl border border-stone-200/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0 mt-0.5">💬</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-700 font-quick leading-relaxed line-clamp-2">"{r.quote}"</p>
                      <p className="text-xs text-stone-400 font-quick mt-1">— {r.author}{r.role ? `, ${r.role}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100">
                    <label className="flex items-center gap-1.5 cursor-pointer mr-auto">
                      <div className="relative">
                        <input type="checkbox" checked={r.published} onChange={() => toggleReview(r)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-stone-200 peer-checked:bg-sage-600 rounded-full transition" />
                        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4 shadow-sm" />
                      </div>
                      <span className={`text-xs font-bold font-quick ${r.published ? 'text-sage-700' : 'text-stone-400'}`}>
                        {r.published ? 'Live' : 'Draft'}
                      </span>
                    </label>
                    <button onClick={() => openEditReview(r)}
                      className="text-xs font-quick text-stone-400 hover:text-sage-700 border border-stone-200 hover:border-sage-300 px-3 py-1.5 rounded-lg transition">
                      Edit
                    </button>
                    <button onClick={() => deleteReview(r.id)}
                      className="text-xs font-quick text-stone-400 hover:text-rose-600 border border-stone-200 hover:border-rose-300 px-3 py-1.5 rounded-lg transition">
                      {deletingReviewId === r.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
              {reviews.filter(r => r.status !== 'pending').length === 0 && reviews.filter(r => r.status === 'pending').length === 0 && (
                <div className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-12 text-center">
                  <p className="font-kids text-xl text-stone-400">No reviews yet</p>
                  <p className="text-stone-400 text-sm mt-1 font-quick">Click "New Review" to add a parent testimonial.</p>
                </div>
              )}
            </div>
          )}

          {/* Review form modal */}
          {showReviewForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center px-6 py-12 overflow-y-auto">
              <div className="bg-cream rounded-[32px] shadow-2xl w-full max-w-lg p-8 space-y-5">
                <h3 className="font-kids text-2xl text-wood-dark">{editingReview ? 'Edit Review' : 'New Review'}</h3>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 font-quick mb-1.5">Quote</label>
                  <textarea rows={4} value={reviewForm.quote}
                    onChange={e => setReviewForm(f => ({...f, quote: e.target.value}))}
                    placeholder="What did this parent say about AIMAVA?"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 transition resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 font-quick mb-1.5">Author Name</label>
                  <input value={reviewForm.author}
                    onChange={e => setReviewForm(f => ({...f, author: e.target.value}))}
                    placeholder="e.g. Fatima"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 transition" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 font-quick mb-1.5">Role <span className="text-stone-400 font-normal">— optional</span></label>
                  <input value={reviewForm.role ?? ''}
                    onChange={e => setReviewForm(f => ({...f, role: e.target.value}))}
                    placeholder="e.g. Parent of 2, AIMAVA parent since 2023"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 transition" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 font-quick mb-1.5">Order</label>
                    <input type="number" value={reviewForm.order}
                      onChange={e => setReviewForm(f => ({...f, order: +e.target.value}))}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 transition" />
                  </div>
                  <div className="flex items-end pb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={reviewForm.published}
                        onChange={e => setReviewForm(f => ({...f, published: e.target.checked}))}
                        className="w-4 h-4 accent-sage-600" />
                      <span className="text-sm font-quick font-semibold text-stone-700">Published</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={saveReview} disabled={savingReview || !reviewForm.quote.trim() || !reviewForm.author.trim()}
                    className="flex-1 bg-wood text-white font-bold font-quick py-3 rounded-full shadow-md hover:brightness-95 transition disabled:opacity-60">
                    {savingReview ? 'Saving…' : 'Save Review'}
                  </button>
                  <button onClick={() => { setShowReviewForm(false); setEditingReview(null) }}
                    className="px-6 py-3 border border-stone-200 rounded-full font-quick text-sm font-semibold text-stone-600 hover:bg-stone-50 transition">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Achievements ── */}
      {section === 'achievements' && (
        <div className="space-y-4">
          {achLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div>
          ) : (
            <>
              <div className="space-y-2">
                {achievements.map(a => (
                  <div key={a.id} className="bg-white rounded-2xl border border-stone-200/70 px-5 py-3 flex items-center gap-3">
                    <span className="text-sage-600 flex-shrink-0">✔</span>
                    {editingAchId === a.id ? (
                      <input autoFocus value={editingAchText}
                        onChange={e => setEditingAchText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveAchievement(a.id); if (e.key === 'Escape') setEditingAchId(null) }}
                        className="flex-1 rounded-xl border border-sage-300 bg-sage-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400" />
                    ) : (
                      <span className="flex-1 text-sm text-stone-700 font-quick">{a.text}</span>
                    )}
                    <div className="flex gap-2 flex-shrink-0">
                      {editingAchId === a.id ? (
                        <>
                          <button onClick={() => saveAchievement(a.id)} className="text-xs font-quick text-sage-700 border border-sage-300 hover:bg-sage-50 px-3 py-1 rounded-full transition">Save</button>
                          <button onClick={() => setEditingAchId(null)} className="text-xs font-quick text-stone-400 border border-stone-200 px-3 py-1 rounded-full transition">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingAchId(a.id); setEditingAchText(a.text) }}
                            className="text-xs font-quick text-stone-400 hover:text-sage-700 border border-stone-200 hover:border-sage-300 px-3 py-1 rounded-full transition">Edit</button>
                          <button onClick={() => deleteAchievement(a.id)}
                            className="text-xs font-quick text-stone-400 hover:text-rose-600 border border-stone-200 hover:border-rose-300 px-3 py-1 rounded-full transition">
                            {deletingAchId === a.id ? '…' : 'Delete'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newAchText} onChange={e => setNewAchText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addAchievement() }}
                  placeholder="Add an achievement…"
                  className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 transition" />
                <button onClick={addAchievement} disabled={addingAch || !newAchText.trim()}
                  className="bg-wood text-white font-bold font-quick px-5 py-2.5 rounded-full shadow-md hover:brightness-95 transition disabled:opacity-50 text-sm">
                  {addingAch ? '…' : '+ Add'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── About Us ── */}
      {section === 'about' && (
        <div className="space-y-6">
          {aboutLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div>
          ) : (
            <>
              <div className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-6 space-y-4">
                <h3 className="font-kids text-xl text-wood-dark">Section Header</h3>
                <div>
                  <label className={labelCls}>Heading</label>
                  <input value={about.heading} onChange={e => setAbout(a => ({...a, heading: e.target.value}))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Subheading</label>
                  <input value={about.subheading} onChange={e => setAbout(a => ({...a, subheading: e.target.value}))} className={inputCls} />
                </div>
              </div>
              {about.pillars.map((pillar, i) => (
                <div key={i} className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-6 space-y-4">
                  <h3 className="font-kids text-xl text-wood-dark">Pillar {i + 1}</h3>
                  <div>
                    <label className={labelCls}>Title</label>
                    <input value={pillar.title} onChange={e => setAbout(a => ({...a, pillars: a.pillars.map((p, j) => j === i ? {...p, title: e.target.value} : p)}))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Description</label>
                    <textarea rows={3} value={pillar.description} onChange={e => setAbout(a => ({...a, pillars: a.pillars.map((p, j) => j === i ? {...p, description: e.target.value} : p)}))} className={inputCls + ' resize-none'} />
                  </div>
                </div>
              ))}
              <button onClick={saveAbout} disabled={savingAbout}
                className="w-full bg-wood text-white font-bold font-quick py-4 rounded-full shadow-md hover:brightness-95 transition disabled:opacity-60">
                {savingAbout ? 'Saving…' : 'Save About Us'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Admin Root ────────────────────────────────────────────────────────────────

export default function Admin() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'events' | 'classes' | 'users' | 'registrations' | 'content' | 'contact'>('events')
  const [pendingCount, setPendingCount] = useState(0)
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

  useEffect(() => {
    if (user && isAdmin) {
      loadEvents()
      // Load pending registration count for badge (family + child requests)
      Promise.all([
        getDocs(query(collection(db, 'registrations'), where('status', '==', 'pending'))),
        getDocs(query(collection(db, 'childRequests'), where('status', '==', 'pending'))),
      ]).then(([regSnap, crSnap]) => setPendingCount(regSnap.size + crSnap.size))
        .catch(() => {})
    }
  }, [user, isAdmin])

  async function loadEvents() {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as AcademyEvent)))
  }

  async function handleSave(data: Omit<AcademyEvent, 'id'>) {
    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined && v !== '') clean[k] = v
    }
    if (!clean.eventDate) delete clean.eventDate
    if (!clean.eventEndDate) delete clean.eventEndDate
    await setDoc(doc(db, 'events', data.slug), clean)
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

  if (!user) { window.location.href = '/login'; return null }

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
        <div className="max-w-4xl mx-auto px-6 flex gap-1 -mb-px overflow-x-auto scrollbar-none">
          {(['events', 'classes', 'registrations', 'users', 'content', 'contact'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setEditing(null) }}
              className={`px-5 py-2.5 text-sm font-semibold font-quick border-b-2 transition flex items-center gap-1.5 flex-shrink-0 ${
                activeTab === tab
                  ? 'border-sage-600 text-sage-700'
                  : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}
            >
              {tab === 'events' ? 'Events' : tab === 'classes' ? 'Classes' : tab === 'users' ? 'Users' : tab === 'registrations' ? 'Registrations' : tab === 'content' ? 'Content' : 'Contact'}
              {tab === 'registrations' && pendingCount > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {pendingCount}
                </span>
              )}
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
        ) : activeTab === 'registrations' ? (
          <RegistrationsTab />
        ) : activeTab === 'users' ? (
          <UsersTab />
        ) : activeTab === 'contact' ? (
          <ContactSubmissionsTab />
        ) : (
          <ContentTab />
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
