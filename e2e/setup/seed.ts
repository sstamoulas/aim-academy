/**
 * Seed script: creates all test users and Firestore data in the emulator.
 * Run directly with: npx tsx e2e/setup/seed.ts
 * Or called automatically from globalSetup.ts before Playwright tests.
 */

import { initializeApp, cert, getApps, deleteApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

// ── Emulator env ──────────────────────────────────────────────────────────────

process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'
process.env.FIRESTORE_EMULATOR_HOST     = 'localhost:8081'
process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199'

const PROJECT_ID = 'aim-academy-7fdae'

// ── Constants ─────────────────────────────────────────────────────────────────

export const TEST = {
  ADMIN_UID:   'test-admin-uid',
  TEACHER_UID: 'test-teacher-uid',
  PARENT_UID:  'test-parent-uid',

  ADMIN_EMAIL:   'admin@test.local',
  TEACHER_EMAIL: 'teacher@test.local',
  PARENT_EMAIL:  'parent@test.local',
  PASSWORD:      'testpass123',

  CLASS_ID:    'test-class-001',
  CLASS_NAME:  'Test Islamic Studies Class',

  STUDENT_1_ID:   'test-student-001',
  STUDENT_1_NAME: 'Ahmed Test',
  STUDENT_2_ID:   'test-student-002',
  STUDENT_2_NAME: 'Fatima Test',
  STUDENT_3_ID:   'test-student-003',
  STUDENT_3_NAME: 'Omar Test',
} as const

const NOW = new Date().toISOString()

// ── Admin SDK init ────────────────────────────────────────────────────────────

function getAdminApp() {
  if (getApps().length) return getApps()[0]
  return initializeApp({ projectId: PROJECT_ID })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createUser(
  adminAuth: ReturnType<typeof getAuth>,
  uid: string, email: string, displayName: string, role: string,
) {
  try {
    await adminAuth.deleteUser(uid)
  } catch {
    // doesn't exist yet — fine
  }
  const user = await adminAuth.createUser({ uid, email, displayName, password: TEST.PASSWORD })
  await adminAuth.setCustomUserClaims(user.uid, { role })
  return user
}

async function clearCollection(db: ReturnType<typeof getFirestore>, col: string) {
  const snap = await db.collection(col).get()
  const batch = db.batch()
  snap.docs.forEach(d => batch.delete(d.ref))
  await batch.commit()
}

// ── Seed ─────────────────────────────────────────────────────────────────────

export async function seed() {
  const adminApp  = getAdminApp()
  const adminAuth = getAuth(adminApp)
  const db        = getFirestore(adminApp)

  console.log('🌱  Seeding emulator with test data…')

  // ── Users ──────────────────────────────────────────────────────────────────

  console.log('  → creating auth users')
  await Promise.all([
    createUser(adminAuth, TEST.ADMIN_UID,   TEST.ADMIN_EMAIL,   'Test Admin',   'admin'),
    createUser(adminAuth, TEST.TEACHER_UID, TEST.TEACHER_EMAIL, 'Test Teacher', 'teacher'),
    createUser(adminAuth, TEST.PARENT_UID,  TEST.PARENT_EMAIL,  'Test Parent',  'parent'),
  ])

  // ── Clear previous test data ───────────────────────────────────────────────

  console.log('  → clearing old Firestore test data')
  await Promise.all([
    clearCollection(db, 'users'),
    clearCollection(db, 'classes'),
    clearCollection(db, 'students'),
    clearCollection(db, 'attendance'),
    clearCollection(db, 'weeklyHomework'),
    clearCollection(db, 'quranProgress'),
    clearCollection(db, 'qaidahProgress'),
    clearCollection(db, 'isQuizProgress'),
    clearCollection(db, 'studentProgress'),
    clearCollection(db, 'missedWork'),
    clearCollection(db, 'announcements'),
    clearCollection(db, 'registrations'),
    clearCollection(db, 'events'),
    clearCollection(db, 'quarterlyReports'),
    clearCollection(db, 'progressReports'),
  ])

  const batch1 = db.batch()

  // ── User records ───────────────────────────────────────────────────────────

  batch1.set(db.doc(`users/${TEST.ADMIN_UID}`), {
    email: TEST.ADMIN_EMAIL, displayName: 'Test Admin', role: 'admin', createdAt: NOW, invitedBy: null,
  })
  batch1.set(db.doc(`users/${TEST.TEACHER_UID}`), {
    email: TEST.TEACHER_EMAIL, displayName: 'Test Teacher', role: 'teacher', createdAt: NOW, invitedBy: null,
  })
  batch1.set(db.doc(`users/${TEST.PARENT_UID}`), {
    email: TEST.PARENT_EMAIL, displayName: 'Test Parent', role: 'parent', createdAt: NOW, invitedBy: null,
  })

  // ── Class ──────────────────────────────────────────────────────────────────

  batch1.set(db.doc(`classes/${TEST.CLASS_ID}`), {
    name: TEST.CLASS_NAME,
    description: 'End-to-end test class',
    teacherUid: TEST.TEACHER_UID,
    teacherName: 'Test Teacher',
    schedule: 'Saturdays 10:00 AM',
    tuitionAmount: 15000,
    nextReportDeadline: '2026-12-31',
    createdAt: NOW,
  })

  // ── Students ───────────────────────────────────────────────────────────────

  batch1.set(db.doc(`students/${TEST.STUDENT_1_ID}`), {
    firstName: 'Ahmed', lastName: 'Test',
    classIds: [TEST.CLASS_ID],
    parentName: 'Test Parent', parentEmail: TEST.PARENT_EMAIL, parentPhone: '555-0101',
    notes: 'Test student 1', createdAt: NOW,
  })
  batch1.set(db.doc(`students/${TEST.STUDENT_2_ID}`), {
    firstName: 'Fatima', lastName: 'Test',
    classIds: [TEST.CLASS_ID],
    parentName: 'Other Parent', parentEmail: 'other@test.local', parentPhone: '555-0102',
    createdAt: NOW,
  })
  batch1.set(db.doc(`students/${TEST.STUDENT_3_ID}`), {
    firstName: 'Omar', lastName: 'Test',
    classIds: [TEST.CLASS_ID],
    parentName: 'Third Parent', parentEmail: 'third@test.local', parentPhone: '555-0103',
    createdAt: NOW,
  })

  await batch1.commit()

  const batch2 = db.batch()

  // ── Attendance sessions ────────────────────────────────────────────────────

  const sessions = [
    { id: 'test-session-001', date: '2026-10-04', records: ['present', 'present', 'absent'] },
    { id: 'test-session-002', date: '2026-10-11', records: ['present', 'late',    'present'] },
    { id: 'test-session-003', date: '2026-10-18', records: ['absent',  'present', 'present'] },
    { id: 'test-session-004', date: '2026-10-25', records: ['present', 'present', 'excused'] },
    { id: 'test-session-005', date: '2026-11-01', records: ['present', 'absent',  'present'] },
  ]
  const studentIds   = [TEST.STUDENT_1_ID, TEST.STUDENT_2_ID, TEST.STUDENT_3_ID]
  const studentNames = [TEST.STUDENT_1_NAME, TEST.STUDENT_2_NAME, TEST.STUDENT_3_NAME]

  sessions.forEach(s => {
    batch2.set(db.doc(`attendance/${s.id}`), {
      classId: TEST.CLASS_ID,
      date: s.date,
      records: s.records.map((status, i) => ({
        studentId: studentIds[i], studentName: studentNames[i], status,
      })),
      createdBy: TEST.TEACHER_UID,
      createdAt: `${s.date}T10:00:00.000Z`,
    })
  })

  // ── Homework (IS) ──────────────────────────────────────────────────────────

  const hwWeeks = [
    { week: '2026-W40', s1: 'complete',           s2: 'partially_complete', s3: 'not_complete' },
    { week: '2026-W41', s1: 'complete',           s2: 'complete',           s3: 'no_homework'  },
    { week: '2026-W42', s1: 'partially_complete', s2: 'not_complete',       s3: 'complete'     },
    { week: '2026-W43', s1: 'complete',           s2: 'complete',           s3: 'complete'     },
    { week: '2026-W44', s1: 'not_complete',       s2: 'partially_complete', s3: 'no_homework'  },
  ]
  hwWeeks.forEach(h => {
    batch2.set(db.doc(`weeklyHomework/${TEST.CLASS_ID}__${h.week}`), {
      classId: TEST.CLASS_ID,
      week: h.week,
      completed: {
        [TEST.STUDENT_1_ID]: h.s1,
        [TEST.STUDENT_2_ID]: h.s2,
        [TEST.STUDENT_3_ID]: h.s3,
      },
      updatedAt: NOW,
      updatedBy: TEST.TEACHER_UID,
    })
  })

  // ── Qur'an progress ────────────────────────────────────────────────────────

  batch2.set(db.doc(`quranProgress/${TEST.CLASS_ID}__${TEST.STUDENT_1_ID}`), {
    classId: TEST.CLASS_ID, studentId: TEST.STUDENT_1_ID, studentName: TEST.STUDENT_1_NAME,
    currentSurah: 'Al-Baqarah', currentAyah: '1-5', status: 'practicing',
    nextAssignment: 'Al-Baqarah 6-10', revisionSurahs: 'Al-Fatiha',
    notes: 'Good progress, working on tajweed',
    history: [
      {
        surah: 'Al-Fatiha', ayah: '1-7', status: 'mastered',
        nextAssignment: 'Al-Baqarah 1-5', revisionSurahs: '',
        notes: 'Completed Al-Fatiha with correct tajweed',
        recordedAt: '2026-10-01T10:00:00.000Z', recordedBy: TEST.TEACHER_UID,
      },
    ],
    updatedAt: NOW, updatedBy: TEST.TEACHER_UID,
  })
  batch2.set(db.doc(`quranProgress/${TEST.CLASS_ID}__${TEST.STUDENT_2_ID}`), {
    classId: TEST.CLASS_ID, studentId: TEST.STUDENT_2_ID, studentName: TEST.STUDENT_2_NAME,
    currentSurah: 'Al-Fatiha', currentAyah: '1-7', status: 'new',
    nextAssignment: 'Al-Fatiha 1-7', revisionSurahs: '', notes: '',
    history: [], updatedAt: NOW, updatedBy: TEST.TEACHER_UID,
  })

  // ── Qa'idah progress ───────────────────────────────────────────────────────

  batch2.set(db.doc(`qaidahProgress/${TEST.CLASS_ID}__${TEST.STUDENT_1_ID}`), {
    classId: TEST.CLASS_ID, studentId: TEST.STUDENT_1_ID, studentName: TEST.STUDENT_1_NAME,
    currentLesson: 'Lesson 5: Tanween', fluency: 'improving',
    notes: 'Working on tanween sounds, getting better',
    history: [
      {
        lesson: 'Lesson 4: Long Vowels', fluency: 'fluent',
        notes: 'Mastered long vowels',
        recordedAt: '2026-10-01T10:00:00.000Z', recordedBy: TEST.TEACHER_UID,
      },
      {
        lesson: 'Lesson 3: Short Vowels', fluency: 'fluent',
        notes: 'Mastered short vowels',
        recordedAt: '2026-09-15T10:00:00.000Z', recordedBy: TEST.TEACHER_UID,
      },
    ],
    updatedAt: NOW, updatedBy: TEST.TEACHER_UID,
  })

  // ── IS Quiz progress ───────────────────────────────────────────────────────

  batch2.set(db.doc(`isQuizProgress/${TEST.CLASS_ID}__${TEST.STUDENT_1_ID}`), {
    classId: TEST.CLASS_ID, studentId: TEST.STUDENT_1_ID, studentName: TEST.STUDENT_1_NAME,
    results: [
      { month: '2026-10', grade: 'good',      score: '8/10', comment: 'Great effort',  recordedAt: '2026-10-28T10:00:00.000Z', recordedBy: TEST.TEACHER_UID },
      { month: '2026-09', grade: 'excellent', score: '10/10', comment: 'Outstanding', recordedAt: '2026-09-30T10:00:00.000Z', recordedBy: TEST.TEACHER_UID },
      { month: '2026-08', grade: 'developing', score: '6/10', comment: 'Needs review of prophets topic', recordedAt: '2026-08-31T10:00:00.000Z', recordedBy: TEST.TEACHER_UID },
    ],
    updatedAt: NOW, updatedBy: TEST.TEACHER_UID,
  })
  batch2.set(db.doc(`isQuizProgress/${TEST.CLASS_ID}__${TEST.STUDENT_2_ID}`), {
    classId: TEST.CLASS_ID, studentId: TEST.STUDENT_2_ID, studentName: TEST.STUDENT_2_NAME,
    results: [
      { month: '2026-10', grade: 'excellent', score: '10/10', comment: 'Perfect score', recordedAt: '2026-10-28T10:00:00.000Z', recordedBy: TEST.TEACHER_UID },
    ],
    updatedAt: NOW, updatedBy: TEST.TEACHER_UID,
  })

  // ── General student progress ───────────────────────────────────────────────

  batch2.set(db.doc(`studentProgress/${TEST.CLASS_ID}__${TEST.STUDENT_1_ID}`), {
    classId: TEST.CLASS_ID, studentId: TEST.STUDENT_1_ID,
    quranPosition: 'Al-Baqarah 1-5',
    qaidahPosition: 'Lesson 5: Tanween',
    islamicStudiesLevel: 'Level 2 — Pillars of Islam',
    notes: 'Ahmed is a hardworking student. Needs to work on pronunciation consistency.',
    updatedAt: NOW, updatedBy: TEST.TEACHER_UID,
  })

  // ── Missed work ────────────────────────────────────────────────────────────

  batch2.set(db.doc('missedWork/test-missed-001'), {
    classId: TEST.CLASS_ID, className: TEST.CLASS_NAME,
    studentId: TEST.STUDENT_1_ID, studentName: TEST.STUDENT_1_NAME,
    date: '2026-10-18', missedLesson: false, missedHomework: true,
    missedWorkNotes: 'Did not submit IS homework for this week',
    resolved: false, createdAt: NOW,
  })
  batch2.set(db.doc('missedWork/test-missed-002'), {
    classId: TEST.CLASS_ID, className: TEST.CLASS_NAME,
    studentId: TEST.STUDENT_3_ID, studentName: TEST.STUDENT_3_NAME,
    date: '2026-10-04', missedLesson: true, missedHomework: true,
    missedWorkNotes: 'Was absent — missed lesson and did not make up homework',
    resolved: false, createdAt: NOW,
  })
  batch2.set(db.doc('missedWork/test-missed-003'), {
    classId: TEST.CLASS_ID, className: TEST.CLASS_NAME,
    studentId: TEST.STUDENT_2_ID, studentName: TEST.STUDENT_2_NAME,
    date: '2026-09-20', missedLesson: false, missedHomework: true,
    missedWorkNotes: 'Completed', resolved: true, resolvedAt: NOW, createdAt: NOW,
  })

  // ── Announcements ──────────────────────────────────────────────────────────

  batch2.set(db.doc('announcements/test-announcement-001'), {
    title: 'Welcome to Test Class',
    body: 'This is the first announcement for our E2E test class. Assalamualaikum!',
    classId: TEST.CLASS_ID, className: TEST.CLASS_NAME,
    authorUid: TEST.TEACHER_UID, authorName: 'Test Teacher',
    createdAt: '2026-10-01T09:00:00.000Z', published: true,
  })
  batch2.set(db.doc('announcements/test-announcement-002'), {
    title: 'Homework Reminder',
    body: 'Please remember to complete the Islamic Studies homework before next Saturday.',
    classId: TEST.CLASS_ID, className: TEST.CLASS_NAME,
    authorUid: TEST.TEACHER_UID, authorName: 'Test Teacher',
    createdAt: '2026-10-20T09:00:00.000Z', published: true,
  })
  batch2.set(db.doc('announcements/test-announcement-draft'), {
    title: 'Draft Announcement (unpublished)',
    body: 'This should not be visible to parents.',
    classId: TEST.CLASS_ID, className: TEST.CLASS_NAME,
    authorUid: TEST.TEACHER_UID, authorName: 'Test Teacher',
    createdAt: '2026-11-01T09:00:00.000Z', published: false,
  })

  // ── Parent registration ────────────────────────────────────────────────────

  batch2.set(db.doc(`registrations/${TEST.PARENT_UID}`), {
    parentName: 'Test Parent', email: TEST.PARENT_EMAIL, phone: '555-0100',
    children: [
      { firstName: 'Ahmed', lastName: 'Test', dateOfBirth: '2015-03-15', grade: '5th Grade' },
    ],
    status: 'approved', submittedAt: NOW, reviewedAt: NOW, reviewedBy: TEST.ADMIN_UID,
  })

  // ── Events ────────────────────────────────────────────────────────────────

  batch2.set(db.doc('events/test-event-001'), {
    slug: 'test-annual-dinner-2026',
    title: 'Test Annual Dinner 2026',
    description: 'Annual fundraising dinner for E2E testing.',
    status: 'upcoming', published: true,
    flyerImageUrl: '', registrationUrl: '',
    details: [
      { id: 'det-1', icon: '📅', label: 'Date',     value: 'December 15, 2026' },
      { id: 'det-2', icon: '🕟', label: 'Time',     value: '6:00 PM – 9:00 PM' },
      { id: 'det-3', icon: '📍', label: 'Location', value: 'Test Venue, Springfield' },
      { id: 'det-4', icon: '👧', label: 'Ages',     value: 'All ages welcome' },
      { id: 'det-5', icon: '💲', label: 'Price',    value: 'See pricing below' },
    ],
    pricing: [
      { id: 'pr-1', label: '1 Child',    sublabel: 'Per child rate',     amount: 2500 },
      { id: 'pr-2', label: '2 Children', sublabel: 'Best for siblings',  amount: 4500 },
      { id: 'pr-3', label: '3 Children', sublabel: 'Family discount',    amount: 6000 },
    ],
    sections: [
      { id: 'sec-1', type: 'text', title: 'About the Event', content: 'Join us for a wonderful evening.', items: [] },
    ],
    media: [], createdAt: NOW,
  })

  await batch2.commit()

  console.log('✅  Seed complete.')
  console.log(`    Admin:   ${TEST.ADMIN_EMAIL} / ${TEST.PASSWORD}`)
  console.log(`    Teacher: ${TEST.TEACHER_EMAIL} / ${TEST.PASSWORD}`)
  console.log(`    Parent:  ${TEST.PARENT_EMAIL} / ${TEST.PASSWORD}`)
}

// ── Run directly ──────────────────────────────────────────────────────────────

if (process.argv[1] === import.meta.filename) {
  seed().catch(err => { console.error(err); process.exit(1) })
}
