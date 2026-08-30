export default function AnimalsInQuran() {
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
          <span className="inline-flex items-center gap-2 bg-stone-100 text-stone-500 border border-stone-200 px-4 py-1.5 rounded-full text-sm font-semibold font-quick shadow-sm mb-5">
            Past Event · Sold Out
          </span>
          <h1 className="font-kids text-4xl lg:text-5xl text-wood-dark leading-tight mb-4">
            Animals in the Qur'an Cookie Baking Workshop
          </h1>
          <p className="text-stone-500 leading-relaxed max-w-lg mx-auto">
            A fun, hands-on workshop where children baked and decorated delicious animal-shaped cookies while discovering the beautiful lessons behind animals mentioned in the Qur'an.
          </p>
        </div>

        {/* Flyer image */}
        <div className="rounded-[28px] overflow-hidden shadow-xl border border-stone-200/70 mb-10">
          <img
            src="https://i0.wp.com/aimava.org/wp-content/uploads/2026/07/fb5677d7-6ea3-4c68-b661-71884783461f.jpg?resize=791%2C1024&ssl=1"
            alt="Animals in the Qur'an Cookie Baking Workshop flyer"
            className="w-full object-cover"
          />
        </div>

        {/* Sold out notice */}
        <div className="bg-rose-50 border border-rose-200 rounded-2xl px-6 py-4 mb-8 text-center">
          <p className="text-rose-600 font-semibold font-quick text-sm">
            Sold out! Please stay tuned for our next event.
          </p>
        </div>

        {/* Event details */}
        <div className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-8 mb-6 space-y-3">
          <h2 className="font-kids text-2xl text-wood-dark mb-4">Event Details</h2>
          <p className="text-stone-700 flex items-center gap-3"><span className="text-xl">📅</span> Friday, July 17, 2026</p>
          <p className="text-stone-700 flex items-center gap-3"><span className="text-xl">🕟</span> 4:30 – 7:30 PM</p>
          <p className="text-stone-700 flex items-center gap-3"><span className="text-xl">📍</span> 14325 Willard Rd Unit D, Chantilly, VA 20151</p>
          <p className="text-stone-700 flex items-center gap-3"><span className="text-xl">👧</span> Ages 5+</p>
          <p className="text-stone-700 flex items-center gap-3"><span className="text-xl">💲</span> $24.99</p>
          <p className="text-stone-500 text-sm font-quick pt-1">Drop-off event</p>
        </div>

        {/* Your child will enjoy */}
        <div className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-8 mb-6">
          <h2 className="font-kids text-2xl text-wood-dark mb-4">Your child will enjoy</h2>
          <ul className="space-y-2 text-stone-700">
            <li className="flex items-center gap-3"><span className="text-xl">🍪</span> Baking cookies</li>
            <li className="flex items-center gap-3"><span className="text-xl">🎨</span> Decorating cookies</li>
            <li className="flex items-center gap-3"><span className="text-xl">📖</span> Storytime</li>
            <li className="flex items-center gap-3"><span className="text-xl">🦁</span> Learning about animals in the Qur'an</li>
            <li className="flex items-center gap-3"><span className="text-xl">🎨</span> Animal craft</li>
          </ul>
        </div>

        {/* What's included + Allergy */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-sage-50 rounded-[24px] border border-sage-100 p-6">
            <h3 className="font-kids text-lg text-wood-dark mb-3">What's Included</h3>
            <ul className="space-y-1.5 text-sm text-stone-600">
              <li>✔ All supplies</li>
              <li>✔ Craft materials</li>
              <li>✔ Cookie decorating</li>
              <li>✔ Storytime</li>
            </ul>
          </div>
          <div className="bg-orange-50 rounded-[24px] border border-orange-100 p-6">
            <h3 className="font-kids text-lg text-wood-dark mb-3">Allergy Info</h3>
            <p className="text-sm text-stone-500 mb-2">Cookies may contain:</p>
            <ul className="space-y-1.5 text-sm text-stone-600">
              <li>• Wheat</li>
              <li>• Eggs</li>
              <li>• Dairy</li>
            </ul>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-8 mb-8 space-y-5">
          <h2 className="font-kids text-2xl text-wood-dark mb-2">Frequently Asked Questions</h2>
          {[
            { q: 'What ages is this workshop for?', a: 'Children ages 5 and up.' },
            { q: 'Is this a drop-off event?', a: 'Yes. Parents drop off at 4:30 PM and return for pickup at 7:30 PM.' },
            { q: 'Are supplies included?', a: 'Yes. All baking materials, craft supplies, and workshop activities are included in the registration fee.' },
            { q: 'What should my child wear?', a: 'Comfortable clothing and closed-toe shoes are recommended.' },
            { q: 'What if my child has food allergies?', a: 'We cannot guarantee an allergen-free environment. Please disclose any allergies on the registration form.' },
          ].map(({ q, a }) => (
            <div key={q}>
              <p className="font-semibold text-stone-800 font-quick mb-1">{q}</p>
              <p className="text-stone-500 text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </div>

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
