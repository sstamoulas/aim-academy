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
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-16">
        <div className="mb-10">
          <h1 className="font-kids text-4xl text-wood-dark mb-2">Our Staff</h1>
          <p className="text-stone-500 font-quick text-base">Meet the dedicated educators at AIM Academy.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
          </div>
        ) : staff.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-stone-200 p-12 text-center">
            <p className="text-stone-400 font-quick text-base">Staff profiles coming soon.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {staff.map(({ profile, classes }) => (
              <div key={profile.uid} className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-6 flex gap-5">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full bg-sage-100 flex items-center justify-center font-bold text-sage-700 font-quick text-xl flex-shrink-0">
                  {profile.displayName[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="font-kids text-xl text-wood-dark leading-tight">{profile.displayName}</h2>

                  {/* Assigned classes */}
                  {classes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {classes.map(cls => (
                        <span key={cls.id} className="text-xs font-quick font-semibold bg-sage-100 text-sage-700 border border-sage-200 px-2.5 py-0.5 rounded-full">
                          {cls.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Bio */}
                  {profile.bio && (
                    <p className="text-sm text-stone-600 font-quick mt-3 leading-relaxed">{profile.bio}</p>
                  )}

                  {/* Contact */}
                  {profile.schoolEmail && (
                    <a href={`mailto:${profile.schoolEmail}`}
                      className="inline-block mt-3 text-xs font-quick font-semibold text-sage-600 hover:text-sage-800 transition">
                      {profile.schoolEmail}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
