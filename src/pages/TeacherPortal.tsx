import { useState, useEffect } from 'react'
import {
  signOut, onAuthStateChanged, type User,
} from 'firebase/auth'
import {
  collection, doc, getDocs, setDoc, query, where, orderBy,
} from 'firebase/firestore'
import { auth, db } from '../firebase'
import type { AcademyClass, Student, AttendanceSession, Announcement } from '../types/portal'
import ImpersonationBanner, { getImpersonation, type ImpersonationState } from '../components/ImpersonationBanner'

// ── Attendance ────────────────────────────────────────────────────────────────

function AttendanceTab({ cls, teacherUid }: { cls: AcademyClass; teacherUid: string }) {
  const [students, setStudents] = useState<Student[]>([])
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'take' | 'history'>('take')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [records, setRecords] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null)

  async function load() {
    setLoading(true)
    const [studSnap, sessSnap] = await Promise.all([
      getDocs(query(collection(db, 'students'), where('classIds', 'array-contains', cls.id))),
      getDocs(query(collection(db, 'attendance'),
        where('classId', '==', cls.id),
        orderBy('date', 'desc')
      )),
    ])
    const studs = studSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student))
    setStudents(studs)
    setSessions(sessSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceSession)))
    // Default: all present
    const init: Record<string, boolean> = {}
    studs.forEach(s => { init[s.id] = true })
    setRecords(init)
    setLoading(false)
  }

  useEffect(() => { load() }, [cls.id])

  // When date changes, check if session already exists
  useEffect(() => {
    const existing = sessions.find(s => s.date === date)
    if (existing) {
      const map: Record<string, boolean> = {}
      existing.records.forEach(r => { map[r.studentId] = r.present })
      setRecords(map)
    } else {
      const init: Record<string, boolean> = {}
      students.forEach(s => { init[s.id] = true })
      setRecords(init)
    }
    setSaved(false)
  }, [date, sessions])

  async function handleSave() {
    setSaving(true)
    const sessionId = `${cls.id}_${date}`
    const sessionRecords = students.map(s => ({
      studentId: s.id,
      studentName: `${s.firstName} ${s.lastName}`,
      present: records[s.id] ?? false,
    }))
    await setDoc(doc(db, 'attendance', sessionId), {
      classId: cls.id,
      date,
      records: sessionRecords,
      createdBy: teacherUid,
      createdAt: new Date().toISOString(),
    })
    await load()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const presentCount = Object.values(records).filter(Boolean).length

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-7 h-7 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-stone-200 mb-6">
        {(['take', 'history'] as const).map(t => (
          <button key={t} onClick={() => setView(t)}
            className={`px-4 py-2 text-sm font-semibold font-quick border-b-2 -mb-px transition ${
              view === t ? 'border-sage-600 text-sage-700' : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}>
            {t === 'take' ? 'Take Attendance' : `History (${sessions.length})`}
          </button>
        ))}
      </div>

      {view === 'take' && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-stone-700 font-quick">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm" />
            </div>
            <span className="text-sm text-stone-400 font-quick">{presentCount}/{students.length} present</span>
          </div>

          {students.length === 0 ? (
            <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center text-stone-400 font-quick text-sm">
              No students enrolled in this class yet.
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-6">
                {students.map(s => {
                  const present = records[s.id] ?? false
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setRecords(r => ({ ...r, [s.id]: !present }))}
                      className={`w-full flex items-center gap-4 rounded-2xl border-2 px-5 py-3.5 text-left transition ${
                        present
                          ? 'border-sage-400 bg-sage-50'
                          : 'border-rose-200 bg-rose-50'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        present ? 'bg-sage-500 text-white' : 'bg-rose-200 text-rose-600'
                      }`}>
                        {present ? '✓' : '✗'}
                      </div>
                      <div className="flex-1">
                        <div className={`font-semibold font-quick text-sm ${present ? 'text-stone-800' : 'text-stone-500'}`}>
                          {s.firstName} {s.lastName}
                        </div>
                      </div>
                      <div className={`text-xs font-bold font-quick ${present ? 'text-sage-600' : 'text-rose-400'}`}>
                        {present ? 'Present' : 'Absent'}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-3 items-center">
                <button onClick={handleSave} disabled={saving}
                  className="bg-wood text-white font-bold font-quick px-8 py-3 rounded-full shadow-md hover:brightness-95 transition disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save Attendance'}
                </button>
                {saved && <span className="text-sm text-sage-600 font-quick font-semibold">Saved!</span>}
              </div>
            </>
          )}
        </div>
      )}

      {view === 'history' && (
        <div>
          {sessions.length === 0 ? (
            <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center text-stone-400 font-quick text-sm">
              No attendance sessions recorded yet.
            </div>
          ) : selectedSession ? (
            <div>
              <button onClick={() => setSelectedSession(null)}
                className="text-sm font-quick font-semibold text-stone-500 hover:text-sage-700 transition mb-4">
                ← Back to history
              </button>
              <h4 className="font-semibold text-stone-700 font-quick mb-4">
                {selectedSession.date} — {selectedSession.records.filter(r => r.present).length}/{selectedSession.records.length} present
              </h4>
              <div className="space-y-2">
                {selectedSession.records.map(r => (
                  <div key={r.studentId}
                    className={`flex items-center gap-4 rounded-2xl px-5 py-3 ${r.present ? 'bg-sage-50 border border-sage-200' : 'bg-rose-50 border border-rose-200'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${r.present ? 'bg-sage-500 text-white' : 'bg-rose-200 text-rose-600'}`}>
                      {r.present ? '✓' : '✗'}
                    </div>
                    <span className="font-quick text-sm text-stone-700 flex-1">{r.studentName}</span>
                    <span className={`text-xs font-bold font-quick ${r.present ? 'text-sage-600' : 'text-rose-400'}`}>
                      {r.present ? 'Present' : 'Absent'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map(sess => {
                const presentN = sess.records.filter(r => r.present).length
                return (
                  <button key={sess.id} onClick={() => setSelectedSession(sess)}
                    className="w-full bg-white rounded-2xl border border-stone-200/70 px-5 py-4 flex items-center gap-4 hover:border-sage-300 hover:bg-sage-50/30 transition text-left">
                    <div className="text-2xl flex-shrink-0">📋</div>
                    <div className="flex-1">
                      <div className="font-semibold text-stone-800 font-quick text-sm">{sess.date}</div>
                      <div className="text-xs text-stone-400 font-quick">{presentN}/{sess.records.length} present</div>
                    </div>
                    <span className="text-xs text-stone-400 font-quick">View →</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Announcements ─────────────────────────────────────────────────────────────

function AnnouncementsTab({ cls, teacherUid, teacherName }: {
  cls: AcademyClass; teacherUid: string; teacherName: string
}) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', published: true })
  const [saving, setSaving] = useState(false)

  function uid() { return Math.random().toString(36).slice(2) }

  async function load() {
    setLoading(true)
    const snap = await getDocs(
      query(collection(db, 'announcements'),
        where('classId', '==', cls.id),
        orderBy('createdAt', 'desc')
      )
    )
    setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)))
    setLoading(false)
  }

  useEffect(() => { load() }, [cls.id])

  async function handlePost() {
    if (!form.title.trim() || !form.body.trim()) return
    setSaving(true)
    const id = uid()
    await setDoc(doc(db, 'announcements', id), {
      title: form.title.trim(),
      body: form.body.trim(),
      classId: cls.id,
      className: cls.name,
      authorUid: teacherUid,
      authorName: teacherName,
      createdAt: new Date().toISOString(),
      published: form.published,
    })
    await load()
    setForm({ title: '', body: '', published: true })
    setComposing(false)
    setSaving(false)
  }

  async function togglePublished(a: Announcement) {
    await setDoc(doc(db, 'announcements', a.id), { ...a, published: !a.published })
    setAnnouncements(prev => prev.map(x => x.id === a.id ? { ...x, published: !x.published } : x))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-7 h-7 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-end mb-5">
        <button onClick={() => setComposing(true)}
          className="bg-wood text-white font-bold font-quick px-5 py-2.5 rounded-full shadow-md hover:brightness-95 transition text-sm">
          + New Announcement
        </button>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center text-stone-400 font-quick text-sm">
          No announcements yet. Post one for the parents of this class.
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-stone-200/70 p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h4 className="font-semibold text-stone-800 font-quick">{a.title}</h4>
                  <p className="text-xs text-stone-400 font-quick mt-0.5">
                    {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => togglePublished(a)}
                  className={`text-xs font-bold font-quick border px-3 py-1 rounded-full flex-shrink-0 transition ${
                    a.published
                      ? 'bg-sage-100 text-sage-700 border-sage-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                      : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-sage-50 hover:text-sage-700 hover:border-sage-200'
                  }`}>
                  {a.published ? 'Published' : 'Draft'}
                </button>
              </div>
              <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-line">{a.body}</p>
            </div>
          ))}
        </div>
      )}

      {composing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-[28px] shadow-2xl border border-stone-200 p-8 max-w-md w-full">
            <h3 className="font-kids text-2xl text-wood-dark mb-6">New Announcement</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 font-quick mb-1">Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Class update for this week"
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 font-quick mb-1">Message</label>
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={5}
                  placeholder="Write your announcement here…"
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm resize-none" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={form.published}
                  onChange={e => setForm(f => ({ ...f, published: e.target.checked }))}
                  className="w-4 h-4 rounded accent-sage-600" />
                <span className="text-sm font-quick text-stone-600">Publish immediately (visible to parents)</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handlePost} disabled={saving || !form.title.trim() || !form.body.trim()}
                className="flex-1 bg-wood text-white font-bold font-quick py-3 rounded-full hover:brightness-95 transition disabled:opacity-60">
                {saving ? 'Posting…' : 'Post'}
              </button>
              <button onClick={() => setComposing(false)}
                className="flex-1 border border-stone-200 text-stone-600 font-quick font-semibold py-3 rounded-full hover:bg-stone-50 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Class Detail ──────────────────────────────────────────────────────────────

function ClassDetail({ cls, teacherUid, teacherName, onBack }: {
  cls: AcademyClass
  teacherUid: string
  teacherName: string
  onBack: () => void
}) {
  const [tab, setTab] = useState<'students' | 'attendance' | 'announcements'>('students')
  const [students, setStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)

  async function loadStudents() {
    setLoadingStudents(true)
    const snap = await getDocs(query(collection(db, 'students'), where('classIds', 'array-contains', cls.id)))
    setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student)))
    setLoadingStudents(false)
  }

  useEffect(() => { loadStudents() }, [cls.id])

  return (
    <div>
      <button onClick={onBack} className="text-sm font-quick font-semibold text-stone-500 hover:text-sage-700 transition mb-5">
        ← My Classes
      </button>
      <h2 className="font-kids text-3xl text-wood-dark mb-1">{cls.name}</h2>
      {cls.schedule && <p className="text-stone-400 text-sm font-quick mb-5">{cls.schedule}</p>}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200 mb-6">
        {([
          ['students', `Students (${students.length})`],
          ['attendance', 'Attendance'],
          ['announcements', 'Announcements'],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold font-quick border-b-2 -mb-px transition ${
              tab === t ? 'border-sage-600 text-sage-700' : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'students' && (
        loadingStudents ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center text-stone-400 font-quick text-sm">
            No students enrolled in this class yet.
          </div>
        ) : (
          <div className="space-y-2">
            {students.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-stone-200/70 px-5 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-sage-100 flex items-center justify-center font-bold text-sage-700 font-quick text-sm flex-shrink-0">
                  {s.firstName[0]}{s.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-stone-800 font-quick text-sm">{s.firstName} {s.lastName}</div>
                  {s.parentName && (
                    <div className="text-xs text-stone-400 font-quick">
                      Parent: {s.parentName}{s.parentPhone ? ` · ${s.parentPhone}` : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'attendance' && <AttendanceTab cls={cls} teacherUid={teacherUid} />}
      {tab === 'announcements' && <AnnouncementsTab cls={cls} teacherUid={teacherUid} teacherName={teacherName} />}
    </div>
  )
}

// ── Teacher Portal Root ───────────────────────────────────────────────────────

export default function TeacherPortal() {
  const [impersonation] = useState<ImpersonationState | null>(() => getImpersonation())
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [authLoading, setAuthLoading] = useState(true)

  const [classes, setClasses] = useState<AcademyClass[]>([])
  const [classesLoading, setClassesLoading] = useState(false)
  const [selectedClass, setSelectedClass] = useState<AcademyClass | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      setUser(u)
      if (u) {
        const token = await u.getIdTokenResult()
        setRole(token.claims['role'] as string ?? null)
        setDisplayName(impersonation?.displayName || u.displayName || u.email || 'Teacher')
      } else {
        setRole(null)
        setDisplayName('')
      }
      setAuthLoading(false)
    })
  }, [])

  useEffect(() => {
    if (user && (role === 'teacher' || role === 'admin')) loadClasses()
  }, [user, role])

  async function loadClasses() {
    setClassesLoading(true)
    let q
    if (impersonation) {
      // When impersonating a teacher, we'd need their UID — for now show all classes (admin-level access)
      q = query(collection(db, 'classes'), orderBy('createdAt', 'desc'))
    } else if (role === 'admin') {
      q = query(collection(db, 'classes'), orderBy('createdAt', 'desc'))
    } else {
      q = query(collection(db, 'classes'), where('teacherUid', '==', user!.uid))
    }
    const snap = await getDocs(q)
    setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as AcademyClass)))
    setClassesLoading(false)
  }

  if (authLoading) {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) { window.location.href = '/login'; return null }

  if (role !== 'teacher' && role !== 'admin') {
    return (
      <div className="bg-cream min-h-screen flex flex-col items-center justify-center gap-4 font-body text-center px-6">
        <div className="text-5xl">🔒</div>
        <h1 className="font-kids text-3xl text-wood-dark">Access Denied</h1>
        <p className="text-stone-500 text-sm max-w-xs">
          This portal is for teachers only. Contact the admin if you need access.
        </p>
        <button onClick={() => signOut(auth)}
          className="font-quick text-sm font-semibold text-rose-600 hover:underline mt-2">
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div className="bg-cream min-h-screen font-body">
      {impersonation && <ImpersonationBanner state={impersonation} />}
      <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur border-b border-stone-200/70">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shadow-sm" />
            <div className="leading-none">
              <div className="font-kids text-base text-wood-dark">Teacher Portal</div>
              <div className="text-xs font-quick text-stone-400">{displayName}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {role === 'admin' && !impersonation && (
              <a href="/admin" className="text-sm font-quick font-semibold text-stone-500 hover:text-sage-700 transition">
                Admin
              </a>
            )}
            <button onClick={() => signOut(auth)}
              className="text-sm font-quick font-semibold text-stone-500 hover:text-rose-600 transition">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {selectedClass ? (
          <ClassDetail
            cls={selectedClass}
            teacherUid={user.uid}
            teacherName={displayName}
            onBack={() => setSelectedClass(null)}
          />
        ) : (
          <div>
            <h2 className="font-kids text-3xl text-wood-dark mb-2">My Classes</h2>
            <p className="text-stone-500 text-sm font-quick mb-8">Select a class to take attendance or post announcements.</p>

            {classesLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
              </div>
            ) : classes.length === 0 ? (
              <div className="bg-white rounded-[28px] border border-stone-200/70 p-10 text-center font-quick">
                <div className="text-4xl mb-4">📚</div>
                <p className="text-stone-500 text-sm">No classes assigned yet.</p>
                <p className="text-stone-400 text-xs mt-1">Contact the admin to get classes assigned to your account.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {classes.map(cls => (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedClass(cls)}
                    className="w-full bg-white rounded-2xl border border-stone-200/70 px-5 py-5 flex items-center gap-4 hover:border-sage-300 hover:shadow-sm transition text-left"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-sage-100 flex items-center justify-center text-2xl flex-shrink-0">📚</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-stone-800 font-quick">{cls.name}</div>
                      {cls.schedule && <div className="text-xs text-stone-400 font-quick mt-0.5">{cls.schedule}</div>}
                      {cls.description && <div className="text-xs text-stone-500 font-quick mt-0.5 truncate">{cls.description}</div>}
                    </div>
                    <span className="text-stone-300 text-xl flex-shrink-0">›</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
