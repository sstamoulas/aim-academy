import { useState, useEffect } from 'react'
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged, type User,
} from 'firebase/auth'
import {
  collection, doc, getDoc, getDocs, query, where, orderBy,
} from 'firebase/firestore'
import { auth, db } from '../firebase'
import type { AcademyClass, Student, AttendanceSession, Announcement } from '../types/portal'
import PaymentModal from '../components/PaymentModal'

// ── Login ─────────────────────────────────────────────────────────────────────

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    try { await signInWithEmailAndPassword(auth, email, password) }
    catch { setError('Invalid email or password.') }
    finally { setLoading(false) }
  }

  return (
    <div className="bg-cream min-h-screen flex items-center justify-center px-6 font-body">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="AIM Academy" className="w-14 h-14 rounded-2xl shadow-md object-contain bg-white p-1 mx-auto mb-4" />
          <h1 className="font-kids text-3xl text-wood-dark">Parent Portal</h1>
          <p className="text-stone-500 text-sm mt-1 font-quick">Anas Ibn Malik Academy</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-[28px] shadow-sm border border-stone-200/70 p-8 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-stone-700 font-quick mb-2">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 transition" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 font-quick mb-2">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 transition" />
          </div>
          {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-wood text-white font-bold font-quick py-3.5 rounded-full shadow-md hover:brightness-95 transition disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Child Detail ──────────────────────────────────────────────────────────────

interface ChildData {
  student: Student
  classes: AcademyClass[]
}

function ChildDetail({ data, onBack }: {
  data: ChildData
  onBack: () => void
}) {
  const { student, classes } = data
  const [tab, setTab] = useState<'attendance' | 'announcements'>('attendance')
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [payOpen, setPayOpen] = useState(false)
  const [payClassId, setPayClassId] = useState<string | null>(null)

  const payClass = payClassId ? classes.find(c => c.id === payClassId) ?? null : null

  async function load() {
    setLoading(true)
    const classIds = student.classIds
    if (classIds.length === 0) { setLoading(false); return }

    // Load attendance for all student's classes
    const allSessions: AttendanceSession[] = []
    await Promise.all(classIds.map(async classId => {
      const snap = await getDocs(query(
        collection(db, 'attendance'),
        where('classId', '==', classId),
        orderBy('date', 'desc')
      ))
      snap.docs.forEach(d => allSessions.push({ id: d.id, ...d.data() } as AttendanceSession))
    }))
    // Sort all sessions newest first
    allSessions.sort((a, b) => b.date.localeCompare(a.date))
    setSessions(allSessions)

    // Load published announcements for all classes
    if (classIds.length > 0) {
      const annoSnap = await getDocs(query(
        collection(db, 'announcements'),
        where('classId', 'in', classIds),
        where('published', '==', true),
        orderBy('createdAt', 'desc')
      ))
      setAnnouncements(annoSnap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)))
    }

    setLoading(false)
  }

  useEffect(() => { load() }, [student.id])

  // Filter attendance to only show records for this student
  const studentSessions = sessions.map(sess => {
    const record = sess.records.find(r => r.studentId === student.id)
    if (!record) return null
    const cls = classes.find(c => c.id === sess.classId)
    return { sess, record, className: cls?.name ?? '' }
  }).filter(Boolean) as { sess: AttendanceSession; record: { present: boolean }; className: string }[]

  const presentCount = studentSessions.filter(s => s.record.present).length
  const totalCount = studentSessions.length

  return (
    <div>
      <button onClick={onBack} className="text-sm font-quick font-semibold text-stone-500 hover:text-sage-700 transition mb-5">
        ← My Children
      </button>

      {/* Child header */}
      <div className="bg-white rounded-[28px] border border-stone-200/70 p-6 mb-6 flex items-center gap-5">
        <div className="w-14 h-14 rounded-full bg-sage-100 flex items-center justify-center font-bold text-sage-700 font-quick text-xl flex-shrink-0">
          {student.firstName[0]}{student.lastName[0]}
        </div>
        <div className="flex-1">
          <h2 className="font-kids text-2xl text-wood-dark">{student.firstName} {student.lastName}</h2>
          <div className="flex flex-wrap gap-2 mt-1">
            {classes.map(cls => (
              <span key={cls.id} className="text-xs font-quick font-semibold bg-sage-100 text-sage-700 border border-sage-200 px-2.5 py-0.5 rounded-full">
                {cls.name}
              </span>
            ))}
          </div>
        </div>
        {/* Attendance summary */}
        {totalCount > 0 && (
          <div className="text-center flex-shrink-0">
            <div className="font-kids text-2xl text-wood-dark">{totalCount > 0 ? Math.round(presentCount / totalCount * 100) : 0}%</div>
            <div className="text-xs text-stone-400 font-quick">attendance</div>
          </div>
        )}
      </div>

      {/* Pay tuition buttons */}
      {classes.filter(c => c.tuitionAmount).map(cls => (
        <div key={cls.id} className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-4 flex items-center justify-between">
          <div>
            <div className="font-semibold text-stone-800 font-quick text-sm">{cls.name} Tuition</div>
            <div className="text-xs text-stone-500 font-quick mt-0.5">
              ${((cls.tuitionAmount ?? 0) / 100).toFixed(2)} / month
            </div>
          </div>
          <button
            onClick={() => { setPayClassId(cls.id); setPayOpen(true) }}
            className="bg-wood text-white font-bold font-quick px-5 py-2 rounded-full shadow-sm hover:brightness-95 transition text-sm flex-shrink-0">
            Pay Now
          </button>
        </div>
      ))}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200 mb-6">
        {([
          ['attendance', `Attendance (${totalCount})`],
          ['announcements', `Announcements (${announcements.length})`],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold font-quick border-b-2 -mb-px transition ${
              tab === t ? 'border-sage-600 text-sage-700' : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
        </div>
      ) : tab === 'attendance' ? (
        studentSessions.length === 0 ? (
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center text-stone-400 font-quick text-sm">
            No attendance records yet.
          </div>
        ) : (
          <div className="space-y-2">
            {studentSessions.map(({ sess, record, className }) => (
              <div key={sess.id}
                className={`flex items-center gap-4 rounded-2xl px-5 py-3.5 border ${
                  record.present
                    ? 'bg-sage-50 border-sage-200'
                    : 'bg-rose-50 border-rose-200'
                }`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  record.present ? 'bg-sage-500 text-white' : 'bg-rose-200 text-rose-600'
                }`}>
                  {record.present ? '✓' : '✗'}
                </div>
                <div className="flex-1">
                  <div className="font-quick text-sm font-semibold text-stone-700">{sess.date}</div>
                  {classes.length > 1 && <div className="text-xs text-stone-400 font-quick">{className}</div>}
                </div>
                <span className={`text-xs font-bold font-quick ${record.present ? 'text-sage-600' : 'text-rose-400'}`}>
                  {record.present ? 'Present' : 'Absent'}
                </span>
              </div>
            ))}
          </div>
        )
      ) : (
        announcements.length === 0 ? (
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center text-stone-400 font-quick text-sm">
            No announcements yet.
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map(a => {
              const cls = classes.find(c => c.id === a.classId)
              return (
                <div key={a.id} className="bg-white rounded-2xl border border-stone-200/70 p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h4 className="font-semibold text-stone-800 font-quick">{a.title}</h4>
                      <p className="text-xs text-stone-400 font-quick mt-0.5">
                        {cls ? `${cls.name} · ` : ''}{new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-line">{a.body}</p>
                </div>
              )
            })}
          </div>
        )
      )}

      {payOpen && payClass?.tuitionAmount && (
        <PaymentModal
          isOpen={payOpen}
          onClose={() => { setPayOpen(false); setPayClassId(null) }}
          amount={payClass.tuitionAmount}
          description={`${payClass.name} Tuition — ${student.firstName} ${student.lastName}`}
        />
      )}
    </div>
  )
}

// ── Parent Portal Root ────────────────────────────────────────────────────────

export default function ParentPortal() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [authLoading, setAuthLoading] = useState(true)

  const [children, setChildren] = useState<ChildData[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [selectedChild, setSelectedChild] = useState<ChildData | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      setUser(u)
      if (u) {
        const token = await u.getIdTokenResult()
        setRole(token.claims['role'] as string ?? null)
        setDisplayName(u.displayName || u.email || 'Parent')
      } else {
        setRole(null)
        setDisplayName('')
      }
      setAuthLoading(false)
    })
  }, [])

  useEffect(() => {
    if (user && (role === 'parent' || role === 'admin')) loadChildren()
  }, [user, role])

  async function loadChildren() {
    if (!user?.email) return
    setDataLoading(true)

    const email = role === 'admin' ? null : user.email

    const snap = email
      ? await getDocs(query(collection(db, 'students'), where('parentEmail', '==', email)))
      : await getDocs(collection(db, 'students'))

    const students = snap.docs.map(d => ({ id: d.id, ...d.data() } as Student))

    // For each student, load their classes
    const childDataList = await Promise.all(students.map(async student => {
      const classPromises = student.classIds.map(cid => getDoc(doc(db, 'classes', cid)))
      const classDocs = await Promise.all(classPromises)
      const classes = classDocs
        .filter(d => d.exists())
        .map(d => ({ id: d.id, ...d.data() } as AcademyClass))
      return { student, classes }
    }))

    setChildren(childDataList)
    setDataLoading(false)
  }

  if (authLoading) {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <LoginForm />

  if (role !== 'parent' && role !== 'admin') {
    // No role — may be a pending registration
    return (
      <div className="bg-cream min-h-screen flex flex-col items-center justify-center gap-4 font-body text-center px-6">
        <div className="text-5xl">⏳</div>
        <h1 className="font-kids text-3xl text-wood-dark">Pending Approval</h1>
        <p className="text-stone-500 text-sm max-w-xs">
          Your account is awaiting admin approval. You'll receive an email once it's been reviewed.
        </p>
        <a href="/portal/register"
          className="font-quick text-sm font-semibold text-sage-700 hover:underline">
          Check registration status →
        </a>
        <button onClick={() => signOut(auth)}
          className="font-quick text-sm font-semibold text-stone-400 hover:text-rose-600 transition">
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div className="bg-cream min-h-screen font-body">
      <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur border-b border-stone-200/70">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shadow-sm" />
            <div className="leading-none">
              <div className="font-kids text-base text-wood-dark">Parent Portal</div>
              <div className="text-xs font-quick text-stone-400">{displayName}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {role === 'admin' && (
              <a href="/admin" className="text-sm font-quick font-semibold text-stone-500 hover:text-sage-700 transition">Admin</a>
            )}
            <button onClick={() => signOut(auth)}
              className="text-sm font-quick font-semibold text-stone-500 hover:text-rose-600 transition">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {selectedChild ? (
          <ChildDetail
            data={selectedChild}
            onBack={() => setSelectedChild(null)}
          />
        ) : (
          <div>
            <h2 className="font-kids text-3xl text-wood-dark mb-2">My Children</h2>
            <p className="text-stone-500 text-sm font-quick mb-8">
              Select a child to view their attendance and class announcements.
            </p>

            {dataLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
              </div>
            ) : children.length === 0 ? (
              <div className="bg-white rounded-[28px] border border-stone-200/70 p-10 text-center font-quick">
                <div className="text-4xl mb-4">👧</div>
                <p className="text-stone-500 text-sm">No children found linked to your account.</p>
                <p className="text-stone-400 text-xs mt-1">
                  Contact the academy to ensure your email ({user.email}) is registered.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {children.map(({ student, classes }) => {
                  const hasPayable = classes.some(c => c.tuitionAmount)
                  return (
                    <div key={student.id} className="bg-white rounded-[28px] border border-stone-200/70 p-6">
                      <div className="flex items-center gap-4 mb-4 cursor-pointer" onClick={() => setSelectedChild({ student, classes })}>
                        <div className="w-12 h-12 rounded-full bg-sage-100 flex items-center justify-center font-bold text-sage-700 font-quick text-lg flex-shrink-0">
                          {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-stone-800 font-quick">{student.firstName} {student.lastName}</div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {classes.length > 0
                              ? classes.map(cls => (
                                  <span key={cls.id} className="text-xs font-quick text-stone-400">{cls.name}</span>
                                ))
                              : <span className="text-xs text-stone-400 font-quick">No classes enrolled</span>
                            }
                          </div>
                        </div>
                        <span className="text-stone-300 text-xl flex-shrink-0">›</span>
                      </div>

                      <div className="flex gap-3 flex-wrap">
                        <button
                          onClick={() => setSelectedChild({ student, classes })}
                          className="flex-1 border border-stone-200 text-stone-600 font-quick font-semibold py-2.5 rounded-full hover:bg-stone-50 transition text-sm">
                          View Details
                        </button>
                        {hasPayable && classes.filter(c => c.tuitionAmount).map(cls => (
                          <PayButton key={cls.id} cls={cls} student={student} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// Extracted to avoid hooks-in-loop issue
function PayButton({ cls, student }: { cls: AcademyClass; student: Student }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-wood text-white font-bold font-quick px-5 py-2.5 rounded-full shadow-sm hover:brightness-95 transition text-sm flex-shrink-0">
        Pay Tuition
      </button>
      <PaymentModal
        isOpen={open}
        onClose={() => setOpen(false)}
        amount={cls.tuitionAmount!}
        description={`${cls.name} Tuition — ${student.firstName} ${student.lastName}`}
      />
    </>
  )
}
