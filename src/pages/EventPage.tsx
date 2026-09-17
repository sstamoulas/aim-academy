import { useState, useEffect, useRef } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { AcademyEvent, EventSection, EventMedia } from '../types/event'
import { PRICING_MODEL_LABELS, categorizeEvent } from '../types/event'
import PaymentModal from '../components/PaymentModal'
import Carousel from '../components/Carousel'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

function MediaCarousel({ items }: { items: EventMedia[] }) {
  const [current, setCurrent] = useState(0)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => { if (videoRef.current) videoRef.current.pause() }, [current])

  useEffect(() => {
    if (lightbox === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setLightbox(l => l !== null ? (l + 1) % items.length : l)
      if (e.key === 'ArrowLeft') setLightbox(l => l !== null ? (l - 1 + items.length) % items.length : l)
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, items.length])

  if (items.length === 0) return null

  const isSingle = items.length <= 1

  return (
    <>
      <div className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-6 mb-6">
        <h2 className="font-kids text-2xl text-wood-dark mb-5">Event Gallery</h2>

        <Carousel
          count={items.length}
          interval={4000}
          skipAutoAdvance={items[current]?.type === 'video'}
          onCurrentChange={setCurrent}
          fillHeight
          className="rounded-2xl bg-stone-900 aspect-video mb-4"
          theme="dark"
          arrows
          counter
          progressBar="overlay"
          renderSlide={(i) => {
            const m = items[i]
            return m.type === 'video' ? (
              <video ref={i === current ? videoRef : undefined}
                src={m.url} controls playsInline
                className="w-full h-full object-contain pointer-events-none" />
            ) : (
              <img src={m.url} alt={m.caption || `Photo ${i + 1}`}
                className="w-full h-full object-contain cursor-zoom-in"
                onClick={() => setLightbox(i)} draggable={false} />
            )
          }}
        />

        {/* Caption */}
        {items[current]?.caption && (
          <p className="text-sm text-stone-500 font-quick text-center mb-4 italic">{items[current].caption}</p>
        )}

        {/* Thumbnail strip */}
        {!isSingle && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {items.map((m, i) => (
              <button key={m.id} onClick={() => setCurrent(i)}
                className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition ${
                  i === current ? 'border-sage-600' : 'border-transparent opacity-60 hover:opacity-90'
                }`}>
                {m.type === 'video'
                  ? <div className="w-full h-full bg-stone-800 flex items-center justify-center text-white text-lg">▶</div>
                  : <img src={m.url} alt="" className="w-full h-full object-cover" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <button
            onClick={e => { e.stopPropagation(); setLightbox(l => l !== null ? (l - 1 + items.length) % items.length : l) }}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl transition">‹</button>
          {items[lightbox].type === 'video' ? (
            <video src={items[lightbox].url} controls autoPlay
              className="max-w-full max-h-full rounded-2xl object-contain"
              onClick={e => e.stopPropagation()} />
          ) : (
            <img src={items[lightbox].url} alt={items[lightbox].caption || ''}
              className="max-w-full max-h-full rounded-2xl object-contain"
              onClick={e => e.stopPropagation()} />
          )}
          <button
            onClick={e => { e.stopPropagation(); setLightbox(l => l !== null ? (l + 1) % items.length : l) }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl transition">›</button>
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white w-10 h-10 rounded-full flex items-center justify-center transition">✕</button>
          {items[lightbox].caption && (
            <p className="absolute bottom-6 inset-x-0 text-center text-white/70 text-sm font-quick px-8">
              {items[lightbox].caption}
            </p>
          )}
          <div className="absolute bottom-16 inset-x-0 flex justify-center gap-1.5">
            {items.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setLightbox(i) }}
                className={`rounded-full transition-all ${i === lightbox ? 'bg-white w-3 h-1.5' : 'bg-white/40 w-1.5 h-1.5 hover:bg-white/70'}`} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

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

  const dateCat = categorizeEvent(event)
  const statusLabel =
    dateCat === 'current' ? 'Happening Now' :
    dateCat === 'upcoming' ? 'Upcoming' : 'Past Event'

  const statusColor =
    dateCat === 'current' ? 'bg-rose-100 text-rose-600 border-rose-200' :
    dateCat === 'upcoming' ? 'bg-sage-100 text-sage-700 border-sage-200' :
    'bg-stone-100 text-stone-500 border-stone-200'

  return (
    <div className="bg-cream antialiased overflow-x-hidden min-h-screen flex flex-col">
      <SiteHeader />

      <main className="max-w-2xl mx-auto w-full px-6 lg:px-8 py-16 font-body flex-1">

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


        {/* Media carousel — shown for past events with media */}
        {dateCat === 'past' && event.media && event.media.length > 0 && (
          <MediaCarousel items={event.media} />
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

        {/* Registration closed notice */}
        {event.registrationClosed && (
          <div className="bg-rose-50 border border-rose-200 rounded-[28px] px-8 py-6 mb-6 text-center">
            <div className="text-3xl mb-3">🔒</div>
            <h2 className="font-kids text-xl text-rose-700 mb-2">Registration Closed</h2>
            <p className="text-rose-600 text-sm font-quick leading-relaxed">
              {event.registrationClosedReason || 'We reached maximum capacity for this event. Jazak Allah khayran for the overwhelming interest and community support!'}
            </p>
          </div>
        )}

        {/* External registration link — shown when registrationUrl is set but no Stripe pricing */}
        {!event.registrationClosed && dateCat !== 'past' && event.registrationUrl && (!event.pricing || event.pricing.filter(t => t.amount > 0).length === 0) && (
          <div className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-8 mb-6 text-center">
            <h2 className="font-kids text-2xl text-wood-dark mb-2">Registration</h2>
            <p className="text-stone-500 text-sm font-quick mb-6">Click the button below to complete your registration.</p>
            <a
              href={event.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-wood text-white font-bold font-quick px-8 py-4 rounded-full shadow-md hover:brightness-95 transition"
            >
              Register Now →
            </a>
          </div>
        )}

        {/* Pricing selector + registration for current and upcoming events */}
        {!event.registrationClosed && dateCat !== 'past' && event.pricing && (
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

                {event.registrationUrl && (
                  <p className="text-center text-xs text-stone-400 font-quick mt-4">
                    Prefer a form?{' '}
                    <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sage-700 hover:underline font-semibold">
                      Register via external form →
                    </a>
                  </p>
                )}
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

      </main>
      <SiteFooter />
    </div>
  )
}
