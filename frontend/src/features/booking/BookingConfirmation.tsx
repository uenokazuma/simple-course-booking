import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api, getApiErrorMessage, type PaymentAttempt, type Student, type TrialClass, unwrap } from '../../services/api'
import { Button } from '../../components/Button'

interface BookingConfirmationState {
  bookingId: string | number
  student?: Student
  lesson?: TrialClass
  date: string
  time: string
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

function classLabel(lesson?: TrialClass): string {
  if (!lesson) return 'Trial class'
  const subject = typeof lesson.subject === 'object' ? lesson.subject.name : lesson.subject
  return [lesson.name, subject].filter(Boolean).join(' - ') || 'Trial class'
}

export function BookingConfirmation() {
  const location = useLocation()
  const navigate = useNavigate()
  const details = location.state as BookingConfirmationState | null
  const bookingId = details?.bookingId
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!bookingId || !details) {
    return <div className="page empty-state"><h2>Booking not found</h2><p>Start a new booking to continue to payment.</p><Link className="button button-primary" to="/booking">Back to booking</Link></div>
  }

  async function startPayment() {
    setLoading(true)
    setError('')
    try {
      const response = await api.post<PaymentResponse>('/payments/trigger', { booking_id: bookingId })
      const payment = unwrap<PaymentResponse>(response.data)
      const paymentUrl = payment.payment_url ?? payment.checkout_url ?? payment.paymentUrl ?? payment.checkoutUrl ?? payment.url
      const paymentAttempt = payment.payment_attempt ?? details?.paymentAttempt
      if (paymentUrl) {
        window.location.assign(paymentUrl)
      } else if (paymentAttempt) {
        navigate('/payment', { state: { bookingId, paymentAttempt } })
      } else {
        setError('Payment was created, but no checkout link was returned.')
      }
    } catch (paymentError) {
      setError(getApiErrorMessage(paymentError, 'We could not start payment. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return <div className="page confirmation-page"><header className="page-header"><div><span className="eyebrow">Booking confirmed</span><h1>Your class is ready.</h1><p>Review the details below, then continue to payment.</p></div></header><section className="confirmation-card section-panel"><div className="confirmation-status"><span className="status-mark">✓</span><div><span className="eyebrow">Booking #{details.bookingId}</span><h2>One bright hour ahead</h2></div></div><dl className="confirmation-details"><div><dt>Student</dt><dd>{details.student?.student_name ?? 'Selected student'}</dd></div><div><dt>Class</dt><dd>{classLabel(details.lesson)}</dd></div><div><dt>Date</dt><dd>{details.date || 'Date selected in booking'}</dd></div><div><dt>Time</dt><dd>{details.time || 'Time selected in booking'}</dd></div></dl>{error ? <p className="form-message error">{error}</p> : null}<div className="confirmation-actions"><Button type="button" onClick={startPayment} disabled={loading}>{loading ? 'Starting payment...' : 'Continue to payment'}</Button><button className="text-button" type="button" onClick={() => navigate('/dashboard')}>Return to dashboard</button></div></section></div>
}
