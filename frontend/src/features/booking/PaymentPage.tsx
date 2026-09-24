import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api, getApiErrorMessage, type PaymentAttempt, unwrap } from '../../services/api'

interface PaymentPageState {
  bookingId: string | number
  paymentAttempt?: PaymentAttempt
}

interface PaymentResponse {
  payment_url?: string
  checkout_url?: string
  paymentUrl?: string
  checkoutUrl?: string
  url?: string
  payment_attempt?: PaymentAttempt
}

function formatDate(value?: string): string {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function PaymentPage() {
  const location = useLocation()
  const details = location.state as PaymentPageState | null
  const [paymentAttempt, setPaymentAttempt] = useState<PaymentAttempt | undefined>(details?.paymentAttempt)
  const [loading, setLoading] = useState(!details?.paymentAttempt)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!details?.bookingId || details.paymentAttempt) return
    api.post<PaymentResponse>('/payments/trigger', { booking_id: details.bookingId })
      .then((response) => {
        const payment = unwrap<PaymentResponse>(response.data)
        const paymentUrl = payment.payment_url ?? payment.checkout_url ?? payment.paymentUrl ?? payment.checkoutUrl ?? payment.url
        if (paymentUrl) {
          window.location.assign(paymentUrl)
          return
        }
        if (!payment.payment_attempt) throw new Error('No payment details returned.')
        setPaymentAttempt(payment.payment_attempt)
      })
      .catch((paymentError) => {
        setError(getApiErrorMessage(paymentError, 'We could not load payment information. Please try again.'))
      })
      .finally(() => setLoading(false))
  }, [details?.bookingId, details?.paymentAttempt])

  if (!details?.bookingId) {
    return <div className="page empty-state"><h2>Payment details not found</h2><p>Return to your bookings and try again.</p><Link className="button button-primary" to="/dashboard">Back to dashboard</Link></div>
  }

  if (loading) return <div className="page loading-state">Loading payment information...</div>
  if (error || !paymentAttempt) return <div className="page empty-state"><h2>Payment information unavailable</h2><p>{error || 'No payment details were returned.'}</p><Link className="button button-primary" to="/dashboard">Back to dashboard</Link></div>

  const payment = paymentAttempt
  return <div className="page confirmation-page"><header className="page-header"><div><span className="eyebrow">Payment details</span><h1>Complete your payment.</h1><p>Use the payment reference below when completing or checking this transaction.</p></div></header><section className="confirmation-card section-panel"><div className="confirmation-status"><span className="status-mark">$</span><div><span className="eyebrow">Booking #{details.bookingId}</span><h2>{payment.status ?? 'Payment pending'}</h2></div></div><dl className="confirmation-details"><div><dt>Transaction reference</dt><dd>{payment.transaction_reference ?? 'Not available'}</dd></div><div><dt>Status</dt><dd>{payment.status ?? 'Not available'}</dd></div><div><dt>Amount</dt><dd>{payment.amount ?? 'Not available'}</dd></div><div><dt>Payment method</dt><dd>{payment.payment_method ?? 'Not selected'}</dd></div><div><dt>Created</dt><dd>{formatDate(payment.created_at)}</dd></div><div><dt>Paid at</dt><dd>{formatDate(payment.paid_at ?? undefined)}</dd></div></dl><Link className="button button-primary" to="/dashboard">Return to dashboard</Link></section></div>
}