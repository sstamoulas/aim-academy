export interface AcademyClass {
  id: string
  name: string
  description?: string
  teacherUid: string
  teacherName: string
  schedule?: string
  tuitionAmount?: number  // in cents, e.g. 15000 = $150/mo
  createdAt: string
}

export interface Student {
  id: string
  firstName: string
  lastName: string
  classIds: string[]
  parentName?: string
  parentEmail?: string
  parentPhone?: string
  notes?: string
  createdAt: string
}

export interface AttendanceRecord {
  studentId: string
  studentName: string
  present: boolean
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
