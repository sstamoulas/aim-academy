import { useState, useEffect, useRef } from 'react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { db, auth } from '../firebase'
import type { AcademyEvent } from '../types/event'
import { categorizeEvent } from '../types/event'
import type { Program, ProgramMedia, Achievement, Review } from '../types/site'
import Carousel from '../components/Carousel'

function ProgramCarousel({ imageUrl, imageStyle, media }: {
  imageUrl?: string
  imageStyle?: string
  media?: ProgramMedia[]
}) {
  const slides = [
    { type: 'image' as const, url: imageUrl || '/class-photo.jpg', style: imageStyle },
    ...(media ?? []),
  ]
  const [currentSlide, setCurrentSlide] = useState(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => { if (videoRef.current) videoRef.current.pause() }, [currentSlide])

  return (
    <Carousel
      count={slides.length}
      interval={4000}
      skipAutoAdvance={slides[currentSlide]?.type === 'video'}
      onCurrentChange={setCurrentSlide}
      fillHeight
      className="aspect-[16/9] bg-stone-900"
      clampPx={120}
      theme="dark"
      arrows
      dots="overlay"
      counter
      progressBar="overlay"
      renderSlide={(i) => {
        const s = slides[i]
        return s.type === 'video' ? (
          <video
            ref={i === currentSlide ? videoRef : undefined}
            src={s.url} controls playsInline
            className="w-full h-full object-cover pointer-events-none"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <div className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: 'style' in s && s.style ? `${s.style}, url('${s.url}')` : `url('${s.url}')` }} />
        )
      }}
    />
  )
}

function ReviewsCarousel({ reviews, variant = 'light' }: { reviews: Review[], variant?: 'light' | 'dark' }) {
  const published = reviews.filter(r => r.published)
  if (published.length === 0) return null

  if (variant === 'dark') {
    return (
      <Carousel
        count={published.length}
        interval={5000}
        mode="fade"
        theme="amber"
        clampPx={200}
        dots="below"
        progressBar="below"
        renderSlide={(i) => {
          const r = published[i]
          return (
            <div className="min-h-[160px]">
              <p className="text-amber-200 text-5xl font-bold leading-none mb-3 select-none">"</p>
              <p className="text-white text-xl lg:text-2xl font-bold leading-snug mb-6">"{r.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold font-quick text-sm text-white flex-shrink-0">
                  {r.author[0]}
                </div>
                <div>
                  <div className="font-semibold font-quick text-sm text-white">{r.author}</div>
                  {r.role && <div className="text-xs font-quick text-white/60 mt-0.5">{r.role}</div>}
                </div>
              </div>
            </div>
          )
        }}
      />
    )
  }

  return (
    <Carousel
      count={published.length}
      interval={5000}
      theme="light"
      clampPx={200}
      arrows
      dots="below"
      progressBar="below"
      renderSlide={(i, isActive) => {
        const r = published[i]
        return (
          <div className="px-2">
            <div className={`rounded-[28px] p-8 lg:p-10 flex flex-col justify-between transition-all duration-300 ${
              isActive ? 'bg-white shadow-lg border border-stone-200/70 scale-100' : 'bg-stone-50 border border-stone-200/40 scale-95 opacity-60'
            }`}>
              <div>
                <div className="text-3xl text-sage-600 leading-none mb-4">"</div>
                <p className="text-stone-700 text-lg lg:text-xl leading-relaxed font-body">{r.quote}</p>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sage-100 flex items-center justify-center font-bold font-quick text-sm text-sage-700 flex-shrink-0">
                  {r.author[0]}
                </div>
                <div>
                  <div className="font-semibold font-quick text-sm text-wood-dark">{r.author}</div>
                  {r.role && <div className="text-xs font-quick text-stone-400 mt-0.5">{r.role}</div>}
                </div>
              </div>
            </div>
          </div>
        )
      }}
    />
  )
}

