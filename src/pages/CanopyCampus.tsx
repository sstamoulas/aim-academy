import { Link } from 'react-router-dom'

export default function CanopyCampus() {
  return (
    <div className="bg-cream font-quick text-stone-800 antialiased selection:bg-sage-100">
      <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur border-b border-stone-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage-600 text-white font-bold text-xl flex items-center justify-center shadow-md">A</div>
            <div className="leading-none">
              <div className="text-lg font-bold tracking-tight text-wood-dark">Anas Ibn Malik</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-sage-700">Academy</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 font-semibold text-stone-600">
            <a href="#rhythm" className="hover:text-sage-700 transition-colors">Rhythm</a>
            <a href="#tracks" className="hover:text-sage-700 transition-colors">Tracks</a>
            <a href="#stories" className="hover:text-sage-700 transition-colors">Stories</a>
            <a href="#join" className="bg-wood text-white px-5 py-2.5 rounded-full shadow-md hover:brightness-95 transition">Register Now</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-sage-100/80 py-16 lg:py-24">
          <div className="absolute -top-24 left-0 w-72 h-72 bg-wood/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-sage-600/10 rounded-full blur-3xl"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-10 items-center relative z-10">
            <div className="lg:col-span-5 text-center lg:text-left space-y-6">
              <span className="inline-flex items-center gap-2 bg-white text-sage-700 border border-sage-600/15 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
                ✨ Enrolling for Fall 2026
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-wood-dark leading-tight tracking-tight">
                A campus page that feels <span className="text-sage-600">open, warm, and alive.</span>
              </h1>
              <p className="text-lg text-stone-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Built to help families understand the school in a single glance: what it is, why it matters, and how to move forward.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a href="#tracks" className="bg-sage-600 text-white font-bold px-8 py-4 rounded-full shadow-lg hover:bg-sage-700 transition text-center">Explore Tracks</a>
                <a href="#rhythm" className="bg-white text-stone-700 border border-stone-300 font-bold px-8 py-4 rounded-full shadow-sm hover:bg-stone-50 transition text-center">See the Rhythm</a>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-7 bg-white rounded-[28px] shadow-xl border border-stone-100 overflow-hidden">
                <div className="aspect-[4/3] bg-cover bg-center" style={{ backgroundImage: "linear-gradient(to top, rgba(43,33,24,.45), rgba(43,33,24,.05)), url('https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=1000&q=80')" }}></div>
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-wood">Campus highlight</div>
                    <div className="text-lg font-bold text-wood-dark">Joyful, hands-on learning</div>
                  </div>
                  <span className="text-xs font-bold bg-sage-100 text-sage-700 px-3 py-1.5 rounded-full">Ages 5+</span>
                </div>
              </div>
              <div className="col-span-12 md:col-span-5 space-y-4">
                <div className="wood-texture text-white rounded-[28px] p-6 shadow-xl border border-stone-800/40">
                  <div className="text-xs font-bold uppercase tracking-widest text-amber-200">Our Objective</div>
                  <p className="text-2xl font-bold leading-tight mt-2">Based on the Quran and authentic Sunnah.</p>
                </div>
                <div className="bg-white rounded-[28px] p-6 shadow-lg border border-stone-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-sage-50 p-4">
                      <div className="text-2xl">📖</div>
                      <div className="font-bold text-wood-dark mt-2">Qur'an</div>
                      <div className="text-xs text-stone-500 mt-1">Clear recitation path</div>
                    </div>
                    <div className="rounded-2xl bg-orange-50 p-4">
                      <div className="text-2xl">🎨</div>
                      <div className="font-bold text-wood-dark mt-2">Creative</div>
                      <div className="text-xs text-stone-500 mt-1">Projects with meaning</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="rhythm" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-wood-dark">The week has a rhythm parents can trust</h2>
              <p className="text-stone-500 font-medium mt-2 max-w-2xl">Three clear beats keep the site calm: learn, build, and belong.</p>
            </div>
            <div className="text-sm font-semibold text-sage-700 bg-sage-100 px-4 py-2 rounded-full w-fit">Designed for attention without noise</div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <article className="bg-white rounded-[28px] p-7 shadow-sm border border-stone-200/70">
              <div className="text-xs font-bold uppercase tracking-widest text-sage-700">01 / Learn</div>
              <h3 className="text-2xl font-bold text-wood-dark mt-3">Strong foundations first</h3>
              <p className="text-stone-600 mt-3 leading-relaxed">Qur'an, Arabic, and Islamic studies are presented as a clear progression, not as a block of text.</p>
            </article>
            <article className="wood-texture text-white rounded-[28px] p-7 shadow-xl border border-stone-800/40">
              <div className="text-xs font-bold uppercase tracking-widest text-amber-200">02 / Build</div>
              <h3 className="text-2xl font-bold mt-3">Hands-on experiences that stick</h3>
              <p className="text-stone-200 mt-3 leading-relaxed">Workshops, crafts, and baking activities create a stronger memory than a plain brochure layout ever could.</p>
            </article>
            <article className="bg-stone-100 rounded-[28px] p-7 shadow-sm border border-stone-200/70">
              <div className="text-xs font-bold uppercase tracking-widest text-wood">03 / Belong</div>
              <h3 className="text-2xl font-bold text-wood-dark mt-3">A place that feels safe</h3>
              <p className="text-stone-600 mt-3 leading-relaxed">Warm colors and open spacing reduce friction so families feel invited rather than sold to.</p>
            </article>
          </div>
        </section>

        <section id="tracks" className="py-20 px-4 sm:px-6 lg:px-8 bg-stone-50/70 border-y border-stone-200/70">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-4 space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-wood">Program bands</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-wood-dark">Clear paths, one strong brand voice</h2>
              <p className="text-stone-600 leading-relaxed">The layout stays calm and readable while still giving each offering a distinct visual role.</p>
            </div>
            <div className="lg:col-span-8 grid sm:grid-cols-2 gap-6">
              <article className="bg-white rounded-[28px] overflow-hidden shadow-sm border border-stone-200/70">
                <div className="aspect-[16/9] bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=80')" }}></div>
                <div className="p-6 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-sage-700">Weekend Academy</div>
                  <h3 className="text-2xl font-bold text-wood-dark">Steady learning, week after week</h3>
                  <p className="text-stone-600 leading-relaxed">This path is about consistency and growth, with a reassuring sense of progression for parents.</p>
                </div>
              </article>
              <article className="bg-white rounded-[28px] overflow-hidden shadow-sm border border-stone-200/70">
                <div className="aspect-[16/9] bg-cover bg-center" style={{ backgroundImage: "linear-gradient(to top, rgba(43,33,24,.35), rgba(43,33,24,.05)), url('https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=900&q=80')" }}></div>
                <div className="p-6 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-wood">Creative Workshops</div>
                  <h3 className="text-2xl font-bold text-wood-dark">Short bursts with strong emotional pull</h3>
                  <p className="text-stone-600 leading-relaxed">The workshop card uses stronger contrast so it stands out as the exciting, limited-time option.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="stories" className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="bg-wood-dark text-white rounded-[32px] overflow-hidden shadow-2xl grid lg:grid-cols-12">
            <div className="lg:col-span-5 p-8 sm:p-10 wood-texture">
              <div className="text-xs font-bold uppercase tracking-widest text-amber-200">Parent voice</div>
              <p className="text-3xl font-bold mt-3 leading-tight">"We knew exactly what the school stood for within seconds."</p>
            </div>
            <div className="lg:col-span-7 p-8 sm:p-10 space-y-5 bg-gradient-to-br from-sage-700 to-sage-600">
              <p className="text-sage-50 leading-relaxed">This final band gives the page a confident close: one emotional line, one trust signal, and one action button.</p>
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-white/12 rounded-2xl p-4">Warm tone</div>
                <div className="bg-white/12 rounded-2xl p-4">Clear promise</div>
                <div className="bg-white/12 rounded-2xl p-4">Visible CTA</div>
              </div>
            </div>
          </div>
        </section>

        <section id="join" className="py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-[28px] p-6 shadow-sm border border-stone-200/70">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-stone-400">Ready to visit?</div>
              <div className="text-2xl font-bold text-wood-dark">Request a registration link</div>
            </div>
            <a href="#" className="bg-wood text-white font-bold px-7 py-3.5 rounded-full shadow-md hover:brightness-95 transition text-center">Register Now</a>
          </div>
        </section>
      </main>
    </div>
  )
}
