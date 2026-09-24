import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getApiErrorMessage, type PaymentAttempt, type Student, type TrialClass, unwrap } from '../../services/api'
import { Button } from '../../components/Button'

interface BookingFormProps { date: string; time: string }

interface CreatedBookingResponse {
  id?: string | number
  booking?: { id?: string | number; payment_attempt?: PaymentAttempt }
  payment_attempt?: PaymentAttempt
}

function readList<T>(value: unknown, key: string): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object') {
    const list = (value as Record<string, unknown>)[key]
    if (Array.isArray(list)) return list as T[]
  }
  return []
}

function classLabel(lesson: TrialClass): string {
  const subject = typeof lesson.subject === 'object' ? lesson.subject.name : lesson.subject
  return [lesson.name, subject].filter(Boolean).join(' - ') || 'Trial class'
}

function matchesSlot(lesson: TrialClass, date: string, time: string): boolean {
  if (!date || !time || !lesson.start_time) return false
  const start = new Date(lesson.start_time)
  return !Number.isNaN(start.getTime()) && start.toISOString().slice(0, 10) === date && start.toISOString().slice(11, 16) === time
}

export function BookingForm({ date, time }: BookingFormProps) {
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<TrialClass[]>([])
  const [studentId, setStudentId] = useState('')
  const [trialClassId, setTrialClassId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const availableClasses = classes.filter((lesson) => matchesSlot(lesson, date, time))

  useEffect(() => {
    Promise.all([api.get('/students'), api.get('/trial-classes')])
      .then(([studentResponse, classResponse]) => {
        setStudents(readList<Student>(unwrap(studentResponse.data), 'students'))
        setClasses(readList<TrialClass>(unwrap(classResponse.data), 'trialClasses'))
      })
      .catch(() => setError('We could not load the students or class list. Please try again.'))
  }, [])

  useEffect(() => {
    if (!availableClasses.some((lesson) => String(lesson.id) === trialClassId)) setTrialClassId('')
  }, [date, time, classes, trialClassId, availableClasses])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!date || !time || !studentId || !trialClassId) { setError('Choose a student, class, date, and time before confirming.'); return }
    setSubmitting(true)
    try {
      const response = await api.post('/bookings', { student_id: studentId, trial_class_id: trialClassId, bookingDate: date, time })
      const payload = unwrap<CreatedBookingResponse>(response.data)
      const createdBooking = payload.booking ?? payload
      const student = students.find((item) => String(item.id) === studentId)
      const lesson = classes.find((item) => String(item.id) === trialClassId)
      if (!createdBooking?.id) throw new Error('The booking response did not include an id.')
      navigate('/booking/confirmation', { state: { bookingId: createdBooking.id, student, lesson, date, time, paymentAttempt: payload.payment_attempt ?? createdBooking.payment_attempt } })
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, 'The booking could not be completed. Please check the slot and try again.'))
    } finally { setSubmitting(false) }
  }

  return <form className="booking-form section-panel" onSubmit={submit}>
    <div className="section-heading"><span className="eyebrow">02 / Confirm</span><h2>Make it theirs</h2><p>Select who is attending and the class they will join.</p></div>
    <label className="field"><span>Student</span><select value={studentId} onChange={(event) => setStudentId(event.target.value)}><option value="">Select a student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.student_name}</option>)}</select></label>
    <label className="field"><span>Class</span><select value={trialClassId} onChange={(event) => setTrialClassId(event.target.value)} disabled={!date || !time}><option value="">Select a class</option>{availableClasses.map((lesson) => <option key={lesson.id} value={lesson.id}>{classLabel(lesson)}</option>)}</select></label>
    <div className="booking-summary"><span>{date || 'Date not selected'} at {time || 'time not selected'}</span><strong>Trial class</strong></div>
    {error ? <p className="form-message error">{error}</p> : null}{message ? <p className="form-message success">{message}</p> : null}
    <Button type="submit" disabled={submitting}>{submitting ? 'Confirming...' : 'Confirm booking'}</Button>
  </form>
}
