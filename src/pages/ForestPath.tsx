import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function ForestPath() {
  const [activeTab, setActiveTab] = useState<string>('overview')

  return (
    <div className="bg-cream font-body text-stone-800 antialiased overflow-x-hidden">
      <div className="min-h-screen lg:grid lg:grid-cols-[44%_56%]">
        <aside className="relative min-h-[420px] lg:min-h-screen text-white bg-cover bg-center" style={{ backgroundImage: "linear-gradient(rgba(28,25,23,.38), rgba(28,25,23,.78)), url('https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&q=80&w=1100')" }}>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/50 via-transparent to-amber-900/25"></div>
          <div className="relative z-10 h-full p-8 lg:p-12 flex flex-col justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-kids text-xl shadow-md">A</div>
              <div>
                <div className="font-kids text-xl">Anas Ibn Malik Academy</div>
                <div className="text-xs uppercase tracking-widest text-emerald-100/80 font-bold">Forest Path</div>
              </div>
            </Link>
            <div className="space-y-5 max-w-md">
              <span className="inline-flex bg-amber-600/90 text-white font-kids text-xs uppercase tracking-widest px-3 py-1 rounded-full">Chantilly, VA</span>
              <h1 className="font-kids text-4xl lg:text-5xl leading-tight">A weekend path that feels steady, bright, and welcoming.</h1>
              <p className="text-stone-200/90 text-sm lg:text-base leading-relaxed">This page uses a calmer split-screen approach so families can orient themselves quickly without feeling overwhelmed.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
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

        <main className="p-6 sm:p-8 lg:p-16">
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
                <div className="grid md:grid-cols-[1.15fr_.85fr] gap-6 items-start">
                  <div className="bg-white rounded-[30px] p-7 sm:p-8 shadow-sm border border-stone-200/70">
                    <h2 className="font-kids text-3xl text-stone-900">Why weekend learning matters</h2>
                    <p className="text-stone-600 leading-relaxed mt-4">The layout leads with clarity: a strong promise, a gentle explanation, and a visible path toward enrollment.</p>
                    <div className="mt-6 grid sm:grid-cols-2 gap-3">
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
                </div>
              </section>
            )}

            {activeTab === 'activities' && (
              <section>
                <div className="bg-white rounded-[30px] p-7 sm:p-8 shadow-sm border border-stone-200/70">
                  <h2 className="font-kids text-3xl text-stone-900">Less lectures, more doing</h2>
                  <p className="text-stone-600 leading-relaxed mt-3">Activities are set up as a clear path, with each card showing a concrete thing a child will do and a parent can picture immediately.</p>
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
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-[30px] p-7 sm:p-8 shadow-sm border border-stone-200/70">
                    <h2 className="font-kids text-3xl text-stone-900">Your absolute peace of mind</h2>
                    <p className="text-stone-600 leading-relaxed mt-3">Safety is presented as a visible system, not a footnote.</p>
                    <div className="mt-5 space-y-3 text-sm">
                      <div className="flex items-center gap-2"><span className="text-emerald-600">✔</span> Secure check-in and sign-out</div>
                      <div className="flex items-center gap-2"><span className="text-emerald-600">✔</span> Vetted instructors</div>
                      <div className="flex items-center gap-2"><span className="text-emerald-600">✔</span> Allergen-aware spaces</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-700 to-sage-600 text-white rounded-[30px] p-7 sm:p-8 shadow-xl">
                    <div className="text-xs font-bold uppercase tracking-widest text-emerald-100">Why it works</div>
                    <p className="text-2xl font-bold mt-3 leading-tight">Trust cues and warm colors reduce friction before the user even reads the copy.</p>
                  </div>
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
  )
}
