import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { initializeApp } from 'firebase-admin/app'

initializeApp()

const stripeSecret = defineSecret('STRIPE_SECRET_KEY')

export const createPaymentIntent = onCall(
  { secrets: [stripeSecret] },
  async (request) => {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeSecret.value())

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
  }
)
