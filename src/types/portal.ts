export interface AcademyClass {
  id: string
  name: string
  description?: string
  teacherUid: string
  teacherName: string
  schedule?: string
  tuitionAmount?: number  // in cents, e.g. 15000 = $150/mo
  nextReportDeadline?: string // YYYY-MM-DD
  createdAt: string
}

export interface Student {
  id: string
  firstName: string
  lastName: string
  classIds: string[]
  tuitionAmount?: number  // in cents, per-student flat fee
  parentName?: string
  parentEmail?: string
  parentPhone?: string
  notes?: string
  createdAt: string
}

export type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent'

export interface AttendanceRecord {
  studentId: string
  studentName: string
  status: AttendanceStatus
  notes?: string
}

export interface AttendanceSession {
  id: string
  classId: string
  date: string // YYYY-MM-DD
  records: AttendanceRecord[]
  createdBy: string
  createdAt: string
}

export interface RegistrationChild {
  firstName: string
  lastName: string
  dateOfBirth?: string
  grade?: string
}

export interface Registration {
  id: string // same as the parent's Firebase Auth UID
  parentName: string
  email: string
  phone: string
  children: RegistrationChild[]
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
  rejectReason?: string
}

export interface ChildRequest {
  id: string
  parentUid: string
  parentEmail: string
  parentName: string
  child: {
    firstName: string
    lastName: string
    dateOfBirth?: string
    grade?: string
  }
  status: 'pending' | 'approved' | 'rejected'
  rejectReason?: string
  classIds?: string[]
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  classId: string | null // null = school-wide
  className?: string
  authorUid: string
  authorName: string
  createdAt: string
  published: boolean
}

export interface StudentProgress {
  quranPosition: string
  qaidahPosition: string
  islamicStudiesLevel: string
  notes: string
  updatedAt?: string
  updatedBy?: string
}

export interface WeeklyHomework {
  completed: Record<string, boolean>
  updatedAt?: string
}

export interface MonthlyQuiz {
  maxScore: number
  scores: Record<string, number>
  updatedAt?: string
}

export interface MissedWork {
  id: string
  classId: string
  className: string
  studentId: string
  studentName: string
  date: string // YYYY-MM-DD
  missedLesson?: boolean
  missedHomework?: boolean
  missedWorkNotes: string
  resolved: boolean
  resolvedAt?: string
  createdAt: string
}

export interface ISHomeworkAssignment {
  id: string
  classId: string
  week: string // ISO week YYYY-Wnn
  title: string
  description: string
  createdAt: string
  createdBy: string
  createdByName: string
}

export type QaidahFluency = 'needs_practice' | 'improving' | 'fluent'

export type QuranStatus = 'new' | 'practicing' | 'needs_review' | 'mastered'

export interface QuranHistoryEntry {
  surah: string
  ayah: string
  status: QuranStatus
  nextAssignment: string
  revisionSurahs: string
  notes: string
  recordedAt: string
  recordedBy: string
}

export interface QuranProgress {
  id: string // classId__studentId
  classId: string
  studentId: string
  studentName: string
  currentSurah: string
  currentAyah: string
  status: QuranStatus
  nextAssignment: string
  revisionSurahs: string
  notes: string
  history: QuranHistoryEntry[]
  updatedAt: string
  updatedBy: string
}

export interface QaidahHistoryEntry {
  lesson: string
  fluency: QaidahFluency
  notes: string
  recordedAt: string
  recordedBy: string
}

export interface QaidahProgress {
  id: string // classId__studentId
  classId: string
  studentId: string
  studentName: string
  currentLesson: string
  fluency: QaidahFluency
  notes: string
  history: QaidahHistoryEntry[]
  updatedAt: string
  updatedBy: string
}
