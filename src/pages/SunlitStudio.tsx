import { Link } from 'react-router-dom'

export default function SunlitStudio() {
  return (
    <div className="bg-cream font-body text-stone-800 antialiased">
      <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur border-b border-stone-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl text-white flex items-center justify-center font-kids text-xl shadow-md">A</div>
            <div className="leading-none">
              <div className="font-kids text-lg text-stone-900">AIM Academy</div>
              <div className="text-xs uppercase tracking-widest text-sage-700 font-bold">Sunlit Studio</div>
            </div>
          </Link>
          <a href="#register" className="bg-stone-950 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition">
            Enroll Now
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-12">
        <section className="grid lg:grid-cols-12 gap-8 items-stretch">
          <article className="lg:col-span-5 bg-white rounded-[34px] p-7 sm:p-9 shadow-sm border border-stone-200/70 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3.5 py-1.5 rounded-full inline-block">Story-first homepage</span>
              <h1 className="font-kids text-4xl sm:text-5xl text-stone-900 leading-tight mt-5">A page that feels like a quiet storybook spread.</h1>
              <p className="text-stone-600 leading-relaxed mt-5">This template is intentionally editorial and vertical, with each section behaving like a chapter instead of repeating the same card rhythm.</p>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-sage-50 p-4">
                <div className="text-xs font-bold uppercase tracking-widest text-sage-700">Trust</div>
                <div className="font-bold text-wood-dark mt-2">Calm structure</div>
              </div>
              <div className="rounded-2xl bg-orange-50 p-4">
                <div className="text-xs font-bold uppercase tracking-widest text-wood">Mood</div>
                <div className="font-bold text-wood-dark mt-2">Warm and bright</div>
              </div>
            </div>
          </article>

          <article className="lg:col-span-7 grid gap-4">
            <div className="rounded-[34px] overflow-hidden shadow-xl border border-stone-100 bg-cover bg-center min-h-[320px]" style={{ backgroundImage: "linear-gradient(to top, rgba(43,33,24,.45), rgba(43,33,24,.05)), url('https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1200')" }}></div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-[28px] bg-white p-5 shadow-sm border border-stone-200/70">
                <div className="text-2xl">📖</div>
                <div className="font-bold text-wood-dark mt-3">Qur'an &amp; Tajweed</div>
                <div className="text-sm text-stone-500 mt-1">Clear, progressive learning.</div>
              </div>
              <div className="rounded-[28px] bg-white p-5 shadow-sm border border-stone-200/70">
                <div className="text-2xl">🎨</div>
                <div className="font-bold text-wood-dark mt-3">Hands-on Projects</div>
                <div className="text-sm text-stone-500 mt-1">Activities with a purpose.</div>
              </div>
              <div className="rounded-[28px] bg-white p-5 shadow-sm border border-stone-200/70">
                <div className="text-2xl">🌱</div>
                <div className="font-bold text-wood-dark mt-3">Character Building</div>
                <div className="text-sm text-stone-500 mt-1">Gentle, reassuring growth.</div>
              </div>
            </div>
          </article>
        </section>

        <section className="grid lg:grid-cols-12 gap-8 items-start">
          <article className="lg:col-span-7 bg-white rounded-[34px] p-7 sm:p-9 shadow-sm border border-stone-200/70">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-wood">Program lens</div>
                <h2 className="font-kids text-3xl text-stone-900 mt-2">One page, multiple entry points.</h2>
              </div>
              <div className="hidden sm:block text-sm font-semibold text-sage-700 bg-sage-100 px-4 py-2 rounded-full">Easy to scan</div>
            </div>
            <div className="mt-6 grid gap-3">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-sage-50">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-bold text-sage-700">1</div>
                <div>
                  <div className="font-bold text-wood-dark">Start with a strong promise</div>
                  <div className="text-sm text-stone-600 mt-1">Tell parents why the school exists and why it matters.</div>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-orange-50">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-bold text-wood">2</div>
                <div>
                  <div className="font-bold text-wood-dark">Show a real scene</div>
                  <div className="text-sm text-stone-600 mt-1">Use one hero image or collage, not a wall of images.</div>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-stone-100">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-bold text-emerald-700">3</div>
                <div>
                  <div className="font-bold text-wood-dark">Close with a clear CTA</div>
                  <div className="text-sm text-stone-600 mt-1">A single strong action button keeps momentum high.</div>
                </div>
              </div>
            </div>
          </article>

          <aside className="lg:col-span-5 bg-gradient-to-br from-emerald-700 to-sage-600 rounded-[34px] p-7 sm:p-9 text-white shadow-xl">
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-100">Parent note</div>
            <p className="text-3xl font-bold leading-tight mt-3">A calm UI feels more trustworthy than one trying too hard.</p>
            <p className="text-emerald-50/85 leading-relaxed mt-5">This template gives the page a softer editorial motion so it feels distinct from the split-screen pages and the modular dashboard page.</p>
            <div className="mt-7 grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/12 rounded-2xl p-4">Soft contrast</div>
              <div className="bg-white/12 rounded-2xl p-4">Long-form pacing</div>
              <div className="bg-white/12 rounded-2xl p-4">Friendly hierarchy</div>
              <div className="bg-white/12 rounded-2xl p-4">Clear registration path</div>
            </div>
          </aside>
        </section>

        <section id="register" className="rounded-[34px] bg-stone-950 text-white p-8 sm:p-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 shadow-2xl">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-200">Ready to act</div>
            <div className="font-kids text-3xl mt-2">Reserve a child-friendly slot today</div>
          </div>
          <a href="#" className="bg-amber-600 hover:bg-amber-700 text-white font-kids px-7 py-3.5 rounded-2xl shadow-md transition text-center">Open Registration Portal</a>
        </section>
      </main>
    </div>
  )
}
