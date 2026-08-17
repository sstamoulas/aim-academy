import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../firebase'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
const functions = getFunctions(app)
const createPaymentIntent = httpsCallable<
  { amount: number; currency: string; description: string },
  { clientSecret: string }
>(functions, 'createPaymentIntent')

// ── Inner checkout form ──────────────────────────────────────────────────────

function CheckoutForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)
    setError(null)

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message ?? 'Something went wrong.')
      setProcessing(false)
      return
    }

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    })

    if (result.error) {
      setError(result.error.message ?? 'Payment failed.')
      setProcessing(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        options={{
          layout: 'tabs',
          wallets: { applePay: 'auto', googlePay: 'auto' },
        }}
      />
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>
      )}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-stone-300 text-stone-600 font-semibold py-3 rounded-full hover:bg-stone-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 bg-sage-600 hover:bg-sage-700 disabled:opacity-50 text-white font-bold py-3 rounded-full shadow-md transition"
        >
          {processing ? 'Processing…' : 'Pay now'}
        </button>
      </div>
    </form>
  )
}

// ── Modal shell ──────────────────────────────────────────────────────────────

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  /** Amount in cents, e.g. 15000 = $150.00 */
  amount: number
  description: string
}

export default function PaymentModal({ isOpen, onClose, amount, description }: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setClientSecret(null)
      setFetchError(null)
      setSuccess(false)
      return
    }
    setLoading(true)
    createPaymentIntent({ amount, currency: 'usd', description })
      .then(({ data }) => setClientSecret(data.clientSecret))
      .catch(() => setFetchError('Could not start checkout. Please try again.'))
      .finally(() => setLoading(false))
  }, [isOpen, amount, description])

  if (!isOpen) return null

  const dollarsLabel = `$${(amount / 100).toFixed(2)}`

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-wood-dark/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-cream rounded-[28px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="wood-texture text-white px-7 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-200">Anas Ibn Malik Academy</p>
            <p className="font-kids text-2xl mt-0.5">{description}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-300">Total</p>
            <p className="font-bold text-2xl">{dollarsLabel}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-7 py-6">
          {success ? (
            <div className="text-center py-6 space-y-3">
              <div className="text-5xl">✅</div>
              <p className="font-kids text-2xl text-wood-dark">Registration confirmed!</p>
              <p className="text-stone-500 text-sm">You'll receive a confirmation email shortly.</p>
              <button
                onClick={onClose}
                className="mt-4 bg-sage-600 text-white font-bold px-8 py-3 rounded-full shadow-md hover:bg-sage-700 transition"
              >
                Done
              </button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
            </div>
          ) : fetchError ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-red-600 text-sm">{fetchError}</p>
              <button onClick={onClose} className="text-stone-500 underline text-sm">Close</button>
            </div>
          ) : clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#5d8162',
                    colorBackground: '#fdfbf7',
                    borderRadius: '12px',
                    fontFamily: 'Quicksand, sans-serif',
                  },
                },
              }}
            >
              <CheckoutForm onSuccess={() => setSuccess(true)} onCancel={onClose} />
            </Elements>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  )
}
