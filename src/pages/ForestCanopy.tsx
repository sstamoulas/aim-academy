import { useState } from 'react'
import PaymentModal from '../components/PaymentModal'

// TODO: set final registration amount in cents (e.g. 15000 = $150.00)
const REGISTRATION_AMOUNT = 15000
const REGISTRATION_DESCRIPTION = 'Weekend Academy Registration'

export default function ForestCanopy() {
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="bg-cream antialiased overflow-x-hidden">

      {/* MOBILE LAYOUT (hidden at lg+) */}
      <div className="block lg:hidden font-body text-stone-800">
        <div className="min-h-screen">
          <aside className="relative min-h-[420px] text-white bg-cover bg-center" style={{ backgroundImage: "linear-gradient(rgba(28,25,23,.38), rgba(28,25,23,.78)), url('/class-photo.jpg')" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/50 via-transparent to-amber-900/25"></div>
            <div className="relative z-10 h-full p-8 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <a href="/" className="flex items-center space-x-3">
                  <img src="/logo.png" alt="Anas Ibn Malik Academy" className="w-11 h-11 rounded-xl shadow-md object-contain bg-white p-0.5" />
                  <div>
                    <div className="font-kids text-xl">Anas Ibn Malik Academy</div>
                    <div className="text-xs uppercase tracking-widest text-emerald-100/80 font-bold">Chantilly, VA</div>
                  </div>
                </a>
                <button
                  onClick={() => setMobileMenuOpen(o => !o)}
                  aria-label="Toggle menu"
                  className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 hover:bg-white/25 transition"
                >
                  <span className={`block w-5 h-0.5 bg-white rounded-full transition-all duration-200 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                  <span className={`block w-5 h-0.5 bg-white rounded-full transition-all duration-200 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
                  <span className={`block w-5 h-0.5 bg-white rounded-full transition-all duration-200 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
                </button>
              </div>

              {/* Mobile slide-down menu */}
              {mobileMenuOpen && (
                <div className="mt-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">

                  {/* Home group */}
                  <div className="px-5 pt-3 pb-1 text-xs font-bold uppercase tracking-widest text-emerald-200/70">Home</div>
                  <a href="#dc-about" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-5 py-2.5 text-white font-kids text-sm hover:bg-white/10 transition">
                    🌿 About Us
                  </a>
                  <a href="#dc-achievements" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-5 py-2.5 text-white font-kids text-sm hover:bg-white/10 transition">
                    🏆 Achievements
                  </a>
                  <a href="/contact" className="flex items-center gap-3 px-5 py-2.5 text-white font-kids text-sm hover:bg-white/10 transition">
                    ✉️ Contact Us
                  </a>

                  <div className="border-t border-white/10 mx-5 my-2" />

                  {/* Programs group */}
                  <div className="px-5 pt-1 pb-1 text-xs font-bold uppercase tracking-widest text-emerald-200/70">Programs</div>
                  <a href="#dc-programs" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-5 py-2.5 text-white font-kids text-sm hover:bg-white/10 transition">
                    📖 Saturday Weekend School
                  </a>
                  <div className="flex items-center gap-3 px-5 py-2.5 font-kids text-sm text-white/40">
                    ☀️ Summer Camp <span className="ml-auto text-xs bg-white/10 text-white/50 px-2 py-0.5 rounded-full">Coming soon</span>
                  </div>

                  <div className="border-t border-white/10 mx-5 my-2" />

                  {/* Events group */}
                  <div className="px-5 pt-1 pb-1 text-xs font-bold uppercase tracking-widest text-emerald-200/70">Events</div>
                  <a href="/events/animals-in-quran" className="flex items-center gap-3 px-5 py-2.5 text-white font-kids text-sm hover:bg-white/10 transition">
                    🐾 Animals in Quran
                  </a>
                  <a href="/events/prophet-yunus-water-slime" className="flex items-center gap-3 px-5 py-2.5 text-white font-kids text-sm hover:bg-white/10 transition">
                    💧 Prophet Yunus Water Slime
                  </a>
                  <div className="flex items-center gap-3 px-5 py-2.5 font-kids text-sm text-white/40">
                    🌟 Future Event <span className="ml-auto text-xs bg-white/10 text-white/50 px-2 py-0.5 rounded-full">TBA</span>
                  </div>

                  <div className="border-t border-white/10 mx-5 my-2" />

                  <button onClick={() => { setMobileMenuOpen(false); setPaymentOpen(true) }} className="w-full flex items-center gap-3 px-5 py-3.5 text-amber-200 font-kids text-sm hover:bg-white/10 transition">
                    ✨ Register Now
                  </button>
                </div>
              )}
              <div className="space-y-5 max-w-md mt-8">
                <span className="inline-flex bg-amber-600/90 text-white font-kids text-xs uppercase tracking-widest px-3 py-1 rounded-full">Chantilly, VA</span>
                <h1 className="font-kids text-4xl leading-tight">A weekend Islamic school built on love for the Qur'an and Sunnah.</h1>
                <p className="text-stone-200/90 text-sm leading-relaxed">Founded in 2023 to provide a warm, faith-based environment for children to grow in knowledge and love for Islam.</p>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-8">
                <div className="bg-white/12 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                  <div className="text-xs font-bold uppercase tracking-widest text-emerald-100">01</div>
                  <div className="font-kids mt-2">Qur'an</div>
                </div>
                <div className="bg-white/12 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                  <div className="text-xs font-bold uppercase tracking-widest text-emerald-100">02</div>
                  <div className="font-kids mt-2">Arabic</div>
                </div>
                <div className="bg-white/12 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                  <div className="text-xs font-bold uppercase tracking-widest text-emerald-100">03</div>
                  <div className="font-kids mt-2">Islamic Studies</div>
                </div>
              </div>
            </div>
          </aside>

          <main className="p-6 sm:p-8">
            <nav className="flex flex-wrap gap-2 p-1.5 bg-stone-200/50 rounded-2xl max-w-xl mb-10">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-5 py-2.5 rounded-xl font-kids text-sm tracking-wide transition ${activeTab === 'overview' ? 'bg-emerald-700 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
              >🌿 About Us</button>
              <button
                onClick={() => setActiveTab('activities')}
                className={`px-5 py-2.5 rounded-xl font-kids text-sm tracking-wide transition ${activeTab === 'activities' ? 'bg-emerald-700 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
              >📖 Programs</button>
              <button
                onClick={() => setActiveTab('safety')}
                className={`px-5 py-2.5 rounded-xl font-kids text-sm tracking-wide transition ${activeTab === 'safety' ? 'bg-emerald-700 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
              >🏆 Achievements</button>
              <a
                href="/contact"
                className="px-5 py-2.5 rounded-xl font-kids text-sm tracking-wide transition text-stone-600 hover:text-stone-900"
              >✉️ Contact</a>
            </nav>

            <div className="space-y-8">
              {activeTab === 'overview' && (
                <section>
                  <div className="bg-white rounded-[30px] p-7 shadow-sm border border-stone-200/70 mb-6">
                    <h2 className="font-kids text-3xl text-stone-900">Founded with purpose in 2023</h2>
                    <p className="text-stone-600 leading-relaxed mt-4">Rooted in the Qur'an and authentic Sunnah, our weekend program combines traditional learning with a modern, engaging approach that honors every child's unique pace.</p>
                    <p className="text-stone-600 leading-relaxed mt-3">We follow the prophetic model of Anas ibn Malik (رضي الله عنه) — teaching with compassion, respect, and love. Our goal is to cultivate students who live their faith beautifully and carry it proudly into the world.</p>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-sage-50 p-4">
                        <div className="font-kids text-lg text-wood-dark">Our Mission</div>
                        <div className="text-xs text-stone-500 mt-1">Foster growth through Qur'anic learning & Islamic values</div>
                      </div>
                      <div className="rounded-2xl bg-orange-50 p-4">
                        <div className="font-kids text-lg text-wood-dark">Our Vision</div>
                        <div className="text-xs text-stone-500 mt-1">Raise confident, compassionate Muslim leaders of tomorrow</div>
                      </div>
                    </div>
                  </div>
                  <div className="wood-texture text-white rounded-[30px] p-7 shadow-xl border border-stone-800/40">
                    <div className="text-xs font-bold uppercase tracking-widest text-amber-200">Parent voice</div>
                    <p className="text-2xl font-bold mt-3 leading-tight">"AIMAVA has been a blessing for our family — my son loves coming to class every week!"</p>
                    <p className="mt-4 text-stone-300 text-sm">— Parent</p>
                  </div>
                </section>
              )}

              {activeTab === 'activities' && (
                <section>
                  <div className="bg-white rounded-[30px] p-7 shadow-sm border border-stone-200/70">
                    <h2 className="font-kids text-3xl text-stone-900">What makes us unique</h2>
                    <p className="text-stone-600 leading-relaxed mt-3">Integrating Islamic Studies, Arabic, and Montessori-based creativity in a nurturing, faith-filled environment.</p>
                    <div className="mt-6 grid gap-3">
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-sage-50">
                        <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-xl">🧠</div>
                        <div>
                          <div className="font-bold text-wood-dark">Individualized Learning</div>
                          <div className="text-xs text-stone-500">We meet each student where they are</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-orange-50">
                        <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-xl">❤️</div>
                        <div>
                          <div className="font-bold text-wood-dark">Qualified Teachers</div>
                          <div className="text-xs text-stone-500">Learn from experienced instructors with formal qualifications in Qur'an and Tajweed</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-stone-100">
                        <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-xl">🌸</div>
                        <div>
                          <div className="font-bold text-wood-dark">Holistic Education</div>
                          <div className="text-xs text-stone-500">Islamic Studies, Arabic, and Montessori-based creativity</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === 'safety' && (
                <section>
                  <div className="bg-white rounded-[30px] p-7 shadow-sm border border-stone-200/70 mb-6">
                    <h2 className="font-kids text-3xl text-stone-900">Student achievements</h2>
                    <p className="text-stone-600 leading-relaxed mt-3">Since our inception in 2023, AIMAVA students have achieved remarkable milestones.</p>
                    <div className="mt-5 space-y-3 text-sm">
                      <div className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">✔</span> Several students have completed Qaida and are now fluent Qur'an readers.</div>
                      <div className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">✔</span> Five students have completed memorization of the entire Qur'an (Hifz).</div>
                      <div className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">✔</span> Many others are mastering recitation with precise Tajweed and deep understanding.</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-700 to-sage-600 text-white rounded-[30px] p-7 shadow-xl">
                    <div className="text-xs font-bold uppercase tracking-widest text-emerald-100">A testament to dedication</div>
                    <p className="text-2xl font-bold mt-3 leading-tight">These accomplishments reflect the dedication of our students, the commitment of our teachers, and the blessing of Allah ﷻ.</p>
                  </div>
                </section>
              )}
            </div>

            <div className="mt-10 pt-6 border-t border-stone-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-stone-400">Join Us Today</div>
                <div className="font-kids text-xl text-stone-900">Classes filling quickly</div>
              </div>
              <button onClick={() => setPaymentOpen(true)} className="bg-amber-700 hover:bg-amber-800 text-white font-kids px-6 py-3.5 rounded-2xl shadow-md transition text-center">Quick Registration</button>
            </div>
          </main>
        </div>
      </div>

      {/* DESKTOP LAYOUT (hidden below lg) */}
      <div className="hidden lg:block font-quick text-stone-800 selection:bg-sage-100">
        <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur border-b border-stone-200/70">
          <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="Anas Ibn Malik Academy" className="w-10 h-10 rounded-xl shadow-md object-contain bg-white p-0.5" />
              <div className="leading-none">
                <div className="text-lg font-bold tracking-tight text-wood-dark">Anas Ibn Malik</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-sage-700">Academy</div>
              </div>
            </a>
            <nav className="flex items-center gap-1 font-semibold text-stone-600">

              {/* Home */}
              <div className="group relative">
                <button className="flex items-center gap-1 px-4 py-2 rounded-xl hover:bg-stone-100 hover:text-sage-700 transition-colors">
                  Home
                  <svg className="w-3.5 h-3.5 mt-px text-stone-400 group-hover:text-sage-600 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className="absolute top-full left-0 pt-2 opacity-0 -translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
                  <div className="bg-white rounded-2xl shadow-xl border border-stone-200/70 py-2 min-w-[180px]">
                    <a href="#dc-about" className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-sage-50 hover:text-sage-700 transition-colors">
                      <span className="text-base">🌿</span> About Us
                    </a>
                    <a href="#dc-achievements" className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-sage-50 hover:text-sage-700 transition-colors">
                      <span className="text-base">🏆</span> Achievements
                    </a>
                    <a href="/contact" className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-sage-50 hover:text-sage-700 transition-colors">
                      <span className="text-base">✉️</span> Contact Us
                    </a>
                  </div>
                </div>
              </div>

              {/* Programs */}
              <div className="group relative">
                <button className="flex items-center gap-1 px-4 py-2 rounded-xl hover:bg-stone-100 hover:text-sage-700 transition-colors">
                  Programs
                  <svg className="w-3.5 h-3.5 mt-px text-stone-400 group-hover:text-sage-600 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className="absolute top-full left-0 pt-2 opacity-0 -translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
                  <div className="bg-white rounded-2xl shadow-xl border border-stone-200/70 py-2 min-w-[220px]">
                    <a href="#dc-programs" className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-sage-50 hover:text-sage-700 transition-colors">
                      <span className="text-base">📖</span> Saturday Weekend School
                    </a>
                    <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-400 cursor-default select-none">
                      <span className="text-base">☀️</span>
                      <span>Summer Camp</span>
                      <span className="ml-auto text-xs font-normal bg-stone-100 text-stone-400 px-2 py-0.5 rounded-full">Coming soon</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Events */}
              <div className="group relative">
                <button className="flex items-center gap-1 px-4 py-2 rounded-xl hover:bg-stone-100 hover:text-sage-700 transition-colors">
                  Events
                  <svg className="w-3.5 h-3.5 mt-px text-stone-400 group-hover:text-sage-600 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className="absolute top-full left-0 pt-2 opacity-0 -translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
                  <div className="bg-white rounded-2xl shadow-xl border border-stone-200/70 py-2 min-w-[240px]">
                    <div className="px-4 pt-1 pb-2 text-xs font-bold uppercase tracking-widest text-stone-400">Past events</div>
                    <a href="/events/animals-in-quran" className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-sage-50 hover:text-sage-700 transition-colors">
                      <span className="text-base">🐾</span> Animals in Quran
                    </a>
                    <a href="/events/prophet-yunus-water-slime" className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-sage-50 hover:text-sage-700 transition-colors">
                      <span className="text-base">💧</span> Prophet Yunus Water Slime
                    </a>
                    <div className="border-t border-stone-100 mt-1 pt-1">
                      <div className="px-4 pt-2 pb-1 text-xs font-bold uppercase tracking-widest text-stone-400">Upcoming</div>
                      <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-400 cursor-default select-none">
                        <span className="text-base">🌟</span>
                        <span>Future Event</span>
                        <span className="ml-auto text-xs font-normal bg-stone-100 text-stone-400 px-2 py-0.5 rounded-full">TBA</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={() => setPaymentOpen(true)} className="ml-3 bg-wood text-white px-5 py-2.5 rounded-full shadow-md hover:brightness-95 transition">Register Now</button>
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
                  A weekend Islamic school built on <span className="text-sage-600">Qur'an and authentic Sunnah.</span>
                </h1>
                <p className="text-lg text-stone-600 max-w-xl leading-relaxed">
                  Founded in 2023 in Chantilly, VA — our program combines traditional Islamic learning with a modern, engaging approach that honors every child's unique pace.
                </p>
                <div className="flex gap-4">
                  <a href="#dc-programs" className="bg-sage-600 text-white font-bold px-8 py-4 rounded-full shadow-lg hover:bg-sage-700 transition">Explore Programs</a>
                  <a href="#dc-about" className="bg-white text-stone-700 border border-stone-300 font-bold px-8 py-4 rounded-full shadow-sm hover:bg-stone-50 transition">About Us</a>
                </div>
              </div>

              <div className="col-span-7 grid grid-cols-12 gap-4">
                <div className="col-span-7 bg-white rounded-[28px] shadow-xl border border-stone-100 overflow-hidden">
                  <div className="aspect-[4/3] bg-cover bg-center" style={{ backgroundImage: "linear-gradient(to top, rgba(43,33,24,.45), rgba(43,33,24,.05)), url('/class-photo.jpg')" }}></div>
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-wood">Chantilly, VA</div>
                      <div className="text-lg font-bold text-wood-dark">Joyful, faith-centered learning</div>
                    </div>
                    <span className="text-xs font-bold bg-sage-100 text-sage-700 px-3 py-1.5 rounded-full">Ages 5+</span>
                  </div>
                </div>
                <div className="col-span-5 space-y-4">
                  <div className="wood-texture text-white rounded-[28px] p-6 shadow-xl border border-stone-800/40">
                    <div className="text-xs font-bold uppercase tracking-widest text-amber-200">Our Foundation</div>
                    <p className="text-2xl font-bold leading-tight mt-2">Based on the Qur'an and authentic Sunnah.</p>
                  </div>
                  <div className="bg-white rounded-[28px] p-6 shadow-lg border border-stone-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-sage-50 p-4">
                        <div className="text-2xl">📖</div>
                        <div className="font-bold text-wood-dark mt-2">Qur'an</div>
                        <div className="text-xs text-stone-500 mt-1">Recitation & memorization</div>
                      </div>
                      <div className="rounded-2xl bg-orange-50 p-4">
                        <div className="text-2xl">🌸</div>
                        <div className="font-bold text-wood-dark mt-2">Creative</div>
                        <div className="text-xs text-stone-500 mt-1">Montessori-inspired arts</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="dc-about" className="py-20 px-8 max-w-7xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="text-4xl font-bold text-wood-dark">What sets AIMAVA apart</h2>
                <p className="text-stone-500 font-medium mt-2 max-w-2xl">Three pillars make our weekend academy a place families trust and children love.</p>
              </div>
              <div className="text-sm font-semibold text-sage-700 bg-sage-100 px-4 py-2 rounded-full whitespace-nowrap">Est. 2023 · Chantilly, VA</div>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <article className="bg-white rounded-[28px] p-7 shadow-sm border border-stone-200/70">
                <div className="text-xs font-bold uppercase tracking-widest text-sage-700">01 / Learn</div>
                <h3 className="text-2xl font-bold text-wood-dark mt-3">Individualized Learning</h3>
                <p className="text-stone-600 mt-3 leading-relaxed">We meet each student where they are, honoring every child's unique pace in Qur'an, Arabic, and Islamic studies.</p>
              </article>
              <article className="wood-texture text-white rounded-[28px] p-7 shadow-xl border border-stone-800/40">
                <div className="text-xs font-bold uppercase tracking-widest text-amber-200">02 / Trust</div>
                <h3 className="text-2xl font-bold mt-3">Qualified Teachers</h3>
                <p className="text-stone-200 mt-3 leading-relaxed">Learn from experienced instructors with formal qualifications in Qur'an and Tajweed, bringing authentic scholarship and compassion to every class.</p>
              </article>
              <article className="bg-stone-100 rounded-[28px] p-7 shadow-sm border border-stone-200/70">
                <div className="text-xs font-bold uppercase tracking-widest text-wood">03 / Grow</div>
                <h3 className="text-2xl font-bold text-wood-dark mt-3">Holistic Education</h3>
                <p className="text-stone-600 mt-3 leading-relaxed">Integrating Islamic Studies, Arabic, and Montessori-based creativity in a nurturing, faith-filled environment.</p>
              </article>
            </div>
          </section>

          <section id="dc-programs" className="py-20 px-8 bg-stone-50/70 border-y border-stone-200/70">
            <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 items-start">
              <div className="col-span-4 space-y-4">
                <span className="text-xs font-bold uppercase tracking-widest text-wood">Programs</span>
                <h2 className="text-4xl font-bold text-wood-dark">A clear path for every child</h2>
                <p className="text-stone-600 leading-relaxed">Whether your child is just starting out or already memorizing, we have a program built for their journey.</p>
              </div>
              <div className="col-span-8 grid grid-cols-2 gap-6">
                <article className="bg-white rounded-[28px] overflow-hidden shadow-sm border border-stone-200/70">
                  <div className="aspect-[16/9] bg-cover bg-center" style={{ backgroundImage: "url('/class-photo.jpg')" }}></div>
                  <div className="p-6 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-sage-700">Weekend Academy</div>
                    <h3 className="text-2xl font-bold text-wood-dark">Consistent, structured learning</h3>
                    <p className="text-stone-600 leading-relaxed">Qur'an, Arabic, and Islamic studies delivered in a steady weekend program with a reassuring sense of progression.</p>
                  </div>
                </article>
                <article className="bg-white rounded-[28px] overflow-hidden shadow-sm border border-stone-200/70">
                  <div className="aspect-[16/9] bg-cover bg-top" style={{ backgroundImage: "linear-gradient(to top, rgba(43,33,24,.35), rgba(43,33,24,.05)), url('/portrait.jpeg')" }}></div>
                  <div className="p-6 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-wood">Creative Workshops</div>
                    <h3 className="text-2xl font-bold text-wood-dark">Hands-on learning with lasting impact</h3>
                    <p className="text-stone-600 leading-relaxed">Montessori-inspired activities, calligraphy, Islamic art, and more — making faith come alive through creativity.</p>
                  </div>
                </article>
              </div>
            </div>
          </section>

          <section id="dc-achievements" className="py-20 px-8 max-w-5xl mx-auto">
            <div className="bg-wood-dark text-white rounded-[32px] overflow-hidden shadow-2xl grid grid-cols-12">
              <div className="col-span-5 p-10 wood-texture">
                <div className="text-xs font-bold uppercase tracking-widest text-amber-200">Parent voice</div>
                <p className="text-3xl font-bold mt-3 leading-tight">"AIMAVA has been a blessing for our family — my son loves coming to class every week!"</p>
                <p className="mt-5 text-stone-300 text-sm">— Parent</p>
              </div>
              <div className="col-span-7 p-10 space-y-5 bg-gradient-to-br from-sage-700 to-sage-600">
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-200">Student achievements since 2023</div>
                <p className="text-sage-50 leading-relaxed">These accomplishments reflect the dedication of our students, the commitment of our teachers, and the blessing of Allah ﷻ.</p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-white/12 rounded-2xl p-4">5 students completed Hifz</div>
                  <div className="bg-white/12 rounded-2xl p-4">Fluent Qur'an readers from Qaida</div>
                  <div className="bg-white/12 rounded-2xl p-4">Precise Tajweed mastery</div>
                </div>
              </div>
            </div>
          </section>

          <section id="dc-join" className="py-10 px-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between gap-4 bg-white rounded-[28px] p-6 shadow-sm border border-stone-200/70">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-stone-400">Ready to join?</div>
                <div className="text-2xl font-bold text-wood-dark">Register for the Weekend Academy</div>
              </div>
              <button onClick={() => setPaymentOpen(true)} className="bg-wood text-white font-bold px-7 py-3.5 rounded-full shadow-md hover:brightness-95 transition">Register Now</button>
            </div>
          </section>
        </main>
      </div>

      <PaymentModal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        amount={REGISTRATION_AMOUNT}
        description={REGISTRATION_DESCRIPTION}
      />
    </div>
  )
}
