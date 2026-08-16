import { useState } from 'react'

export default function ForestCanopy() {
  const [activeTab, setActiveTab] = useState<string>('overview')

  return (
    <div className="bg-cream antialiased overflow-x-hidden">

      {/* MOBILE LAYOUT: Forest Path (hidden at lg+) */}
      <div className="block lg:hidden font-body text-stone-800">
        <div className="min-h-screen">
          <aside className="relative min-h-[420px] text-white bg-cover bg-center" style={{ backgroundImage: "linear-gradient(rgba(28,25,23,.38), rgba(28,25,23,.78)), url('https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&q=80&w=1100')" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/50 via-transparent to-amber-900/25"></div>
            <div className="relative z-10 h-full p-8 flex flex-col justify-between">
              <a href="/" className="flex items-center space-x-3">
                <div className="w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-kids text-xl shadow-md">A</div>
                <div>
                  <div className="font-kids text-xl">Anas Ibn Malik Academy</div>
                  <div className="text-xs uppercase tracking-widest text-emerald-100/80 font-bold">Forest Path</div>
                </div>
              </a>
              <div className="space-y-5 max-w-md mt-8">
                <span className="inline-flex bg-amber-600/90 text-white font-kids text-xs uppercase tracking-widest px-3 py-1 rounded-full">Chantilly, VA</span>
                <h1 className="font-kids text-4xl leading-tight">A weekend path that feels steady, bright, and welcoming.</h1>
                <p className="text-stone-200/90 text-sm leading-relaxed">This page uses a calmer split-screen approach so families can orient themselves quickly without feeling overwhelmed.</p>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-8">
                <div className="bg-white/12 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                  <div className="text-xs font-bold uppercase tracking-widest text-emerald-100">01</div>
                  <div className="font-kids mt-2">Learn</div>
                </div>
                <div className="bg-white/12 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                  <div className="text-xs font-bold uppercase tracking-widest text-emerald-100">02</div>
                  <div className="font-kids mt-2">Practice</div>
                </div>
                <div className="bg-white/12 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                  <div className="text-xs font-bold uppercase tracking-widest text-emerald-100">03</div>
                  <div className="font-kids mt-2">Grow</div>
                </div>
              </div>
            </div>
          </aside>

          <main className="p-6 sm:p-8">
            <nav className="flex flex-wrap gap-2 p-1.5 bg-stone-200/50 rounded-2xl max-w-xl mb-10">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-5 py-2.5 rounded-xl font-kids text-sm tracking-wide transition ${activeTab === 'overview' ? 'bg-emerald-700 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
              >🌿 Overview</button>
              <button
                onClick={() => setActiveTab('activities')}
                className={`px-5 py-2.5 rounded-xl font-kids text-sm tracking-wide transition ${activeTab === 'activities' ? 'bg-emerald-700 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
              >🍪 Activities</button>
              <button
                onClick={() => setActiveTab('safety')}
                className={`px-5 py-2.5 rounded-xl font-kids text-sm tracking-wide transition ${activeTab === 'safety' ? 'bg-emerald-700 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
              >🛡️ Safety First</button>
            </nav>

            <div className="space-y-8">
              {activeTab === 'overview' && (
                <section>
                  <div className="bg-white rounded-[30px] p-7 shadow-sm border border-stone-200/70 mb-6">
                    <h2 className="font-kids text-3xl text-stone-900">Why weekend learning matters</h2>
                    <p className="text-stone-600 leading-relaxed mt-4">The layout leads with clarity: a strong promise, a gentle explanation, and a visible path toward enrollment.</p>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-sage-50 p-4">
                        <div className="font-kids text-lg text-wood-dark">Flexible Slots</div>
                        <div className="text-xs text-stone-500 mt-1">Saturday or Sunday options</div>
                      </div>
                      <div className="rounded-2xl bg-orange-50 p-4">
                        <div className="font-kids text-lg text-wood-dark">Authentic Core</div>
                        <div className="text-xs text-stone-500 mt-1">Qur'an and Sunnah base</div>
                      </div>
                    </div>
                  </div>
                  <div className="wood-texture text-white rounded-[30px] p-7 shadow-xl border border-stone-800/40">
                    <div className="text-xs font-bold uppercase tracking-widest text-amber-200">What parents notice</div>
                    <p className="text-2xl font-bold mt-3 leading-tight">A quieter design, with enough contrast to still pull attention.</p>
                    <ul className="mt-6 space-y-3 text-sm text-stone-200">
                      <li>• Clean drop-off experience</li>
                      <li>• Kid-friendly, parent-trustful tone</li>
                      <li>• Strong visual hierarchy</li>
                    </ul>
                  </div>
                </section>
              )}

              {activeTab === 'activities' && (
                <section>
                  <div className="bg-white rounded-[30px] p-7 shadow-sm border border-stone-200/70">
                    <h2 className="font-kids text-3xl text-stone-900">Less lectures, more doing</h2>
                    <p className="text-stone-600 leading-relaxed mt-3">Activities are set up as a clear path, with each card showing a concrete thing a child will do.</p>
                    <div className="mt-6 grid gap-3">
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-sage-50">
                        <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center font-bold text-sage-700">1</div>
                        <div>
                          <div className="font-bold text-wood-dark">Animals in the Qur'an Cookie Baking</div>
                          <div className="text-xs text-stone-500">Fun, tactile, memorable</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-orange-50">
                        <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center font-bold text-wood">2</div>
                        <div>
                          <div className="font-bold text-wood-dark">Calligraphy &amp; craft stations</div>
                          <div className="text-xs text-stone-500">Steady focus with a creative payoff</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-stone-100">
                        <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center font-bold text-emerald-700">3</div>
                        <div>
                          <div className="font-bold text-wood-dark">Interactive story circles</div>
                          <div className="text-xs text-stone-500">Social, calm, and age-friendly</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === 'safety' && (
                <section>
                  <div className="bg-white rounded-[30px] p-7 shadow-sm border border-stone-200/70 mb-6">
                    <h2 className="font-kids text-3xl text-stone-900">Your absolute peace of mind</h2>
                    <p className="text-stone-600 leading-relaxed mt-3">Safety is presented as a visible system, not a footnote.</p>
                    <div className="mt-5 space-y-3 text-sm">
                      <div className="flex items-center gap-2"><span className="text-emerald-600">✔</span> Secure check-in and sign-out</div>
                      <div className="flex items-center gap-2"><span className="text-emerald-600">✔</span> Vetted instructors</div>
                      <div className="flex items-center gap-2"><span className="text-emerald-600">✔</span> Allergen-aware spaces</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-700 to-sage-600 text-white rounded-[30px] p-7 shadow-xl">
                    <div className="text-xs font-bold uppercase tracking-widest text-emerald-100">Why it works</div>
                    <p className="text-2xl font-bold mt-3 leading-tight">Trust cues and warm colors reduce friction before the user even reads the copy.</p>
                  </div>
                </section>
              )}
            </div>

            <div className="mt-10 pt-6 border-t border-stone-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-stone-400">Join Us Today</div>
                <div className="font-kids text-xl text-stone-900">Classes filling quickly</div>
              </div>
              <a href="#" className="bg-amber-700 hover:bg-amber-800 text-white font-kids px-6 py-3.5 rounded-2xl shadow-md transition text-center">Quick Registration</a>
            </div>
          </main>
        </div>
      </div>

      {/* DESKTOP LAYOUT: Canopy Campus (hidden below lg) */}
      <div className="hidden lg:block font-quick text-stone-800 selection:bg-sage-100">
        <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur border-b border-stone-200/70">
          <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sage-600 text-white font-bold text-xl flex items-center justify-center shadow-md">A</div>
              <div className="leading-none">
                <div className="text-lg font-bold tracking-tight text-wood-dark">Anas Ibn Malik</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-sage-700">Academy</div>
              </div>
            </a>
            <nav className="flex items-center gap-8 font-semibold text-stone-600">
              <a href="#dc-rhythm" className="hover:text-sage-700 transition-colors">Rhythm</a>
              <a href="#dc-tracks" className="hover:text-sage-700 transition-colors">Tracks</a>
              <a href="#dc-stories" className="hover:text-sage-700 transition-colors">Stories</a>
              <a href="#dc-join" className="bg-wood text-white px-5 py-2.5 rounded-full shadow-md hover:brightness-95 transition">Register Now</a>
            </nav>
          </div>
        </header>

        <main>
          <section className="relative overflow-hidden bg-sage-100/80 py-24">
            <div className="absolute -top-24 left-0 w-72 h-72 bg-wood/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-sage-600/10 rounded-full blur-3xl"></div>
            <div className="max-w-7xl mx-auto px-8 grid grid-cols-12 gap-10 items-center relative z-10">
              <div className="col-span-5 space-y-6">
                <span className="inline-flex items-center gap-2 bg-white text-sage-700 border border-sage-600/15 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
                  ✨ Enrolling for Fall 2026
                </span>
                <h1 className="text-5xl xl:text-6xl font-bold text-wood-dark leading-tight tracking-tight">
                  A campus page that feels <span className="text-sage-600">open, warm, and alive.</span>
                </h1>
                <p className="text-lg text-stone-600 max-w-xl leading-relaxed">
                  Built to help families understand the school in a single glance: what it is, why it matters, and how to move forward.
                </p>
                <div className="flex gap-4">
                  <a href="#dc-tracks" className="bg-sage-600 text-white font-bold px-8 py-4 rounded-full shadow-lg hover:bg-sage-700 transition">Explore Tracks</a>
                  <a href="#dc-rhythm" className="bg-white text-stone-700 border border-stone-300 font-bold px-8 py-4 rounded-full shadow-sm hover:bg-stone-50 transition">See the Rhythm</a>
                </div>
              </div>

              <div className="col-span-7 grid grid-cols-12 gap-4">
                <div className="col-span-7 bg-white rounded-[28px] shadow-xl border border-stone-100 overflow-hidden">
                  <div className="aspect-[4/3] bg-cover bg-center" style={{ backgroundImage: "linear-gradient(to top, rgba(43,33,24,.45), rgba(43,33,24,.05)), url('https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=1000&q=80')" }}></div>
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-wood">Campus highlight</div>
                      <div className="text-lg font-bold text-wood-dark">Joyful, hands-on learning</div>
                    </div>
                    <span className="text-xs font-bold bg-sage-100 text-sage-700 px-3 py-1.5 rounded-full">Ages 5+</span>
                  </div>
                </div>
                <div className="col-span-5 space-y-4">
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

          <section id="dc-rhythm" className="py-20 px-8 max-w-7xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="text-4xl font-bold text-wood-dark">The week has a rhythm parents can trust</h2>
                <p className="text-stone-500 font-medium mt-2 max-w-2xl">Three clear beats keep the site calm: learn, build, and belong.</p>
              </div>
              <div className="text-sm font-semibold text-sage-700 bg-sage-100 px-4 py-2 rounded-full whitespace-nowrap">Designed for attention without noise</div>
            </div>
            <div className="grid grid-cols-3 gap-6">
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

          <section id="dc-tracks" className="py-20 px-8 bg-stone-50/70 border-y border-stone-200/70">
            <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 items-start">
              <div className="col-span-4 space-y-4">
                <span className="text-xs font-bold uppercase tracking-widest text-wood">Program bands</span>
                <h2 className="text-4xl font-bold text-wood-dark">Clear paths, one strong brand voice</h2>
                <p className="text-stone-600 leading-relaxed">The layout stays calm and readable while still giving each offering a distinct visual role.</p>
              </div>
              <div className="col-span-8 grid grid-cols-2 gap-6">
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

          <section id="dc-stories" className="py-20 px-8 max-w-5xl mx-auto">
            <div className="bg-wood-dark text-white rounded-[32px] overflow-hidden shadow-2xl grid grid-cols-12">
              <div className="col-span-5 p-10 wood-texture">
                <div className="text-xs font-bold uppercase tracking-widest text-amber-200">Parent voice</div>
                <p className="text-3xl font-bold mt-3 leading-tight">"We knew exactly what the school stood for within seconds."</p>
              </div>
              <div className="col-span-7 p-10 space-y-5 bg-gradient-to-br from-sage-700 to-sage-600">
                <p className="text-sage-50 leading-relaxed">This final band gives the page a confident close: one emotional line, one trust signal, and one action button.</p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-white/12 rounded-2xl p-4">Warm tone</div>
                  <div className="bg-white/12 rounded-2xl p-4">Clear promise</div>
                  <div className="bg-white/12 rounded-2xl p-4">Visible CTA</div>
                </div>
              </div>
            </div>
          </section>

          <section id="dc-join" className="py-10 px-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between gap-4 bg-white rounded-[28px] p-6 shadow-sm border border-stone-200/70">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-stone-400">Ready to visit?</div>
                <div className="text-2xl font-bold text-wood-dark">Request a registration link</div>
              </div>
              <a href="#" className="bg-wood text-white font-bold px-7 py-3.5 rounded-full shadow-md hover:brightness-95 transition">Register Now</a>
            </div>
          </section>
        </main>
      </div>

    </div>
  )
}
