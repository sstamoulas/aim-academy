import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { AcademyEvent, EventSection } from '../types/event'
import { PRICING_MODEL_LABELS } from '../types/event'
import PaymentModal from '../components/PaymentModal'

function renderSection(section: EventSection) {
  switch (section.type) {
    case 'list':
      return (
        <div key={section.id} className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-8 mb-6">
          <h2 className="font-kids text-2xl text-wood-dark mb-4">{section.title}</h2>
          <ul className="space-y-2 text-stone-700">
            {(section.items ?? []).map((item, i) => (
              <li key={i} className="flex items-start gap-3"><span className="mt-0.5">✨</span> {item}</li>
            ))}
          </ul>
        </div>
      )
    case 'faq':
      return (
        <div key={section.id} className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-8 mb-6 space-y-5">
          <h2 className="font-kids text-2xl text-wood-dark mb-2">{section.title}</h2>
          {(section.faqs ?? []).map(({ q, a }, i) => (
            <div key={i}>
              <p className="font-semibold text-stone-800 font-quick mb-1">{q}</p>
              <p className="text-stone-500 text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      )
    case 'text':
      return (
        <div key={section.id} className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-8 mb-6">
          <h2 className="font-kids text-2xl text-wood-dark mb-4">{section.title}</h2>
          <p className="text-stone-600 leading-relaxed whitespace-pre-line">{section.body}</p>
        </div>
      )
    default:
      return null
  }
}

export default function EventPage({ slug }: { slug: string }) {
  const [event, setEvent] = useState<AcademyEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'events', slug))
        if (!snap.exists()) {
          setNotFound(true)
        } else {
          setEvent({ id: snap.id, ...snap.data() } as AcademyEvent)
        }
      } catch {
        setNotFound(true)
      }
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !event) {
    return (
      <div className="bg-cream min-h-screen flex flex-col items-center justify-center gap-4 font-body text-center px-6">
        <div className="text-5xl">🌿</div>
        <h1 className="font-kids text-3xl text-wood-dark">Event not found</h1>
        <p className="text-stone-500">This event may no longer be available.</p>
        <a href="/" className="font-quick text-sm font-semibold text-sage-700 hover:underline">← Back to home</a>
      </div>
    )
  }

  const statusLabel =
    event.status === 'sold-out' ? 'Sold Out' :
    event.status === 'past' ? 'Past Event' : 'Upcoming'

  const statusColor =
    event.status === 'upcoming'
      ? 'bg-sage-100 text-sage-700 border-sage-200'
      : 'bg-stone-100 text-stone-500 border-stone-200'

  return (
    <div className="bg-cream antialiased overflow-x-hidden min-h-screen">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur border-b border-stone-200/70">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Anas Ibn Malik Academy" className="w-10 h-10 rounded-xl shadow-md object-contain bg-white p-0.5" />
            <div className="leading-none">
              <div className="font-kids text-lg text-wood-dark">Anas Ibn Malik</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-sage-700 font-quick">Academy</div>
            </div>
          </a>
          <a href="/" className="font-quick text-sm font-semibold text-stone-500 hover:text-sage-700 transition-colors">
            ← Back to home
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 lg:px-8 py-16 font-body">

        {/* Badge + title */}
        <div className="mb-10 text-center">
          <span className={`inline-flex items-center gap-2 border px-4 py-1.5 rounded-full text-sm font-semibold font-quick shadow-sm mb-5 ${statusColor}`}>
            {statusLabel}
          </span>
          <h1 className="font-kids text-4xl lg:text-5xl text-wood-dark leading-tight mb-4">{event.title}</h1>
          {event.description && (
            <p className="text-stone-500 leading-relaxed max-w-lg mx-auto">{event.description}</p>
          )}
        </div>

        {/* Flyer image */}
        {event.flyerImageUrl && (
          <div className="rounded-[28px] overflow-hidden shadow-xl border border-stone-200/70 mb-10">
            <img src={event.flyerImageUrl} alt={`${event.title} flyer`} className="w-full object-cover" />
          </div>
        )}

        {/* Sold out notice */}
        {event.status === 'sold-out' && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl px-6 py-4 mb-8 text-center">
            <p className="text-rose-600 font-semibold font-quick text-sm">
              Sold out! Please stay tuned for our next event.
            </p>
          </div>
        )}

        {/* Event details */}
        {event.details && event.details.length > 0 && (
          <div className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-8 mb-6 space-y-3">
            <h2 className="font-kids text-2xl text-wood-dark mb-4">Event Details</h2>
            {event.details.map((detail) => (
              <p key={detail.id} className="text-stone-700 flex items-center gap-3">
                <span className="text-xl">{detail.icon}</span>
                <span><span className="font-semibold font-quick text-stone-500 text-sm mr-1">{detail.label}:</span>{detail.value}</span>
              </p>
            ))}
          </div>
        )}

        {/* Pricing selector + registration for upcoming events */}
        {event.status === 'upcoming' && event.pricing && (
          (() => {
            const tiers = event.pricing!.filter(t => t.amount > 0)
            if (tiers.length === 0) return null
            const activeTierId = selectedTierId ?? tiers[0].id
            const selectedTier = tiers.find(t => t.id === activeTierId) ?? tiers[0]
            const cols = tiers.length === 1 ? 'grid-cols-1' : tiers.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
            return (
              <div className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-8 mb-6">
                <h2 className="font-kids text-2xl text-wood-dark mb-5">Registration</h2>

                {/* Tier cards */}
                <div className={`grid ${cols} gap-3 mb-6`}>
                  {tiers.map(tier => {
                    const selected = tier.id === activeTierId
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setSelectedTierId(tier.id)}
                        className={`rounded-2xl border-2 p-4 text-left transition-all ${
                          selected
                            ? 'border-sage-600 bg-sage-50 shadow-sm'
                            : 'border-stone-200 hover:border-sage-300 hover:bg-stone-50'
                        }`}
                      >
                        <div className={`text-xs font-bold uppercase tracking-widest font-quick mb-2 ${selected ? 'text-sage-600' : 'text-stone-400'}`}>
                          {selected && <span className="mr-1">✓</span>}{tier.label}
                        </div>
                        <div className="font-kids text-2xl text-wood-dark">
                          ${(tier.amount / 100).toFixed(2)}
                        </div>
                        {tier.model && (
                          <div className="text-xs text-sage-600 font-quick font-semibold mt-1">{PRICING_MODEL_LABELS[tier.model]}</div>
                        )}
                        {tier.sublabel && (
                          <div className="text-xs text-stone-400 font-quick mt-0.5">{tier.sublabel}</div>
                        )}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => setPaymentOpen(true)}
                  className="w-full bg-wood text-white font-bold font-quick py-4 rounded-full shadow-md hover:brightness-95 transition"
                >
                  Register Now — ${(selectedTier.amount / 100).toFixed(2)}
                </button>

                <PaymentModal
                  isOpen={paymentOpen}
                  onClose={() => setPaymentOpen(false)}
                  amount={selectedTier.amount}
                  description={`${event.title} — ${selectedTier.label}`}
                />
              </div>
            )
          })()
        )}

        {/* Dynamic content sections */}
        {event.sections && event.sections.map(section => renderSection(section))}

        {/* CTA */}
        <div className="wood-texture text-white rounded-[28px] p-8 shadow-xl border border-stone-800/40 text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-amber-200 font-quick mb-3">Don't miss the next one</div>
          <p className="font-kids text-2xl leading-tight mb-5">Stay connected for upcoming events and workshops.</p>
          <a href="/contact" className="inline-block bg-white text-wood-dark font-bold font-quick px-7 py-3 rounded-full shadow-md hover:brightness-95 transition">
            Contact Us
          </a>
        </div>

        <p className="text-center text-xs text-stone-400 font-quick mt-8">
          Anas Ibn Malik Academy · Chantilly, VA
        </p>
      </main>
    </div>
  )
}
