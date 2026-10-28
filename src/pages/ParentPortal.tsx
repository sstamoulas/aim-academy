import React, { useState, useEffect } from 'react'
import {
  signOut, onAuthStateChanged, type User,
} from 'firebase/auth'
import {
  collection, doc, getDoc, getDocs, addDoc, query, where, orderBy, limit,
} from 'firebase/firestore'
import { auth, db } from '../firebase'
import type { AcademyClass, Student, AttendanceSession, AttendanceRecord, Announcement, ChildRequest, MissedWork, ISHomeworkAssignment } from '../types/portal'
import ImpersonationBanner, { getImpersonation, clearImpersonation, type ImpersonationState } from '../components/ImpersonationBanner'

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
  const [tab, setTab] = useState<'attendance' | 'missedWork' | 'homework' | 'announcements'>('attendance')
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [missedWorkItems, setMissedWorkItems] = useState<MissedWork[]>([])
  const [homeworkAssignments, setHomeworkAssignments] = useState<ISHomeworkAssignment[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const classIds = student.classIds
    if (classIds.length === 0) { setLoading(false); return }

    // Load attendance for all student's classes
    const allSessions: AttendanceSession[] = []
    await Promise.all(classIds.map(async classId => {
      const snap = await getDocs(query(
        collection(db, 'attendance'),
        where('classId', '==', classId)
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
        where('published', '==', true)
      ))
      setAnnouncements(annoSnap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    }

    // Load unresolved missed work for this student
    const mwSnap = await getDocs(query(
      collection(db, 'missedWork'),
      where('studentId', '==', student.id),
      where('resolved', '==', false),
      orderBy('date', 'desc'),
    ))
    setMissedWorkItems(mwSnap.docs.map(d => ({ id: d.id, ...d.data() } as MissedWork)))

    // Load recent IS homework assignments for all student classes
    const hwAssignments: ISHomeworkAssignment[] = []
    await Promise.all(classIds.map(async classId => {
      const hwSnap = await getDocs(query(
        collection(db, 'isHomework'),
        where('classId', '==', classId),
        orderBy('week', 'desc'),
        limit(8),
      ))
      hwSnap.docs.forEach(d => hwAssignments.push({ id: d.id, ...d.data() } as ISHomeworkAssignment))
    }))
    hwAssignments.sort((a, b) => b.week.localeCompare(a.week))
    setHomeworkAssignments(hwAssignments)

    setLoading(false)
  }

  useEffect(() => { load() }, [student.id])

  // Filter attendance to only show records for this student
  const studentSessions = sessions.map(sess => {
    const record = sess.records.find(r => r.studentId === student.id)
    if (!record) return null
    const cls = classes.find(c => c.id === sess.classId)
    return { sess, record, className: cls?.name ?? '' }
  }).filter(Boolean) as { sess: AttendanceSession; record: AttendanceRecord; className: string }[]

  const presentCount = studentSessions.filter(s => s.record.status === 'present' || s.record.status === 'late' || (s.record as unknown as { present?: boolean }).present === true).length
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

      {/* Monthly fee display */}
      {student.tuitionAmount ? (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 mb-4 flex items-center justify-between">
          <div className="font-semibold text-stone-700 font-quick text-sm">Monthly Fee</div>
          <div className="text-stone-800 font-quick font-bold">${(student.tuitionAmount / 100).toFixed(2)}<span className="text-stone-400 font-normal text-xs">/mo</span></div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200 mb-6">
        {([
          ['attendance', `Attendance (${totalCount})`],
          ['missedWork', `Missed Work${missedWorkItems.length > 0 ? ` (${missedWorkItems.length})` : ''}`],
          ['homework', `Homework${homeworkAssignments.length > 0 ? ` (${homeworkAssignments.length})` : ''}`],
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
            {studentSessions.map(({ sess, record, className }) => {
              const status = record.status ?? ((record as unknown as { present?: boolean }).present ? 'present' : 'absent')
              const isPresent = status === 'present' || status === 'late'
              const statusLabel = status === 'present' ? 'Present' : status === 'late' ? 'Late' : status === 'excused' ? 'Excused' : 'Absent'
              return (
                <div key={sess.id}
                  className={`flex items-center gap-4 rounded-2xl px-5 py-3.5 border ${
                    status === 'present' ? 'bg-sage-50 border-sage-200' :
                    status === 'late' ? 'bg-amber-50 border-amber-200' :
                    status === 'excused' ? 'bg-stone-50 border-stone-200' :
                    'bg-rose-50 border-rose-200'
                  }`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    isPresent ? 'bg-sage-500 text-white' : status === 'excused' ? 'bg-stone-300 text-stone-600' : 'bg-rose-200 text-rose-600'
                  }`}>
                    {isPresent ? '✓' : status === 'excused' ? 'E' : '✗'}
                  </div>
                  <div className="flex-1">
                    <div className="font-quick text-sm font-semibold text-stone-700">{sess.date}</div>
                    {classes.length > 1 && <div className="text-xs text-stone-400 font-quick">{className}</div>}
                  </div>
                  <span className={`text-xs font-bold font-quick ${
                    status === 'present' ? 'text-sage-600' : status === 'late' ? 'text-amber-600' : status === 'excused' ? 'text-stone-500' : 'text-rose-400'
                  }`}>
                    {statusLabel}
                  </span>
                </div>
              )
            })}
          </div>
        )
      ) : tab === 'missedWork' ? (
        missedWorkItems.length === 0 ? (
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center text-stone-400 font-quick text-sm">
            No missed work on record.
          </div>
        ) : (
          <div className="space-y-3">
            {missedWorkItems.map(item => {
              const cls = classes.find(c => c.id === item.classId)
              const what: string[] = []
              if (item.missedLesson) what.push('IS Lesson')
              if (item.missedHomework) what.push('IS Homework')
              return (
                <div key={item.id} className="bg-white rounded-2xl border border-rose-100 p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="font-quick font-semibold text-stone-800 text-sm">
                        {new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </div>
                      <div className="text-xs text-stone-400 font-quick mt-0.5">{cls?.name ?? item.className}</div>
                    </div>
                    <span className="text-xs font-bold font-quick bg-rose-100 text-rose-600 border border-rose-200 px-2.5 py-0.5 rounded-full flex-shrink-0">Absent</span>
                  </div>
                  {what.length > 0 && (
                    <div className="flex gap-2 mb-2">
                      {what.map(w => (
                        <span key={w} className="text-xs font-quick font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full">{w}</span>
                      ))}
                    </div>
                  )}
                  {item.missedWorkNotes ? (
                    <p className="text-sm font-quick text-stone-600 leading-relaxed">{item.missedWorkNotes}</p>
                  ) : (
                    <p className="text-xs font-quick text-stone-400 italic">No additional notes from teacher.</p>
                  )}
                </div>
              )
            })}
          </div>
        )
      ) : tab === 'homework' ? (
        homeworkAssignments.length === 0 ? (
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center text-stone-400 font-quick text-sm">
            No homework assignments posted yet.
          </div>
        ) : (
          <div className="space-y-3">
            {homeworkAssignments.map(hw => {
              const cls = classes.find(c => c.id === hw.classId)
              return (
                <div key={hw.id} className="bg-white rounded-2xl border border-amber-100 p-5">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="font-quick font-semibold text-stone-800 text-sm">{hw.title}</div>
                    <span className="text-xs font-quick text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">IS Homework</span>
                  </div>
                  <div className="text-xs text-stone-400 font-quick mb-2">
                    {cls?.name ?? ''} · {(() => {
                      const [yr, wk] = hw.week.split('-W')
                      const jan1 = new Date(Number(yr), 0, 1)
                      const simple = new Date(jan1.getTime() + (Number(wk) - 1) * 7 * 86400000)
                      const dow = simple.getDay()
                      const mon = new Date(simple)
                      mon.setDate(simple.getDate() - (dow === 0 ? 6 : dow - 1))
                      return `Week of ${mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    })()}
                  </div>
                  {hw.description && (
                    <p className="text-sm font-quick text-stone-600 leading-relaxed">{hw.description}</p>
                  )}
                </div>
              )
            })}
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

    </div>
  )
}

// ── Parent Portal Root ────────────────────────────────────────────────────────

export default function ParentPortal() {
  const [impersonation, setImpersonation] = useState<ImpersonationState | null>(() => getImpersonation())
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [authLoading, setAuthLoading] = useState(true)

  const [children, setChildren] = useState<ChildData[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [selectedChild, setSelectedChild] = useState<ChildData | null>(null)

  const [pendingRequests, setPendingRequests] = useState<ChildRequest[]>([])
  const [registerOpen, setRegisterOpen] = useState(false)
  const [registerForm, setRegisterForm] = useState({ firstName: '', lastName: '', dateOfBirth: '', grade: '' })
  const [registerSubmitting, setRegisterSubmitting] = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [registerSuccess, setRegisterSuccess] = useState(false)

  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewForm, setReviewForm] = useState({ quote: '', adminRole: 'parent' })
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewSuccess, setReviewSuccess] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [existingReviewStatus, setExistingReviewStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none')

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      setUser(u)
      if (u) {
        const token = await u.getIdTokenResult()
        const userRole = token.claims['role'] as string ?? null
        setRole(userRole)
        // Clear stale impersonation if the real user is not an admin
        if (userRole !== 'admin' && getImpersonation()) {
          clearImpersonation()
          setImpersonation(null)
        }
        setDisplayName(impersonation?.displayName || u.displayName || u.email || 'Parent')
      } else {
        setRole(null)
        setDisplayName('')
      }
      setAuthLoading(false)
    })
  }, [])

  useEffect(() => {
    if (user && (role === 'parent' || role === 'admin')) {
      loadChildren()
      loadPendingRequests()
      checkExistingReview()
    }
  }, [user, role])

  async function checkExistingReview() {
    if (!user) return
    const uid = impersonation?.uid ?? user.uid
    const snap = await getDocs(query(collection(db, 'reviews'), where('submittedByUid', '==', uid)))
    if (snap.empty) { setExistingReviewStatus('none'); return }
    setExistingReviewStatus(snap.docs[0].data().status ?? 'pending')
  }

  function formatAuthorName(name: string): string {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0]
    return `${parts[0]} ${parts[parts.length - 1][0]}.`
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault()
    setReviewError(null)
    if (!reviewForm.quote.trim()) {
      setReviewError('Please fill in your review.')
      return
    }
    if (!user) return
    setReviewSubmitting(true)
    try {
      const uid = impersonation?.uid ?? user.uid
      const authorRaw = impersonation?.displayName || user.displayName || user.email || 'Anonymous'
      const authorFormatted = formatAuthorName(authorRaw)
      const derivedRole = (role === 'admin' && !impersonation) ? reviewForm.adminRole : (impersonation ? 'parent' : (role ?? 'parent'))
      const roleLabel = derivedRole.charAt(0).toUpperCase() + derivedRole.slice(1)
      await addDoc(collection(db, 'reviews'), {
        quote: reviewForm.quote.trim(),
        author: authorFormatted,
        role: roleLabel,
        published: false,
        status: 'pending',
        order: 999,
        submittedByUid: uid,
        submittedAt: new Date().toISOString(),
      })
      setReviewSuccess(true)
      setExistingReviewStatus('pending')
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : 'Failed to submit review.')
    } finally {
      setReviewSubmitting(false)
    }
  }

  async function loadPendingRequests() {
    if (!user) return
    const uid = impersonation?.uid ?? user.uid
    const snap = await getDocs(query(
      collection(db, 'childRequests'),
      where('parentUid', '==', uid),
      where('status', '==', 'pending'),
    ))
    setPendingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChildRequest)))
  }

  async function handleRegisterChild(e: React.FormEvent) {
    e.preventDefault()
    setRegisterError(null)
    if (!registerForm.firstName.trim() || !registerForm.lastName.trim()) {
      setRegisterError('First and last name are required.')
      return
    }
    if (!user) return
    setRegisterSubmitting(true)
    try {
      const parentUid = impersonation?.uid ?? user.uid
      const parentEmail = impersonation?.email ?? user.email
      const parentName = impersonation?.displayName ?? user.displayName ?? user.email
      await addDoc(collection(db, 'childRequests'), {
        parentUid,
        parentEmail,
        parentName,
        child: {
          firstName: registerForm.firstName.trim(),
          lastName: registerForm.lastName.trim(),
          dateOfBirth: registerForm.dateOfBirth.trim() || null,
          grade: registerForm.grade.trim() || null,
        },
        status: 'pending',
        submittedAt: new Date().toISOString(),
      })
      setRegisterSuccess(true)
      setRegisterForm({ firstName: '', lastName: '', dateOfBirth: '', grade: '' })
      await loadPendingRequests()
    } catch (err: unknown) {
      setRegisterError(err instanceof Error ? err.message : 'Failed to submit request.')
    } finally {
      setRegisterSubmitting(false)
    }
  }

  async function loadChildren() {
    if (!user) return
    setDataLoading(true)

    // When impersonating, query by the impersonated user's email
    const email = impersonation ? impersonation.email : (role === 'admin' ? null : user.email)

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

  if (!user) { window.location.href = '/login'; return null }

  // Redirect non-impersonated admins/teachers to their own portals
  if (!impersonation) {
    if (role === 'admin') { window.location.href = '/admin'; return null }
    if (role === 'teacher') { window.location.href = '/portal/teacher'; return null }
  }

  if (!impersonation && role !== 'parent' && role !== 'admin') {
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
      {impersonation && <ImpersonationBanner state={impersonation} />}
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
            {role === 'admin' && !impersonation && (
              <a href="/admin" className="text-sm font-quick font-semibold text-stone-500 hover:text-sage-700 transition">Admin</a>
            )}
            <button onClick={() => signOut(auth)}
              className="text-sm font-quick font-semibold text-stone-500 hover:text-rose-600 transition">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Leave a Review Modal */}
      {reviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md p-8">
            {reviewSuccess ? (
              <div className="text-center">
                <div className="text-5xl mb-4">🌿</div>
                <h2 className="font-kids text-2xl text-wood-dark mb-2">Thank you!</h2>
                <p className="text-stone-500 text-sm font-quick mb-6">
                  Your review has been submitted and will appear on the site once approved, in sha Allah.
                </p>
                <button
                  onClick={() => setReviewOpen(false)}
                  className="bg-sage-600 text-white font-bold font-quick px-6 py-3 rounded-full hover:brightness-95 transition">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-kids text-2xl text-wood-dark">Leave a Review</h2>
                  <button onClick={() => setReviewOpen(false)} className="text-stone-400 hover:text-stone-600 text-xl leading-none">✕</button>
                </div>
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 font-quick mb-1.5">Your Review <span className="text-rose-500">*</span></label>
                    <textarea
                      rows={4}
                      value={reviewForm.quote}
                      onChange={e => setReviewForm(p => ({ ...p, quote: e.target.value }))}
                      placeholder="Share your experience with AIMAVA…"
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent resize-none"
                    />
                  </div>
                  {role === 'admin' && !impersonation && (
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 font-quick mb-1.5">Role (shown publicly)</label>
                      <select
                        value={reviewForm.adminRole}
                        onChange={e => setReviewForm(p => ({ ...p, adminRole: e.target.value }))}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400"
                      >
                        <option value="parent">Parent</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  )}
                  {reviewError && (
                    <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{reviewError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="w-full bg-sage-600 text-white font-bold font-quick py-3 rounded-full shadow-md hover:brightness-95 transition disabled:opacity-60 mt-2">
                    {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Register a Child Modal */}
      {registerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md p-8">
            {registerSuccess ? (
              <div className="text-center">
                <div className="text-5xl mb-4">🌿</div>
                <h2 className="font-kids text-2xl text-wood-dark mb-2">Request submitted!</h2>
                <p className="text-stone-500 text-sm font-quick mb-6">
                  Your child registration request has been sent to the admin for review. You'll be notified once it's approved, in sha Allah.
                </p>
                <button
                  onClick={() => setRegisterOpen(false)}
                  className="bg-sage-600 text-white font-bold font-quick px-6 py-3 rounded-full hover:brightness-95 transition">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-kids text-2xl text-wood-dark">Register a Child</h2>
                  <button onClick={() => setRegisterOpen(false)} className="text-stone-400 hover:text-stone-600 text-xl leading-none">✕</button>
                </div>
                <form onSubmit={handleRegisterChild} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 font-quick mb-1.5">First Name <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={registerForm.firstName}
                        onChange={e => setRegisterForm(p => ({ ...p, firstName: e.target.value }))}
                        placeholder="First"
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 font-quick mb-1.5">Last Name <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={registerForm.lastName}
                        onChange={e => setRegisterForm(p => ({ ...p, lastName: e.target.value }))}
                        placeholder="Last"
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 font-quick mb-1.5">Date of Birth <span className="text-stone-400 font-normal">(optional)</span></label>
                    <input
                      type="date"
                      value={registerForm.dateOfBirth}
                      onChange={e => setRegisterForm(p => ({ ...p, dateOfBirth: e.target.value }))}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 font-quick mb-1.5">Grade <span className="text-stone-400 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={registerForm.grade}
                      onChange={e => setRegisterForm(p => ({ ...p, grade: e.target.value }))}
                      placeholder="e.g. 3rd grade"
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent"
                    />
                  </div>
                  {registerError && (
                    <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{registerError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={registerSubmitting}
                    className="w-full bg-wood text-white font-bold font-quick py-3 rounded-full shadow-md hover:brightness-95 transition disabled:opacity-60 mt-2">
                    {registerSubmitting ? 'Submitting…' : 'Submit Request'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <main className={`max-w-3xl mx-auto px-6 py-10${impersonation ? ' pb-32' : ''}`}>
        {selectedChild ? (
          <ChildDetail
            data={selectedChild}
            onBack={() => setSelectedChild(null)}
          />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-kids text-3xl text-wood-dark">My Children</h2>
              <button
                onClick={() => { setRegisterOpen(true); setRegisterSuccess(false); setRegisterError(null) }}
                className="bg-wood text-white font-bold font-quick px-5 py-2.5 rounded-full shadow-sm hover:brightness-95 transition text-sm">
                + Register a Child
              </button>
            </div>
            <p className="text-stone-500 text-sm font-quick mb-8">
              Select a child to view their attendance and class announcements.
            </p>

            {/* Pending child requests */}
            {pendingRequests.length > 0 && (
              <div className="mb-6 space-y-3">
                <p className="text-xs font-bold font-quick text-stone-400 uppercase tracking-wider">Pending Approval</p>
                {pendingRequests.map(req => (
                  <div key={req.id} className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700 font-quick flex-shrink-0">
                      {req.child.firstName[0]}{req.child.lastName[0]}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-stone-800 font-quick text-sm">{req.child.firstName} {req.child.lastName}</div>
                      <div className="text-xs text-stone-400 font-quick">Awaiting admin approval · submitted {new Date(req.submittedAt).toLocaleDateString()}</div>
                    </div>
                    <span className="text-xs font-bold font-quick bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">Pending</span>
                  </div>
                ))}
              </div>
            )}

            {dataLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
              </div>
            ) : children.length === 0 && pendingRequests.length === 0 ? (
              <div className="bg-white rounded-[28px] border border-stone-200/70 p-10 text-center font-quick">
                <div className="text-4xl mb-4">👧</div>
                <p className="text-stone-500 text-sm">No children found linked to your account.</p>
                <p className="text-stone-400 text-xs mt-1">
                  {impersonation
                    ? `Contact the academy to ensure the email (${impersonation.email}) is registered.`
                    : `Register a child above or contact the academy to ensure your email (${user.email}) is registered.`
                  }
                </p>
              </div>
            ) : children.length === 0 ? null : (
              <div className="space-y-4">
                {children.map(({ student, classes }) => {
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
                          {student.tuitionAmount ? (
                            <div className="text-xs font-quick text-stone-400 mt-1">Monthly fee: <span className="font-semibold text-stone-600">${(student.tuitionAmount / 100).toFixed(2)}</span></div>
                          ) : null}
                        </div>
                        <span className="text-stone-300 text-xl flex-shrink-0">›</span>
                      </div>

                      <div className="flex gap-3 flex-wrap">
                        <button
                          onClick={() => setSelectedChild({ student, classes })}
                          className="flex-1 border border-stone-200 text-stone-600 font-quick font-semibold py-2.5 rounded-full hover:bg-stone-50 transition text-sm">
                          View Details
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}


            {/* Leave a Review banner */}
            {!dataLoading && existingReviewStatus !== 'approved' && (
              <div className="mt-8 bg-sage-50 border border-sage-200 rounded-[24px] px-6 py-5 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-stone-800 font-quick text-sm">Enjoying AIMAVA?</div>
                  <div className="text-xs text-stone-500 font-quick mt-0.5">
                    {existingReviewStatus === 'pending'
                      ? 'Your review has been submitted and is pending approval.'
                      : "Share your experience — we'd love to hear from you."}
                  </div>
                </div>
                {(existingReviewStatus === 'none' || existingReviewStatus === 'rejected') && (
                  <button
                    onClick={() => { setReviewOpen(true); setReviewSuccess(false); setReviewError(null); setReviewForm({ quote: '', adminRole: 'parent' }) }}
                    className="bg-sage-600 text-white font-bold font-quick px-5 py-2.5 rounded-full shadow-sm hover:brightness-95 transition text-sm flex-shrink-0">
                    Leave a Review
                  </button>
                )}
                {existingReviewStatus === 'pending' && (
                  <span className="text-xs font-bold font-quick bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full flex-shrink-0">Pending</span>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

