import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth as getAdminAuth } from 'firebase-admin/auth'
import cors from 'cors'
import * as https from 'https'
import * as nodemailer from 'nodemailer'

initializeApp()

const stripeSecret = defineSecret('STRIPE_SECRET_KEY')
const gmailUser = defineSecret('GMAIL_USER')
const gmailPass = defineSecret('GMAIL_PASS')
const corsMiddleware = cors({ origin: true })

function createStripePaymentIntent(
  secretKey: string,
  amount: number,
  currency: string,
  description?: string
): Promise<{ client_secret: string }> {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      amount: String(amount),
      currency,
      'automatic_payment_methods[enabled]': 'true',
    })
    if (description) params.append('description', description)

    const body = params.toString()

    const req = https.request(
      {
        hostname: 'api.stripe.com',
        port: 443,
        path: '/v1/payment_intents',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey.trim()}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            const json = JSON.parse(data) as { client_secret?: string; error?: { message?: string } }
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(json.error?.message ?? `Stripe HTTP ${res.statusCode}`))
            } else {
              resolve(json as { client_secret: string })
            }
          } catch {
            reject(new Error('Failed to parse Stripe response'))
          }
        })
      }
    )

    req.on('error', reject)
    req.setTimeout(20000, () => {
      req.destroy(new Error('Stripe request timed out'))
    })
    req.write(body)
    req.end()
  })
}

const TO_EMAIL = 'aimacademyva@gmail.com'

function sendEmail(opts: { user: string; pass: string; to: string; subject: string; html: string; replyTo?: string }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: opts.user, pass: opts.pass },
  })
  return transporter.sendMail({
    from: `AIM Academy <${opts.user}>`,
    to: opts.to,
    replyTo: opts.replyTo,
    subject: opts.subject,
    html: opts.html,
  })
}

export const submitContactForm = onRequest(
  { secrets: [gmailUser, gmailPass], timeoutSeconds: 30 },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' })
        return
      }

      const { name, phone, email, interests, message } = req.body as {
        name?: string
        phone?: string
        email?: string
        interests?: string[]
        message?: string
      }

      if (!name?.trim() || !phone?.trim() || !email?.trim()) {
        res.status(400).json({ error: 'name, phone, and email are required' })
        return
      }

      try {
        const db = getFirestore()
        await db.collection('contactSubmissions').add({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          interests: interests ?? [],
          message: message?.trim() ?? '',
          submittedAt: new Date().toISOString(),
        })

        const interestList = (interests ?? []).join(', ') || 'None selected'

        await sendEmail({
          user: gmailUser.value(),
          pass: gmailPass.value(),
          to: TO_EMAIL,
          replyTo: email.trim(),
          subject: `New contact form submission from ${name.trim()}`,
          html: `
            <p><strong>Name:</strong> ${name.trim()}</p>
            <p><strong>Phone:</strong> ${phone.trim()}</p>
            <p><strong>Email:</strong> ${email.trim()}</p>
            <p><strong>Interested in:</strong> ${interestList}</p>
            <p><strong>Message:</strong> ${message?.trim() || '(none)'}</p>
          `,
        })

        res.json({ success: true })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('Contact form error:', msg)
        res.status(500).json({ error: 'Failed to save submission' })
      }
    })
  }
)

export const createPaymentIntent = onRequest(
  { secrets: [stripeSecret], timeoutSeconds: 30 },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' })
        return
      }

      const payload = req.body?.data ?? req.body
      const { amount, currency = 'usd', description } = payload as {
        amount: number
        currency?: string
        description?: string
      }

      if (!amount || typeof amount !== 'number' || amount < 50) {
        res.status(400).json({ error: 'Amount must be a number ≥ 50 (cents)' })
        return
      }

      try {
        const paymentIntent = await createStripePaymentIntent(
          stripeSecret.value(),
          amount,
          currency,
          description
        )
        res.json({ clientSecret: paymentIntent.client_secret })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('Stripe error:', message)
        res.status(500).json({ error: message })
      }
    })
  }
)

// ── Role management (admin-only) ──────────────────────────────────────────────

const VALID_ROLES = ['admin', 'teacher', 'parent'] as const
type UserRole = typeof VALID_ROLES[number]

/** Change an existing user's role. Caller must have role === 'admin'. */
export const setUserRole = onCall(async (request) => {
  if (request.auth?.token?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can set user roles.')
  }
  const { uid, role } = request.data as { uid: string; role: UserRole }
  if (!uid || !VALID_ROLES.includes(role)) {
    throw new HttpsError('invalid-argument', 'uid and a valid role are required.')
  }
  await getAdminAuth().setCustomUserClaims(uid, { role })
  await getFirestore().collection('users').doc(uid).set({ role }, { merge: true })
  return { success: true }
})

/** Invite a new user by email with a role. Creates the account if needed and
 *  emails them a password-setup link. Caller must have role === 'admin'. */
export const inviteUser = onCall(
  { secrets: [gmailUser, gmailPass] },
  async (request) => {
    if (request.auth?.token?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Only admins can invite users.')
    }
    const { email, role, displayName } = request.data as {
      email: string
      role: UserRole
      displayName?: string
    }
    if (!email || !VALID_ROLES.includes(role)) {
      throw new HttpsError('invalid-argument', 'email and a valid role are required.')
    }

    // Create or fetch user
    let uid: string
    try {
      const existing = await getAdminAuth().getUserByEmail(email)
      uid = existing.uid
    } catch {
      const created = await getAdminAuth().createUser({
        email,
        displayName: displayName || undefined,
      })
      uid = created.uid
    }

    // Set custom claim
    await getAdminAuth().setCustomUserClaims(uid, { role })

    // Persist to users collection
    await getFirestore().collection('users').doc(uid).set({
      email,
      displayName: displayName || '',
      role,
      createdAt: new Date().toISOString(),
      invitedBy: request.auth.uid,
    }, { merge: true })

    // Generate password-reset link and email it
    const resetLink = await getAdminAuth().generatePasswordResetLink(email)
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1)

    try {
      await sendEmail({
        user: gmailUser.value(),
        pass: gmailPass.value(),
        to: email,
        subject: `You've been invited to AIM Academy as ${roleLabel}`,
        html: `
          <p>You have been invited to the <strong>Anas Ibn Malik Academy</strong> portal as a <strong>${roleLabel}</strong>.</p>
          <p><a href="${resetLink}">Click here to set your password and get started →</a></p>
          <p style="color:#888;font-size:12px;">This link expires in 1 hour.</p>
        `,
      })
    } catch (emailErr) {
      console.error('Invite email failed (user was still created):', emailErr)
    }

    return { success: true, resetLink }
  }
)

