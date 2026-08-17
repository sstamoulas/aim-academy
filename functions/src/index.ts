import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { initializeApp } from 'firebase-admin/app'
import cors from 'cors'

initializeApp()

const stripeSecret = defineSecret('STRIPE_SECRET_KEY')
const corsMiddleware = cors({ origin: true })

export const createPaymentIntent = onRequest(
  { secrets: [stripeSecret] },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' })
        return
      }

      // Support both direct POST body and Firebase callable {data:{}} wrapper
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

      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(stripeSecret.value())

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        description,
        automatic_payment_methods: { enabled: true },
      })

      res.json({ clientSecret: paymentIntent.client_secret })
    })
  }
)
