import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import type { TeacherProfile, AcademyClass } from '../types/portal'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

interface StaffEntry {
  profile: TeacherProfile
  classes: AcademyClass[]
}

export default function Staff() {
  const [staff, setStaff] = useState<StaffEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [profilesSnap, classesSnap] = await Promise.all([
          getDocs(query(collection(db, 'teacherProfiles'), where('visibility', '==', 'public'))),
          getDocs(collection(db, 'classes')),
        ])
        const allClasses = classesSnap.docs.map(d => ({ id: d.id, ...d.data() } as AcademyClass))
        const entries: StaffEntry[] = profilesSnap.docs.map(d => {
          const profile = { id: d.id, ...d.data() } as TeacherProfile
          return { profile, classes: allClasses.filter(c => c.teacherUid === profile.uid) }
        })
        setStaff(entries)
      } catch { /* silent */ }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <div className="bg-gradient-to-br from-wood-dark to-wood text-white py-16 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-5xl mb-4">👩‍🏫</div>
            <h1 className="font-kids text-4xl sm:text-5xl mb-3">Meet our Teachers</h1>
            <p className="text-stone-300 font-quick text-base leading-relaxed max-w-xl mx-auto">
              Dedicated educators with formal qualifications in Qur'an, Tajweed, and Islamic Studies — committed to nurturing every child's journey.
            </p>
          </div>
        </div>

        {/* Cards */}
        <div className="max-w-4xl mx-auto px-6 py-16">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
            </div>
          ) : staff.length === 0 ? (
            <div className="bg-white rounded-[28px] border border-stone-200 p-16 text-center shadow-sm">
              <div className="text-4xl mb-4">🌿</div>
              <p className="text-stone-500 font-quick text-base">Teacher profiles coming soon.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {staff.map(({ profile, classes }) => {
                const initials = profile.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <div key={profile.uid} className="bg-white rounded-[28px] border border-stone-200/70 shadow-sm overflow-hidden">
                    {/* Card header */}
                    <div className="wood-texture px-6 pt-7 pb-5 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center font-bold text-white font-kids text-xl flex-shrink-0">
                        {initials}
                      </div>
                      <div>
                        <h2 className="font-kids text-xl text-white leading-tight">{profile.displayName}</h2>
                        {classes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {classes.map(cls => (
                              <span key={cls.id} className="text-xs font-quick font-semibold bg-white/20 text-amber-100 px-2.5 py-0.5 rounded-full">
                                {cls.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="px-6 py-5 space-y-3">
                      {profile.bio ? (
                        <p className="text-stone-600 font-quick text-sm leading-relaxed">{profile.bio}</p>
                      ) : (
                        <p className="text-stone-400 font-quick text-sm italic">Bio coming soon.</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