// ── Registration approval ─────────────────────────────────────────────────────

interface RegistrationChild {
  firstName: string
  lastName: string
  dateOfBirth?: string
  grade?: string
}

interface ClassAssignment {
  childIndex: number
  classIds: string[]
}

/** Delete a user from Auth and Firestore. Caller must have role === 'admin'. */
export const deleteUser = onCall(async (request) => {
  if (request.auth?.token?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can delete users.')
  }
  const { uid, deleteStudents = false } = request.data as { uid: string; deleteStudents?: boolean }
  if (!uid) throw new HttpsError('invalid-argument', 'uid is required.')

  const db = getFirestore()

  // Look up the user's email so we can clean up email-linked records
  const authUser = await getAdminAuth().getUser(uid)
  const email = authUser.email

  const cleanupOps: Promise<unknown>[] = [
    getAdminAuth().deleteUser(uid),
    db.collection('users').doc(uid).delete(),
    db.collection('registrations').doc(uid).delete(),
  ]

  if (email) {
    // Optionally delete student records
    if (deleteStudents) {
      const studentsSnap = await db.collection('students').where('parentEmail', '==', email).get()
      studentsSnap.docs.forEach(d => cleanupOps.push(d.ref.delete()))
    }
    // Always clean up pending child requests
    const crSnap = await db.collection('childRequests').where('parentEmail', '==', email).get()
    crSnap.docs.forEach(d => cleanupOps.push(d.ref.delete()))
  }
  const crUidSnap = await db.collection('childRequests').where('parentUid', '==', uid).get()
  crUidSnap.docs.forEach(d => cleanupOps.push(d.ref.delete()))

  await Promise.all(cleanupOps)
  return { success: true }
})

/** Approve a pending family registration. Sets parent role, creates students, sends welcome email. */
export const approveRegistration = onCall(
  { secrets: [gmailUser, gmailPass] },
  async (request) => {
    if (request.auth?.token?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Only admins can approve registrations.')
    }
    const { registrationId, classAssignments = [] } = request.data as {
      registrationId: string
      classAssignments: ClassAssignment[]
    }
    if (!registrationId) throw new HttpsError('invalid-argument', 'registrationId is required.')

    const db = getFirestore()
    const regRef = db.collection('registrations').doc(registrationId)
    const regDoc = await regRef.get()
    if (!regDoc.exists) throw new HttpsError('not-found', 'Registration not found.')

    const reg = regDoc.data()!
    const children: RegistrationChild[] = reg.children ?? []

    // Set parent role claim
    await getAdminAuth().setCustomUserClaims(registrationId, { role: 'parent' })

    // Upsert user record
    await db.collection('users').doc(registrationId).set({
      email: reg.email,
      displayName: reg.parentName,
      role: 'parent',
      createdAt: new Date().toISOString(),
      invitedBy: request.auth.uid,
    }, { merge: true })

    // Look up the current year default fee from the first assigned class
    let defaultTuitionAmount: number | null = null
    const allClassIds = classAssignments.flatMap(a => a.classIds ?? [])
    if (allClassIds.length > 0) {
      const classDoc = await db.collection('classes').doc(allClassIds[0]).get()
      if (classDoc.exists) {
        defaultTuitionAmount = classDoc.data()?.tuitionAmount ?? null
      }
    }

    // Create student records
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const assignment = classAssignments.find(a => a.childIndex === i)
      const classIds: string[] = assignment?.classIds ?? []

      // Reuse existing student record if name matches (preserves attendance history)
      const existingSnap = await db.collection('students')
        .where('parentEmail', '==', reg.email)
        .where('firstName', '==', child.firstName)
        .where('lastName', '==', child.lastName)
        .get()

      if (!existingSnap.empty) {
        const existing = existingSnap.docs[0]
        const updateData: Record<string, unknown> = {
          dateOfBirth: child.dateOfBirth ?? null,
          grade: child.grade ?? null,
          classIds,
          parentName: reg.parentName,
          parentPhone: reg.phone,
        }
        // Only set tuitionAmount if not already individually set
        if (!existing.data().tuitionAmount && defaultTuitionAmount) {
          updateData.tuitionAmount = defaultTuitionAmount
        }
        await existing.ref.update(updateData)
      } else {
        const studentId = Math.random().toString(36).slice(2)
        await db.collection('students').doc(studentId).set({
          firstName: child.firstName,
          lastName: child.lastName,
          dateOfBirth: child.dateOfBirth ?? null,
          grade: child.grade ?? null,
          classIds,
          tuitionAmount: defaultTuitionAmount ?? null,
          parentName: reg.parentName,
          parentEmail: reg.email,
          parentPhone: reg.phone,
          notes: '',
          createdAt: new Date().toISOString(),
        })
      }
    }

    // Mark registration approved
    await regRef.update({
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      reviewedBy: request.auth.uid,
    })

    // Send welcome email
    try {
      await sendEmail({
        user: gmailUser.value(),
        pass: gmailPass.value(),
        to: reg.email,
        subject: 'Your AIM Academy registration has been approved!',
        html: `
          <p>As-salamu alaykum <strong>${reg.parentName}</strong>,</p>
          <p>Your family registration with <strong>Anas Ibn Malik Academy</strong> has been approved!</p>
          <p><a href="https://aimava.org/portal/parent">Click here to access the Parent Portal →</a></p>
          <p style="color:#888;font-size:12px;">Jazak Allah khayran,<br>Anas Ibn Malik Academy</p>
        `,
      })
    } catch (emailErr) {
      console.error('Approval email failed (registration was still approved):', emailErr)
    }

    return { success: true }
  }
)

