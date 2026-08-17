import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { initializeApp } from 'firebase-admin/app'
import cors from 'cors'
import * as https from 'https'

initializeApp()

const stripeSecret = defineSecret('STRIPE_SECRET_KEY')
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
