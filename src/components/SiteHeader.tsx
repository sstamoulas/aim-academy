import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { db, auth } from '../firebase'
import type { Program } from '../types/site'
import type { AcademyEvent } from '../types/event'
import { categorizeEvent } from '../types/event'

// Module-level cache — survives page-to-page navigation within the same JS session
let cachedPrograms: Program[] | null = null
let cachedCurrentEvents: AcademyEvent[] | null = null
let cachedUpcomingEvents: AcademyEvent[] | null = null
let cachedPastEvents: AcademyEvent[] | null = null

interface SiteHeaderProps {
  /** Hide Sign Up / Log In buttons (e.g. on login/register pages) */
  hideAuth?: boolean
}

export default function SiteHeader({ hideAuth = false }: SiteHeaderProps) {
  const [programs, setPrograms] = useState<Program[]>(cachedPrograms ?? [])
  const [upcomingEvents, setUpcomingEvents] = useState<AcademyEvent[]>(cachedUpcomingEvents ?? [])
  const [currentEvents, setCurrentEvents] = useState<AcademyEvent[]>(cachedCurrentEvents ?? [])
  const [pastEvents, setPastEvents] = useState<AcademyEvent[]>(cachedPastEvents ?? [])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (cachedPrograms) return // already cached, skip fetch
    async function load() {
      try {
        const [progSnap, evSnap] = await Promise.all([
          getDocs(query(collection(db, 'programs'), where('published', '==', true))),
          getDocs(query(collection(db, 'events'), where('published', '==', true))),
        ])
        const progs = progSnap.docs.map(d => ({ id: d.id, ...d.data() } as Program)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        const all = evSnap.docs.map(d => ({ id: d.id, ...d.data() } as AcademyEvent))
          .sort((a, b) => (b.eventDate ?? b.createdAt).localeCompare(a.eventDate ?? a.createdAt))
        const current = all.filter(e => categorizeEvent(e) === 'current')
        const upcoming = all.filter(e => categorizeEvent(e) === 'upcoming')
        const past = all.filter(e => categorizeEvent(e) === 'past')
        cachedPrograms = progs
        cachedCurrentEvents = current
        cachedUpcomingEvents = upcoming
        cachedPastEvents = past
        setPrograms(progs)
        setCurrentEvents(current)
        setUpcomingEvents(upcoming)
        setPastEvents(past)
      } catch { /* silent */ }
    }
    load()
  }, [])

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      setCurrentUser(u)
      if (u) {
        const token = await u.getIdTokenResult()
        setUserRole(token.claims['role'] as string ?? null)
      } else {
        setUserRole(null)
      }
      setAuthReady(true)
    })
  }, [])

  const chevron = (
    <svg className="w-3.5 h-3.5 mt-px text-stone-400 group-hover:text-sage-600 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )

  const portalHref = userRole === 'admin' ? '/admin' : userRole === 'teacher' ? '/portal/teacher' : '/portal/parent'

  return (
    <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur border-b border-stone-200/70 font-quick">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 lg:h-20 flex items-center justify-between">

        {/* Logo */}
        <a href="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Anas Ibn Malik Academy" className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl shadow-md object-contain bg-white p-0.5" />
          <div className="leading-none">
            <div className="text-base lg:text-lg font-bold tracking-tight text-wood-dark">Anas Ibn Malik</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-sage-700">Academy</div>
          </div>
        </a>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 font-semibold text-stone-600">

          {/* Home */}
          <div className="group relative">
            <button className="flex items-center gap-1 px-4 py-2 rounded-xl hover:bg-stone-100 hover:text-sage-700 transition-colors">
              Home {chevron}
            </button>
            <div className="absolute top-full left-0 pt-2 opacity-0 -translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
              <div className="bg-white rounded-2xl shadow-xl border border-stone-200/70 py-2 min-w-[180px]">
                <a href="/#dc-about" className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-sage-50 hover:text-sage-700 transition-colors">
                  <span className="text-base">🌿</span> About Us
                </a>
                <a href="/#dc-achievements" className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-sage-50 hover:text-sage-700 transition-colors">
                  <span className="text-base">🏆</span> Achievements
                </a>
              </div>
            </div>
          </div>

          {/* Programs */}
          <div className="group relative">
            <button className="flex items-center gap-1 px-4 py-2 rounded-xl hover:bg-stone-100 hover:text-sage-700 transition-colors">
              Programs {chevron}
            </button>
            <div className="absolute top-full left-0 pt-2 opacity-0 -translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
              <div className="bg-white rounded-2xl shadow-xl border border-stone-200/70 py-2 min-w-[220px]">
                {programs.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-stone-400">No programs yet</div>
                ) : programs.map(p => (
                  p.comingSoon ? (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-400 cursor-default select-none">
                      <span className="text-base">{p.emoji}</span>
                      <span>{p.name}</span>
                      <span className="ml-auto text-xs bg-stone-100 text-stone-400 px-2 py-0.5 rounded-full">Coming soon</span>
                    </div>
                  ) : (
                    <a key={p.id} href={p.href || '/#dc-programs'} className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-sage-50 hover:text-sage-700 transition-colors">
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
              Events {chevron}
            </button>
            <div className="absolute top-full left-0 pt-2 opacity-0 -translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
              <div className="bg-white rounded-2xl shadow-xl border border-stone-200/70 py-2 min-w-[240px]">
                {currentEvents.length === 0 && upcomingEvents.length === 0 && pastEvents.length === 0 && (
                  <div className="px-4 py-3 text-sm text-stone-400">No events yet — check back soon!</div>
                )}
                {currentEvents.length > 0 && (
                  <>
                    <div className="px-4 pt-1 pb-2 text-xs font-bold uppercase tracking-widest text-rose-400">Happening Now</div>
                    {currentEvents.map(e => (
                      <a key={e.id} href={`/events/${e.slug}`} className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-rose-50 hover:text-rose-700 transition-colors">
                        <span className="text-base">🔴</span> {e.title}
                      </a>
                    ))}
                    {(upcomingEvents.length > 0 || pastEvents.length > 0) && <div className="border-t border-stone-100 mt-1 pt-1" />}
                  </>
                )}
                {upcomingEvents.length > 0 && (
                  <>
                    <div className="px-4 pt-1 pb-2 text-xs font-bold uppercase tracking-widest text-stone-400">Up & Coming</div>
                    {upcomingEvents.map(e => (
                      <a key={e.id} href={`/events/${e.slug}`} className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-sage-50 hover:text-sage-700 transition-colors">
                        <span className="text-base">🌟</span> {e.title}
                      </a>
                    ))}
                    {pastEvents.length > 0 && <div className="border-t border-stone-100 mt-1 pt-1" />}
                  </>
                )}
                {pastEvents.length > 0 && (
                  <>
                    <div className="px-4 pt-1 pb-2 text-xs font-bold uppercase tracking-widest text-stone-400">Past Events</div>
                    {pastEvents.map(e => (
                      <a key={e.id} href={`/events/${e.slug}`} className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-sage-50 hover:text-sage-700 transition-colors">
                        {e.title}
                      </a>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          <a href="/contact" className="px-4 py-2 rounded-xl hover:bg-stone-100 hover:text-sage-700 transition-colors">
            Contact Us
          </a>

          {!hideAuth && (
            <div className={`ml-3 flex items-center gap-2 transition-opacity duration-150 ${authReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              {currentUser ? (
                <a href={portalHref} className="bg-wood text-white px-5 py-2.5 rounded-full shadow-md hover:brightness-95 transition text-sm font-semibold">My Portal</a>
              ) : (
                <>
                  <a href="/portal/register" className="bg-wood text-white px-5 py-2.5 rounded-full shadow-md hover:brightness-95 transition text-sm font-semibold">Sign Up</a>
                  <a href="/login" className="border border-stone-300 text-stone-600 px-5 py-2.5 rounded-full hover:bg-stone-50 transition text-sm font-semibold">Log In</a>
                </>
              )}
            </div>
          )}
        </nav>

        {/* Mobile right side */}
        <div className="flex lg:hidden items-center gap-3">
          {!hideAuth && (
            <div className={`transition-opacity duration-150 ${authReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              {currentUser
                ? <a href={portalHref} className="bg-wood text-white text-xs font-bold px-4 py-2 rounded-full shadow-sm hover:brightness-95 transition">Portal</a>
                : <a href="/portal/register" className="bg-wood text-white text-xs font-bold px-4 py-2 rounded-full shadow-sm hover:brightness-95 transition">Sign Up</a>
              }
            </div>
          )}
          <button
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle menu"
            className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 transition"
          >
            <span className={`block w-4.5 h-0.5 bg-stone-600 rounded-full transition-all duration-200 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-4.5 h-0.5 bg-stone-600 rounded-full transition-all duration-200 ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-4.5 h-0.5 bg-stone-600 rounded-full transition-all duration-200 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-stone-200/70 bg-cream/98 px-4 py-3 space-y-1 font-quick">
          <div className="text-xs font-bold uppercase tracking-widest text-stone-400 px-3 pb-1">Home</div>
          <a href="/#dc-about" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 transition text-sm font-semibold">🌿 About Us</a>
          <a href="/#dc-achievements" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 transition text-sm font-semibold">🏆 Achievements</a>

          {programs.length > 0 && (
            <>
              <div className="text-xs font-bold uppercase tracking-widest text-stone-400 px-3 pt-2 pb-1">Programs</div>
              {programs.map(p => (
                p.comingSoon ? (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 text-stone-400 text-sm select-none">
                    {p.emoji} {p.name} <span className="ml-auto text-xs bg-stone-100 px-2 py-0.5 rounded-full">Soon</span>
                  </div>
                ) : (
                  <a key={p.id} href={p.href || '/#dc-programs'} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 transition text-sm font-semibold">
                    {p.emoji} {p.name}
                  </a>
                )
              ))}
            </>
          )}

          {(currentEvents.length > 0 || upcomingEvents.length > 0 || pastEvents.length > 0) && (
            <>
              <div className="text-xs font-bold uppercase tracking-widest text-stone-400 px-3 pt-2 pb-1">Events</div>
              {currentEvents.map(e => (
                <a key={e.id} href={`/events/${e.slug}`} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 transition text-sm font-semibold">🔴 {e.title}</a>
              ))}
              {upcomingEvents.map(e => (
                <a key={e.id} href={`/events/${e.slug}`} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 transition text-sm font-semibold">🌟 {e.title}</a>
              ))}
              {pastEvents.map(e => (
                <a key={e.id} href={`/events/${e.slug}`} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 transition text-sm font-semibold">{e.title}</a>
              ))}
            </>
          )}

          <div className="text-xs font-bold uppercase tracking-widest text-stone-400 px-3 pt-2 pb-1">More</div>
          <a href="/contact" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 transition text-sm font-semibold">✉️ Contact Us</a>
          {!hideAuth && authReady && (
            currentUser
              ? <a href={portalHref} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-amber-700 hover:bg-amber-50 transition text-sm font-semibold">🏠 My Portal</a>
              : <>
                  <a href="/portal/register" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-amber-700 hover:bg-amber-50 transition text-sm font-semibold">✨ Sign Up</a>
                  <a href="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 transition text-sm font-semibold">🔑 Log In</a>
                </>
          )}
        </div>
      )}
    </header>
  )
}
