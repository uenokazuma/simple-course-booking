interface BookingCalendarProps {
  date: string
  time: string
  availableDates: string[]
  availableTimes: string[]
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
}

export function BookingCalendar({ date, time, availableDates, availableTimes, onDateChange, onTimeChange }: BookingCalendarProps) {
  const hasAvailableClasses = availableDates.length > 0
  return (
    <section className="booking-calendar section-panel">
      <div className="section-heading"><span className="eyebrow">01 / Schedule</span><h2>Choose a time to learn</h2><p>Pick a date and an available class slot.</p></div>
      <label className="field" htmlFor="booking-date"><span>Date</span><select id="booking-date" value={date} onChange={(event) => onDateChange(event.target.value)} disabled={!hasAvailableClasses} required><option value="">Select an available date</option>{availableDates.map((availableDate) => <option key={availableDate} value={availableDate}>{availableDate}</option>)}</select></label>
      <div className="field"><span>Available times</span><div className="time-grid">{availableTimes.map((slot) => <button key={slot} type="button" className={`time-slot ${time === slot ? 'selected' : ''}`} onClick={() => onTimeChange(slot)}>{slot}</button>)}</div></div>
      {!hasAvailableClasses ? <p className="form-message">Date and time selection will be available when trial classes are available.</p> : null}
    </section>
  )
}
