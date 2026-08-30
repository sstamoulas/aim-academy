import { useState } from 'react'

const INTERESTS = [
  { id: 'general', label: 'General inquiry' },
  { id: 'weekend-school', label: 'Weekend school' },
  { id: 'events', label: 'Events & activities' },
]

interface FormState {
  name: string
  phone: string
  email: string
  interests: string[]
  message: string
}

export default function ContactUs() {
  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    email: '',
    interests: [],
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function toggleInterest(id: string) {
    setForm(prev => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter(i => i !== id)
        : [...prev.interests, id],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      setError('Please fill in your name, phone, and email.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/submitContactForm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Submission failed')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again or email us directly.')
    } finally {
      setSubmitting(false)
    }
  }

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

        {/* Hero */}
        <div className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 bg-sage-100 text-sage-700 border border-sage-600/15 px-4 py-1.5 rounded-full text-sm font-semibold font-quick shadow-sm mb-5">
            ✉️ Get in touch
          </span>
          <h1 className="font-kids text-4xl lg:text-5xl text-wood-dark leading-tight mb-4">
            We'd love to hear from you
          </h1>
          <p className="text-stone-500 leading-relaxed max-w-lg mx-auto">
            Have questions about our programs? Interested in enrolling? Fill out the form below and we'll get back to you shortly, in sha Allah.
          </p>
        </div>

        {submitted ? (
          <div className="bg-sage-50 border border-sage-200 rounded-[28px] p-10 text-center shadow-sm">
            <div className="text-5xl mb-4">🌿</div>
            <h2 className="font-kids text-3xl text-wood-dark mb-3">Message received!</h2>
            <p className="text-stone-600 leading-relaxed mb-6">
              Jazak Allah khayran for reaching out. We'll be in touch soon, in sha Allah.
            </p>
            <a
              href="/"
              className="inline-block bg-sage-600 text-white font-semibold font-quick px-7 py-3 rounded-full shadow-md hover:bg-sage-700 transition"
            >
              Return home
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-8 space-y-6">

              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-stone-700 font-quick mb-2">
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition"
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-stone-700 font-quick mb-2">
                  Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="(555) 000-0000"
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-stone-700 font-quick mb-2">
                  Email <span className="text-rose-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition"
                />
              </div>

              {/* Interests */}
              <div>
                <p className="block text-sm font-semibold text-stone-700 font-quick mb-3">
                  Interested in
                </p>
                <div className="flex flex-wrap gap-3">
                  {INTERESTS.map(({ id, label }) => {
                    const checked = form.interests.includes(id)
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleInterest(id)}
                        className={`px-4 py-2.5 rounded-full border text-sm font-semibold font-quick transition
                          ${checked
                            ? 'bg-sage-600 text-white border-sage-600 shadow-sm'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-sage-400 hover:text-sage-700'
                          }`}
                      >
                        {checked && <span className="mr-1.5">✓</span>}
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-stone-700 font-quick mb-2">
                  Message <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Any questions or details you'd like to share…"
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-wood text-white font-bold font-quick py-4 rounded-full shadow-md hover:brightness-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          </form>
        )}

        {/* Footer note */}
        <p className="text-center text-xs text-stone-400 font-quick mt-8">
          Anas Ibn Malik Academy · Chantilly, VA
        </p>
      </main>
    </div>
  )
}
