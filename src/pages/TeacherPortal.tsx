import { useState, useEffect } from 'react'
import {
  signOut, onAuthStateChanged, type User,
} from 'firebase/auth'
import {
  collection, doc, getDoc, getDocs, setDoc, query, where, orderBy,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { auth, db } from '../firebase'
import type { AcademyClass, Student, AttendanceSession, Announcement } from '../types/portal'
import ImpersonationBanner, { getImpersonation, type ImpersonationState } from '../components/ImpersonationBanner'

const functions = getFunctions()
const notifyAnnouncementParentsFn = httpsCallable(functions, 'notifyAnnouncementParents')

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
      getDocs(query(collection(db, 'attendance'), where('classId', '==', cls.id), orderBy('date', 'desc'))),
    ])
    const studs = studSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student))
    setStudents(studs)
    setSessions(sessSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceSession)))
    const init: Record<string, boolean> = {}
    studs.forEach(s => { init[s.id] = false })
    setRecords(init)
    setLoading(false)
  }

  useEffect(() => { load() }, [cls.id])

  useEffect(() => {
    const existing = sessions.find(s => s.date === date)
    if (existing) {
      const map: Record<string, boolean> = {}
      existing.records.forEach(r => { map[r.studentId] = r.present })
      setRecords(map)
    } else {
      const init: Record<string, boolean> = {}
      students.forEach(s => { init[s.id] = false })
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
      records: students.map(s => ({ studentId: s.id, studentName: `${s.firstName} ${s.lastName}`, present: records[s.id] ?? false })),
      createdBy: teacherUid,
      createdAt: new Date().toISOString(),
    })
    await load()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const presentCount = Object.values(records).filter(Boolean).length

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
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-stone-700 font-quick">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm" />
            </div>
            <span className="text-sm text-stone-400 font-quick">{presentCount}/{students.length} present</span>
          </div>
          {students.length === 0 ? (
            <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center text-stone-400 font-quick text-sm">No students enrolled in this class yet.</div>
          ) : (
            <>
              <div className="space-y-2 mb-6">
                {students.map(s => {
                  const present = records[s.id] ?? false
                  return (
                    <button key={s.id} type="button" onClick={() => setRecords(r => ({ ...r, [s.id]: !present }))}
                      className={`w-full flex items-center gap-4 rounded-2xl border-2 px-5 py-3.5 text-left transition ${present ? 'border-sage-400 bg-sage-50' : 'border-rose-200 bg-rose-50'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${present ? 'bg-sage-500 text-white' : 'bg-rose-200 text-rose-600'}`}>
                        {present ? '✓' : '✗'}
                      </div>
                      <div className="flex-1">
                        <div className={`font-semibold font-quick text-sm ${present ? 'text-stone-800' : 'text-stone-500'}`}>{s.firstName} {s.lastName}</div>
                      </div>
                      <div className={`text-xs font-bold font-quick ${present ? 'text-sage-600' : 'text-rose-400'}`}>{present ? 'Present' : 'Absent'}</div>
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
            <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center text-stone-400 font-quick text-sm">No attendance sessions recorded yet.</div>
          ) : selectedSession ? (
            <div>
              <button onClick={() => setSelectedSession(null)} className="text-sm font-quick font-semibold text-stone-500 hover:text-sage-700 transition mb-4">← Back to history</button>
              <h4 className="font-semibold text-stone-700 font-quick mb-4">{selectedSession.date} — {selectedSession.records.filter(r => r.present).length}/{selectedSession.records.length} present</h4>
              <div className="space-y-2">
                {selectedSession.records.map(r => (
                  <div key={r.studentId} className={`flex items-center gap-4 rounded-2xl px-5 py-3 ${r.present ? 'bg-sage-50 border border-sage-200' : 'bg-rose-50 border border-rose-200'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${r.present ? 'bg-sage-500 text-white' : 'bg-rose-200 text-rose-600'}`}>{r.present ? '✓' : '✗'}</div>
                    <span className="font-quick text-sm text-stone-700 flex-1">{r.studentName}</span>
                    <span className={`text-xs font-bold font-quick ${r.present ? 'text-sage-600' : 'text-rose-400'}`}>{r.present ? 'Present' : 'Absent'}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map(sess => {
                const pn = sess.records.filter(r => r.present).length
                return (
                  <button key={sess.id} onClick={() => setSelectedSession(sess)}
                    className="w-full bg-white rounded-2xl border border-stone-200/70 px-5 py-4 flex items-center gap-4 hover:border-sage-300 hover:bg-sage-50/30 transition text-left">
                    <div className="text-2xl flex-shrink-0">📋</div>
                    <div className="flex-1">
                      <div className="font-semibold text-stone-800 font-quick text-sm">{sess.date}</div>
                      <div className="text-xs text-stone-400 font-quick">{pn}/{sess.records.length} present</div>
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

function HomeworkTab({ cls, students, teacherUid }: { cls: AcademyClass; students: Student[]; teacherUid: string }) {
  const [week, setWeek] = useState(currentWeek())
  const [completed, setCompleted] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const snap = await getDoc(doc(db, 'weeklyHomework', `${cls.id}__${week}`))
      setCompleted(snap.exists() ? ((snap.data() as HwData).completed ?? {}) : {})
      setLoading(false)
    }
    load()
  }, [cls.id, week])

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
              {saving ? 'Saving…' : 'Save'}
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

// ── Class Detail ──────────────────────────────────────────────────────────────

type DetailTab = 'attendance' | 'progress' | 'homework' | 'quiz' | 'announcements' | 'students'

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
    ['homework', 'Homework'],
    ['quiz', 'Quiz'],
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
      {tab === 'homework' && (loadingStudents ? <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div> : <HomeworkTab cls={cls} students={students} teacherUid={teacherUid} />)}
      {tab === 'quiz' && (loadingStudents ? <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" /></div> : <QuizTab cls={cls} students={students} teacherUid={teacherUid} />)}
      {tab === 'announcements' && <AnnouncementsTab cls={cls} teacherUid={teacherUid} teacherName={teacherName} />}
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

            return (
              <div key={cls.id} className="bg-white rounded-2xl border border-stone-200/70 p-5 hover:border-sage-300 hover:shadow-sm transition">
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