export default function ForestCanopy() {
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [upcomingEvents, setUpcomingEvents] = useState<AcademyEvent[]>([])
  const [currentEvents, setCurrentEvents] = useState<AcademyEvent[]>([])
  const [pastEvents, setPastEvents] = useState<AcademyEvent[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [aboutContent, setAboutContent] = useState<{ heading: string; subheading: string; pillars: Array<{ title: string; description: string }> } | null>(null)

  useEffect(() => {
    async function loadEvents() {
      try {
        const snap = await getDocs(query(
          collection(db, 'events'),
          where('published', '==', true)
        ))
        const all = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as AcademyEvent))
          .sort((a, b) => (b.eventDate ?? b.createdAt).localeCompare(a.eventDate ?? a.createdAt))
        setUpcomingEvents(all.filter(e => categorizeEvent(e) === 'upcoming'))
        setCurrentEvents(all.filter(e => categorizeEvent(e) === 'current'))
        setPastEvents(all.filter(e => categorizeEvent(e) === 'past'))
      } catch (e) {
        console.error('Failed to load events:', e)
      }
    }
    loadEvents()
  }, [])

  useEffect(() => {
    async function loadContent() {
      try {
        const [progSnap, achSnap, revSnap, siteSnap] = await Promise.all([
          getDocs(query(collection(db, 'programs'), where('published', '==', true), orderBy('order', 'asc'))),
          getDocs(query(collection(db, 'achievements'), orderBy('order', 'asc'))),
          getDocs(query(collection(db, 'reviews'), where('published', '==', true), orderBy('order', 'asc'))),
          getDocs(collection(db, 'site')),
        ])
        setPrograms(progSnap.docs.map(d => ({ id: d.id, ...d.data() } as Program)))
        setAchievements(achSnap.docs.map(d => ({ id: d.id, ...d.data() } as Achievement)))
        setReviews(revSnap.docs.map(d => ({ id: d.id, ...d.data() } as Review)))
        const aboutDoc = siteSnap.docs.find(d => d.id === 'about')
        if (aboutDoc) setAboutContent(aboutDoc.data() as typeof aboutContent)
      } catch (e) {
        console.error('Failed to load site content:', e)
      }
    }
    loadContent()
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      setCurrentUser(u)
      if (u) {
        const token = await u.getIdTokenResult()
        setUserRole(token.claims['role'] as string ?? null)
      } else {
        setUserRole(null)
      }
    })
    return unsub
  }, [])

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
                  <a href="#dc-about" onClick={() => { setMobileMenuOpen(false); setActiveTab('overview') }} className="flex items-center gap-3 px-5 py-2.5 text-white font-kids text-sm hover:bg-white/10 transition">
                    🌿 About Us
                  </a>
                  <a href="#dc-achievements" onClick={() => { setMobileMenuOpen(false); setActiveTab('safety') }} className="flex items-center gap-3 px-5 py-2.5 text-white font-kids text-sm hover:bg-white/10 transition">
                    🏆 Achievements
                  </a>
                  <a href="/contact" className="flex items-center gap-3 px-5 py-2.5 text-white font-kids text-sm hover:bg-white/10 transition">
                    ✉️ Contact Us
                  </a>

                  <div className="border-t border-white/10 mx-5 my-2" />

                  {/* Programs group */}
                  <div className="px-5 pt-1 pb-1 text-xs font-bold uppercase tracking-widest text-emerald-200/70">Programs</div>
                  {programs.map(p => (
                    p.comingSoon ? (
                      <div key={p.id} className="flex items-center gap-3 px-5 py-2.5 text-stone-400 font-kids text-sm cursor-default">
                        {p.emoji} {p.name} <span className="ml-auto text-xs bg-stone-100/20 text-stone-400 px-2 py-0.5 rounded-full">Soon</span>
                      </div>
                    ) : (
                      <a key={p.id} href={p.href || '#dc-programs'} onClick={() => { setMobileMenuOpen(false); setActiveTab('activities') }} className="flex items-center gap-3 px-5 py-2.5 text-white font-kids text-sm hover:bg-white/10 transition">
                        {p.emoji} {p.name}
                      </a>
                    )
                  ))}

                  <div className="border-t border-white/10 mx-5 my-2" />

                  {/* Events group */}
                  {currentEvents.length > 0 && (
                    <>
                      <div className="px-5 pt-1 pb-1 text-xs font-bold uppercase tracking-widest text-emerald-200/70">Current Events</div>
                      {currentEvents.map(event => (
                        <a key={event.id} href={`/events/${event.slug}`} className="flex items-center gap-3 px-5 py-2.5 text-white font-kids text-sm hover:bg-white/10 transition">
                          🔴 {event.title}
                        </a>
                      ))}
                    </>
                  )}
                  {upcomingEvents.length > 0 && (
                    <>
                      <div className="px-5 pt-1 pb-1 text-xs font-bold uppercase tracking-widest text-emerald-200/70">Upcoming Events</div>
                      {upcomingEvents.map(event => (
                        <a key={event.id} href={`/events/${event.slug}`} className="flex items-center gap-3 px-5 py-2.5 text-white font-kids text-sm hover:bg-white/10 transition">
                          🌟 {event.title}
                        </a>
                      ))}
                    </>
                  )}
                  {pastEvents.length > 0 && (
                    <>
                      <div className="px-5 pt-1 pb-1 text-xs font-bold uppercase tracking-widest text-emerald-200/70">Past Events</div>
                      {pastEvents.map(event => (
                        <a key={event.id} href={`/events/${event.slug}`} className="flex items-center gap-3 px-5 py-2.5 text-white font-kids text-sm hover:bg-white/10 transition">
                          {event.title}
                        </a>
                      ))}
                    </>
                  )}

                  <div className="border-t border-white/10 mx-5 my-2" />

                  {/* Portal links */}
                  <div className="px-5 pt-1 pb-1 text-xs font-bold uppercase tracking-widest text-emerald-200/70">Account</div>
                  {currentUser ? (
                    <a href={userRole === 'admin' ? '/admin' : userRole === 'teacher' ? '/portal/teacher' : '/portal/parent'} className="flex items-center gap-3 px-5 py-2.5 text-amber-200 font-kids text-sm hover:bg-white/10 transition">
                      🏠 My Portal
                    </a>
                  ) : (
                    <>
                      <a href="/portal/register" className="flex items-center gap-3 px-5 py-2.5 text-amber-200 font-kids text-sm hover:bg-white/10 transition">
                        ✨ Sign Up
                      </a>
                      <a href="/login" className="flex items-center gap-3 px-5 py-2.5 text-white font-kids text-sm hover:bg-white/10 transition">
                        🔑 Log In
                      </a>
                    </>
                  )}
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
            <nav className="flex gap-1 p-1 bg-stone-100 rounded-2xl mb-8">
              {([
                { key: 'overview', label: 'About' },
                { key: 'activities', label: 'Programs' },
                { key: 'safety', label: 'Achievements' },
              ] as const).map(({ key, label }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`flex-1 py-2.5 rounded-xl font-kids text-sm tracking-wide transition ${activeTab === key ? 'bg-white text-wood-dark shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                  {label}
                </button>
              ))}
            </nav>

            <div className="space-y-8">
              {activeTab === 'overview' && (
                <section className="space-y-4">
                  <div className="bg-white rounded-[24px] p-6 shadow-sm border border-stone-200/70">
                    <h2 className="font-kids text-2xl text-stone-900">{aboutContent?.heading ?? 'What sets AIMAVA apart'}</h2>
                    <p className="text-stone-500 text-sm leading-relaxed mt-2">{aboutContent?.subheading ?? 'Three pillars make our weekend academy a place families trust and children love.'}</p>
                    <div className="mt-5 space-y-3">
                      {(aboutContent?.pillars ?? [
                        { title: 'Individualized Learning', description: "We meet each student where they are, honoring every child's unique pace." },
                        { title: 'Qualified Teachers', description: 'Experienced instructors with formal qualifications in Qur\'an and Tajweed.' },
                        { title: 'Holistic Education', description: 'Islamic Studies, Arabic, and Montessori-based creativity.' },
                      ]).map((pillar, i) => (
                        <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-stone-50">
                          <div className="w-6 h-6 rounded-full bg-sage-100 flex items-center justify-center text-xs font-bold text-sage-700 flex-shrink-0 mt-0.5">{i + 1}</div>
                          <div>
                            <div className="font-semibold text-wood-dark text-sm">{pillar.title}</div>
                            <div className="text-xs text-stone-500 mt-0.5 leading-relaxed">{pillar.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {reviews.length > 0 && (
                    <div className="bg-sage-50 rounded-[24px] p-6 border border-sage-100">
                      <div className="text-xs font-bold uppercase tracking-widest text-sage-700 font-quick mb-4">What parents say</div>
                      <ReviewsCarousel reviews={reviews} />
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'activities' && (
                <section className="space-y-4">
                  {programs.length === 0 ? (
                    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-stone-200/70 text-center text-stone-400 text-sm font-quick">
                      No programs yet — check back soon.
                    </div>
                  ) : programs.map(p => (
                    <div key={p.id} className={`bg-white rounded-[24px] overflow-hidden shadow-sm border border-stone-200/70 ${p.comingSoon ? 'opacity-60' : ''}`}>
                      {!p.comingSoon && (
                        <ProgramCarousel imageUrl={p.imageUrl} imageStyle={p.imageStyle} media={p.media} />
                      )}
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-sage-700">{p.label}</span>
                          {p.comingSoon && <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-quick">Coming soon</span>}
                        </div>
                        <h3 className="font-kids text-xl text-wood-dark">{p.title}</h3>
                        <p className="text-stone-500 text-sm leading-relaxed mt-1">{p.description}</p>
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {activeTab === 'safety' && (
                <section className="space-y-4">
                  <div className="bg-white rounded-[24px] p-6 shadow-sm border border-stone-200/70">
                    <h2 className="font-kids text-2xl text-stone-900">Student Achievements</h2>
                    <p className="text-stone-500 text-sm leading-relaxed mt-2">Since our inception in 2023, AIMAVA students have achieved remarkable milestones.</p>
                    {achievements.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {achievements.map(a => (
                          <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl bg-sage-50">
                            <span className="text-sage-600 mt-0.5 flex-shrink-0">✔</span>
                            <span className="text-sm text-stone-700">{a.text}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-stone-400 text-sm mt-4">No achievements listed yet.</p>
                    )}
                  </div>
                  <div className="bg-gradient-to-br from-sage-700 to-sage-600 text-white rounded-[24px] p-6 shadow-xl">
                    <div className="text-xs font-bold uppercase tracking-widest text-emerald-200">A testament to dedication</div>
                    <p className="text-lg font-bold mt-2 leading-snug">These accomplishments reflect the dedication of our students, the commitment of our teachers, and the blessing of Allah ﷻ.</p>
                  </div>
                </section>
              )}
            </div>

            {!currentUser && (
            <div className="mt-8 pt-6 border-t border-stone-200/70 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-stone-400">Ready to join?</div>
                <div className="font-kids text-lg text-stone-900">Classes filling quickly</div>
              </div>
              <a href="/portal/register" className="bg-wood text-white font-kids px-6 py-3 rounded-full shadow-md hover:brightness-95 transition">Sign Up</a>
            </div>
            )}
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
                    <a href="#dc-about" onClick={() => setActiveTab('overview')} className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-sage-50 hover:text-sage-700 transition-colors">
                      <span className="text-base">🌿</span> About Us
                    </a>
                    <a href="#dc-achievements" onClick={() => setActiveTab('safety')} className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-sage-50 hover:text-sage-700 transition-colors">
                      <span className="text-base">🏆</span> Achievements
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
                    {programs.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-stone-400 font-quick">No programs yet</div>
                    ) : programs.map(p => (
                      p.comingSoon ? (
                        <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-400 cursor-default select-none">
                          <span className="text-base">{p.emoji}</span>
                          <span>{p.name}</span>
                          <span className="ml-auto text-xs font-normal bg-stone-100 text-stone-400 px-2 py-0.5 rounded-full">Coming soon</span>
                        </div>
                      ) : (
                        <a key={p.id} href={p.href || '#dc-programs'} onClick={() => setActiveTab('activities')} className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-sage-50 hover:text-sage-700 transition-colors">
                          <span className="text-base">{p.emoji}</span> {p.name}
                        </a>
                      )
                    ))}
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
                    {currentEvents.length === 0 && upcomingEvents.length === 0 && pastEvents.length === 0 && (
                      <div className="px-4 py-3 text-sm text-stone-400 font-quick">No events yet — check back soon!</div>
                    )}
                    {currentEvents.length > 0 && (
                      <>
                        <div className="px-4 pt-1 pb-2 text-xs font-bold uppercase tracking-widest text-rose-400">Happening Now</div>
                        {currentEvents.map(event => (
                          <a key={event.id} href={`/events/${event.slug}`} className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-rose-50 hover:text-rose-700 transition-colors">
                            <span className="text-base">🔴</span> {event.title}
                          </a>
                        ))}
                        {(upcomingEvents.length > 0 || pastEvents.length > 0) && <div className="border-t border-stone-100 mt-1 pt-1" />}
                      </>
                    )}
                    {upcomingEvents.length > 0 && (
                      <>
                        <div className="px-4 pt-1 pb-2 text-xs font-bold uppercase tracking-widest text-stone-400">Up & Coming</div>
                        {upcomingEvents.map(event => (
                          <a key={event.id} href={`/events/${event.slug}`} className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-sage-50 hover:text-sage-700 transition-colors">
                            <span className="text-base">🌟</span> {event.title}
                          </a>
                        ))}
                        {pastEvents.length > 0 && <div className="border-t border-stone-100 mt-1 pt-1" />}
                      </>
                    )}
                    {pastEvents.length > 0 && (
                      <>
                        <div className="px-4 pt-1 pb-2 text-xs font-bold uppercase tracking-widest text-stone-400">Past Events</div>
                        {pastEvents.map(event => (
                          <a key={event.id} href={`/events/${event.slug}`} className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-sage-50 hover:text-sage-700 transition-colors">
                            {event.title}
                          </a>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Us */}
              <a href="/contact" className="px-4 py-2 rounded-xl hover:bg-stone-100 hover:text-sage-700 transition-colors font-semibold text-stone-600">
                Contact Us
              </a>

              <div className="ml-3 flex items-center gap-2">
                {currentUser ? (
                  <a href={userRole === 'admin' ? '/admin' : userRole === 'teacher' ? '/portal/teacher' : '/portal/parent'} className="bg-wood text-white px-5 py-2.5 rounded-full shadow-md hover:brightness-95 transition text-sm font-semibold">My Portal</a>
                ) : (
                  <>
                    <a href="/portal/register" className="bg-wood text-white px-5 py-2.5 rounded-full shadow-md hover:brightness-95 transition text-sm font-semibold">Sign Up</a>
                    <a href="/login" className="border border-stone-300 text-stone-600 px-5 py-2.5 rounded-full hover:bg-stone-50 transition text-sm font-semibold">Log In</a>
                  </>
                )}
              </div>
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
                  <a href="#dc-programs" onClick={() => setActiveTab('activities')} className="bg-sage-600 text-white font-bold px-8 py-4 rounded-full shadow-lg hover:bg-sage-700 transition">Explore Programs</a>
                  <a href="#dc-about" onClick={() => setActiveTab('overview')} className="bg-white text-stone-700 border border-stone-300 font-bold px-8 py-4 rounded-full shadow-sm hover:bg-stone-50 transition">About Us</a>
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

          <section id="dc-about" className="py-20 px-8 max-w-7xl mx-auto scroll-mt-24">
            <div className="flex items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="text-4xl font-bold text-wood-dark">{aboutContent?.heading ?? 'What sets AIMAVA apart'}</h2>
                <p className="text-stone-500 font-medium mt-2 max-w-2xl">{aboutContent?.subheading ?? 'Three pillars make our weekend academy a place families trust and children love.'}</p>
              </div>
              <div className="text-sm font-semibold text-sage-700 bg-sage-100 px-4 py-2 rounded-full whitespace-nowrap">Est. 2023 · Chantilly, VA</div>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {(aboutContent?.pillars ?? [
                { title: 'Individualized Learning', description: "We meet each student where they are, honoring every child's unique pace in Qur'an, Arabic, and Islamic studies." },
                { title: 'Qualified Teachers', description: 'Learn from experienced instructors with formal qualifications in Qur\'an and Tajweed, bringing authentic scholarship and compassion to every class.' },
                { title: 'Holistic Education', description: 'Integrating Islamic Studies, Arabic, and Montessori-based creativity in a nurturing, faith-filled environment.' },
              ]).map((pillar, i) => {
                const styles = [
                  'bg-white rounded-[28px] p-7 shadow-sm border border-stone-200/70',
                  'wood-texture text-white rounded-[28px] p-7 shadow-xl border border-stone-800/40',
                  'bg-stone-100 rounded-[28px] p-7 shadow-sm border border-stone-200/70',
                ]
                const labelStyles = ['text-sage-700', 'text-amber-200', 'text-wood']
                const categories = ['Learn', 'Trust', 'Grow']
                const descStyles = ['text-stone-600', 'text-stone-200', 'text-stone-600']
                const titleCls = i === 1 ? 'text-2xl font-bold mt-3' : 'text-2xl font-bold text-wood-dark mt-3'
                return (
                  <article key={i} className={styles[i] ?? styles[0]}>
                    <div className={`text-xs font-bold uppercase tracking-widest ${labelStyles[i] ?? labelStyles[0]}`}>0{i+1} / {categories[i] ?? ''}</div>
                    <h3 className={titleCls}>{pillar.title}</h3>
                    <p className={`mt-3 leading-relaxed ${descStyles[i] ?? descStyles[0]}`}>{pillar.description}</p>
                  </article>
                )
              })}
            </div>
          </section>

          {programs.length > 0 && (
            <section id="dc-programs" className="py-20 px-8 bg-stone-50/70 border-y border-stone-200/70 scroll-mt-24">
              <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 items-start">
                <div className="col-span-4 space-y-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-wood">Programs</span>
                  <h2 className="text-4xl font-bold text-wood-dark">A clear path for every child</h2>
                  <p className="text-stone-600 leading-relaxed">Whether your child is just starting out or already memorizing, we have a program built for their journey.</p>
                </div>
                <div className={`col-span-8 grid gap-6 ${programs.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {programs.map(p => (
                    <article key={p.id} className={`bg-white rounded-[28px] overflow-hidden shadow-sm border border-stone-200/70 ${p.comingSoon ? 'opacity-60' : ''}`}>
                      <ProgramCarousel imageUrl={p.imageUrl} imageStyle={p.imageStyle} media={p.media} />
                      <div className="p-6 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-bold uppercase tracking-widest text-sage-700">{p.label}</div>
                          {p.comingSoon && <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-quick">Coming soon</span>}
                        </div>
                        <h3 className="text-2xl font-bold text-wood-dark">{p.title}</h3>
                        <p className="text-stone-600 leading-relaxed">{p.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}

          {reviews.length > 0 && (
            <section className="py-20 px-8 max-w-5xl mx-auto">
              <div className="bg-wood-dark text-white rounded-[32px] overflow-hidden shadow-2xl p-10 wood-texture">
                <div className="mb-8">
                  <div className="text-xs font-bold uppercase tracking-widest text-amber-200 font-quick">What parents say</div>
                  <h2 className="text-3xl font-bold text-white mt-2">Trusted by families</h2>
                </div>
                <ReviewsCarousel reviews={reviews} variant="dark" />
              </div>
            </section>
          )}

          {achievements.length > 0 && (
            <section id="dc-achievements" className="py-20 px-8 max-w-5xl mx-auto scroll-mt-24">
              <div className="bg-gradient-to-br from-sage-700 to-sage-600 text-white rounded-[32px] overflow-hidden shadow-2xl p-10 space-y-5">
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-200">Student achievements since 2023</div>
                <p className="text-sage-50 leading-relaxed">These accomplishments reflect the dedication of our students, the commitment of our teachers, and the blessing of Allah ﷻ.</p>
                <div className={`grid gap-3 text-sm ${achievements.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {achievements.map(a => (
                    <div key={a.id} className="bg-white/12 rounded-2xl p-4">{a.text}</div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {!currentUser && (
          <section id="dc-join" className="py-10 px-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between gap-4 bg-white rounded-[28px] p-6 shadow-sm border border-stone-200/70">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-stone-400">Ready to join?</div>
                <div className="text-2xl font-bold text-wood-dark">Register for the Weekend Academy</div>
              </div>
              <a href="/portal/register" className="bg-wood text-white font-bold px-7 py-3.5 rounded-full shadow-md hover:brightness-95 transition">Sign Up Now</a>
            </div>
          </section>
          )}

          <footer className="border-t border-stone-200/70 mt-4 px-8 py-10 max-w-5xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="AIM Academy" className="w-9 h-9 rounded-xl object-contain bg-white p-0.5 shadow-sm" />
                <div>
                  <div className="font-kids text-base text-wood-dark leading-none">AIM Academy</div>
                  <div className="text-xs text-stone-400 font-quick mt-0.5">Anas Ibn Malik Academy</div>
                </div>
              </div>
              <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-500 font-quick">
                <a href="#dc-about" onClick={() => setActiveTab('overview')} className="hover:text-wood-dark transition">About</a>
                <a href="#dc-programs" onClick={() => setActiveTab('activities')} className="hover:text-wood-dark transition">Programs</a>
                {upcomingEvents[0]
                  ? <a href={`/events/${upcomingEvents[0].slug}`} className="hover:text-wood-dark transition">Events</a>
                  : <a href="/contact" className="hover:text-wood-dark transition">Events</a>
                }
                <a href="#dc-achievements" onClick={() => setActiveTab('safety')} className="hover:text-wood-dark transition">Achievements</a>
                <a href="/contact" className="hover:text-wood-dark transition">Contact</a>
                {currentUser
                  ? <a href={userRole === 'admin' ? '/admin' : userRole === 'teacher' ? '/portal/teacher' : '/portal/parent'} className="hover:text-wood-dark transition">My Portal</a>
                  : <a href="/portal/register" className="hover:text-wood-dark transition">Register</a>
                }
              </nav>
            </div>
            <div className="mt-6 text-xs text-stone-400 font-quick">
              © {new Date().getFullYear()} Anas Ibn Malik Academy. All rights reserved.
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
