export default function WaterSlimeWorkshop() {
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
            Past Event · Registration Closed
          </span>
          <h1 className="font-kids text-4xl lg:text-5xl text-wood-dark leading-tight mb-4">
            Prophet Yunus Water Slime Workshop
          </h1>
          <p className="text-stone-500 leading-relaxed max-w-lg mx-auto">
            A hands-on, faith-inspired workshop where students explored the story of Prophet Yunus (عليه السلام) through the fun and creativity of slime-making.
          </p>
        </div>

        {/* Flyer image */}
        <div className="rounded-[28px] overflow-hidden shadow-xl border border-stone-200/70 mb-10">
          <img
            src="https://i0.wp.com/aimava.org/wp-content/uploads/2026/08/3eaabbce-0d6a-43d3-8118-454864bbb242.jpg?w=750&ssl=1"
            alt="Prophet Yunus Water Slime Workshop flyer"
            className="w-full object-cover"
          />
        </div>

        {/* Status card */}
        <div className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-8 mb-8 text-center">
          <div className="text-4xl mb-4">🌊</div>
          <h2 className="font-kids text-2xl text-wood-dark mb-3">Registration is now closed</h2>
          <p className="text-stone-500 leading-relaxed mb-6">
            We reached maximum capacity for this event. Jazak Allah khayran for the overwhelming interest and community support!
          </p>
          <p className="text-sm text-stone-400 font-quick">
            If you registered and paid, event details and updates were sent to your registered parent email address.
          </p>
        </div>

        {/* Stay in the loop */}
        <div className="wood-texture text-white rounded-[28px] p-8 shadow-xl border border-stone-800/40 text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-amber-200 font-quick mb-3">Don't miss the next one</div>
          <p className="font-kids text-2xl leading-tight mb-5">Stay connected for upcoming events and workshops.</p>
          <a
            href="/contact"
            className="inline-block bg-white text-wood-dark font-bold font-quick px-7 py-3 rounded-full shadow-md hover:brightness-95 transition"
          >
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
