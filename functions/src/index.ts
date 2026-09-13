import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth as getAdminAuth } from 'firebase-admin/auth'
import cors from 'cors'
import * as https from 'https'
import { Resend } from 'resend'

initializeApp()

const stripeSecret = defineSecret('STRIPE_SECRET_KEY')
const resendApiKey = defineSecret('RESEND_API_KEY')
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

const FROM_EMAIL = 'AIM Academy <noreply@aimava.org>'
const TO_EMAIL = 'aimacademyva@gmail.com'

export const submitContactForm = onRequest(
  { secrets: [resendApiKey], timeoutSeconds: 30 },
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

        const resend = new Resend(resendApiKey.value())
        const interestList = (interests ?? []).join(', ') || 'None selected'

        await resend.emails.send({
          from: FROM_EMAIL,
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
  { secrets: [resendApiKey] },
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
      const resend = new Resend(resendApiKey.value())
      await resend.emails.send({
        from: FROM_EMAIL,
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
  const { uid } = request.data as { uid: string }
  if (!uid) throw new HttpsError('invalid-argument', 'uid is required.')

  const db = getFirestore()
  await Promise.all([
    getAdminAuth().deleteUser(uid),
    db.collection('users').doc(uid).delete(),
  ])
  return { success: true }
})

/** Approve a pending family registration. Sets parent role, creates students, sends welcome email. */
export const approveRegistration = onCall(
  { secrets: [resendApiKey] },
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
    try {
      const resend = new Resend(resendApiKey.value())
      await resend.emails.send({
        from: FROM_EMAIL,
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

/** Reject a pending family registration with an optional reason. */
export const rejectRegistration = onCall(
  { secrets: [resendApiKey] },
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
      const resend = new Resend(resendApiKey.value())
      await resend.emails.send({
        from: FROM_EMAIL,
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
