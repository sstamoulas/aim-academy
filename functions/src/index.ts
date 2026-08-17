import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'
import Stripe from 'stripe'

initializeApp()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export const createPaymentIntent = onCall(async (request) => {
  const { amount, currency = 'usd', description } = request.data as {
    amount: number
    currency?: string
    description?: string
  }

  if (!amount || typeof amount !== 'number' || amount < 50) {
    throw new HttpsError('invalid-argument', 'Amount must be a number ≥ 50 (cents)')
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    description,
    automatic_payment_methods: { enabled: true },
  })

  return { clientSecret: paymentIntent.client_secret }
})
