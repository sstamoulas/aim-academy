import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
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
