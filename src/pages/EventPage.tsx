import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { AcademyEvent } from '../types/event'

export default function EventPage({ slug }: { slug: string }) {
  const [event, setEvent] = useState<AcademyEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'events', slug))
      if (!snap.exists() || !snap.data().published) {
        setNotFound(true)
      } else {
        setEvent({ id: snap.id, ...snap.data() } as AcademyEvent)
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
        {(event.date || event.time || event.location || event.price || event.ages) && (
          <div className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-8 mb-6 space-y-3">
            <h2 className="font-kids text-2xl text-wood-dark mb-4">Event Details</h2>
            {event.date     && <p className="text-stone-700 flex items-center gap-3"><span className="text-xl">📅</span> {event.date}</p>}
            {event.time     && <p className="text-stone-700 flex items-center gap-3"><span className="text-xl">🕟</span> {event.time}</p>}
            {event.location && <p className="text-stone-700 flex items-center gap-3"><span className="text-xl">📍</span> {event.location}</p>}
            {event.ages     && <p className="text-stone-700 flex items-center gap-3"><span className="text-xl">👧</span> {event.ages}</p>}
            {event.price    && <p className="text-stone-700 flex items-center gap-3"><span className="text-xl">💲</span> {event.price}</p>}
            {event.isDropOff && <p className="text-stone-500 text-sm font-quick pt-1">Drop-off event</p>}
          </div>
        )}

        {/* Registration link for upcoming events */}
        {event.status === 'upcoming' && event.registrationUrl && (
          <div className="mb-6">
            <a
              href={event.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-wood text-white font-bold font-quick py-4 rounded-full shadow-md hover:brightness-95 transition"
            >
              Register Now
            </a>
          </div>
        )}

        {/* Activities */}
        {event.activities && event.activities.length > 0 && (
          <div className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-8 mb-6">
            <h2 className="font-kids text-2xl text-wood-dark mb-4">Your child will enjoy</h2>
            <ul className="space-y-2 text-stone-700">
              {event.activities.map((a, i) => (
                <li key={i} className="flex items-start gap-3"><span className="mt-0.5">✨</span> {a}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Included + Allergy */}
        {(event.included?.length > 0 || event.allergyInfo?.length > 0) && (
          <div className={`grid gap-4 mb-6 ${event.included?.length > 0 && event.allergyInfo?.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {event.included?.length > 0 && (
              <div className="bg-sage-50 rounded-[24px] border border-sage-100 p-6">
                <h3 className="font-kids text-lg text-wood-dark mb-3">What's Included</h3>
                <ul className="space-y-1.5 text-sm text-stone-600">
                  {event.included.map((item, i) => <li key={i}>✔ {item}</li>)}
                </ul>
              </div>
            )}
            {event.allergyInfo?.length > 0 && (
              <div className="bg-orange-50 rounded-[24px] border border-orange-100 p-6">
                <h3 className="font-kids text-lg text-wood-dark mb-3">Allergy Info</h3>
                <p className="text-sm text-stone-500 mb-2">May contain:</p>
                <ul className="space-y-1.5 text-sm text-stone-600">
                  {event.allergyInfo.map((item, i) => <li key={i}>• {item}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* FAQ */}
        {event.faq && event.faq.length > 0 && (
          <div className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-8 mb-8 space-y-5">
            <h2 className="font-kids text-2xl text-wood-dark mb-2">Frequently Asked Questions</h2>
            {event.faq.map(({ q, a }, i) => (
              <div key={i}>
                <p className="font-semibold text-stone-800 font-quick mb-1">{q}</p>
                <p className="text-stone-500 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        )}

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
