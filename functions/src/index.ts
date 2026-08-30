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
const gmailAppPassword = defineSecret('GMAIL_APP_PASSWORD')
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

const GMAIL_USER = 'aimacademyva@gmail.com'

export const submitContactForm = onRequest(
  { secrets: [gmailAppPassword], timeoutSeconds: 30 },
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

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: GMAIL_USER, pass: gmailAppPassword.value() },
        })

        const interestList = (interests ?? []).join(', ') || 'None selected'

        await transporter.sendMail({
          from: `"AIM Academy Website" <${GMAIL_USER}>`,
          to: GMAIL_USER,
          replyTo: email.trim(),
          subject: `New contact form submission from ${name.trim()}`,
          text: [
            `Name: ${name.trim()}`,
            `Phone: ${phone.trim()}`,
            `Email: ${email.trim()}`,
            `Interested in: ${interestList}`,
            `Message: ${message?.trim() || '(none)'}`,
          ].join('\n'),
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
  { secrets: [gmailAppPassword] },
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

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: gmailAppPassword.value() },
    })

    await transporter.sendMail({
      from: `"Anas Ibn Malik Academy" <${GMAIL_USER}>`,
      to: email,
      subject: `You've been invited to AIM Academy as ${roleLabel}`,
      text: [
        `You have been invited to the Anas Ibn Malik Academy portal as a ${roleLabel}.`,
        '',
        'Click the link below to set your password and get started:',
        resetLink,
        '',
        'This link expires in 1 hour.',
      ].join('\n'),
      html: `
        <p>You have been invited to the <strong>Anas Ibn Malik Academy</strong> portal as a <strong>${roleLabel}</strong>.</p>
        <p><a href="${resetLink}">Click here to set your password and get started →</a></p>
        <p style="color:#888;font-size:12px;">This link expires in 1 hour.</p>
      `,
    })

    return { success: true }
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

/** Approve a pending family registration. Sets parent role, creates students, sends welcome email. */
export const approveRegistration = onCall(
  { secrets: [gmailAppPassword] },
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

    // Create student records
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const assignment = classAssignments.find(a => a.childIndex === i)
      const classIds: string[] = assignment?.classIds ?? []
      const studentId = Math.random().toString(36).slice(2)
      await db.collection('students').doc(studentId).set({
        firstName: child.firstName,
        lastName: child.lastName,
        dateOfBirth: child.dateOfBirth ?? null,
        grade: child.grade ?? null,
        classIds,
        parentName: reg.parentName,
        parentEmail: reg.email,
        parentPhone: reg.phone,
        notes: '',
        createdAt: new Date().toISOString(),
      })
    }

    // Mark registration approved
    await regRef.update({
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      reviewedBy: request.auth.uid,
    })

    // Send welcome email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: gmailAppPassword.value() },
    })

    await transporter.sendMail({
      from: `"Anas Ibn Malik Academy" <${GMAIL_USER}>`,
      to: reg.email,
      subject: 'Your AIM Academy registration has been approved!',
      text: `As-salamu alaykum ${reg.parentName},\n\nYour family registration with Anas Ibn Malik Academy has been approved!\n\nYou can now access the Parent Portal at https://aimava.org/portal/parent\n\nJazak Allah khayran,\nAnas Ibn Malik Academy`,
      html: `
        <p>As-salamu alaykum <strong>${reg.parentName}</strong>,</p>
        <p>Your family registration with <strong>Anas Ibn Malik Academy</strong> has been approved!</p>
        <p><a href="https://aimava.org/portal/parent">Click here to access the Parent Portal →</a></p>
        <p style="color:#888;font-size:12px;">Jazak Allah khayran,<br>Anas Ibn Malik Academy</p>
      `,
    })

    return { success: true }
  }
)

/** Reject a pending family registration with an optional reason. */
export const rejectRegistration = onCall(
  { secrets: [gmailAppPassword] },
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
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: gmailAppPassword.value() },
    })

    await transporter.sendMail({
      from: `"Anas Ibn Malik Academy" <${GMAIL_USER}>`,
      to: reg.email,
      subject: 'AIM Academy — Registration Update',
      text: [
        `As-salamu alaykum ${reg.parentName},`,
        '',
        'We have reviewed your family registration with Anas Ibn Malik Academy.',
        reason ? `Unfortunately, we are unable to approve your registration at this time.\n\nReason: ${reason}` : 'Unfortunately, we are unable to approve your registration at this time.',
        '',
        'Please contact us if you have any questions.',
        '',
        'Jazak Allah khayran,\nAnas Ibn Malik Academy',
      ].join('\n'),
    })

    return { success: true }
  }
)