// ── Payment tracking ──────────────────────────────────────────────────────────

/** Mark or unmark a student's tuition payment for a given month. */
export const markPayment = onCall(async (request) => {
  if (request.auth?.token?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can mark payments.')
  }
  const { studentId, studentName, parentEmail, tuitionAmount, month, paid } = request.data as {
    studentId: string
    studentName: string
    parentEmail: string
    tuitionAmount: number
    month: string
    paid: boolean
  }
  if (!studentId || !month) {
    throw new HttpsError('invalid-argument', 'studentId and month are required.')
  }

  const db = getFirestore()
  const docId = `${studentId}__${month}`
  const paymentRef = db.collection('payments').doc(docId)

  if (paid) {
    await paymentRef.set({
      studentId,
      studentName,
      parentEmail,
      tuitionAmount,
      month,
      paidAt: new Date().toISOString(),
      markedByUid: request.auth.uid,
    })
  } else {
    await paymentRef.delete()
  }

  return { success: true }
})

/** Send tuition reminder emails to parents with unpaid students for a given month. */
export const sendPaymentReminders = onCall(
  { secrets: [gmailUser, gmailPass] },
  async (request) => {
    if (request.auth?.token?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Only admins can send payment reminders.')
    }
    const { month } = request.data as { month: string }
    if (!month) {
      throw new HttpsError('invalid-argument', 'month is required.')
    }

    const db = getFirestore()

    // Get all students with tuitionAmount > 0
    const studentsSnap = await db.collection('students').where('tuitionAmount', '>', 0).get()
    const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as {
      id: string
      firstName: string
      lastName: string
      parentEmail: string
      tuitionAmount: number
    }))

    // Get all payment docs for this month
    const paymentsSnap = await db.collection('payments').where('month', '==', month).get()
    const paidStudentIds = new Set(paymentsSnap.docs.map(d => (d.data() as { studentId: string }).studentId))

    // Find unpaid students
    const unpaidStudents = students.filter(s => !paidStudentIds.has(s.id))

    // Group by parentEmail
    const byParent = new Map<string, typeof unpaidStudents>()
    for (const student of unpaidStudents) {
      const email = student.parentEmail
      if (!email) continue
      if (!byParent.has(email)) byParent.set(email, [])
      byParent.get(email)!.push(student)
    }

    // Build month label (e.g. "October 2026")
    const [year, monthNum] = month.split('-')
    const monthLabel = new Date(Number(year), Number(monthNum) - 1, 1)
      .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    let emailsSent = 0
    for (const [parentEmail, children] of byParent) {
      const childList = children
        .map(c => `<li><strong>${c.firstName} ${c.lastName}</strong> — $${(c.tuitionAmount / 100).toFixed(2)}/mo</li>`)
        .join('\n')

      await sendEmail({
        user: gmailUser.value(),
        pass: gmailPass.value(),
        to: parentEmail,
        subject: `AIM Academy — Tuition Reminder for ${monthLabel}`,
        html: `
          <p>As-salamu alaykum,</p>
          <p>This is a friendly reminder that tuition for <strong>${monthLabel}</strong> has not yet been received for the following student(s):</p>
          <ul>${childList}</ul>
          <p>Please send payment via Zelle to <strong>aimacademyva@gmail.com</strong>.</p>
          <p>If you have already sent payment, please disregard this message. Jazak Allah khayran!</p>
          <p style="color:#888;font-size:12px;">Anas Ibn Malik Academy</p>
        `,
      })
      emailsSent++
    }

    return { success: true, emailsSent }
  }
)

// ── Attendance reminders ──────────────────────────────────────────────────────

/** Send attendance reminder emails to teachers who haven't submitted for the current week. */
export const sendAttendanceReminders = onCall(
  { secrets: [gmailUser, gmailPass] },
  async (request) => {
    if (request.auth?.token?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Only admins can send attendance reminders.')
    }
    const { classIds } = request.data as { classIds?: string[] }

    // Current week Monday–Sunday (ISO)
    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const mondayStr = monday.toISOString().split('T')[0]
    const sundayStr = sunday.toISOString().split('T')[0]
    const weekLabel = monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    const db = getFirestore()

    // Load classes (all or filtered)
    let classSnap
    if (classIds && classIds.length > 0) {
      const docs = await Promise.all(classIds.map(id => db.collection('classes').doc(id).get()))
      classSnap = { docs: docs.filter(d => d.exists) }
    } else {
      classSnap = await db.collection('classes').get()
    }

    // Group incomplete classes by teacherUid
    const byTeacher = new Map<string, { teacherName: string; classNames: string[] }>()

    await Promise.all(classSnap.docs.map(async classDoc => {
      const cls = classDoc.data() as { name: string; teacherUid: string; teacherName: string }
      if (!cls.teacherUid) return

      // Check if attendance was submitted this week
      const attSnap = await db.collection('attendance')
        .where('classId', '==', classDoc.id)
        .where('date', '>=', mondayStr)
        .where('date', '<=', sundayStr)
        .get()

      if (!attSnap.empty) return // already submitted

      if (!byTeacher.has(cls.teacherUid)) {
        byTeacher.set(cls.teacherUid, { teacherName: cls.teacherName, classNames: [] })
      }
      byTeacher.get(cls.teacherUid)!.classNames.push(cls.name)
    }))

    // Look up teacher emails and send
    let emailsSent = 0
    for (const [teacherUid, { teacherName, classNames }] of byTeacher) {
      const userDoc = await db.collection('users').doc(teacherUid).get()
      const teacherEmail = userDoc.data()?.email as string | undefined
      if (!teacherEmail) continue

      const classList = classNames.map(n => `<li><strong>${n}</strong></li>`).join('\n')
      const greeting = teacherName ? `Ustadh/Ustadha ${teacherName}` : 'Teacher'

      try {
        await sendEmail({
          user: gmailUser.value(),
          pass: gmailPass.value(),
          to: teacherEmail,
          subject: `Attendance Reminder — Week of ${weekLabel}`,
          html: `
            <p>As-salamu alaykum <strong>${greeting}</strong>,</p>
            <p>This is a friendly reminder that attendance has not yet been submitted for the week of <strong>${weekLabel}</strong> for the following class(es):</p>
            <ul>${classList}</ul>
            <p>Please log in to the Teacher Portal to submit attendance:</p>
            <p><a href="https://aimava.org/portal/teacher">Teacher Portal →</a></p>
            <p style="color:#888;font-size:12px;">Jazak Allah khayran,<br>Anas Ibn Malik Academy</p>
          `,
        })
        emailsSent++
      } catch (err) {
        console.error(`Failed to email ${teacherEmail}:`, err)
      }
    }

    return { success: true, emailsSent, teachersReminded: byTeacher.size }
  }
)

