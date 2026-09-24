import { useEffect, useState } from 'react'
import { BookingCalendar } from './BookingCalendar'
import { BookingForm } from './BookingForm'
import { api, type TrialClass, unwrap } from '../../services/api'

function readTrialClasses(value: unknown): TrialClass[] {
  if (Array.isArray(value)) return value as TrialClass[]
  if (value && typeof value === 'object') {
    const trialClasses = (value as Record<string, unknown>).trialClasses
    if (Array.isArray(trialClasses)) return trialClasses as TrialClass[]
  }
  return []
}

function getSchedule(classes: TrialClass[]) {
  const timesByDate: Record<string, string[]> = {}
  classes.forEach((lesson) => {
    if (!lesson.start_time) return
    const start = new Date(lesson.start_time)
    if (Number.isNaN(start.getTime())) return
    const date = start.toISOString().slice(0, 10)
    const time = start.toISOString().slice(11, 16)
    timesByDate[date] = [...(timesByDate[date] ?? []), time]
  })
  Object.values(timesByDate).forEach((times) => times.sort())
  return { dates: Object.keys(timesByDate).sort((firstDate, secondDate) => new Date(firstDate).getTime() - new Date(secondDate).getTime()), timesByDate }
}

export function BookingPage() {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [schedule, setSchedule] = useState({ dates: [] as string[], timesByDate: {} as Record<string, string[]> })

  useEffect(() => {
    api.get('/trial-classes')
      .then((response) => setSchedule(getSchedule(readTrialClasses(unwrap(response.data)))))
      .catch(() => setSchedule({ dates: [], timesByDate: {} }))
  }, [])

  function handleDateChange(nextDate: string) {
    if (!schedule.dates.includes(nextDate)) return
    setDate(nextDate)
    setTime('')
  }

  return <div className="page booking-page"><header className="page-header"><div><span className="eyebrow">Class booking menu</span><h1>Reserve their next bright hour.</h1><p>Set up a trial class in a few simple steps.</p></div></header><div className="booking-grid"><BookingCalendar date={date} time={time} availableDates={schedule.dates} availableTimes={schedule.timesByDate[date] ?? []} onDateChange={handleDateChange} onTimeChange={setTime} /><BookingForm date={date} time={time} /></div></div>
}
