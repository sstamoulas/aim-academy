import { useState, useEffect } from 'react'
import {
  signOut, onAuthStateChanged, type User,
} from 'firebase/auth'
import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, orderBy,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { auth, db } from '../firebase'
import type { AcademyClass, Student, AttendanceSession, AttendanceStatus, MissedWork, Announcement, ISHomeworkAssignment, QaidahFluency, QaidahProgress, QaidahHistoryEntry } from '../types/portal'
import ImpersonationBanner, { getImpersonation, type ImpersonationState } from '../components/ImpersonationBanner'

const functions = getFunctions()
const notifyAnnouncementParentsFn = httpsCallable(functions, 'notifyAnnouncementParents')
const notifyMissedWorkParentFn = httpsCallable(functions, 'notifyMissedWorkParent')

// ── Date/week helpers ─────────────────────────────────────────────────────────

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const wk = Math.ceil(((d.valueOf() - yearStart.valueOf()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`
}

function currentWeek() { return isoWeek(new Date()) }

function currentMonth() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

function weekMonday(w: string): Date {
  const [yr, wkStr] = w.split('-W')
  const jan1 = new Date(Number(yr), 0, 1)
  const wkNum = Number(wkStr)
  const simple = new Date(jan1.getTime() + (wkNum - 1) * 7 * 86400000)
  const dow = simple.getDay()
  const mon = new Date(simple)
  mon.setDate(simple.getDate() - (dow === 0 ? 6 : dow - 1))
  mon.setHours(0, 0, 0, 0)
  return mon
}

function weekLabel(w: string): string {
  const mon = weekMonday(w)
  return `Week of ${mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function monthLabel(m: string): string {
  const [y, mo] = m.split('-')
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function shiftWeek(w: string, delta: number): string {
  const mon = weekMonday(w)
  mon.setDate(mon.getDate() + delta * 7)
  return isoWeek(mon)
}

function shiftMonth(m: string, delta: number): string {
  const [y, mo] = m.split('-')
  const d = new Date(Number(y), Number(mo) - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── Progress types (inline) ───────────────────────────────────────────────────

interface ProgData { quranPosition: string; qaidahPosition: string; islamicStudiesLevel: string; notes: string; updatedAt?: string }
interface HwData { completed: Record<string, boolean>; updatedAt?: string }
interface QuizData { maxScore: number; scores: Record<string, number>; updatedAt?: string }

// ── Status badge helper ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-sage-100 text-sage-700',
  late: 'bg-amber-100 text-amber-700',
  excused: 'bg-stone-100 text-stone-600',
  absent: 'bg-rose-100 text-rose-600',
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  excused: 'Excused',
  absent: 'Absent',
}

// ── Attendance ────────────────────────────────────────────────────────────────

function AttendanceTab({ cls, teacherUid }: { cls: AcademyClass; teacherUid: string }) {
  const [students, setStudents] = useState<Student[]>([])
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'take' | 'history'>('take')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null)

  async function load() {
    setLoading(true)
    const [studSnap, sessSnap] = await Promise.all([
      getDocs(query(collection(db, 'students'), where('classIds', 'array-contains', cls.id))),
      getDocs(query(collection(db, 'attendance'), where('classId', '==', cls.id), orderBy('date', 'desc'))),
    ])
    const studs = studSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student))
    setStudents(studs)
    setSessions(sessSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceSession)))
    const init: Record<string, AttendanceStatus> = {}
    studs.forEach(s => { init[s.id] = 'absent' })
    setRecords(init)
    setLoading(false)
  }

  useEffect(() => { load() }, [cls.id])

  useEffect(() => {
    const existing = sessions.find(s => s.date === date)
    if (existing) {
      const map: Record<string, AttendanceStatus> = {}
      existing.records.forEach(r => {
        map[r.studentId] = r.status ?? ((r as unknown as { present?: boolean }).present ? 'present' : 'absent')
      })
      setRecords(map)
    } else {
      const init: Record<string, AttendanceStatus> = {}
      students.forEach(s => { init[s.id] = 'absent' })
      setRecords(init)
    }
    setSaved(false)
  }, [date, sessions])

  async function handleSave() {
    setSaving(true)
    const sessionId = `${cls.id}_${date}`
    await setDoc(doc(db, 'attendance', sessionId), {
      classId: cls.id,
      date,
      records: students.map(s => ({
        studentId: s.id,
        studentName: `${s.firstName} ${s.lastName}`,
        status: records[s.id] ?? 'absent',
        present: records[s.id] === 'present' || records[s.id] === 'late',
      })),
      createdBy: teacherUid,
      createdAt: new Date().toISOString(),
    })

    // Check if there's a classwide IS homework assignment for this date's week
    const dateWeek = isoWeek(new Date(date + 'T00:00:00'))
    const assignmentSnap = await getDoc(doc(db, 'isHomework', `${cls.id}__${dateWeek}`))
    const hasAssignment = assignmentSnap.exists()

    // Handle missedWork docs
    await Promise.all(students.map(async s => {
      const missedDocId = `${cls.id}_${date}_${s.id}`
      const status = records[s.id] ?? 'absent'
      if (status === 'absent') {
        await setDoc(doc(db, 'missedWork', missedDocId), {
          classId: cls.id,
          className: cls.name,
          studentId: s.id,
          studentName: `${s.firstName} ${s.lastName}`,
          date,
          missedWorkNotes: '',
          resolved: false,
          createdAt: new Date().toISOString(),
          ...(hasAssignment ? { missedHomework: true } : {}),
        }, { merge: true })
      } else {
        try {
          await deleteDoc(doc(db, 'missedWork', missedDocId))
        } catch {
          // doc may not exist — ignore
        }
      }
    }))

    await load()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const statusCounts = { present: 0, late: 0, excused: 0, absent: 0 }
  Object.values(records).forEach(s => statusCounts[s]++)

  if (loading) return <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex gap-1 border-b border-stone-200 mb-6">
        {(['take', 'history'] as const).map(t => (
          <button key={t} onClick={() => setView(t)}
            className={`px-4 py-2 text-sm font-semibold font-quick border-b-2 -mb-px transition ${view === t ? 'border-sage-600 text-sage-700' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
            {t === 'take' ? 'Take Attendance' : `History (${sessions.length})`}
          </button>
        ))}
      </div>

      {view === 'take' && (
        <div>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-stone-700 font-quick">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm" />
            </div>
            <span className="text-xs text-stone-400 font-quick">
              {statusCounts.present} present · {statusCounts.late} late · {statusCounts.excused} excused · {statusCounts.absent} absent
            </span>
          </div>
          {students.length === 0 ? (
            <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center text-stone-400 font-quick text-sm">No students enrolled in this class yet.</div>
          ) : (
            <>
              <div className="space-y-2 mb-6">
                {students.map(s => {
                  const status = records[s.id] ?? 'absent'
                  return (
                    <div key={s.id}
                      className={`w-full flex items-center gap-4 rounded-2xl border-2 px-5 py-3.5 transition ${
                        status === 'present' ? 'border-sage-400 bg-sage-50' :
                        status === 'late' ? 'border-amber-300 bg-amber-50' :
                        status === 'excused' ? 'border-stone-300 bg-stone-50' :
                        'border-rose-200 bg-rose-50'
                      }`}>
                      <div className={`font-semibold font-quick text-sm flex-1 ${status === 'absent' ? 'text-stone-500' : 'text-stone-800'}`}>
                        {s.firstName} {s.lastName}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {(['present', 'late', 'excused', 'absent'] as AttendanceStatus[]).map(st => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setRecords(r => ({ ...r, [s.id]: st }))}
                            className={`px-2.5 py-1 rounded-full text-xs font-bold font-quick transition border ${
                              status === st
                                ? st === 'present' ? 'bg-sage-500 text-white border-sage-500' :
                                  st === 'late' ? 'bg-amber-500 text-white border-amber-500' :
                                  st === 'excused' ? 'bg-stone-500 text-white border-stone-500' :
                                  'bg-rose-500 text-white border-rose-500'
                                : 'bg-white text-stone-400 border-stone-200 hover:border-stone-300'
                            }`}>
                            {st === 'present' ? 'P' : st === 'late' ? 'L' : st === 'excused' ? 'E' : 'A'}
                          </button>
                        ))}
                      </div>
                    </div>
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
            <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center text-stone-400 font-quick text-sm">No attendance sessions recorded yet.</div>
          ) : selectedSession ? (
            <div>
              <button onClick={() => setSelectedSession(null)} className="text-sm font-quick font-semibold text-stone-500 hover:text-sage-700 transition mb-4">← Back to history</button>
              <h4 className="font-semibold text-stone-700 font-quick mb-4">{selectedSession.date}</h4>
              <div className="space-y-2">
                {selectedSession.records.map(r => {
                  const status: AttendanceStatus = r.status ?? ((r as unknown as { present?: boolean }).present ? 'present' : 'absent')
                  return (
                    <div key={r.studentId} className={`flex items-center gap-4 rounded-2xl px-5 py-3 border ${
                      status === 'present' ? 'bg-sage-50 border-sage-200' :
                      status === 'late' ? 'bg-amber-50 border-amber-200' :
                      status === 'excused' ? 'bg-stone-50 border-stone-200' :
                      'bg-rose-50 border-rose-200'
                    }`}>
                      <span className="font-quick text-sm text-stone-700 flex-1">{r.studentName}</span>
                      <span className={`text-xs font-bold font-quick px-2.5 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>
                        {STATUS_LABELS[status]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map(sess => {
                const counts = { present: 0, late: 0, excused: 0, absent: 0 }
                sess.records.forEach(r => {
                  const st: AttendanceStatus = r.status ?? ((r as unknown as { present?: boolean }).present ? 'present' : 'absent')
                  counts[st]++
                })
                return (
                  <button key={sess.id} onClick={() => setSelectedSession(sess)}
                    className="w-full bg-white rounded-2xl border border-stone-200/70 px-5 py-4 flex items-center gap-4 hover:border-sage-300 hover:bg-sage-50/30 transition text-left">
                    <div className="text-2xl flex-shrink-0">📋</div>
                    <div className="flex-1">
                      <div className="font-semibold text-stone-800 font-quick text-sm">{sess.date}</div>
                      <div className="text-xs text-stone-400 font-quick">
                        {counts.present} present · {counts.late} late · {counts.excused} excused · {counts.absent} absent
                      </div>
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

// ── Progress ──────────────────────────────────────────────────────────────────

function ProgressTab({ cls, students, teacherUid }: { cls: AcademyClass; students: Student[]; teacherUid: string }) {
  const [progMap, setProgMap] = useState<Record<string, ProgData>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function load() {
      setLoading(true)
      const docs = await Promise.all(students.map(s => getDoc(doc(db, 'studentProgress', `${cls.id}__${s.id}`))))
      const map: Record<string, ProgData> = {}
      students.forEach((s, i) => {
        const d = docs[i]
        map[s.id] = d.exists() ? (d.data() as ProgData) : { quranPosition: '', qaidahPosition: '', islamicStudiesLevel: '', notes: '' }
      })
      setProgMap(map)
      setLoading(false)
    }
    if (students.length > 0) load(); else setLoading(false)
  }, [cls.id, students.map(s => s.id).join(',')])

  function update(studentId: string, field: keyof ProgData, value: string) {
    setProgMap(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }))
  }

  async function saveStudent(s: Student) {
    setSaving(prev => ({ ...prev, [s.id]: true }))
    await setDoc(doc(db, 'studentProgress', `${cls.id}__${s.id}`), {
      classId: cls.id,
      studentId: s.id,
      ...progMap[s.id],
      updatedAt: new Date().toISOString(),
      updatedBy: teacherUid,
    })
    setSaving(prev => ({ ...prev, [s.id]: false }))
    setSaved(prev => ({ ...prev, [s.id]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [s.id]: false })), 3000)
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div>
  if (students.length === 0) return <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center text-stone-400 font-quick text-sm">No students enrolled in this class yet.</div>

  return (
    <div className="space-y-4">
      {students.map(s => {
        const p = progMap[s.id] ?? { quranPosition: '', qaidahPosition: '', islamicStudiesLevel: '', notes: '' }
        return (
          <div key={s.id} className="bg-white rounded-2xl border border-stone-200/70 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center font-bold text-sage-700 font-quick text-xs flex-shrink-0">
                {s.firstName[0]}{s.lastName[0]}
              </div>
              <div className="font-semibold text-stone-800 font-quick flex-1">{s.firstName} {s.lastName}</div>
              {p.updatedAt && (
                <span className="text-xs text-stone-400 font-quick">
                  Updated {new Date(p.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { field: 'quranPosition' as const, label: "Qur'an Position", placeholder: "e.g. Surah Al-Mulk, Ayah 5" },
                { field: 'qaidahPosition' as const, label: "Qa'idah Position", placeholder: "e.g. Noorani Qa'idah, Page 12" },
                { field: 'islamicStudiesLevel' as const, label: 'Islamic Studies', placeholder: 'e.g. Grade 3, Chapter 2' },
                { field: 'notes' as const, label: 'Notes', placeholder: 'Optional notes…' },
              ].map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-stone-500 font-quick mb-1">{label}</label>
                  <input
                    value={p[field] as string}
                    onChange={e => update(s.id, field, e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button onClick={() => saveStudent(s)} disabled={saving[s.id]}
                className="bg-wood text-white font-bold font-quick px-5 py-2 rounded-full text-sm hover:brightness-95 transition disabled:opacity-60">
                {saving[s.id] ? 'Saving…' : 'Save'}
              </button>
              {saved[s.id] && <span className="text-sm text-sage-600 font-quick font-semibold">Saved!</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Homework ──────────────────────────────────────────────────────────────────

function HomeworkTab({ cls, students, teacherUid, teacherName }: { cls: AcademyClass; students: Student[]; teacherUid: string; teacherName: string }) {
  const [week, setWeek] = useState(currentWeek())
  const [completed, setCompleted] = useState<Record<string, boolean>>({})
  const [assignment, setAssignment] = useState<ISHomeworkAssignment | null>(null)
  const [assignmentForm, setAssignmentForm] = useState({ title: '', description: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savingAssignment, setSavingAssignment] = useState(false)
  const [savedAssignment, setSavedAssignment] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [hwSnap, assignSnap] = await Promise.all([
        getDoc(doc(db, 'weeklyHomework', `${cls.id}__${week}`)),
        getDoc(doc(db, 'isHomework', `${cls.id}__${week}`)),
      ])
      setCompleted(hwSnap.exists() ? ((hwSnap.data() as HwData).completed ?? {}) : {})
      if (assignSnap.exists()) {
        const a = { id: assignSnap.id, ...assignSnap.data() } as ISHomeworkAssignment
        setAssignment(a)
        setAssignmentForm({ title: a.title, description: a.description })
      } else {
        setAssignment(null)
        setAssignmentForm({ title: '', description: '' })
      }
      setLoading(false)
    }
    load()
  }, [cls.id, week])

  async function handleSaveAssignment() {
    if (!assignmentForm.title.trim()) return
    setSavingAssignment(true)
    const docId = `${cls.id}__${week}`
    const now = new Date().toISOString()
    await setDoc(doc(db, 'isHomework', docId), {
      classId: cls.id,
      week,
      title: assignmentForm.title.trim(),
      description: assignmentForm.description.trim(),
      createdAt: assignment?.createdAt ?? now,
      createdBy: teacherUid,
      createdByName: teacherName,
    })
    setAssignment({ id: docId, classId: cls.id, week, title: assignmentForm.title.trim(), description: assignmentForm.description.trim(), createdAt: assignment?.createdAt ?? now, createdBy: teacherUid, createdByName: teacherName })
    setSavingAssignment(false)
    setSavedAssignment(true)
    setTimeout(() => setSavedAssignment(false), 3000)
  }

  async function handleSave() {
    setSaving(true)
    await setDoc(doc(db, 'weeklyHomework', `${cls.id}__${week}`), {
      classId: cls.id, week, completed,
      updatedAt: new Date().toISOString(), updatedBy: teacherUid,
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setWeek(w => shiftWeek(w, -1))} className="w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50 transition">‹</button>
        <span className="font-quick text-sm font-semibold text-stone-700 flex-1 text-center">{weekLabel(week)}</span>
        <button onClick={() => setWeek(w => shiftWeek(w, 1))} className="w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50 transition">›</button>
      </div>

      {/* Class Assignment Card */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
        <h4 className="font-semibold text-stone-800 font-quick text-sm mb-3">Class Assignment (IS Homework)</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-stone-500 font-quick mb-1">Assignment Title</label>
            <input
              value={assignmentForm.title}
              onChange={e => setAssignmentForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Chapter 4 Review — The Five Pillars"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 font-quick mb-1">Description (optional)</label>
            <textarea
              value={assignmentForm.description}
              onChange={e => setAssignmentForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Pages to read, what to study, etc."
              rows={2}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAssignment}
              disabled={savingAssignment || !assignmentForm.title.trim()}
              className="bg-amber-500 text-white font-bold font-quick px-5 py-2 rounded-full text-sm hover:brightness-95 transition disabled:opacity-60">
              {savingAssignment ? 'Saving…' : assignment ? 'Update Assignment' : 'Post Assignment'}
            </button>
            {savedAssignment && <span className="text-sm text-amber-700 font-quick font-semibold">Saved!</span>}
            {assignment && !savedAssignment && (
              <span className="text-xs text-stone-400 font-quick">Posted · visible to parents</span>
            )}
          </div>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center text-stone-400 font-quick text-sm">No students enrolled in this class yet.</div>
      ) : (
        <>
          <p className="text-xs text-stone-400 font-quick mb-3">Islamic Studies homework completion</p>
          <div className="space-y-2 mb-5">
            {students.map(s => {
              const done = completed[s.id] ?? false
              return (
                <button key={s.id} type="button" onClick={() => setCompleted(prev => ({ ...prev, [s.id]: !done }))}
                  className={`w-full flex items-center gap-4 rounded-2xl border-2 px-5 py-3.5 text-left transition ${done ? 'border-sage-400 bg-sage-50' : 'border-stone-200 bg-white'}`}>
                  <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 ${done ? 'border-sage-500 bg-sage-500 text-white' : 'border-stone-300 bg-white text-transparent'}`}>✓</div>
                  <span className={`font-quick text-sm flex-1 ${done ? 'text-stone-800' : 'text-stone-500'}`}>{s.firstName} {s.lastName}</span>
                  <span className={`text-xs font-bold font-quick ${done ? 'text-sage-600' : 'text-stone-400'}`}>{done ? 'Submitted' : 'Missing'}</span>
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={saving}
              className="bg-wood text-white font-bold font-quick px-8 py-3 rounded-full shadow-md hover:brightness-95 transition disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Completion'}
            </button>
            {saved && <span className="text-sm text-sage-600 font-quick font-semibold">Saved!</span>}
          </div>
        </>
      )}
    </div>
  )
}

// ── Quiz ──────────────────────────────────────────────────────────────────────

function QuizTab({ cls, students, teacherUid }: { cls: AcademyClass; students: Student[]; teacherUid: string }) {
  const [month, setMonth] = useState(currentMonth())
  const [maxScore, setMaxScore] = useState(100)
  const [scores, setScores] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const snap = await getDoc(doc(db, 'quizResults', `${cls.id}__${month}`))
      if (snap.exists()) {
        const data = snap.data() as QuizData
        setMaxScore(data.maxScore ?? 100)
        const strScores: Record<string, string> = {}
        Object.entries(data.scores ?? {}).forEach(([k, v]) => { strScores[k] = String(v) })
        setScores(strScores)
      } else {
        setMaxScore(100); setScores({})
      }
      setLoading(false)
    }
    load()
  }, [cls.id, month])

  async function handleSave() {
    setSaving(true)
    const numericScores: Record<string, number> = {}
    Object.entries(scores).forEach(([k, v]) => { const n = Number(v); if (!isNaN(n) && v !== '') numericScores[k] = n })
    await setDoc(doc(db, 'quizResults', `${cls.id}__${month}`), {
      classId: cls.id, month, maxScore, scores: numericScores,
      updatedAt: new Date().toISOString(), updatedBy: teacherUid,
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setMonth(m => shiftMonth(m, -1))} className="w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50 transition">‹</button>
        <span className="font-quick text-sm font-semibold text-stone-700 flex-1 text-center">{monthLabel(month)}</span>
        <button onClick={() => setMonth(m => shiftMonth(m, 1))} className="w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50 transition">›</button>
      </div>
      {students.length === 0 ? (
        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center text-stone-400 font-quick text-sm">No students enrolled in this class yet.</div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm font-semibold text-stone-600 font-quick">Max Score</label>
            <input type="number" value={maxScore} onChange={e => setMaxScore(Number(e.target.value))} min={1}
              className="w-24 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm" />
          </div>
          <div className="space-y-2 mb-5">
            {students.map(s => {
              const score = scores[s.id] ?? ''
              const pct = score !== '' && !isNaN(Number(score)) ? Math.round((Number(score) / maxScore) * 100) : null
              return (
                <div key={s.id} className="flex items-center gap-4 bg-white rounded-2xl border border-stone-200/70 px-5 py-3">
                  <span className="font-quick text-sm text-stone-800 flex-1">{s.firstName} {s.lastName}</span>
                  <div className="flex items-center gap-2">
                    <input type="number" value={score} onChange={e => setScores(prev => ({ ...prev, [s.id]: e.target.value }))}
                      placeholder="—" min={0} max={maxScore}
                      className="w-20 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm text-center" />
                    <span className="text-stone-400 font-quick text-sm">/ {maxScore}</span>
                    {pct !== null && (
                      <span className={`text-xs font-bold font-quick w-10 text-right ${pct >= 70 ? 'text-sage-600' : 'text-rose-500'}`}>{pct}%</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={saving}
              className="bg-wood text-white font-bold font-quick px-8 py-3 rounded-full shadow-md hover:brightness-95 transition disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Results'}
            </button>
            {saved && <span className="text-sm text-sage-600 font-quick font-semibold">Saved!</span>}
          </div>
        </>
      )}
    </div>
  )
}

// ── Announcements ─────────────────────────────────────────────────────────────

function AnnouncementsTab({ cls, teacherUid, teacherName }: { cls: AcademyClass; teacherUid: string; teacherName: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', published: true })
  const [saving, setSaving] = useState(false)

  function uid() { return Math.random().toString(36).slice(2) }

  async function load() {
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'announcements'), where('classId', '==', cls.id), orderBy('createdAt', 'desc')))
    setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)))
    setLoading(false)
  }

  useEffect(() => { load() }, [cls.id])

  async function handlePost() {
    if (!form.title.trim() || !form.body.trim()) return
    setSaving(true)
    const id = uid()
    const title = form.title.trim()
    const body = form.body.trim()
    await setDoc(doc(db, 'announcements', id), {
      title, body, classId: cls.id, className: cls.name,
      authorUid: teacherUid, authorName: teacherName,
      createdAt: new Date().toISOString(), published: form.published,
    })
    notifyAnnouncementParentsFn({ classId: cls.id, className: cls.name, teacherName, title, body })
      .catch(err => console.error('Announcement notification failed:', err))
    await load()
    setForm({ title: '', body: '', published: true })
    setComposing(false)
    setSaving(false)
  }

  async function togglePublished(a: Announcement) {
    await setDoc(doc(db, 'announcements', a.id), { ...a, published: !a.published })
    setAnnouncements(prev => prev.map(x => x.id === a.id ? { ...x, published: !x.published } : x))
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex justify-end mb-5">
        <button onClick={() => setComposing(true)}
          className="bg-wood text-white font-bold font-quick px-5 py-2.5 rounded-full shadow-md hover:brightness-95 transition text-sm">
          + New Announcement
        </button>
      </div>
      {announcements.length === 0 ? (
        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center text-stone-400 font-quick text-sm">No announcements yet. Post one for the parents of this class.</div>
      ) : (
        <div className="space-y-4">
          {announcements.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-stone-200/70 p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h4 className="font-semibold text-stone-800 font-quick">{a.title}</h4>
                  <p className="text-xs text-stone-400 font-quick mt-0.5">{new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <button onClick={() => togglePublished(a)}
                  className={`text-xs font-bold font-quick border px-3 py-1 rounded-full flex-shrink-0 transition ${a.published ? 'bg-sage-100 text-sage-700 border-sage-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200' : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-sage-50 hover:text-sage-700 hover:border-sage-200'}`}>
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
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Class update for this week"
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 font-quick mb-1">Message</label>
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={5} placeholder="Write your announcement here…"
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm resize-none" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} className="w-4 h-4 rounded accent-sage-600" />
                <span className="text-sm font-quick text-stone-600">Publish immediately (visible to parents)</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handlePost} disabled={saving || !form.title.trim() || !form.body.trim()}
                className="flex-1 bg-wood text-white font-bold font-quick py-3 rounded-full hover:brightness-95 transition disabled:opacity-60">
                {saving ? 'Posting…' : 'Post'}
              </button>
              <button onClick={() => setComposing(false)} className="flex-1 border border-stone-200 text-stone-600 font-quick font-semibold py-3 rounded-full hover:bg-stone-50 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Missed Work Tab ───────────────────────────────────────────────────────────

function MissedWorkTab({ cls, teacherUid: _teacherUid }: { cls: AcademyClass; teacherUid: string }) {
  const [items, setItems] = useState<MissedWork[]>([])
  const [loading, setLoading] = useState(true)
  const [showResolved, setShowResolved] = useState(false)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [missedLesson, setMissedLesson] = useState<Record<string, boolean>>({})
  const [missedHomework, setMissedHomework] = useState<Record<string, boolean>>({})
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({})
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [notifyStatus, setNotifyStatus] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    const q = query(
      collection(db, 'missedWork'),
      where('classId', '==', cls.id),
      where('resolved', '==', showResolved),
      orderBy('date', 'desc'),
    )
    const snap = await getDocs(q)
    const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() } as MissedWork))
    setItems(loaded)
    const noteMap: Record<string, string> = {}
    const lessonMap: Record<string, boolean> = {}
    const hwMap: Record<string, boolean> = {}
    loaded.forEach(item => {
      noteMap[item.id] = item.missedWorkNotes ?? ''
      lessonMap[item.id] = item.missedLesson ?? false
      hwMap[item.id] = item.missedHomework ?? false
    })
    setNotes(noteMap)
    setMissedLesson(lessonMap)
    setMissedHomework(hwMap)
    setLoading(false)
  }

  useEffect(() => { load() }, [cls.id, showResolved])

  async function saveNotes(itemId: string) {
    setSavingNotes(prev => ({ ...prev, [itemId]: true }))
    await setDoc(doc(db, 'missedWork', itemId), {
      missedWorkNotes: notes[itemId] ?? '',
      missedLesson: missedLesson[itemId] ?? false,
      missedHomework: missedHomework[itemId] ?? false,
    }, { merge: true })
    setSavingNotes(prev => ({ ...prev, [itemId]: false }))
  }

  async function markResolved(itemId: string) {
    setResolvingId(itemId)
    await setDoc(doc(db, 'missedWork', itemId), { resolved: true, resolvedAt: new Date().toISOString() }, { merge: true })
    setResolvingId(null)
    await load()
  }

  async function notifyParent(itemId: string) {
    setNotifyStatus(prev => ({ ...prev, [itemId]: 'sending' }))
    try {
      await notifyMissedWorkParentFn({ missedWorkId: itemId })
      setNotifyStatus(prev => ({ ...prev, [itemId]: 'sent' }))
    } catch {
      setNotifyStatus(prev => ({ ...prev, [itemId]: 'error' }))
    }
    setTimeout(() => setNotifyStatus(prev => ({ ...prev, [itemId]: '' })), 4000)
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-stone-700 font-quick text-sm">
          {showResolved ? 'Resolved missed work' : 'Unresolved missed work'}
        </h3>
        <button
          onClick={() => setShowResolved(v => !v)}
          className="text-xs font-semibold font-quick text-stone-500 hover:text-sage-700 border border-stone-200 px-3 py-1.5 rounded-full transition">
          {showResolved ? 'Show Unresolved' : 'Show Resolved'}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-10 text-center">
          <div className="text-3xl mb-3">✅</div>
          <p className="font-quick text-sm text-stone-500 font-semibold">No missed work flagged</p>
          <p className="font-quick text-xs text-stone-400 mt-1">
            {showResolved ? 'No resolved items for this class.' : 'All students are caught up!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-2xl border border-stone-200/70 p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="font-semibold text-stone-800 font-quick text-sm">{item.studentName}</div>
                  <div className="text-xs text-stone-400 font-quick mt-0.5">
                    Absent on {new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                </div>
                {item.resolvedAt && (
                  <span className="text-xs font-quick text-sage-600 bg-sage-50 border border-sage-200 px-2.5 py-0.5 rounded-full flex-shrink-0">
                    Resolved {new Date(item.resolvedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Structured options */}
              <div className="flex gap-4 mb-3">
                <label className={`flex items-center gap-2 cursor-pointer select-none ${showResolved ? 'opacity-60 pointer-events-none' : ''}`}>
                  <input
                    type="checkbox"
                    checked={missedLesson[item.id] ?? false}
                    onChange={e => setMissedLesson(prev => ({ ...prev, [item.id]: e.target.checked }))}
                    className="w-4 h-4 rounded accent-rose-500"
                  />
                  <span className="text-sm font-quick text-stone-700">IS Lesson</span>
                </label>
                <label className={`flex items-center gap-2 cursor-pointer select-none ${showResolved ? 'opacity-60 pointer-events-none' : ''}`}>
                  <input
                    type="checkbox"
                    checked={missedHomework[item.id] ?? false}
                    onChange={e => setMissedHomework(prev => ({ ...prev, [item.id]: e.target.checked }))}
                    className="w-4 h-4 rounded accent-rose-500"
                  />
                  <span className="text-sm font-quick text-stone-700">IS Homework</span>
                </label>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-semibold text-stone-500 font-quick mb-1">Additional notes</label>
                <textarea
                  value={notes[item.id] ?? ''}
                  onChange={e => setNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                  rows={3}
                  placeholder="Describe what the student missed…"
                  disabled={showResolved}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm resize-none disabled:opacity-60"
                />
              </div>
              {!showResolved && (
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => saveNotes(item.id)}
                    disabled={savingNotes[item.id]}
                    className="bg-stone-100 text-stone-700 font-semibold font-quick text-xs px-4 py-2 rounded-full hover:bg-stone-200 transition disabled:opacity-60">
                    {savingNotes[item.id] ? 'Saving…' : 'Save Notes'}
                  </button>
                  <button
                    onClick={() => markResolved(item.id)}
                    disabled={resolvingId === item.id}
                    className="bg-sage-100 text-sage-700 font-semibold font-quick text-xs px-4 py-2 rounded-full hover:bg-sage-200 transition disabled:opacity-60">
                    {resolvingId === item.id ? 'Resolving…' : 'Mark Resolved'}
                  </button>
                  <button
                    onClick={() => notifyParent(item.id)}
                    disabled={notifyStatus[item.id] === 'sending'}
                    className="bg-wood/10 text-wood font-semibold font-quick text-xs px-4 py-2 rounded-full hover:bg-wood/20 transition disabled:opacity-60 border border-wood/20">
                    {notifyStatus[item.id] === 'sending' ? 'Sending…' : 'Notify Parent'}
                  </button>
                  {notifyStatus[item.id] === 'sent' && <span className="text-xs font-quick text-sage-600 font-semibold">Email sent!</span>}
                  {notifyStatus[item.id] === 'error' && <span className="text-xs font-quick text-rose-500 font-semibold">Failed to send.</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Qa'idah Progress Tab ──────────────────────────────────────────────────────

const FLUENCY_LABELS: Record<QaidahFluency, string> = {
  needs_practice: 'Needs Practice',
  improving: 'Improving',
  fluent: 'Fluent',
}

const FLUENCY_COLORS: Record<QaidahFluency, string> = {
  needs_practice: 'bg-rose-100 text-rose-700',
  improving: 'bg-amber-100 text-amber-700',
  fluent: 'bg-sage-100 text-sage-700',
}

interface QaidahEntry {
  currentLesson: string
  fluency: QaidahFluency
  notes: string
  history: QaidahHistoryEntry[]
}

function QaidahTab({ cls, students, teacherUid }: { cls: AcademyClass; students: Student[]; teacherUid: string }) {
  const [data, setData] = useState<Record<string, QaidahEntry>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const docs = await Promise.all(
        students.map(s => getDoc(doc(db, 'qaidahProgress', `${cls.id}__${s.id}`)))
      )
      const map: Record<string, QaidahEntry> = {}
      students.forEach((s, i) => {
        const d = docs[i]
        if (d.exists()) {
          const p = d.data() as QaidahProgress
          map[s.id] = { currentLesson: p.currentLesson, fluency: p.fluency, notes: p.notes, history: p.history ?? [] }
        } else {
          map[s.id] = { currentLesson: '', fluency: 'needs_practice', history: [], notes: '' }
        }
      })
      setData(map)
      setLoading(false)
    }
    if (students.length > 0) load(); else setLoading(false)
  }, [cls.id, students.map(s => s.id).join(',')])

  function update(studentId: string, field: keyof QaidahEntry, value: string | QaidahFluency) {
    setData(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }))
  }

  async function handleSave(s: Student) {
    setSaving(prev => ({ ...prev, [s.id]: true }))
    const entry = data[s.id]
    await setDoc(doc(db, 'qaidahProgress', `${cls.id}__${s.id}`), {
      classId: cls.id,
      studentId: s.id,
      studentName: `${s.firstName} ${s.lastName}`,
      currentLesson: entry.currentLesson,
      fluency: entry.fluency,
      notes: entry.notes,
      history: entry.history,
      updatedAt: new Date().toISOString(),
      updatedBy: teacherUid,
    })
    setSaving(prev => ({ ...prev, [s.id]: false }))
    setSaved(prev => ({ ...prev, [s.id]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [s.id]: false })), 3000)
  }

  async function handleAdvance(s: Student) {
    const entry = data[s.id]
    if (!entry.currentLesson.trim()) return
    const historyEntry: QaidahHistoryEntry = {
      lesson: entry.currentLesson,
      fluency: entry.fluency,
      notes: entry.notes,
      recordedAt: new Date().toISOString(),
      recordedBy: teacherUid,
    }
    const newEntry: QaidahEntry = {
      currentLesson: '',
      fluency: 'needs_practice',
      notes: '',
      history: [historyEntry, ...entry.history],
    }
    setData(prev => ({ ...prev, [s.id]: newEntry }))
    setSaving(prev => ({ ...prev, [s.id]: true }))
    await setDoc(doc(db, 'qaidahProgress', `${cls.id}__${s.id}`), {
      classId: cls.id,
      studentId: s.id,
      studentName: `${s.firstName} ${s.lastName}`,
      ...newEntry,
      updatedAt: new Date().toISOString(),
      updatedBy: teacherUid,
    })
    setSaving(prev => ({ ...prev, [s.id]: false }))
    setSaved(prev => ({ ...prev, [s.id]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [s.id]: false })), 3000)
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div>
  if (students.length === 0) return <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center text-stone-400 font-quick text-sm">No students enrolled in this class yet.</div>

  return (
    <div className="rounded-2xl border border-stone-200/70 overflow-hidden">
      {students.map((s, idx) => {
        const entry = data[s.id] ?? { currentLesson: '', fluency: 'needs_practice' as QaidahFluency, notes: '', history: [] }
        const isOpen = expanded === s.id
        const isSaving = saving[s.id]
        const isSaved = saved[s.id]
        const historyOpen = showHistory[s.id] ?? false

        return (
          <div key={s.id} className={`bg-white ${idx > 0 ? 'border-t border-stone-100' : ''}`}>
            {/* Collapsed row — always visible */}
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : s.id)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-stone-50/60 transition text-left">
              <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center font-bold text-sage-700 font-quick text-xs flex-shrink-0">
                {s.firstName[0]}{s.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-stone-800 font-quick text-sm">{s.firstName} {s.lastName}</div>
                {entry.currentLesson ? (
                  <div className="text-xs text-stone-400 font-quick truncate mt-0.5">{entry.currentLesson}</div>
                ) : (
                  <div className="text-xs text-stone-300 font-quick mt-0.5 italic">No lesson set</div>
                )}
              </div>
              {entry.currentLesson && (
                <span className={`text-xs font-bold font-quick px-2.5 py-0.5 rounded-full flex-shrink-0 ${FLUENCY_COLORS[entry.fluency]}`}>
                  {FLUENCY_LABELS[entry.fluency]}
                </span>
              )}
              <span className="text-stone-300 text-sm flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Expanded edit panel */}
            {isOpen && (
              <div className="px-5 pb-5 border-t border-stone-100 bg-stone-50/40">
                <div className="pt-4 space-y-3 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 font-quick mb-1">Current Lesson</label>
                    <input
                      value={entry.currentLesson}
                      onChange={e => update(s.id, 'currentLesson', e.target.value)}
                      placeholder="e.g. Noorani Qa'idah Page 18 — Compound Letters"
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 font-quick mb-1">Fluency</label>
                      <select
                        value={entry.fluency}
                        onChange={e => update(s.id, 'fluency', e.target.value as QaidahFluency)}
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm">
                        <option value="needs_practice">Needs Practice</option>
                        <option value="improving">Improving</option>
                        <option value="fluent">Fluent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 font-quick mb-1">Teacher Note</label>
                      <input
                        value={entry.notes}
                        onChange={e => update(s.id, 'notes', e.target.value)}
                        placeholder="Optional note…"
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button onClick={() => handleSave(s)} disabled={isSaving}
                    className="bg-wood text-white font-bold font-quick px-5 py-2 rounded-full text-sm hover:brightness-95 transition disabled:opacity-60">
                    {isSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => handleAdvance(s)} disabled={isSaving || !entry.currentLesson.trim()}
                    title="Save current lesson to history and start a new one"
                    className="border border-sage-400 text-sage-700 font-bold font-quick px-5 py-2 rounded-full text-sm hover:bg-sage-50 transition disabled:opacity-40">
                    Advance →
                  </button>
                  {isSaved && <span className="text-sm text-sage-600 font-quick font-semibold">Saved!</span>}
                  {entry.history.length > 0 && (
                    <button
                      onClick={() => setShowHistory(prev => ({ ...prev, [s.id]: !historyOpen }))}
                      className="ml-auto text-xs font-quick text-stone-400 hover:text-stone-600 transition">
                      {historyOpen ? 'Hide history' : `History (${entry.history.length})`}
                    </button>
                  )}
                </div>

                {historyOpen && entry.history.length > 0 && (
                  <div className="mt-4 border-t border-stone-100 pt-4 space-y-2">
                    {entry.history.map((h, i) => (
                      <div key={i} className="flex items-start gap-3 text-xs font-quick">
                        <div className="flex-1">
                          <span className="font-semibold text-stone-700">{h.lesson}</span>
                          {h.notes && <span className="text-stone-400"> · {h.notes}</span>}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${FLUENCY_COLORS[h.fluency as QaidahFluency]}`}>
                          {FLUENCY_LABELS[h.fluency as QaidahFluency]}
                        </span>
                        <span className="text-stone-300 flex-shrink-0">
                          {new Date(h.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Class Detail ──────────────────────────────────────────────────────────────

type DetailTab = 'attendance' | 'progress' | 'qaidah' | 'homework' | 'quiz' | 'missedWork' | 'announcements' | 'students'

function ClassDetail({ cls, teacherUid, teacherName, onBack, initialTab }: {
  cls: AcademyClass; teacherUid: string; teacherName: string; onBack: () => void; initialTab?: DetailTab
}) {
  const [tab, setTab] = useState<DetailTab>(initialTab ?? 'attendance')
  const [students, setStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)

  useEffect(() => {
    async function loadStudents() {
      setLoadingStudents(true)
      const snap = await getDocs(query(collection(db, 'students'), where('classIds', 'array-contains', cls.id)))
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student)))
      setLoadingStudents(false)
    }
    loadStudents()
  }, [cls.id])

  const TABS: [DetailTab, string][] = [
    ['attendance', 'Attendance'],
    ['progress', 'Progress'],
    ['qaidah', "Qa'idah"],
    ['homework', 'Homework'],
    ['quiz', 'Quiz'],
    ['missedWork', 'Missed Work'],
    ['announcements', 'Announcements'],
    ['students', `Students (${students.length})`],
  ]

  return (
    <div>
      <button onClick={onBack} className="text-sm font-quick font-semibold text-stone-500 hover:text-sage-700 transition mb-5">← My Classes</button>
      <h2 className="font-kids text-3xl text-wood-dark mb-1">{cls.name}</h2>
      {cls.schedule && <p className="text-stone-400 text-sm font-quick mb-5">{cls.schedule}</p>}

      <div className="flex gap-1 border-b border-stone-200 mb-6 overflow-x-auto">
        {TABS.map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold font-quick border-b-2 -mb-px transition whitespace-nowrap ${tab === t ? 'border-sage-600 text-sage-700' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'students' && (
        loadingStudents ? (
          <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div>
        ) : students.length === 0 ? (
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center text-stone-400 font-quick text-sm">No students enrolled in this class yet.</div>
        ) : (
          <div className="space-y-2">
            {students.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-stone-200/70 px-5 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-sage-100 flex items-center justify-center font-bold text-sage-700 font-quick text-sm flex-shrink-0">{s.firstName[0]}{s.lastName[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-stone-800 font-quick text-sm">{s.firstName} {s.lastName}</div>
                  {s.parentName && <div className="text-xs text-stone-400 font-quick">Parent: {s.parentName}{s.parentPhone ? ` · ${s.parentPhone}` : ''}</div>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'attendance' && <AttendanceTab cls={cls} teacherUid={teacherUid} />}
      {tab === 'progress' && (loadingStudents ? <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div> : <ProgressTab cls={cls} students={students} teacherUid={teacherUid} />)}
      {tab === 'homework' && (loadingStudents ? <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div> : <HomeworkTab cls={cls} students={students} teacherUid={teacherUid} teacherName={teacherName} />)}
      {tab === 'quiz' && (loadingStudents ? <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div> : <QuizTab cls={cls} students={students} teacherUid={teacherUid} />)}
      {tab === 'missedWork' && <MissedWorkTab cls={cls} teacherUid={teacherUid} />}
      {tab === 'announcements' && <AnnouncementsTab cls={cls} teacherUid={teacherUid} teacherName={teacherName} />}
      {tab === 'qaidah' && (loadingStudents ? <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div> : <QaidahTab cls={cls} students={students} teacherUid={teacherUid} />)}
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

interface ClassStatus { att: boolean; prog: boolean; hw: boolean; quiz: boolean }

function Dashboard({ classes, onSelect }: { classes: AcademyClass[]; onSelect: (cls: AcademyClass, tab?: DetailTab) => void }) {
  const [statusMap, setStatusMap] = useState<Record<string, ClassStatus>>({})
  const [loading, setLoading] = useState(true)

  const week = currentWeek()
  const month = currentMonth()

  useEffect(() => {
    async function loadStatus() {
      setLoading(true)
      const mon = weekMonday(week)
      const monStr = mon.toISOString().split('T')[0]
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      const sunStr = sun.toISOString().split('T')[0]
      const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

      const map: Record<string, ClassStatus> = {}
      await Promise.all(classes.map(async cls => {
        const [attSnap, hwSnap, quizSnap, progSnap] = await Promise.all([
          getDocs(query(collection(db, 'attendance'), where('classId', '==', cls.id), orderBy('date', 'desc'))),
          getDoc(doc(db, 'weeklyHomework', `${cls.id}__${week}`)),
          getDoc(doc(db, 'quizResults', `${cls.id}__${month}`)),
          getDocs(query(collection(db, 'studentProgress'), where('classId', '==', cls.id))),
        ])
        map[cls.id] = {
          att: attSnap.docs.some(d => { const dt = (d.data() as { date: string }).date; return dt >= monStr && dt <= sunStr }),
          hw: hwSnap.exists(),
          quiz: quizSnap.exists(),
          prog: progSnap.docs.some(d => { const ua = (d.data() as { updatedAt?: string }).updatedAt; return !!ua && new Date(ua) >= twoWeeksAgo }),
        }
      }))
      setStatusMap(map)
      setLoading(false)
    }
    if (classes.length > 0) loadStatus(); else setLoading(false)
  }, [classes.map(c => c.id).join(',')])

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-kids text-3xl text-wood-dark mb-1">My Classes</h2>
        <p className="text-stone-400 text-sm font-quick">{today}</p>
      </div>

      {loading && classes.length > 0 ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-[28px] border border-stone-200/70 p-10 text-center font-quick">
          <div className="text-4xl mb-4">📚</div>
          <p className="text-stone-500 text-sm">No classes assigned yet.</p>
          <p className="text-stone-400 text-xs mt-1">Contact the admin to get classes assigned to your account.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map(cls => {
            const s = statusMap[cls.id]
            const tasks: { label: string; done: boolean; tab: DetailTab }[] = s ? [
              { label: 'Attendance', done: s.att, tab: 'attendance' },
              { label: 'Progress', done: s.prog, tab: 'progress' },
              { label: 'Homework', done: s.hw, tab: 'homework' },
              { label: 'Quiz', done: s.quiz, tab: 'quiz' },
            ] : []
            const pending = tasks.filter(t => !t.done)

            // Progress report deadline
            const deadlineBanner = (() => {
              if (!cls.nextReportDeadline) return null
              const dl = new Date(cls.nextReportDeadline + 'T00:00:00')
              const today = new Date(); today.setHours(0, 0, 0, 0)
              const daysLeft = Math.round((dl.getTime() - today.getTime()) / 86400000)
              if (daysLeft < 0) return null // past
              const label = dl.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              const urgent = daysLeft <= 3
              const soon = daysLeft <= 14
              if (!soon) return null
              return { label, daysLeft, urgent }
            })()

            return (
              <div key={cls.id} className="bg-white rounded-2xl border border-stone-200/70 p-5 hover:border-sage-300 hover:shadow-sm transition">
                {deadlineBanner && (
                  <div className={`flex items-center gap-2 text-xs font-quick font-semibold mb-3 px-3 py-2 rounded-xl ${deadlineBanner.urgent ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                    <span>{deadlineBanner.urgent ? '🔴' : '📋'}</span>
                    <span>
                      Progress reports due {deadlineBanner.label} — {deadlineBanner.daysLeft === 0 ? 'due today!' : `${deadlineBanner.daysLeft} day${deadlineBanner.daysLeft === 1 ? '' : 's'} left`}
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-sage-100 flex items-center justify-center text-2xl flex-shrink-0">📚</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <button onClick={() => onSelect(cls)} className="font-semibold text-stone-800 font-quick hover:text-sage-700 transition text-left">{cls.name}</button>
                      {s && (
                        <span className={`text-xs font-bold font-quick px-2.5 py-0.5 rounded-full flex-shrink-0 ${pending.length === 0 ? 'bg-sage-100 text-sage-700' : 'bg-amber-100 text-amber-700'}`}>
                          {pending.length === 0 ? 'All done' : `${pending.length} pending`}
                        </span>
                      )}
                    </div>
                    {cls.schedule && <div className="text-xs text-stone-400 font-quick mb-3">{cls.schedule}</div>}
                    {s && (
                      <div className="flex flex-wrap gap-1.5">
                        {tasks.map(t => (
                          <button key={t.label} onClick={() => onSelect(cls, t.tab)}
                            className={`text-xs font-quick px-2.5 py-1 rounded-full font-semibold transition ${t.done ? 'bg-sage-100 text-sage-700 hover:bg-sage-200' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'}`}>
                            {t.done ? '✓' : '!'} {t.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
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
  const [selected, setSelected] = useState<{ cls: AcademyClass; tab?: DetailTab } | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      setUser(u)
      if (u) {
        const token = await u.getIdTokenResult()
        setRole(token.claims['role'] as string ?? null)
        setDisplayName(impersonation?.displayName || u.displayName || u.email || 'Teacher')
      } else {
        setRole(null); setDisplayName('')
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
    if (impersonation) q = query(collection(db, 'classes'), where('teacherUid', '==', impersonation.uid))
    else if (role === 'admin') q = query(collection(db, 'classes'), orderBy('createdAt', 'desc'))
    else q = query(collection(db, 'classes'), where('teacherUid', '==', user!.uid))
    const snap = await getDocs(q)
    setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as AcademyClass)))
    setClassesLoading(false)
  }

  if (authLoading) return (
    <div className="bg-cream min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
    </div>
  )

  if (!user) { window.location.href = '/login'; return null }

  if (role !== 'teacher' && role !== 'admin') return (
    <div className="bg-cream min-h-screen flex flex-col items-center justify-center gap-4 font-body text-center px-6">
      <div className="text-5xl">🔒</div>
      <h1 className="font-kids text-3xl text-wood-dark">Access Denied</h1>
      <p className="text-stone-500 text-sm max-w-xs">This portal is for teachers only. Contact the admin if you need access.</p>
      <button onClick={() => signOut(auth)} className="font-quick text-sm font-semibold text-rose-600 hover:underline mt-2">Sign Out</button>
    </div>
  )

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
              <a href="/admin" className="text-sm font-quick font-semibold text-stone-500 hover:text-sage-700 transition">Admin</a>
            )}
            <button onClick={() => signOut(auth)} className="text-sm font-quick font-semibold text-stone-500 hover:text-rose-600 transition">Sign Out</button>
          </div>
        </div>
      </header>

      <main className={`max-w-3xl mx-auto px-6 py-10${impersonation ? ' pb-32' : ''}`}>
        {classesLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div>
        ) : selected ? (
          <ClassDetail
            cls={selected.cls}
            initialTab={selected.tab}
            teacherUid={impersonation ? impersonation.uid : user.uid}
            teacherName={displayName}
            onBack={() => setSelected(null)}
          />
        ) : (
          <Dashboard classes={classes} onSelect={(cls, tab) => setSelected({ cls, tab })} />
        )}
      </main>
    </div>
  )
}
