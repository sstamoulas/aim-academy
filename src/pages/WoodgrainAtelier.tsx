import { Link } from 'react-router-dom'

export default function WoodgrainAtelier() {
  return (
    <div className="bg-cream font-body text-stone-800 antialiased">
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div className="bg-white/85 backdrop-blur border border-stone-200/70 rounded-3xl px-5 py-4 shadow-sm flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-kids text-xl shadow-md">A</div>
            <div>
              <div className="font-kids text-lg text-stone-900">AIM Academy</div>
              <div className="text-xs uppercase tracking-widest text-wood font-bold">Woodgrain Atelier</div>
            </div>
          </Link>
          <a href="#join" className="bg-amber-700 text-white px-5 py-2.5 rounded-full hover:bg-amber-800 transition shadow-sm font-kids tracking-wide">Register Now</a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
        <section className="grid lg:grid-cols-12 gap-8 items-stretch">
          <article className="lg:col-span-6 rounded-[34px] bg-white p-7 sm:p-9 shadow-sm border border-stone-200/70">
            <span className="text-xs font-bold uppercase tracking-widest text-sage-700 bg-sage-100 px-3.5 py-1.5 rounded-full inline-block">Modular dashboard feel</span>
            <h1 className="font-kids text-4xl sm:text-5xl text-stone-900 leading-tight mt-5">Built like a crafted board, not a typical brochure.</h1>
            <p className="text-stone-600 leading-relaxed mt-5">This page leans into a modular layout with clear zones for proof, programs, and conversion. It feels different while still carrying the same warm AIMAVA identity.</p>
            <div className="mt-8 grid sm:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-sage-50 p-4">
                <div className="font-bold text-wood-dark">Low friction</div>
                <div className="text-xs text-stone-500 mt-1">Easy to understand fast</div>
              </div>
              <div className="rounded-2xl bg-orange-50 p-4">
                <div className="font-bold text-wood-dark">Warm tone</div>
                <div className="text-xs text-stone-500 mt-1">Green and wood depth</div>
              </div>
              <div className="rounded-2xl bg-stone-100 p-4">
                <div className="font-bold text-wood-dark">Strong CTA</div>
                <div className="text-xs text-stone-500 mt-1">Visible at every phase</div>
              </div>
            </div>
          </article>

          <aside className="lg:col-span-6 grid sm:grid-cols-2 gap-4">
            <div className="rounded-[28px] overflow-hidden shadow-xl border border-stone-100 bg-cover bg-center min-h-[300px]" style={{ backgroundImage: "linear-gradient(to top, rgba(43,33,24,.5), rgba(43,33,24,.05)), url('https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=1000')" }}></div>
            <div className="space-y-4">
              <div className="wood-texture rounded-[28px] p-6 text-white shadow-xl border border-stone-800/40">
                <div className="text-xs font-bold uppercase tracking-widest text-amber-200">Core line</div>
                <p className="text-2xl font-bold mt-2 leading-tight">Faith, hands-on learning, and a sense of belonging.</p>
              </div>
              <div className="bg-white rounded-[28px] p-6 shadow-sm border border-stone-200/70">
                <div className="text-xs font-bold uppercase tracking-widest text-wood">Quick facts</div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span>Weekend academy</span><span className="font-bold text-wood-dark">Ages 5+</span></div>
                  <div className="flex items-center justify-between"><span>Workshop model</span><span className="font-bold text-wood-dark">Limited seats</span></div>
                  <div className="flex items-center justify-between"><span>Curriculum</span><span className="font-bold text-wood-dark">Qur'an + Sunnah</span></div>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 rounded-[30px] bg-white p-7 sm:p-8 shadow-sm border border-stone-200/70">
            <div className="text-xs font-bold uppercase tracking-widest text-wood">Program matrix</div>
            <h2 className="font-kids text-3xl text-stone-900 mt-2">Everything fits into a clean grid.</h2>
            <p className="text-stone-600 mt-4 leading-relaxed">This section separates offerings into distinct modules so each one feels intentional and easy to compare.</p>
          </div>
          <div className="lg:col-span-8 grid sm:grid-cols-2 gap-4">
            <div className="rounded-[30px] bg-sage-50 p-6 border border-stone-200/70">
              <div className="text-2xl">📖</div>
              <div className="font-bold text-wood-dark mt-3 text-xl">Academy track</div>
              <p className="text-stone-600 mt-2 leading-relaxed">Reliable progression for Qur'an, Arabic, and adab.</p>
            </div>
            <div className="rounded-[30px] bg-orange-50 p-6 border border-stone-200/70">
              <div className="text-2xl">🎨</div>
              <div className="font-bold text-wood-dark mt-3 text-xl">Workshop track</div>
              <p className="text-stone-600 mt-2 leading-relaxed">Creative sessions with clear emotional pull.</p>
            </div>
            <div className="rounded-[30px] bg-white p-6 border border-stone-200/70 shadow-sm">
              <div className="text-2xl">🌟</div>
              <div className="font-bold text-wood-dark mt-3 text-xl">Parent trust</div>
              <p className="text-stone-600 mt-2 leading-relaxed">Safety, clarity, and a calm decision path.</p>
            </div>
            <div className="rounded-[30px] bg-stone-100 p-6 border border-stone-200/70">
              <div className="text-2xl">🧺</div>
              <div className="font-bold text-wood-dark mt-3 text-xl">A simple next step</div>
              <p className="text-stone-600 mt-2 leading-relaxed">One visible registration button keeps momentum.</p>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 rounded-[34px] bg-stone-950 text-white p-8 sm:p-10 shadow-2xl">
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-200">Parent quote</div>
            <p className="text-3xl font-bold mt-3 leading-tight">"It felt organized, welcoming, and genuinely built for kids."</p>
            <p className="text-stone-300 mt-5 leading-relaxed">The dark testimonial panel gives the page a stronger anchor and a different emotional beat from the other templates.</p>
          </div>
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-[34px] p-7 sm:p-8 shadow-sm border border-stone-200/70">
              <div className="text-xs font-bold uppercase tracking-widest text-sage-700">What stands out</div>
              <ul className="mt-4 space-y-3 text-sm text-stone-600">
                <li className="flex items-center gap-2"><span className="text-emerald-600">✔</span> Structured layout</li>
                <li className="flex items-center gap-2"><span className="text-emerald-600">✔</span> Strong contrast hierarchy</li>
                <li className="flex items-center gap-2"><span className="text-emerald-600">✔</span> Clear conversion zone</li>
              </ul>
            </div>
            <a id="join" href="#" className="block text-center bg-wood text-white font-kids px-7 py-4 rounded-2xl shadow-md hover:brightness-95 transition">Open Registration Portal</a>
          </div>
        </section>
      </main>
    </div>
  )
}