// ── Announcement notifications ────────────────────────────────────────────────

/** Email all parents in a class when a teacher posts an announcement. */
export const notifyAnnouncementParents = onCall(
  { secrets: [gmailUser, gmailPass] },
  async (request) => {
    const role = request.auth?.token?.role
    if (role !== 'admin' && role !== 'teacher') {
      throw new HttpsError('permission-denied', 'Only teachers and admins can send announcement notifications.')
    }
    const { classId, className, teacherName, title, body } = request.data as {
      classId: string
      className: string
      teacherName: string
      title: string
      body: string
    }
    if (!classId || !title) {
      throw new HttpsError('invalid-argument', 'classId and title are required.')
    }

    const db = getFirestore()
    const studentsSnap = await db.collection('students').where('classIds', 'array-contains', classId).get()

    // Collect unique parent emails
    const parentEmails = new Set<string>()
    for (const doc of studentsSnap.docs) {
      const email = (doc.data() as { parentEmail?: string }).parentEmail
      if (email) parentEmails.add(email)
    }

    if (parentEmails.size === 0) return { success: true, emailsSent: 0 }

    const teacherLabel = teacherName ? `Ustadh/Ustadha ${teacherName}` : 'Your teacher'
    const bodyHtml = body.replace(/\n/g, '<br>')

    let emailsSent = 0
    for (const parentEmail of parentEmails) {
      try {
        await sendEmail({
          user: gmailUser.value(),
          pass: gmailPass.value(),
          to: parentEmail,
          subject: `New Announcement — ${className}`,
          html: `
            <p>As-salamu alaykum,</p>
            <p>${teacherLabel} has posted a new announcement for <strong>${className}</strong>:</p>
            <div style="background:#f5f5f0;border-left:4px solid #7a9e7e;padding:12px 16px;margin:16px 0;border-radius:4px">
              <p style="margin:0 0 6px 0;font-weight:600">${title}</p>
              <p style="margin:0;color:#444">${bodyHtml}</p>
            </div>
            <p><a href="https://aimava.org/portal/parent">View in Parent Portal →</a></p>
            <p style="color:#888;font-size:12px;">Anas Ibn Malik Academy</p>
          `,
        })
        emailsSent++
      } catch (err) {
        console.error(`Failed to email ${parentEmail}:`, err)
      }
    }

    return { success: true, emailsSent }
  }
)

/** Reject a pending family registration with an optional reason. */
export const rejectRegistration = onCall(
  { secrets: [gmailUser, gmailPass] },
  async (request) => {
    if (request.auth?.token?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Only admins can reject registrations.')
    }
    const { registrationId, reason = '' } = request.data as {
      registrationId: string
      reason?: string
    }
    if (!registrationId) throw new HttpsError('invalid-argument', 'registrationId is required.')

    const db = getFirestore()
    const regRef = db.collection('registrations').doc(registrationId)
    const regDoc = await regRef.get()
    if (!regDoc.exists) throw new HttpsError('not-found', 'Registration not found.')

    const reg = regDoc.data()!

    await regRef.update({
      status: 'rejected',
      rejectReason: reason,
      reviewedAt: new Date().toISOString(),
      reviewedBy: request.auth.uid,
    })

    // Notify parent
    try {
      await sendEmail({
        user: gmailUser.value(),
        pass: gmailPass.value(),
        to: reg.email,
        subject: 'AIM Academy — Registration Update',
        html: `
          <p>As-salamu alaykum <strong>${reg.parentName}</strong>,</p>
          <p>We have reviewed your family registration with Anas Ibn Malik Academy.</p>
          ${reason ? `<p>Unfortunately, we are unable to approve your registration at this time.</p><p><strong>Reason:</strong> ${reason}</p>` : '<p>Unfortunately, we are unable to approve your registration at this time.</p>'}
          <p>Please contact us if you have any questions.</p>
          <p style="color:#888;font-size:12px;">Jazak Allah khayran,<br>Anas Ibn Malik Academy</p>
        `,
      })
    } catch (emailErr) {
      console.error('Rejection email failed (registration was still rejected):', emailErr)
    }

    return { success: true }
  }
)

// ── seedDatabase ──────────────────────────────────────────────────────────────
// Admin-only: writes realistic test data (classes, students, attendance, etc.)
// All documents use "seed_" prefixed IDs so they can be cleared without risk.

