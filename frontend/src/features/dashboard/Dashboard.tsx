import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Booking, type Student, unwrap, USER_KEY } from '../../services/api'

interface StudentSchedule extends Student { bookings: Booking[] }

function readList<T>(value: unknown, key?: string): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const list = key ? record[key] : record.items
    if (Array.isArray(list)) return list as T[]
    if (list && typeof list === 'object') return [list as T]
    if (key === 'bookings' && ('id' in record || 'trialClass' in record || 'trial_class' in record || 'bookingDate' in record || 'booking_date' in record)) return [value as T]
  }
  return []
}

function bookingLabel(booking: Booking): string {
  const subject = booking.trial_class?.subject
  const subjectName = typeof subject === 'object' ? subject.name : subject
  return booking.trialClass?.name ?? booking.trial_class?.name ?? subjectName ?? booking.subject ?? booking.className ?? 'Trial class'
}

function bookingTime(booking: Booking): string {
  if (booking.time) return formatBookingTime(booking.time)
  const startTime = booking.startTime ?? booking.start_time ?? booking.trial_class?.start_time
  const endTime = booking.endTime ?? booking.end_time ?? booking.trial_class?.end_time
  if (startTime && endTime) return `${formatBookingTime(startTime)} - ${formatBookingTime(endTime)}`
  return startTime || endTime ? formatBookingTime(startTime ?? endTime ?? '') : 'Time to be confirmed'
}

function formatBookingTime(value: string): string {
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime()) && value.includes('T')) {
    return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(parsed)
  }
  return value
}

function bookingDate(booking: Booking): string {
  const value = booking.trial_class?.start_time ?? booking.start_time ?? booking.bookingDate ?? booking.booking_date ?? booking.date
  if (!value) return 'Date to be confirmed'
  return new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(value))
}

function bookingDateValue(booking: Booking): number {
  const value = booking.trial_class?.start_time ?? booking.start_time ?? booking.bookingDate ?? booking.booking_date ?? booking.date
  if (!value) return Number.POSITIVE_INFINITY
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp
}

function bookingSubject(booking: Booking): string {
  const subject = booking.trial_class?.subject
  return typeof subject === 'object' ? subject.name ?? '' : subject ?? ''
}

function bookingStatus(booking: Booking): string {
  return booking.status?.replace(/_/g, ' ') ?? 'Status unavailable'
}

function isPendingPayment(booking: Booking): boolean {
  return booking.status?.toUpperCase() === 'PENDING_PAYMENT'
}

function normalizeStudent(value: Student & { _id?: string; studentId?: string; firstName?: string; lastName?: string }): Student {
  const name = value.student_name ?? [value.firstName, value.lastName].filter(Boolean).join(' ') ?? 'Student'
  return { ...value, id: value.id ?? value._id ?? value.studentId ?? name, student_name: name }
}

export function Dashboard() {
  const [students, setStudents] = useState<StudentSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        const storedUser = localStorage.getItem(USER_KEY)
        const currentUser = storedUser ? (JSON.parse(storedUser) as { id?: string; role?: string; name?: string; student_name?: string; email?: string }) : null
        const isStudentView = String(currentUser?.role ?? '').trim().toLowerCase() === 'student'

        if (isStudentView && currentUser?.id) {
          const bookingsResponse = await api.get(`/students/${currentUser.id}/bookings`)
          const bookings = readList<Booking>(unwrap(bookingsResponse.data), 'bookings').sort((firstBooking, secondBooking) => bookingDateValue(firstBooking) - bookingDateValue(secondBooking))
          const student = normalizeStudent({ id: currentUser.id, student_name: currentUser.name ?? currentUser.student_name ?? 'Student', email: currentUser.email })
          setStudents([{ ...student, bookings }])
          return
        }

        const response = await api.get('/students')
        const linkedStudents = readList<Student & { _id?: string; studentId?: string; firstName?: string; lastName?: string }>(unwrap(response.data), 'students').map(normalizeStudent)
        const schedules = await Promise.all(linkedStudents.map(async (student) => {
          try {
            const bookingsResponse = await api.get(`/students/${student.id}/bookings`)
            const bookings = readList<Booking>(unwrap(bookingsResponse.data), 'bookings')
            return { ...student, bookings: bookings.sort((firstBooking, secondBooking) => bookingDateValue(firstBooking) - bookingDateValue(secondBooking)) }
          } catch {
            return { ...student, bookings: [] }
          }
        }))
        setStudents(schedules)
      } catch { setError('We could not load your schedule. Please refresh and try again.') }
      finally { setLoading(false) }
    }
    void loadDashboard()
  }, [])

  const bookingCount = students.reduce((total, student) => total + student.bookings.length, 0)
  const isStudentView = String(JSON.parse(localStorage.getItem(USER_KEY) ?? '{}').role ?? '').trim().toLowerCase() === 'student'

  return (
    <div className="page">
      <header className="page-header dashboard-header"><div><span className="eyebrow">{isStudentView ? 'Student dashboard' : 'Parent dashboard'}</span><h1>{isStudentView ? 'Your class schedule' : 'A little more room to grow.'}</h1><p>{isStudentView ? 'Here is what you have coming up.' : 'Here is what your learners have coming up.'}</p></div><div className="dashboard-actions"><div className="date-stamp">{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date())}</div>{!isStudentView ? <Link className="button button-primary" to="/booking">Book a class</Link> : null}</div></header>
      <section className="stats-row"><div><span>{isStudentView ? 'Classes booked' : 'Linked learners'}</span><strong>{isStudentView ? bookingCount : students.length}</strong></div><div><span>Booked classes</span><strong>{bookingCount}</strong></div><div><span>Next step</span><strong>Keep learning</strong></div></section>
      {loading ? <div className="loading-state">Gathering your schedule...</div> : error ? <p className="form-message error">{error}</p> : students.length === 0 ? <div className="empty-state"><h2>No classes booked yet</h2><p>{isStudentView ? 'Your upcoming lessons will appear here once you book one.' : 'Once a student is connected to your account, their classes will appear here.'}</p></div> : <section className="student-list"><div className="section-heading"><span className="eyebrow">{isStudentView ? 'Your bookings' : 'Your family'}</span><h2>{isStudentView ? 'Booked classes' : 'Linked learners and classes'}</h2></div>{students.map((student) => <article className="student-row" key={student.id}><div className="student-info"><span className="avatar large">{student.student_name.charAt(0).toUpperCase()}</span><div><h3>{student.student_name}</h3><p>{student.grade ?? 'Student'}{student.email ? ` · ${student.email}` : ''}</p></div></div><div className="booking-list">{student.bookings.length === 0 ? <span className="muted">No classes booked yet</span> : student.bookings.map((booking) => <div className="booking-item" key={booking.id}><span>{bookingLabel(booking)}</span><small>{bookingDate(booking)} · {bookingTime(booking)} · Status: {bookingStatus(booking)}</small>{!isStudentView && isPendingPayment(booking) ? <Link className="button button-secondary" to="/payment" state={{ bookingId: booking.id }}>Continue to payment</Link> : null}</div>)}</div></article>)}</section>}
    </div>
  )
}
