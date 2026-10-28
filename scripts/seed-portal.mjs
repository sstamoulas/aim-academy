// scripts/seed-portal.mjs
// Seeds aim-academy-7fdae (test) with realistic portal data:
// classes, students, attendance, progress, homework, quiz results, announcements
//
// Run: cd functions && node ../scripts/seed-portal.mjs

import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) {
  initializeApp({ projectId: 'aim-academy-7fdae' })
}

const db = getFirestore()

// ── IDs ───────────────────────────────────────────────────────────────────────

const TEACHER = {
  ibrahim: { uid: 'seed_teacher_ibrahim', name: 'Ibrahim Khan' },
  zainab:  { uid: 'seed_teacher_zainab',  name: 'Zainab Malik'    },
  ahmad:   { uid: 'seed_teacher_ahmad',   name: 'Ahmad Siddiqui'  },
}

const CLS = {
  hifz:    'seed_cls_hifz',
  qaidah:  'seed_cls_qaidah',
  is3:     'seed_cls_is3',
  tajweed: 'seed_cls_tajweed',
}

// ── Classes ───────────────────────────────────────────────────────────────────

const classes = [
  {
    id: CLS.hifz,
    name: 'Hifz',
    description: 'Quran memorization for advanced students',
    teacherUid: TEACHER.ibrahim.uid,
    teacherName: TEACHER.ibrahim.name,
    schedule: 'Saturday 9:00am–11:00am',
    tuitionAmount: 15000,
    nextReportDeadline: '2026-11-07',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: CLS.qaidah,
    name: "Noorani Qa'idah",
    description: "Foundational Arabic reading using the Noorani Qa'idah method",
    teacherUid: TEACHER.zainab.uid,
    teacherName: TEACHER.zainab.name,
    schedule: 'Saturday 11:00am–12:30pm',
    tuitionAmount: 12000,
    nextReportDeadline: '2026-11-14',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: CLS.is3,
    name: 'Islamic Studies Grade 3',
    description: 'Aqeedah, Fiqh, Seerah, and Akhlaq for Grade 3 students',
    teacherUid: TEACHER.ahmad.uid,
    teacherName: TEACHER.ahmad.name,
    schedule: 'Saturday 12:30pm–2:00pm',
    tuitionAmount: 12000,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: CLS.tajweed,
    name: 'Quran Recitation (Tajweed)',
    description: 'Quran recitation with proper Tajweed rules for intermediate students',
    teacherUid: TEACHER.zainab.uid,
    teacherName: TEACHER.zainab.name,
    schedule: 'Saturday 2:00pm–3:30pm',
    tuitionAmount: 14000,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
]

// ── Students ──────────────────────────────────────────────────────────────────

const students = [
  // Hifz
  { id: 'seed_stu_omar',    firstName: 'Omar',    lastName: 'Abdullah',  classIds: [CLS.hifz],    tuitionAmount: 15000, parentName: 'Khalid Abdullah',  parentEmail: 'khalid.abdullah@seedtest.com', parentPhone: '(571) 555-0101' },
  { id: 'seed_stu_aisha',   firstName: 'Aisha',   lastName: 'Rahman',    classIds: [CLS.hifz],    tuitionAmount: 15000, parentName: 'Hassan Rahman',    parentEmail: 'hassan.rahman@seedtest.com',   parentPhone: '(571) 555-0102' },
  { id: 'seed_stu_yusuf',   firstName: 'Yusuf',   lastName: 'Al-Amin',   classIds: [CLS.hifz],    tuitionAmount: 15000, parentName: 'Bilal Al-Amin',    parentEmail: 'bilal.alamin@seedtest.com',    parentPhone: '(571) 555-0103' },
  { id: 'seed_stu_maryam',  firstName: 'Maryam',  lastName: 'Hossain',   classIds: [CLS.hifz],    tuitionAmount: 15000, parentName: 'Tariq Hossain',    parentEmail: 'tariq.hossain@seedtest.com',   parentPhone: '(571) 555-0104' },

  // Noorani Qa'idah
  { id: 'seed_stu_zayd',    firstName: 'Zayd',    lastName: 'Nasser',    classIds: [CLS.qaidah],  tuitionAmount: 12000, parentName: 'Amira Nasser',     parentEmail: 'amira.nasser@seedtest.com',    parentPhone: '(571) 555-0201' },
  { id: 'seed_stu_fatima',  firstName: 'Fatima',  lastName: 'Osman',     classIds: [CLS.qaidah],  tuitionAmount: 12000, parentName: 'Yusuf Osman',      parentEmail: 'yusuf.osman@seedtest.com',     parentPhone: '(571) 555-0202' },
  { id: 'seed_stu_ibrahim', firstName: 'Ibrahim', lastName: 'Malik',     classIds: [CLS.qaidah],  tuitionAmount: 12000, parentName: 'Layla Malik',      parentEmail: 'layla.malik@seedtest.com',     parentPhone: '(571) 555-0203' },
  { id: 'seed_stu_khadija', firstName: 'Khadijah',lastName: 'Hussain',   classIds: [CLS.qaidah],  tuitionAmount: 12000, parentName: 'Ahmed Hussain',    parentEmail: 'ahmed.hussain@seedtest.com',   parentPhone: '(571) 555-0204' },
  { id: 'seed_stu_ali',     firstName: 'Ali',     lastName: 'Karimi',    classIds: [CLS.qaidah],  tuitionAmount: 12000, parentName: 'Sara Karimi',      parentEmail: 'sara.karimi@seedtest.com',     parentPhone: '(571) 555-0205' },

  // Islamic Studies Grade 3
  { id: 'seed_stu_sara',    firstName: 'Sara',    lastName: 'Ahmed',     classIds: [CLS.is3],     tuitionAmount: 12000, parentName: 'Nadia Ahmed',      parentEmail: 'nadia.ahmed@seedtest.com',     parentPhone: '(571) 555-0301' },
  { id: 'seed_stu_hassan',  firstName: 'Hassan',  lastName: 'Qureshi',   classIds: [CLS.is3],     tuitionAmount: 12000, parentName: 'Imran Qureshi',    parentEmail: 'imran.qureshi@seedtest.com',   parentPhone: '(571) 555-0302' },
  { id: 'seed_stu_zainab',  firstName: 'Zainab',  lastName: 'Farooq',    classIds: [CLS.is3],     tuitionAmount: 12000, parentName: 'Khalid Farooq',    parentEmail: 'khalid.farooq@seedtest.com',   parentPhone: '(571) 555-0303' },
  { id: 'seed_stu_adam',    firstName: 'Adam',    lastName: 'Nasir',     classIds: [CLS.is3],     tuitionAmount: 12000, parentName: 'Rania Nasir',      parentEmail: 'rania.nasir@seedtest.com',     parentPhone: '(571) 555-0304' },

  // Tajweed
  { id: 'seed_stu_noor',    firstName: 'Noor',    lastName: 'Siddiqui',  classIds: [CLS.tajweed], tuitionAmount: 14000, parentName: 'Amna Siddiqui',    parentEmail: 'amna.siddiqui@seedtest.com',   parentPhone: '(571) 555-0401' },
  { id: 'seed_stu_bilal',   firstName: 'Bilal',   lastName: 'Chaudhry',  classIds: [CLS.tajweed], tuitionAmount: 14000, parentName: 'Zara Chaudhry',    parentEmail: 'zara.chaudhry@seedtest.com',   parentPhone: '(571) 555-0402' },
  { id: 'seed_stu_hana',    firstName: 'Hana',    lastName: 'Al-Rashid', classIds: [CLS.tajweed], tuitionAmount: 14000, parentName: 'Faisal Al-Rashid', parentEmail: 'faisal.alrashid@seedtest.com', parentPhone: '(571) 555-0403' },
  { id: 'seed_stu_umar',    firstName: 'Umar',    lastName: 'Patel',     classIds: [CLS.tajweed], tuitionAmount: 14000, parentName: 'Safia Patel',      parentEmail: 'safia.patel@seedtest.com',     parentPhone: '(571) 555-0404' },
].map(s => ({ ...s, notes: '', createdAt: '2026-09-01T00:00:00.000Z' }))

// ── Attendance ─────────────────────────────────────────────────────────────────
// Last 3 Saturdays: Oct 11, Oct 18, Oct 25

function attendanceSession(classId, date, studentList, presentIds) {
  return {
    id: `${classId}_${date}`,
    classId,
    date,
    records: studentList.map(s => ({
      studentId: s.id,
      studentName: `${s.firstName} ${s.lastName}`,
      present: presentIds.includes(s.id),
    })),
    createdBy: classes.find(c => c.id === classId)?.teacherUid ?? '',
    createdAt: `${date}T10:00:00.000Z`,
  }
}

const hifzStudents    = students.filter(s => s.classIds.includes(CLS.hifz))
const qaidahStudents  = students.filter(s => s.classIds.includes(CLS.qaidah))
const is3Students     = students.filter(s => s.classIds.includes(CLS.is3))
const tajweedStudents = students.filter(s => s.classIds.includes(CLS.tajweed))

const attendance = [
  // Hifz — Oct 11: 3/4 present, Oct 18: 4/4, Oct 25: 3/4
  attendanceSession(CLS.hifz, '2026-10-11', hifzStudents, ['seed_stu_omar','seed_stu_aisha','seed_stu_yusuf']),
  attendanceSession(CLS.hifz, '2026-10-18', hifzStudents, ['seed_stu_omar','seed_stu_aisha','seed_stu_yusuf','seed_stu_maryam']),
  attendanceSession(CLS.hifz, '2026-10-25', hifzStudents, ['seed_stu_aisha','seed_stu_yusuf','seed_stu_maryam']),

  // Qa'idah — Oct 11: 4/5, Oct 18: 5/5, Oct 25: 4/5
  attendanceSession(CLS.qaidah, '2026-10-11', qaidahStudents, ['seed_stu_zayd','seed_stu_fatima','seed_stu_ibrahim','seed_stu_khadija']),
  attendanceSession(CLS.qaidah, '2026-10-18', qaidahStudents, ['seed_stu_zayd','seed_stu_fatima','seed_stu_ibrahim','seed_stu_khadija','seed_stu_ali']),
  attendanceSession(CLS.qaidah, '2026-10-25', qaidahStudents, ['seed_stu_zayd','seed_stu_fatima','seed_stu_khadija','seed_stu_ali']),

  // IS3 — Oct 11: 3/4, Oct 18: 4/4, Oct 25: 3/4
  attendanceSession(CLS.is3, '2026-10-11', is3Students, ['seed_stu_sara','seed_stu_hassan','seed_stu_zainab']),
  attendanceSession(CLS.is3, '2026-10-18', is3Students, ['seed_stu_sara','seed_stu_hassan','seed_stu_zainab','seed_stu_adam']),
  attendanceSession(CLS.is3, '2026-10-25', is3Students, ['seed_stu_sara','seed_stu_zainab','seed_stu_adam']),

  // Tajweed — Oct 11: 4/4, Oct 18: 3/4, Oct 25: 4/4
  attendanceSession(CLS.tajweed, '2026-10-11', tajweedStudents, ['seed_stu_noor','seed_stu_bilal','seed_stu_hana','seed_stu_umar']),
  attendanceSession(CLS.tajweed, '2026-10-18', tajweedStudents, ['seed_stu_noor','seed_stu_hana','seed_stu_umar']),
  attendanceSession(CLS.tajweed, '2026-10-25', tajweedStudents, ['seed_stu_noor','seed_stu_bilal','seed_stu_hana','seed_stu_umar']),
]

// ── Student Progress ──────────────────────────────────────────────────────────

const progress = [
  // Hifz — Quran memorization positions
  { id: `${CLS.hifz}__seed_stu_omar`,   classId: CLS.hifz, studentId: 'seed_stu_omar',   quranPosition: "Surah Al-Mulk (67), Ayah 18",      qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 5', notes: 'Strong memorization, needs to work on tajweed',        updatedAt: '2026-10-25T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid },
  { id: `${CLS.hifz}__seed_stu_aisha`,  classId: CLS.hifz, studentId: 'seed_stu_aisha',  quranPosition: "Surah Al-Qalam (68), Ayah 5",       qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 5', notes: 'Excellent progress, ahead of schedule',                updatedAt: '2026-10-25T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid },
  { id: `${CLS.hifz}__seed_stu_yusuf`,  classId: CLS.hifz, studentId: 'seed_stu_yusuf',  quranPosition: "Surah Al-Haqqah (69), Ayah 1",      qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 5', notes: 'Good retention, occasional pronunciation errors',       updatedAt: '2026-10-18T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid },
  { id: `${CLS.hifz}__seed_stu_maryam`, classId: CLS.hifz, studentId: 'seed_stu_maryam', quranPosition: "Surah Al-Maarij (70), Ayah 10",     qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 4', notes: 'Needs more revision of Juz 29',                         updatedAt: '2026-10-25T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid },

  // Qa'idah — Reading positions
  { id: `${CLS.qaidah}__seed_stu_zayd`,    classId: CLS.qaidah, studentId: 'seed_stu_zayd',    quranPosition: '',              qaidahPosition: "Noorani Qa'idah Page 18 — Compound Letters", islamicStudiesLevel: 'Grade 1', notes: 'Good progress, needs practice with compound letters', updatedAt: '2026-10-25T12:00:00.000Z', updatedBy: TEACHER.zainab.uid },
  { id: `${CLS.qaidah}__seed_stu_fatima`,  classId: CLS.qaidah, studentId: 'seed_stu_fatima',  quranPosition: '',              qaidahPosition: "Noorani Qa'idah Page 22 — Short Vowels",     islamicStudiesLevel: 'Grade 2', notes: 'Excellent, ahead of class',                          updatedAt: '2026-10-25T12:00:00.000Z', updatedBy: TEACHER.zainab.uid },
  { id: `${CLS.qaidah}__seed_stu_ibrahim`, classId: CLS.qaidah, studentId: 'seed_stu_ibrahim', quranPosition: '',              qaidahPosition: "Noorani Qa'idah Page 14 — Single Letters",   islamicStudiesLevel: 'Grade 1', notes: 'Slow but steady, extra practice at home recommended',  updatedAt: '2026-10-18T12:00:00.000Z', updatedBy: TEACHER.zainab.uid },
  { id: `${CLS.qaidah}__seed_stu_khadija`, classId: CLS.qaidah, studentId: 'seed_stu_khadija', quranPosition: '',              qaidahPosition: "Noorani Qa'idah Page 20 — Tanween",         islamicStudiesLevel: 'Grade 2', notes: 'Good, tanween still needs work',                       updatedAt: '2026-10-25T12:00:00.000Z', updatedBy: TEACHER.zainab.uid },
  { id: `${CLS.qaidah}__seed_stu_ali`,     classId: CLS.qaidah, studentId: 'seed_stu_ali',     quranPosition: '',              qaidahPosition: "Noorani Qa'idah Page 16 — Joined Letters",   islamicStudiesLevel: 'Grade 1', notes: 'Needs encouragement, making progress',                  updatedAt: '2026-10-25T12:00:00.000Z', updatedBy: TEACHER.zainab.uid },

  // IS3 — Islamic Studies level
  { id: `${CLS.is3}__seed_stu_sara`,   classId: CLS.is3, studentId: 'seed_stu_sara',   quranPosition: 'Surah Al-Fatiha — Memorized', qaidahPosition: "Qa'idah Complete", islamicStudiesLevel: 'Grade 3, Chapter 4 — The Five Pillars', notes: 'Strong student, participates well',        updatedAt: '2026-10-25T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid },
  { id: `${CLS.is3}__seed_stu_hassan`, classId: CLS.is3, studentId: 'seed_stu_hassan', quranPosition: 'Surah Al-Fatiha — Memorized', qaidahPosition: "Qa'idah Complete", islamicStudiesLevel: 'Grade 3, Chapter 3 — Salah',            notes: 'Needs help with Salah chapter',            updatedAt: '2026-10-25T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid },
  { id: `${CLS.is3}__seed_stu_zainab`, classId: CLS.is3, studentId: 'seed_stu_zainab', quranPosition: 'Surah Al-Ikhlas — Memorized', qaidahPosition: "Qa'idah Page 30",  islamicStudiesLevel: 'Grade 3, Chapter 4 — The Five Pillars', notes: 'Very attentive and asks great questions',  updatedAt: '2026-10-18T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid },
  { id: `${CLS.is3}__seed_stu_adam`,   classId: CLS.is3, studentId: 'seed_stu_adam',   quranPosition: 'Surah Al-Fatiha — Memorized', qaidahPosition: "Qa'idah Page 25",  islamicStudiesLevel: 'Grade 3, Chapter 3 — Salah',            notes: 'Improving steadily',                       updatedAt: '2026-10-25T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid },

  // Tajweed — Recitation positions
  { id: `${CLS.tajweed}__seed_stu_noor`,  classId: CLS.tajweed, studentId: 'seed_stu_noor',  quranPosition: "Surah Yaseen — Working on Ikhfa rules", qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 4', notes: 'Beautiful recitation, almost ready for Juz 1 review', updatedAt: '2026-10-25T14:30:00.000Z', updatedBy: TEACHER.zainab.uid },
  { id: `${CLS.tajweed}__seed_stu_bilal`, classId: CLS.tajweed, studentId: 'seed_stu_bilal', quranPosition: "Surah Al-Baqarah — Idgham rules",        qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 4', notes: 'Working on Idgham, good overall',                     updatedAt: '2026-10-25T14:30:00.000Z', updatedBy: TEACHER.zainab.uid },
  { id: `${CLS.tajweed}__seed_stu_hana`,  classId: CLS.tajweed, studentId: 'seed_stu_hana',  quranPosition: "Surah Al-Imran — Qalqalah practice",    qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 3', notes: 'Qalqalah improving, consistent effort',               updatedAt: '2026-10-18T14:30:00.000Z', updatedBy: TEACHER.zainab.uid },
  { id: `${CLS.tajweed}__seed_stu_umar`,  classId: CLS.tajweed, studentId: 'seed_stu_umar',  quranPosition: "Surah An-Nisa — Madd rules",             qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 4', notes: 'Strong madd pronunciation, keep it up',               updatedAt: '2026-10-25T14:30:00.000Z', updatedBy: TEACHER.zainab.uid },
]

// ── Weekly Homework ───────────────────────────────────────────────────────────
// Weeks 42 (Oct 12–18) and 43 (Oct 19–25) completed; week 44 (current) not yet done

const homework = [
  // IS3 week 42
  {
    id: `${CLS.is3}__2026-W42`, classId: CLS.is3, week: '2026-W42',
    completed: { seed_stu_sara: true, seed_stu_hassan: false, seed_stu_zainab: true, seed_stu_adam: true },
    updatedAt: '2026-10-18T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid,
  },
  // IS3 week 43
  {
    id: `${CLS.is3}__2026-W43`, classId: CLS.is3, week: '2026-W43',
    completed: { seed_stu_sara: true, seed_stu_hassan: true, seed_stu_zainab: true, seed_stu_adam: false },
    updatedAt: '2026-10-25T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid,
  },
  // Hifz week 42
  {
    id: `${CLS.hifz}__2026-W42`, classId: CLS.hifz, week: '2026-W42',
    completed: { seed_stu_omar: true, seed_stu_aisha: true, seed_stu_yusuf: true, seed_stu_maryam: false },
    updatedAt: '2026-10-18T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid,
  },
  // Hifz week 43
  {
    id: `${CLS.hifz}__2026-W43`, classId: CLS.hifz, week: '2026-W43',
    completed: { seed_stu_omar: true, seed_stu_aisha: true, seed_stu_yusuf: false, seed_stu_maryam: true },
    updatedAt: '2026-10-25T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid,
  },
  // Tajweed week 42
  {
    id: `${CLS.tajweed}__2026-W42`, classId: CLS.tajweed, week: '2026-W42',
    completed: { seed_stu_noor: true, seed_stu_bilal: true, seed_stu_hana: false, seed_stu_umar: true },
    updatedAt: '2026-10-18T14:30:00.000Z', updatedBy: TEACHER.zainab.uid,
  },
  // Tajweed week 43
  {
    id: `${CLS.tajweed}__2026-W43`, classId: CLS.tajweed, week: '2026-W43',
    completed: { seed_stu_noor: true, seed_stu_bilal: false, seed_stu_hana: true, seed_stu_umar: true },
    updatedAt: '2026-10-25T14:30:00.000Z', updatedBy: TEACHER.zainab.uid,
  },
]

// ── Quiz Results ──────────────────────────────────────────────────────────────
// October 2026 quiz results for IS3 and Hifz (Tajweed and Qa'idah not yet entered)

const quizResults = [
  {
    id: `${CLS.is3}__2026-10`, classId: CLS.is3, month: '2026-10', maxScore: 20,
    scores: { seed_stu_sara: 18, seed_stu_hassan: 14, seed_stu_zainab: 19, seed_stu_adam: 16 },
    updatedAt: '2026-10-25T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid,
  },
  {
    id: `${CLS.hifz}__2026-10`, classId: CLS.hifz, month: '2026-10', maxScore: 10,
    scores: { seed_stu_omar: 9, seed_stu_aisha: 10, seed_stu_yusuf: 8, seed_stu_maryam: 7 },
    updatedAt: '2026-10-25T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid,
  },
]

// ── Announcements ─────────────────────────────────────────────────────────────

const announcements = [
  {
    id: 'seed_ann_hifz_1',
    title: 'Juz 29 Revision This Saturday',
    body: "As-salamu alaykum dear parents,\n\nThis Saturday we will be doing a full revision of Juz 29. Please ensure your child has reviewed Surahs Al-Muzzammil through An-Naba' at home before class.\n\nJazak Allah khayran.",
    classId: CLS.hifz, className: 'Hifz',
    authorUid: TEACHER.ibrahim.uid, authorName: TEACHER.ibrahim.name,
    createdAt: '2026-10-22T10:00:00.000Z', published: true,
  },
  {
    id: 'seed_ann_hifz_2',
    title: 'Mid-Year Progress Reports — Nov 7 Deadline',
    body: "As-salamu alaykum,\n\nProgress reports for the Hifz class are due by November 7th. Reports will be shared with parents via the portal. Please reach out if you have any questions.\n\nBarak Allahu feekum.",
    classId: CLS.hifz, className: 'Hifz',
    authorUid: TEACHER.ibrahim.uid, authorName: TEACHER.ibrahim.name,
    createdAt: '2026-10-15T10:00:00.000Z', published: true,
  },
  {
    id: 'seed_ann_qaidah_1',
    title: "Practice Letters 10–15 This Week",
    body: "As-salamu alaykum,\n\nWe covered letters 10–15 in the Noorani Qa'idah this Saturday. Please have your child practice writing and reading these letters daily for 10 minutes.\n\nJazak Allah khayran for your support!",
    classId: CLS.qaidah, className: "Noorani Qa'idah",
    authorUid: TEACHER.zainab.uid, authorName: TEACHER.zainab.name,
    createdAt: '2026-10-25T13:00:00.000Z', published: true,
  },
  {
    id: 'seed_ann_qaidah_2',
    title: 'Class Starting 15 Minutes Late on Nov 1',
    body: "As-salamu alaykum dear parents,\n\nPlease note that the Noorani Qa'idah class on November 1st will start 15 minutes late (11:15am instead of 11:00am) due to a scheduling conflict. We will still end at the regular time.\n\nJazak Allah khayran for your understanding.",
    classId: CLS.qaidah, className: "Noorani Qa'idah",
    authorUid: TEACHER.zainab.uid, authorName: TEACHER.zainab.name,
    createdAt: '2026-10-20T09:00:00.000Z', published: true,
  },
  {
    id: 'seed_ann_is3_1',
    title: 'Chapter 4 Quiz Next Saturday',
    body: "As-salamu alaykum parents,\n\nWe will have a short quiz on Chapter 4 (The Five Pillars of Islam) next Saturday. The quiz will be 20 questions. Please review pages 42–58 in the Islamic Studies textbook.\n\nJazak Allah khayran.",
    classId: CLS.is3, className: 'Islamic Studies Grade 3',
    authorUid: TEACHER.ahmad.uid, authorName: TEACHER.ahmad.name,
    createdAt: '2026-10-21T12:00:00.000Z', published: true,
  },
  {
    id: 'seed_ann_tajweed_1',
    title: 'Ikhfa and Idgham Review',
    body: "As-salamu alaykum dear parents,\n\nThis week we focused on Ikhfa and Idgham rules. Please ask your child to recite Surah Al-Baqarah verses 1–10 applying these rules. A helpful reminder sheet is available at the front desk.\n\nJazak Allah khayran.",
    classId: CLS.tajweed, className: 'Quran Recitation (Tajweed)',
    authorUid: TEACHER.zainab.uid, authorName: TEACHER.zainab.name,
    createdAt: '2026-10-25T15:00:00.000Z', published: true,
  },
  {
    id: 'seed_ann_tajweed_2',
    title: 'No Class on November 8th',
    body: "As-salamu alaykum,\n\nPlease note there will be no Tajweed class on Saturday, November 8th due to the school being used for a community event. We will resume on November 15th.\n\nJazak Allah khayran for your understanding.",
    classId: CLS.tajweed, className: 'Quran Recitation (Tajweed)',
    authorUid: TEACHER.zainab.uid, authorName: TEACHER.zainab.name,
    createdAt: '2026-10-18T15:00:00.000Z', published: true,
  },
]

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('Seeding aim-academy-7fdae (test) with portal data...\n')

  // Classes
  for (const cls of classes) {
    const { id, ...data } = cls
    await db.collection('classes').doc(id).set(data)
    console.log(`  ✓ Class: ${cls.name}`)
  }

  // Students
  for (const stu of students) {
    const { id, ...data } = stu
    await db.collection('students').doc(id).set(data)
  }
  console.log(`  ✓ Students: ${students.length} seeded`)

  // Attendance
  for (const sess of attendance) {
    const { id, ...data } = sess
    await db.collection('attendance').doc(id).set(data)
  }
  console.log(`  ✓ Attendance: ${attendance.length} sessions seeded`)

  // Student Progress
  for (const prog of progress) {
    const { id, ...data } = prog
    await db.collection('studentProgress').doc(id).set(data)
  }
  console.log(`  ✓ Progress: ${progress.length} records seeded`)

  // Weekly Homework
  for (const hw of homework) {
    const { id, ...data } = hw
    await db.collection('weeklyHomework').doc(id).set(data)
  }
  console.log(`  ✓ Homework: ${homework.length} weekly records seeded`)

  // Quiz Results
  for (const quiz of quizResults) {
    const { id, ...data } = quiz
    await db.collection('quizResults').doc(id).set(data)
  }
  console.log(`  ✓ Quiz results: ${quizResults.length} records seeded`)

  // Announcements
  for (const ann of announcements) {
    const { id, ...data } = ann
    await db.collection('announcements').doc(id).set(data)
  }
  console.log(`  ✓ Announcements: ${announcements.length} seeded`)

  console.log('\nDone! Test environment is seeded.')
  console.log('\nNote: Teacher UIDs are fake seed values (seed_teacher_*)')
  console.log('      Classes appear for admin. Assign real teacher UIDs via Admin → Classes to test teacher login.\n')
  process.exit(0)
}

seed().catch(err => {
  console.error('Seed error:', err.message)
  process.exit(1)
})