export const seedDatabase = onCall(
  { secrets: [] },
  async (request) => {
    const db = getFirestore()

    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in.')
    const callerDoc = await db.collection('users').doc(request.auth.uid).get()
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin only.')
    }

    const TEACHER = {
      ibrahim: { uid: 'seed_teacher_ibrahim', name: 'Ibrahim Khan' },
      zainab:  { uid: 'seed_teacher_zainab',  name: 'Zainab Malik' },
      ahmad:   { uid: 'seed_teacher_ahmad',   name: 'Ahmad Siddiqui' },
    }
    const CLS = {
      hifz:    'seed_cls_hifz',
      qaidah:  'seed_cls_qaidah',
      is3:     'seed_cls_is3',
      tajweed: 'seed_cls_tajweed',
    }

    const classes = [
      { id: CLS.hifz,    name: 'Hifz',                       description: 'Quran memorization for advanced students',                            teacherUid: TEACHER.ibrahim.uid, teacherName: TEACHER.ibrahim.name, schedule: 'Saturday 9:00am–11:00am',   tuitionAmount: 15000, nextReportDeadline: '2026-11-07', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: CLS.qaidah,  name: "Noorani Qa'idah",            description: "Foundational Arabic reading using the Noorani Qa'idah method",        teacherUid: TEACHER.zainab.uid,  teacherName: TEACHER.zainab.name,  schedule: 'Saturday 11:00am–12:30pm', tuitionAmount: 12000, nextReportDeadline: '2026-11-14', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: CLS.is3,     name: 'Islamic Studies Grade 3',    description: 'Aqeedah, Fiqh, Seerah, and Akhlaq for Grade 3 students',             teacherUid: TEACHER.ahmad.uid,   teacherName: TEACHER.ahmad.name,   schedule: 'Saturday 12:30pm–2:00pm',  tuitionAmount: 12000,                                  createdAt: '2026-09-01T00:00:00.000Z' },
      { id: CLS.tajweed, name: 'Quran Recitation (Tajweed)', description: 'Quran recitation with proper Tajweed rules for intermediate students', teacherUid: TEACHER.zainab.uid,  teacherName: TEACHER.zainab.name,  schedule: 'Saturday 2:00pm–3:30pm',   tuitionAmount: 14000,                                  createdAt: '2026-09-01T00:00:00.000Z' },
    ]

    const students = [
      { id: 'seed_stu_omar',    firstName: 'Omar',     lastName: 'Abdullah',  classIds: [CLS.hifz],    tuitionAmount: 15000, parentName: 'Khalid Abdullah',  parentEmail: 'khalid.abdullah@seedtest.com', parentPhone: '(571) 555-0101' },
      { id: 'seed_stu_aisha',   firstName: 'Aisha',    lastName: 'Rahman',    classIds: [CLS.hifz],    tuitionAmount: 15000, parentName: 'Hassan Rahman',    parentEmail: 'hassan.rahman@seedtest.com',   parentPhone: '(571) 555-0102' },
      { id: 'seed_stu_yusuf',   firstName: 'Yusuf',    lastName: 'Al-Amin',   classIds: [CLS.hifz],    tuitionAmount: 15000, parentName: 'Bilal Al-Amin',    parentEmail: 'bilal.alamin@seedtest.com',    parentPhone: '(571) 555-0103' },
      { id: 'seed_stu_maryam',  firstName: 'Maryam',   lastName: 'Hossain',   classIds: [CLS.hifz],    tuitionAmount: 15000, parentName: 'Tariq Hossain',    parentEmail: 'tariq.hossain@seedtest.com',   parentPhone: '(571) 555-0104' },
      { id: 'seed_stu_zayd',    firstName: 'Zayd',     lastName: 'Nasser',    classIds: [CLS.qaidah],  tuitionAmount: 12000, parentName: 'Amira Nasser',     parentEmail: 'amira.nasser@seedtest.com',    parentPhone: '(571) 555-0201' },
      { id: 'seed_stu_fatima',  firstName: 'Fatima',   lastName: 'Osman',     classIds: [CLS.qaidah],  tuitionAmount: 12000, parentName: 'Yusuf Osman',      parentEmail: 'yusuf.osman@seedtest.com',     parentPhone: '(571) 555-0202' },
      { id: 'seed_stu_ibrahim', firstName: 'Ibrahim',  lastName: 'Malik',     classIds: [CLS.qaidah],  tuitionAmount: 12000, parentName: 'Layla Malik',      parentEmail: 'layla.malik@seedtest.com',     parentPhone: '(571) 555-0203' },
      { id: 'seed_stu_khadija', firstName: 'Khadijah', lastName: 'Hussain',   classIds: [CLS.qaidah],  tuitionAmount: 12000, parentName: 'Ahmed Hussain',    parentEmail: 'ahmed.hussain@seedtest.com',   parentPhone: '(571) 555-0204' },
      { id: 'seed_stu_ali',     firstName: 'Ali',      lastName: 'Karimi',    classIds: [CLS.qaidah],  tuitionAmount: 12000, parentName: 'Sara Karimi',      parentEmail: 'sara.karimi@seedtest.com',     parentPhone: '(571) 555-0205' },
      { id: 'seed_stu_sara',    firstName: 'Sara',     lastName: 'Ahmed',     classIds: [CLS.is3],     tuitionAmount: 12000, parentName: 'Nadia Ahmed',      parentEmail: 'nadia.ahmed@seedtest.com',     parentPhone: '(571) 555-0301' },
      { id: 'seed_stu_hassan',  firstName: 'Hassan',   lastName: 'Qureshi',   classIds: [CLS.is3],     tuitionAmount: 12000, parentName: 'Imran Qureshi',    parentEmail: 'imran.qureshi@seedtest.com',   parentPhone: '(571) 555-0302' },
      { id: 'seed_stu_zainab',  firstName: 'Zainab',   lastName: 'Farooq',    classIds: [CLS.is3],     tuitionAmount: 12000, parentName: 'Khalid Farooq',    parentEmail: 'khalid.farooq@seedtest.com',   parentPhone: '(571) 555-0303' },
      { id: 'seed_stu_adam',    firstName: 'Adam',     lastName: 'Nasir',     classIds: [CLS.is3],     tuitionAmount: 12000, parentName: 'Rania Nasir',      parentEmail: 'rania.nasir@seedtest.com',     parentPhone: '(571) 555-0304' },
      { id: 'seed_stu_noor',    firstName: 'Noor',     lastName: 'Siddiqui',  classIds: [CLS.tajweed], tuitionAmount: 14000, parentName: 'Amna Siddiqui',    parentEmail: 'amna.siddiqui@seedtest.com',   parentPhone: '(571) 555-0401' },
      { id: 'seed_stu_bilal',   firstName: 'Bilal',    lastName: 'Chaudhry',  classIds: [CLS.tajweed], tuitionAmount: 14000, parentName: 'Zara Chaudhry',    parentEmail: 'zara.chaudhry@seedtest.com',   parentPhone: '(571) 555-0402' },
      { id: 'seed_stu_hana',    firstName: 'Hana',     lastName: 'Al-Rashid', classIds: [CLS.tajweed], tuitionAmount: 14000, parentName: 'Faisal Al-Rashid', parentEmail: 'faisal.alrashid@seedtest.com', parentPhone: '(571) 555-0403' },
      { id: 'seed_stu_umar',    firstName: 'Umar',     lastName: 'Patel',     classIds: [CLS.tajweed], tuitionAmount: 14000, parentName: 'Safia Patel',      parentEmail: 'safia.patel@seedtest.com',     parentPhone: '(571) 555-0404' },
    ].map(s => ({ ...s, notes: '', createdAt: '2026-09-01T00:00:00.000Z' }))

    const hifzStus    = students.filter(s => s.classIds.includes(CLS.hifz))
    const qaidahStus  = students.filter(s => s.classIds.includes(CLS.qaidah))
    const is3Stus     = students.filter(s => s.classIds.includes(CLS.is3))
    const tajweedStus = students.filter(s => s.classIds.includes(CLS.tajweed))

    function mkSession(classId: string, date: string, stuList: typeof students, presentIds: string[]) {
      return {
        classId, date,
        records: stuList.map(s => ({
          studentId: s.id,
          studentName: `${s.firstName} ${s.lastName}`,
          status: presentIds.includes(s.id) ? 'present' : 'absent',
        })),
        createdBy: classes.find(c => c.id === classId)?.teacherUid ?? '',
        createdAt: `${date}T10:00:00.000Z`,
      }
    }

    const attendance = [
      { id: `${CLS.hifz}_2026-10-11`,    ...mkSession(CLS.hifz,    '2026-10-11', hifzStus,    ['seed_stu_omar','seed_stu_aisha','seed_stu_yusuf']) },
      { id: `${CLS.hifz}_2026-10-18`,    ...mkSession(CLS.hifz,    '2026-10-18', hifzStus,    ['seed_stu_omar','seed_stu_aisha','seed_stu_yusuf','seed_stu_maryam']) },
      { id: `${CLS.hifz}_2026-10-25`,    ...mkSession(CLS.hifz,    '2026-10-25', hifzStus,    ['seed_stu_aisha','seed_stu_yusuf','seed_stu_maryam']) },
      { id: `${CLS.qaidah}_2026-10-11`,  ...mkSession(CLS.qaidah,  '2026-10-11', qaidahStus,  ['seed_stu_zayd','seed_stu_fatima','seed_stu_ibrahim','seed_stu_khadija']) },
      { id: `${CLS.qaidah}_2026-10-18`,  ...mkSession(CLS.qaidah,  '2026-10-18', qaidahStus,  ['seed_stu_zayd','seed_stu_fatima','seed_stu_ibrahim','seed_stu_khadija','seed_stu_ali']) },
      { id: `${CLS.qaidah}_2026-10-25`,  ...mkSession(CLS.qaidah,  '2026-10-25', qaidahStus,  ['seed_stu_zayd','seed_stu_fatima','seed_stu_khadija','seed_stu_ali']) },
      { id: `${CLS.is3}_2026-10-11`,     ...mkSession(CLS.is3,     '2026-10-11', is3Stus,     ['seed_stu_sara','seed_stu_hassan','seed_stu_zainab']) },
      { id: `${CLS.is3}_2026-10-18`,     ...mkSession(CLS.is3,     '2026-10-18', is3Stus,     ['seed_stu_sara','seed_stu_hassan','seed_stu_zainab','seed_stu_adam']) },
      { id: `${CLS.is3}_2026-10-25`,     ...mkSession(CLS.is3,     '2026-10-25', is3Stus,     ['seed_stu_sara','seed_stu_zainab','seed_stu_adam']) },
      { id: `${CLS.tajweed}_2026-10-11`, ...mkSession(CLS.tajweed, '2026-10-11', tajweedStus, ['seed_stu_noor','seed_stu_bilal','seed_stu_hana','seed_stu_umar']) },
      { id: `${CLS.tajweed}_2026-10-18`, ...mkSession(CLS.tajweed, '2026-10-18', tajweedStus, ['seed_stu_noor','seed_stu_hana','seed_stu_umar']) },
      { id: `${CLS.tajweed}_2026-10-25`, ...mkSession(CLS.tajweed, '2026-10-25', tajweedStus, ['seed_stu_noor','seed_stu_bilal','seed_stu_hana','seed_stu_umar']) },
    ]

    const progress = [
      { id: `${CLS.hifz}__seed_stu_omar`,      classId: CLS.hifz,    studentId: 'seed_stu_omar',    quranPosition: 'Surah Al-Mulk (67), Ayah 18',        qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 5', notes: 'Strong memorization, needs to work on tajweed',       updatedAt: '2026-10-25T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid },
      { id: `${CLS.hifz}__seed_stu_aisha`,     classId: CLS.hifz,    studentId: 'seed_stu_aisha',   quranPosition: 'Surah Al-Qalam (68), Ayah 5',         qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 5', notes: 'Excellent progress, ahead of schedule',               updatedAt: '2026-10-25T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid },
      { id: `${CLS.hifz}__seed_stu_yusuf`,     classId: CLS.hifz,    studentId: 'seed_stu_yusuf',   quranPosition: 'Surah Al-Haqqah (69), Ayah 1',        qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 5', notes: 'Good retention, occasional pronunciation errors',      updatedAt: '2026-10-18T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid },
      { id: `${CLS.hifz}__seed_stu_maryam`,    classId: CLS.hifz,    studentId: 'seed_stu_maryam',  quranPosition: 'Surah Al-Maarij (70), Ayah 10',       qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 4', notes: 'Needs more revision of Juz 29',                        updatedAt: '2026-10-25T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid },
      { id: `${CLS.qaidah}__seed_stu_zayd`,    classId: CLS.qaidah,  studentId: 'seed_stu_zayd',    quranPosition: '',                                     qaidahPosition: "Noorani Qa'idah Page 18", islamicStudiesLevel: 'Grade 1', notes: 'Good progress, needs practice with compound letters', updatedAt: '2026-10-25T12:00:00.000Z', updatedBy: TEACHER.zainab.uid },
      { id: `${CLS.qaidah}__seed_stu_fatima`,  classId: CLS.qaidah,  studentId: 'seed_stu_fatima',  quranPosition: '',                                     qaidahPosition: "Noorani Qa'idah Page 22", islamicStudiesLevel: 'Grade 2', notes: 'Excellent, ahead of class',                          updatedAt: '2026-10-25T12:00:00.000Z', updatedBy: TEACHER.zainab.uid },
      { id: `${CLS.qaidah}__seed_stu_ibrahim`, classId: CLS.qaidah,  studentId: 'seed_stu_ibrahim', quranPosition: '',                                     qaidahPosition: "Noorani Qa'idah Page 14", islamicStudiesLevel: 'Grade 1', notes: 'Slow but steady, extra practice recommended',         updatedAt: '2026-10-18T12:00:00.000Z', updatedBy: TEACHER.zainab.uid },
      { id: `${CLS.qaidah}__seed_stu_khadija`, classId: CLS.qaidah,  studentId: 'seed_stu_khadija', quranPosition: '',                                     qaidahPosition: "Noorani Qa'idah Page 20", islamicStudiesLevel: 'Grade 2', notes: 'Good, tanween still needs work',                       updatedAt: '2026-10-25T12:00:00.000Z', updatedBy: TEACHER.zainab.uid },
      { id: `${CLS.qaidah}__seed_stu_ali`,     classId: CLS.qaidah,  studentId: 'seed_stu_ali',     quranPosition: '',                                     qaidahPosition: "Noorani Qa'idah Page 16", islamicStudiesLevel: 'Grade 1', notes: 'Needs encouragement, making progress',                 updatedAt: '2026-10-25T12:00:00.000Z', updatedBy: TEACHER.zainab.uid },
      { id: `${CLS.is3}__seed_stu_sara`,       classId: CLS.is3,     studentId: 'seed_stu_sara',    quranPosition: 'Surah Al-Fatiha — Memorized',          qaidahPosition: "Qa'idah Complete", islamicStudiesLevel: 'Grade 3, Chapter 4', notes: 'Strong student, participates well',        updatedAt: '2026-10-25T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid },
      { id: `${CLS.is3}__seed_stu_hassan`,     classId: CLS.is3,     studentId: 'seed_stu_hassan',  quranPosition: 'Surah Al-Fatiha — Memorized',          qaidahPosition: "Qa'idah Complete", islamicStudiesLevel: 'Grade 3, Chapter 3', notes: 'Needs help with Salah chapter',            updatedAt: '2026-10-25T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid },
      { id: `${CLS.is3}__seed_stu_zainab`,     classId: CLS.is3,     studentId: 'seed_stu_zainab',  quranPosition: 'Surah Al-Ikhlas — Memorized',          qaidahPosition: "Qa'idah Page 30",  islamicStudiesLevel: 'Grade 3, Chapter 4', notes: 'Very attentive and asks great questions',  updatedAt: '2026-10-18T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid },
      { id: `${CLS.is3}__seed_stu_adam`,       classId: CLS.is3,     studentId: 'seed_stu_adam',    quranPosition: 'Surah Al-Fatiha — Memorized',          qaidahPosition: "Qa'idah Page 25",  islamicStudiesLevel: 'Grade 3, Chapter 3', notes: 'Improving steadily',                       updatedAt: '2026-10-25T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid },
      { id: `${CLS.tajweed}__seed_stu_noor`,   classId: CLS.tajweed, studentId: 'seed_stu_noor',    quranPosition: 'Surah Yaseen — Ikhfa rules',           qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 4', notes: 'Beautiful recitation, almost ready for Juz 1 review', updatedAt: '2026-10-25T14:30:00.000Z', updatedBy: TEACHER.zainab.uid },
      { id: `${CLS.tajweed}__seed_stu_bilal`,  classId: CLS.tajweed, studentId: 'seed_stu_bilal',   quranPosition: 'Surah Al-Baqarah — Idgham rules',      qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 4', notes: 'Working on Idgham, good overall',                     updatedAt: '2026-10-25T14:30:00.000Z', updatedBy: TEACHER.zainab.uid },
      { id: `${CLS.tajweed}__seed_stu_hana`,   classId: CLS.tajweed, studentId: 'seed_stu_hana',    quranPosition: 'Surah Al-Imran — Qalqalah practice',   qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 3', notes: 'Qalqalah improving, consistent effort',               updatedAt: '2026-10-18T14:30:00.000Z', updatedBy: TEACHER.zainab.uid },
      { id: `${CLS.tajweed}__seed_stu_umar`,   classId: CLS.tajweed, studentId: 'seed_stu_umar',    quranPosition: 'Surah An-Nisa — Madd rules',           qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 4', notes: 'Strong madd pronunciation, keep it up',               updatedAt: '2026-10-25T14:30:00.000Z', updatedBy: TEACHER.zainab.uid },
    ]

    const homework = [
      { id: `${CLS.is3}__2026-W42`,     classId: CLS.is3,     week: '2026-W42', completed: { seed_stu_sara: true,  seed_stu_hassan: false, seed_stu_zainab: true,  seed_stu_adam: true  }, updatedAt: '2026-10-18T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid },
      { id: `${CLS.is3}__2026-W43`,     classId: CLS.is3,     week: '2026-W43', completed: { seed_stu_sara: true,  seed_stu_hassan: true,  seed_stu_zainab: true,  seed_stu_adam: false }, updatedAt: '2026-10-25T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid },
      { id: `${CLS.hifz}__2026-W42`,    classId: CLS.hifz,    week: '2026-W42', completed: { seed_stu_omar: true,  seed_stu_aisha: true,   seed_stu_yusuf: true,   seed_stu_maryam: false }, updatedAt: '2026-10-18T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid },
      { id: `${CLS.hifz}__2026-W43`,    classId: CLS.hifz,    week: '2026-W43', completed: { seed_stu_omar: true,  seed_stu_aisha: true,   seed_stu_yusuf: false,  seed_stu_maryam: true }, updatedAt: '2026-10-25T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid },
      { id: `${CLS.tajweed}__2026-W42`, classId: CLS.tajweed, week: '2026-W42', completed: { seed_stu_noor: true,  seed_stu_bilal: true,   seed_stu_hana: false,   seed_stu_umar: true  }, updatedAt: '2026-10-18T14:30:00.000Z', updatedBy: TEACHER.zainab.uid },
      { id: `${CLS.tajweed}__2026-W43`, classId: CLS.tajweed, week: '2026-W43', completed: { seed_stu_noor: true,  seed_stu_bilal: false,  seed_stu_hana: true,    seed_stu_umar: true  }, updatedAt: '2026-10-25T14:30:00.000Z', updatedBy: TEACHER.zainab.uid },
    ]

    const quizResults = [
      { id: `${CLS.is3}__2026-10`,  classId: CLS.is3,  month: '2026-10', maxScore: 20, scores: { seed_stu_sara: 18, seed_stu_hassan: 14, seed_stu_zainab: 19, seed_stu_adam: 16 }, updatedAt: '2026-10-25T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid },
      { id: `${CLS.hifz}__2026-10`, classId: CLS.hifz, month: '2026-10', maxScore: 10, scores: { seed_stu_omar: 9,  seed_stu_aisha: 10,  seed_stu_yusuf: 8,  seed_stu_maryam: 7  }, updatedAt: '2026-10-25T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid },
    ]

    const announcements = [
      { id: 'seed_ann_hifz_1',    title: 'Juz 29 Revision This Saturday',        body: "As-salamu alaykum dear parents,\n\nThis Saturday we will be doing a full revision of Juz 29.", classId: CLS.hifz,    className: 'Hifz',                       authorUid: TEACHER.ibrahim.uid, authorName: TEACHER.ibrahim.name, createdAt: '2026-10-22T10:00:00.000Z', published: true },
      { id: 'seed_ann_hifz_2',    title: 'Mid-Year Progress Reports — Nov 7',    body: "As-salamu alaykum,\n\nProgress reports for the Hifz class are due by November 7th.",          classId: CLS.hifz,    className: 'Hifz',                       authorUid: TEACHER.ibrahim.uid, authorName: TEACHER.ibrahim.name, createdAt: '2026-10-15T10:00:00.000Z', published: true },
      { id: 'seed_ann_qaidah_1',  title: "Practice Letters 10–15 This Week",     body: "As-salamu alaykum,\n\nWe covered letters 10–15 in the Noorani Qa'idah this Saturday.",         classId: CLS.qaidah,  className: "Noorani Qa'idah",            authorUid: TEACHER.zainab.uid,  authorName: TEACHER.zainab.name,  createdAt: '2026-10-25T13:00:00.000Z', published: true },
      { id: 'seed_ann_qaidah_2',  title: 'Class Starting 15 Minutes Late Nov 1', body: "As-salamu alaykum,\n\nThe Noorani Qa'idah class on November 1st will start at 11:15am.",       classId: CLS.qaidah,  className: "Noorani Qa'idah",            authorUid: TEACHER.zainab.uid,  authorName: TEACHER.zainab.name,  createdAt: '2026-10-20T09:00:00.000Z', published: true },
      { id: 'seed_ann_is3_1',     title: 'Chapter 4 Quiz Next Saturday',         body: "As-salamu alaykum,\n\nWe will have a short quiz on Chapter 4 (The Five Pillars) next Saturday.", classId: CLS.is3,     className: 'Islamic Studies Grade 3',    authorUid: TEACHER.ahmad.uid,   authorName: TEACHER.ahmad.name,   createdAt: '2026-10-21T12:00:00.000Z', published: true },
      { id: 'seed_ann_tajweed_1', title: 'Ikhfa and Idgham Review',              body: "As-salamu alaykum dear parents,\n\nThis week we focused on Ikhfa and Idgham rules.",             classId: CLS.tajweed, className: 'Quran Recitation (Tajweed)', authorUid: TEACHER.zainab.uid,  authorName: TEACHER.zainab.name,  createdAt: '2026-10-25T15:00:00.000Z', published: true },
      { id: 'seed_ann_tajweed_2', title: 'No Class on November 8th',             body: "As-salamu alaykum,\n\nNo Tajweed class on November 8th due to a community event. Resumes Nov 15.", classId: CLS.tajweed, className: 'Quran Recitation (Tajweed)', authorUid: TEACHER.zainab.uid,  authorName: TEACHER.zainab.name,  createdAt: '2026-10-18T15:00:00.000Z', published: true },
    ]

    // Write in batches (Firestore limit: 500 ops per batch)
    const allDocs = [
      ...classes.map(({ id, ...d }) => ({ col: 'classes', id, data: d })),
      ...students.map(({ id, ...d }) => ({ col: 'students', id, data: d })),
      ...attendance.map(({ id, ...d }) => ({ col: 'attendance', id, data: d })),
      ...progress.map(({ id, ...d }) => ({ col: 'studentProgress', id, data: d })),
      ...homework.map(({ id, ...d }) => ({ col: 'weeklyHomework', id, data: d })),
      ...quizResults.map(({ id, ...d }) => ({ col: 'quizResults', id, data: d })),
      ...announcements.map(({ id, ...d }) => ({ col: 'announcements', id, data: d })),
    ]
    const batch = db.batch()
    for (const { col, id, data } of allDocs) batch.set(db.collection(col).doc(id), data)
    await batch.commit()

    return {
      success: true,
      counts: {
        classes: classes.length,
        students: students.length,
        attendance: attendance.length,
        progress: progress.length,
        homework: homework.length,
        quizResults: quizResults.length,
        announcements: announcements.length,
      },
    }
  }
)

// ── clearSeedData ─────────────────────────────────────────────────────────────
// Admin-only: deletes all documents whose ID starts with "seed_"

export const clearSeedData = onCall(
  { secrets: [] },
  async (request) => {
    const db = getFirestore()

    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in.')
    const callerDoc = await db.collection('users').doc(request.auth.uid).get()
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin only.')
    }

    const collections = ['classes', 'students', 'attendance', 'studentProgress', 'weeklyHomework', 'quizResults', 'announcements', 'missedWork']
    let deleted = 0
    for (const col of collections) {
      const snap = await db.collection(col).get()
      const seedDocs = snap.docs.filter(d => d.id.startsWith('seed_'))
      if (seedDocs.length > 0) {
        const batch = db.batch()
        for (const d of seedDocs) batch.delete(d.ref)
        await batch.commit()
        deleted += seedDocs.length
      }
    }

    return { success: true, deleted }
  }
)
